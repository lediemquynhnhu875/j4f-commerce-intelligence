/** Fill only missing display categories for the three audited demo sellers. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const args=process.argv.slice(2),apply=args[0]==='--apply';
const scope=new Map([['2','Gentlemen'],['9','KHO GIA DỤNG TIỆN ÍCH GIA ĐÌNH'],['2393','Shalla']]);
const clean=x=>typeof x==='string'?x.normalize('NFC').trim().replace(/\s+/g,' '):'';
let db,c;
try{
 if(!(args.length===0||(args.length===3&&apply&&args[1]==='--confirm'&&/^[a-f0-9]{64}$/.test(args[2]))))throw Error('Use dry-run or --apply --confirm HASH');
 const bytes=await readFile('../data/processed/products_full.json');const manifest=JSON.parse(await readFile('../data/processed/ml-import-v1/manifest.json','utf8'));
 if(sha(bytes)!==manifest.source_sha256)throw Error('Source checksum mismatch');
 const raw=JSON.parse(bytes),source=new Map(raw.products.map(p=>[String(p.product_id),p]));
 db=(await import('../src/server/db.ts')).pool();c=await db.connect();
 await c.query(apply?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 if(apply){await c.query('SELECT pg_advisory_xact_lock(736551004)');await c.query('LOCK TABLE products,categories IN SHARE ROW EXCLUSIVE MODE');}
 const products=(await c.query(`SELECT id::text,store_id::text,source_product_id,category_id::text FROM products WHERE store_id=ANY($1::bigint[]) AND source_system='tiki' ORDER BY id`,[[...scope.keys()]])).rows;
 const categories=(await c.query('SELECT id::text,code,name FROM categories ORDER BY id')).rows;
 const updates=[],unresolved=[],names=new Map();
 for(const p of products){
  const s=source.get(p.source_product_id);if(!s||s.seller_id!==scope.get(p.store_id))throw Error('Source seller/store mismatch');
  if(p.category_id!==null)continue;
  const name=clean(s.category_raw);
  if(!name||name.toLowerCase()==='root'||Array.from(name).length>150){unresolved.push({id:p.id,source_id:p.source_product_id,raw_category:s.category_raw??null});continue;}
  const matches=categories.filter(c=>clean(c.name).toLowerCase()===name.toLowerCase());
  const code='source-'+sha(name.toLowerCase()).slice(0,24);
  const collision=categories.find(c=>c.code===code&&clean(c.name).toLowerCase()!==name.toLowerCase());if(collision)throw Error('Category code collision');
  const target=matches.length===1?{id:matches[0].id,name:matches[0].name,code:matches[0].code}:{id:categories.find(c=>c.code===code)?.id??null,name,code};
  names.set(target.code,target);updates.push({id:p.id,store_id:p.store_id,source_id:p.source_product_id,category_code:target.code});
 }
 const fingerprint=sha(JSON.stringify({source:sha(bytes),products,categories,updates,unresolved}));
 const report={mode:apply?'applied':'dry-run',scoped_products:products.length,fill_missing_categories:updates.length,categories_to_create:[...names.values()].filter(x=>!x.id).length,unresolved_root_or_missing:unresolved.length,fingerprint};
 await mkdir('../tmp/demo-categories',{recursive:true});await writeFile(`../tmp/demo-categories/plan-${fingerprint}.json`,JSON.stringify({report,updates,unresolved,categories},null,2));
 if(apply){
  if(args[2]!==fingerprint)throw Error('Plan changed; run dry-run again');
  for(const target of names.values())if(!target.id)target.id=String((await c.query('INSERT INTO categories(code,name) VALUES($1,$2) RETURNING id',[target.code,target.name])).rows[0].id);
  const rows=updates.map(u=>({id:u.id,store_id:u.store_id,category_id:names.get(u.category_code).id}));
  const result=await c.query(`UPDATE products p SET category_id=x.category_id,updated_at=now() FROM jsonb_to_recordset($1::jsonb) AS x(id bigint,store_id bigint,category_id bigint) WHERE p.id=x.id AND p.store_id=x.store_id AND p.category_id IS NULL`,[JSON.stringify(rows)]);
  if(result.rowCount!==updates.length)throw Error('Category update count mismatch');
  await c.query('COMMIT');
 }else await c.query('ROLLBACK');
 console.log(JSON.stringify(report,null,2));
}catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});console.error(/^(Use dry|Source |Category |Plan changed)/.test(e?.message??'')?e.message:'Category fill failed; inspect local source/schema/connectivity.');process.exitCode=1;}
finally{c?.release();if(db)await db.end();}
