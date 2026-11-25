/** Read-only seller/store audit. Run from backend with node --import tsx. */
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const bundle=resolve('../data/processed/ml-import-v1');
const output=fileURLToPath(new URL('../../tmp/seller-store-audit.json',import.meta.url));
let db,client;
try {
 if(process.argv.length!==2)throw Error('This read-only audit accepts no options');
 const manifest=JSON.parse(await readFile(resolve(bundle,'manifest.json'),'utf8'));
 const sellers=new Map(),bySource=new Map(),hash=createHash('sha256');
 for await(const chunk of createReadStream(resolve(bundle,'records.ndjson')))hash.update(chunk);
 if(hash.digest('hex')!==manifest.records_sha256)throw Error('Bundle checksum mismatch');
 let recommendations=0;
 for await(const line of createInterface({input:createReadStream(resolve(bundle,'records.ndjson')),crlfDelay:Infinity})){
  if(!line.trim())continue;
  const p=JSON.parse(line);
  if(typeof p.seller_id!=='string'||!p.seller_id.trim()||typeof p.source_id!=='string'||bySource.has(p.source_id))throw Error('Invalid seller or duplicate source identity');
  bySource.set(p.source_id,p.seller_id);
  sellers.set(p.seller_id,(sellers.get(p.seller_id)??0)+1);
  recommendations+=p.recommendations.length;
 }
 if(bySource.size!==manifest.products||recommendations!==manifest.recommendations)throw Error('Bundle counts mismatch');
 db=(await import('../src/server/db.ts')).pool();client=await db.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const stores=(await client.query(`SELECT s.id::text,s.name,s.is_active,u.role,u.is_active AS owner_active FROM stores s JOIN users u ON u.id=s.owner_user_id ORDER BY s.id`)).rows;
 const products=(await client.query(`SELECT id::text,store_id::text,source_product_id FROM products WHERE source_system='tiki' ORDER BY id`)).rows;
 const sellerStores=new Map(),storeSellers=new Map(),sourceRows=new Map();
 let matched=0;
 for(const p of products){
  const seller=bySource.get(p.source_product_id);if(seller===undefined)continue;matched++;
  if(!sellerStores.has(seller))sellerStores.set(seller,new Set());sellerStores.get(seller).add(p.store_id);
  if(!storeSellers.has(p.store_id))storeSellers.set(p.store_id,new Set());storeSellers.get(p.store_id).add(seller);
  if(!sourceRows.has(p.source_product_id))sourceRows.set(p.source_product_id,[]);sourceRows.get(p.source_product_id).push(p.id);
 }
 const storeById=new Map(stores.map(s=>[s.id,s]));
 const reusable=[],conflicts=[];
 for(const [seller,ids]of sellerStores){
  const id=[...ids][0],s=storeById.get(id);
  const reasons=[];
  if(ids.size!==1)reasons.push('seller_in_multiple_stores');
  if([...ids].some(x=>storeSellers.get(x).size!==1))reasons.push('store_contains_multiple_source_sellers');
  if([...ids].some(x=>{const row=storeById.get(x);return !row||!row.is_active||!row.owner_active||row.role!=='reviewer';}))reasons.push('inactive_or_invalid_owner');
  if(reasons.length)conflicts.push({seller,store_ids:[...ids],reasons});
  else reusable.push({seller,store_id:id,store_name:s.name,source_products:sellers.get(seller)});
 }
 const report={mode:'read-only',source_products:bySource.size,source_recommendations:recommendations,source_sellers:sellers.size,existing_database_stores:stores.length,matched_database_rows:matched,unique_source_products_already_present:sourceRows.size,source_products_not_yet_present:bySource.size-sourceRows.size,reusable_stores:reusable,sellers_without_source_products_in_database:[...sellers].filter(([s])=>!sellerStores.has(s)).map(([seller,products])=>({seller,products})),conflicts,duplicate_source_products:[...sourceRows].filter(([,ids])=>ids.length>1).map(([source_id,product_ids])=>({source_id,product_ids})),mixed_stores:[...storeSellers].filter(([,ss])=>ss.size>1).map(([id,ss])=>({store_id:id,name:storeById.get(id)?.name,sellers:[...ss]}))};
 await client.query('ROLLBACK');
 await mkdir(new URL('../../tmp/',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({mode:report.mode,source_products:report.source_products,source_sellers:report.source_sellers,reusable_stores:reusable.length,sellers_needing_new_store_or_mapping:report.sellers_without_source_products_in_database.length,conflicting_sellers:conflicts.length,duplicate_source_products:report.duplicate_source_products.length,report:output},null,2));
}catch(e){
 console.error('Audit failed:',e?.name??'Error','code:',/^[A-Z0-9_]{2,40}$/.test(String(e?.code))?e.code:'unavailable');
 console.error('Check database connectivity and bundle files locally. No database writes were requested.');process.exitCode=1;
}finally{if(client){await client.query('ROLLBACK').catch(()=>{});client.release();}if(db)await db.end();}
