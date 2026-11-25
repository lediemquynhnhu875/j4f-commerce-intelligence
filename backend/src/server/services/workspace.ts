import {z} from 'zod';
import type {PoolClient} from 'pg';
import type {Account} from '../auth';
import {transaction} from '../db';
import {id} from '../validation';
import {ownStore} from './stores';
import {missing} from '../errors';
type DB=Pick<PoolClient,'query'>;
const page=z.coerce.number().int().min(1).max(1000000).default(1);
const limit=z.coerce.number().int().min(1).max(100).default(20);
const search=z.string().trim().max(200).default('');
export const choiceQuery=z.object({q:search,page,limit}).strict();
export const detailQuery=z.object({product_id:id.optional(),analysis_id:id.optional(),history_page:page,actions_page:page}).strict();
export const workQuery=z.object({q:search,page,limit:z.coerce.number().int().min(1).max(100).default(12),analysis_id:id.optional(),
 status:z.enum(['proposed','accepted','in_progress','completed','rejected','cancelled']).optional(),
 type:z.enum(['review_price','complete_description','review_images_or_video','review_images','review_video','inspect_reviews','verify_listing_and_stock','verify_exposure','other']).optional()}).strict();
const literal=(s:string)=>'%'+s.replace(/[\\%_]/g,'\\$&')+'%';
const storeDTO=(s:Record<string,any>)=>({id:String(s.id),owner_user_id:String(s.owner_user_id),name:s.name,is_active:s.is_active});
const productFields=`p.id::text,p.store_id::text,p.category_id::text,p.source_system,p.source_product_id,p.name,p.brand,
 p.price::text,p.currency,p.quantity_sold::text,p.rating_average::text,p.review_count,p.thumbnail_url,p.number_of_images,
 p.has_video,p.observed_at,p.sales_scope,p.sales_label_verified,NULL::text AS description`;
const latest=`WITH latest AS MATERIALIZED (SELECT DISTINCT ON(a.product_id) a.id,a.product_id,a.status,a.status_schema_version,
 a.reference_sold,a.priority_score,a.analyzed_at FROM product_analyses a JOIN products p ON p.id=a.product_id
 WHERE p.store_id=$1 ORDER BY a.product_id,a.analyzed_at DESC,a.id DESC)`;
const active="('proposed','accepted','in_progress')";
export async function readOverview(db:DB,actor:Account){
 const store=await ownStore(actor,db),sid=String(store.id);
 const stats=(await db.query(`${latest} SELECT
 (SELECT count(*)::int FROM products WHERE store_id=$1) AS total,count(*)::int AS analyzed_products,
 count(*) FILTER(WHERE reference_sold IS NULL)::int AS no_reference,
 coalesce(bool_or(status_schema_version='ml_v2'),false) AS has_ml,max(analyzed_at) AS last_analysis_at,
 (SELECT count(DISTINCT l.id)::int FROM latest l JOIN improvement_actions w ON w.analysis_id=l.id WHERE w.status IN ${active}) AS review_products,
 (SELECT count(*)::int FROM latest l JOIN improvement_actions w ON w.analysis_id=l.id WHERE w.status IN ${active}) AS active_actions,
 (SELECT count(*)::int FROM latest l JOIN improvement_actions w ON w.analysis_id=l.id WHERE w.status='in_progress') AS in_progress,
 (SELECT count(*)::int FROM latest l JOIN improvement_actions w ON w.analysis_id=l.id WHERE w.status='proposed') AS proposed,
 (SELECT count(*)::int FROM improvement_actions w JOIN product_analyses a ON a.id=w.analysis_id JOIN products p ON p.id=a.product_id WHERE p.store_id=$1 AND w.status='proposed') AS global_proposed
 FROM latest`,[sid])).rows[0];
 const groups=(await db.query(`${latest} SELECT status,count(*)::int AS count FROM latest GROUP BY status`,[sid])).rows;
 const categories=(await db.query(`SELECT coalesce(c.id::text,'none') AS id,coalesce(c.name,'Chưa phân loại') AS name,count(*)::int AS count
 FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.store_id=$1 GROUP BY c.id,c.name ORDER BY c.id NULLS LAST`,[sid])).rows;
 const priority=(await db.query(`${latest} SELECT l.id::text FROM latest l WHERE EXISTS(SELECT 1 FROM improvement_actions w WHERE w.analysis_id=l.id AND w.status IN ${active}) ORDER BY l.priority_score DESC NULLS LAST,l.id ASC LIMIT 8`,[sid])).rows.map(r=>r.id);
 const cards=(await db.query(`${latest} SELECT w.id::text FROM improvement_actions w JOIN latest l ON l.id=w.analysis_id WHERE w.status IN ${active} ORDER BY w.id LIMIT 4`,[sid])).rows.map(r=>r.id);
 const reps=priority.length?(await db.query(`SELECT DISTINCT ON(analysis_id) id::text FROM improvement_actions WHERE analysis_id=ANY($1::bigint[]) AND status IN ${active} ORDER BY analysis_id,id`,[priority])).rows.map(r=>r.id):[];
 const actionIds=[...new Set([...cards,...reps])];
 const actions=actionIds.length?(await db.query(`SELECT id::text,analysis_id::text,type,title,status,
 jsonb_build_object('evidence',original_suggestion_json->'evidence') AS original_suggestion_json
 FROM improvement_actions WHERE id=ANY($1::bigint[]) ORDER BY array_position($1::bigint[],id)`,[actionIds])).rows:[];
 const aids=[...new Set([...priority,...actions.map(a=>a.analysis_id)])];
 const analyses=aids.length?(await db.query(`SELECT id::text,product_id::text,status,status_schema_version,product_type,priority_score::text,
 reference_sold::text,sales_gap::text,analyzed_at,jsonb_build_object('quantity_sold',input_snapshot_json->'quantity_sold') AS input_snapshot_json
 FROM product_analyses WHERE id=ANY($1::bigint[]) ORDER BY id`,[aids])).rows:[];
 const products=analyses.length?(await db.query(`SELECT ${productFields} FROM products p WHERE p.id=ANY($1::bigint[]) AND p.store_id=$2 ORDER BY p.id`,[analyses.map(a=>a.product_id),sid])).rows:[];
 const scopedCategories=(await db.query(`SELECT id::text,code,name,description FROM categories WHERE id=ANY($1::bigint[])`,[categories.filter(c=>c.id!=='none').map(c=>c.id)])).rows;
 return {store:storeDTO(store),summary:{...stats,status_counts:Object.fromEntries(groups.map(r=>[r.status,r.count])),categories},
 data:{products,analyses,actions,categories:scopedCategories,accounts:[]}};
}

export async function readChoices(db:DB,actor:Account,q:z.infer<typeof choiceQuery>,kind:'products'|'analyses'){
 const store=await ownStore(actor,db),args:unknown[]=[String(store.id)];
 let from=kind==='products'?'FROM products p':'FROM product_analyses a JOIN products p ON p.id=a.product_id';
 let where='WHERE p.store_id=$1';
 if(q.q){args.push(literal(q.q));where+=` AND (p.name ILIKE $2 OR p.id::text ILIKE $2 OR ('SP-'||coalesce(nullif(p.source_product_id,''),p.id::text)) ILIKE $2${kind==='analyses'?' OR a.id::text ILIKE $2':''})`;}
 const total=(await db.query(`SELECT count(*)::int AS total ${from} ${where}`,args)).rows[0].total;
 const p=Math.min(q.page,Math.max(1,Math.ceil(total/q.limit)));
 const select=kind==='products'?"p.id::text,p.name":"a.id::text,a.product_id::text,a.status,a.analyzed_at,jsonb_build_object('id',p.id::text,'name',p.name,'category_id',p.category_id::text) AS product";
 const order=kind==='products'?'p.id':'a.analyzed_at DESC,a.id DESC';
 const rows=(await db.query(`SELECT ${select} ${from} ${where} ORDER BY ${order} LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,q.limit,(p-1)*q.limit])).rows;
 return {data:rows,pagination:{page:p,limit:q.limit,total}};
}

export async function readDetail(db:DB,actor:Account,q:z.infer<typeof detailQuery>){
 const store=await ownStore(actor,db),sid=String(store.id);
 let pid=q.product_id,analysis:Record<string,any>|null=null;
 const from=`FROM product_analyses a JOIN products p ON p.id=a.product_id LEFT JOIN users u ON u.id=a.analyzed_by`;
 const select=`SELECT a.*,jsonb_build_object('id',p.id::text,'name',p.name,'category_id',p.category_id::text) AS product,
 CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('id',u.id::text,'full_name',u.full_name) END AS analyst`;
 if(q.analysis_id){
  analysis=(await db.query(`${select} ${from} WHERE a.id=$1 AND p.store_id=$2`,[q.analysis_id,sid])).rows[0];
  if(!analysis || (pid&&String(analysis.product_id)!==pid))missing();pid=String(analysis.product_id);
 }
 if(!pid)pid=(await db.query(`SELECT p.id::text FROM products p WHERE p.store_id=$1 ORDER BY EXISTS(SELECT 1 FROM product_analyses a WHERE a.product_id=p.id AND a.status_schema_version='ml_v2') DESC,p.id LIMIT 1`,[sid])).rows[0]?.id;
 const product=pid?(await db.query('SELECT * FROM products WHERE id=$1 AND store_id=$2',[pid,sid])).rows[0]:null;
 if(pid&&!product)missing();
 if(pid&&!q.analysis_id)analysis=(await db.query(`${select} ${from} WHERE a.product_id=$1 AND p.store_id=$2 ORDER BY a.analyzed_at DESC,a.id DESC LIMIT 1`,[pid,sid])).rows[0]??null;
 const total=pid?(await db.query('SELECT count(*)::int AS total FROM product_analyses WHERE product_id=$1',[pid])).rows[0].total:0;
 const hp=Math.min(q.history_page,Math.max(1,Math.ceil(total/20)));
 const history=pid?(await db.query('SELECT id::text,product_id::text,status,analyzed_at FROM product_analyses WHERE product_id=$1 ORDER BY analyzed_at DESC,id DESC LIMIT 20 OFFSET $2',[pid,(hp-1)*20])).rows:[];
 const actionTotal=analysis?(await db.query('SELECT count(*)::int AS total FROM improvement_actions WHERE analysis_id=$1',[analysis.id])).rows[0].total:0;
 const ap=Math.min(q.actions_page,Math.max(1,Math.ceil(actionTotal/20)));
 const actions=analysis?(await db.query('SELECT * FROM improvement_actions WHERE analysis_id=$1 ORDER BY id LIMIT 20 OFFSET $2',[analysis.id,(ap-1)*20])).rows:[];
 const categories=product?.category_id?(await db.query('SELECT id::text,code,name,description FROM categories WHERE id=$1',[product.category_id])).rows:[];
 const proposed=(await db.query("SELECT count(*)::int AS total FROM improvement_actions w JOIN product_analyses a ON a.id=w.analysis_id JOIN products p ON p.id=a.product_id WHERE p.store_id=$1 AND w.status='proposed'",[sid])).rows[0].total;
 return {store:storeDTO(store),proposed_actions:proposed,data:{products:product?[product]:[],analyses:analysis?[analysis]:[],actions,categories,accounts:[]},
 history,history_pagination:{page:hp,limit:20,total},actions_pagination:{page:ap,limit:20,total:actionTotal}};
}

export async function readWorkPage(db:DB,actor:Account,q:z.infer<typeof workQuery>){
 const store=await ownStore(actor,db),sid=String(store.id),args:unknown[]=[sid];
 const from='FROM improvement_actions w JOIN product_analyses a ON a.id=w.analysis_id JOIN products p ON p.id=a.product_id';
 const conditions=['p.store_id=$1'];
 const bind=(v:unknown)=>{args.push(v);return '$'+args.length;};
 if(q.analysis_id){const owned=(await db.query('SELECT 1 FROM product_analyses a JOIN products p ON p.id=a.product_id WHERE a.id=$1 AND p.store_id=$2',[q.analysis_id,sid])).rows[0];if(!owned)missing();conditions.push('w.analysis_id='+bind(q.analysis_id));}
 if(q.status)conditions.push('w.status='+bind(q.status));if(q.type)conditions.push('w.type='+bind(q.type));
 if(q.q){const slot=bind(literal(q.q));conditions.push(`(w.title ILIKE ${slot} OR w.id::text ILIKE ${slot})`);}
 const where='WHERE '+conditions.join(' AND ');
 const grouped=(await db.query(`SELECT w.status,count(*)::int AS count ${from} ${where} GROUP BY w.status`,args)).rows;
 const total=grouped.reduce((n,r)=>n+r.count,0),p=Math.min(q.page,Math.max(1,Math.ceil(total/q.limit)));
 const actions=(await db.query(`SELECT w.* ${from} ${where} ORDER BY w.updated_at DESC,w.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,q.limit,(p-1)*q.limit])).rows;
 const aids=[...new Set(actions.map(a=>String(a.analysis_id)))];
 const analyses=aids.length?(await db.query(`SELECT a.id::text,a.product_id::text,jsonb_build_object('id',p.id::text,'name',p.name,'category_id',p.category_id::text) AS product FROM product_analyses a JOIN products p ON p.id=a.product_id WHERE a.id=ANY($1::bigint[]) AND p.store_id=$2`,[aids,sid])).rows:[];
 const products=analyses.length?(await db.query(`SELECT ${productFields} FROM products p WHERE p.id=ANY($1::bigint[]) AND p.store_id=$2`,[analyses.map(a=>a.product_id),sid])).rows:[];
 const states=(await db.query(`SELECT w.status,count(*)::int AS count ${from} WHERE p.store_id=$1 GROUP BY w.status`,[sid])).rows;
 const types=(await db.query(`SELECT DISTINCT w.type ${from} WHERE p.store_id=$1 ORDER BY w.type`,[sid])).rows.map(r=>r.type);
 return {store:storeDTO(store),data:{products,analyses,actions},pagination:{page:p,limit:q.limit,total},
 summary:{total:states.reduce((n,r)=>n+r.count,0),states:Object.fromEntries(states.map(r=>[r.status,r.count]))},facets:{types},filtered_states:Object.fromEntries(grouped.map(r=>[r.status,r.count]))};
}

export function workspaceRead<T>(fn:(db:DB)=>Promise<T>){return transaction(async db=>{await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');return fn(db);});}
