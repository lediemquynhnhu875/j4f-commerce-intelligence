import { z } from 'zod';
import type { PoolClient } from 'pg';
import { transaction } from '../db';
import { id, analysisStatuses } from '../validation';
import { mlStatuses } from '../ml-sample';
import type { Account } from '../auth';
import { ownStore } from './stores';
import { missing } from '../errors';

type DB = Pick<PoolClient,'query'>;
export const catalogQuerySchema=z.object({
  page:z.coerce.number().int().min(1).max(1000000).default(1),
  limit:z.coerce.number().int().min(1).max(100).default(20),
  q:z.string().trim().max(200).default(''),
  category_id:id.optional(), store:id.optional(),
  type:z.string().trim().min(1).max(150).optional(),
  status:z.enum([...analysisStatuses,...mlStatuses,'no_analysis']).optional(),
  sort:z.enum(['','price','sales']).default(''),
  analysable_only:z.enum(['true','false']).default('false'),
}).strict();
export type CatalogQuery=z.infer<typeof catalogQuerySchema>;
const latest=`LEFT JOIN LATERAL (
 SELECT id,status,product_type,analyzed_at FROM product_analyses
 WHERE product_id=p.id ORDER BY analyzed_at DESC,id DESC LIMIT 1
) a ON true`;

/** Private fixed SQL fragments plus bound values; the owner store is resolved first. */
export function catalogFilters(storeId:string,q:CatalogQuery){
  const args:unknown[]=[storeId],conditions=['p.store_id=$1'];
  const bind=(value:unknown)=>{args.push(value);return '$'+args.length;};
  if(q.q){
    const slot=bind('%'+q.q.replace(/[\\%_]/g,'\\$&')+'%');
    conditions.push(`(p.name ILIKE ${slot} OR p.brand ILIKE ${slot} OR p.id::text ILIKE ${slot}
      OR ('SP-'||coalesce(nullif(btrim(p.source_product_id),''),p.id::text)) ILIKE ${slot})`);
  }
  if(q.category_id)conditions.push('p.category_id='+bind(q.category_id));
  if(q.type)conditions.push('a.product_type='+bind(q.type));
  if(q.status==='no_analysis')conditions.push('a.id IS NULL');
  else if(q.status)conditions.push('a.status='+bind(q.status));
  if(q.analysable_only==='true')conditions.push("a.id IS NOT NULL AND a.status<>'insufficient_data'");
  const order=q.sort==='price'?'p.price ASC NULLS LAST,p.id ASC':q.sort==='sales'?'p.quantity_sold DESC NULLS LAST,p.id ASC':"(a.id IS NOT NULL AND a.status<>'insufficient_data') DESC,p.id ASC";
  return {args,where:'WHERE '+conditions.join(' AND '),order};
}

/** Exported executor allows SQL integration checks against an isolated database. */
export async function readCatalogPage(db:DB,actor:Account,q:CatalogQuery){
  const store=await ownStore(actor,db);
  if(q.store && q.store!==String(store.id))missing();
  const storeId=String(store.id);
  const metadata=(await db.query(`SELECT count(*)::int AS total,
    count(*) FILTER(WHERE a.id IS NULL OR a.status='insufficient_data')::int AS undecided_count,
    coalesce(jsonb_agg(DISTINCT a.status) FILTER(WHERE a.status IS NOT NULL),'[]') AS statuses,
    coalesce(jsonb_agg(DISTINCT a.product_type) FILTER(WHERE a.product_type IS NOT NULL AND a.product_type<>''),'[]') AS types
    FROM products p ${latest} WHERE p.store_id=$1`,[storeId])).rows[0];
  const categories=(await db.query(`SELECT c.id::text,c.code,c.name,c.description FROM categories c
    WHERE EXISTS(SELECT 1 FROM products p WHERE p.category_id=c.id AND p.store_id=$1)
    ORDER BY c.name,c.id`,[storeId])).rows;
  const f=catalogFilters(storeId,q);
  const total=(await db.query(`SELECT count(*)::int AS total FROM products p ${latest} ${f.where}`,f.args)).rows[0].total;
  // Clamp after deletion/filtering so an obsolete final page does not strand the UI.
  const page=Math.min(q.page,Math.max(1,Math.ceil(total/q.limit)));
  const rows=(await db.query(`SELECT p.id::text,p.store_id::text,p.category_id::text,p.source_system,p.source_product_id,
    p.name,p.brand,p.price::text,p.currency,p.quantity_sold::text,p.rating_average::text,p.review_count,
    p.thumbnail_url,p.number_of_images,p.has_video,p.observed_at,p.sales_scope,p.sales_label_verified,
    NULL::text AS description,
    CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('id',a.id::text,'product_id',p.id::text,
      'status',a.status,'product_type',a.product_type,'analyzed_at',a.analyzed_at) END AS latest_analysis
    FROM products p ${latest} ${f.where} ORDER BY ${f.order}
    LIMIT $${f.args.length+1} OFFSET $${f.args.length+2}`,[...f.args,q.limit,(page-1)*q.limit])).rows;
  const analyses=rows.map(row=>row.latest_analysis).filter(Boolean);
  const analysisIds=analyses.map(a=>a.id);
  const actions=analysisIds.length?(await db.query(`SELECT id::text,analysis_id::text,title FROM improvement_actions
    WHERE analysis_id=ANY($1::bigint[]) ORDER BY id`,[analysisIds])).rows:[];
  const proposed=(await db.query(`SELECT count(*)::int AS total FROM improvement_actions w
    JOIN product_analyses a ON a.id=w.analysis_id JOIN products p ON p.id=a.product_id
    WHERE p.store_id=$1 AND w.status='proposed'`,[storeId])).rows[0].total;
  return {data:rows.map(({latest_analysis: _latest,...product})=>{void _latest;return product;}),
    pagination:{page,limit:q.limit,total},analyses,actions,categories,
    store:{id:storeId,owner_user_id:String(store.owner_user_id),name:store.name,is_active:store.is_active},
    facets:{statuses:metadata.statuses,types:metadata.types},
    summary:{total:metadata.total,undecided_count:metadata.undecided_count,proposed_actions:proposed}};
}

export async function catalogPage(actor:Account,q:CatalogQuery){
  return transaction(async db=>{
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    return readCatalogPage(db,actor,q);
  });
}
