/** Read-only demo selection. Does not create accounts/stores or import products. */
import {readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {PoolClient} from 'pg';
import {pool,transaction} from '../src/server/db';

type Stats={seller_id:string;products:number;recommendations:number;products_with_recommendations:number;statuses:Record<string,number>;existing_products:number;existing_by_store:Record<string,number>;invalid_for_model:number;ambiguous_source:number};
export async function planDemoStores(db:Pick<PoolClient,'query'>,directory:string,count=2){
 const manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
 if(manifest.schema_version!=='sellens-ml-import-v1')throw Error('Unsupported bundle version');
 const file=join(directory,'records.ndjson'),hash=createHash('sha256');
 for await(const chunk of createReadStream(file))hash.update(chunk);
 if(hash.digest('hex')!==manifest.records_sha256)throw Error('Bundle checksum mismatch');
 const stores=(await db.query(`SELECT s.id::text AS store_id,s.name AS store_name,s.is_active,
  u.id::text AS owner_id,u.full_name AS owner_name,u.role,u.is_active AS owner_active,
  (SELECT count(*)::int FROM products p WHERE p.store_id=s.id) AS products
  FROM stores s JOIN users u ON u.id=s.owner_user_id ORDER BY s.id`)).rows;
 const existing=(await db.query("SELECT source_product_id,store_id::text FROM products WHERE source_system='tiki' AND source_product_id IS NOT NULL ORDER BY id")).rows;
 const byId=new Map<string,string[]>();
 for(const p of existing)byId.set(p.source_product_id,[...(byId.get(p.source_product_id)??[]),p.store_id]);
 const sellers=new Map<string,Stats>(),identities=new Set<string>();let total=0,recs=0;
 for await(const line of createInterface({input:createReadStream(file),crlfDelay:Infinity})){
  if(!line.trim())continue;
  const p=JSON.parse(line);
  if(identities.has(p.source_id)||p.analysis?.config_json?.source_sha256!==manifest.source_sha256)throw Error('Bundle identity mismatch');
  identities.add(p.source_id);total++;recs+=p.recommendations.length;
  let s=sellers.get(p.seller_id);
  if(!s){s={seller_id:p.seller_id,products:0,recommendations:0,products_with_recommendations:0,statuses:{},existing_products:0,existing_by_store:{},invalid_for_model:0,ambiguous_source:0};sellers.set(p.seller_id,s);}
  s.products++;s.recommendations+=p.recommendations.length;s.products_with_recommendations+=Number(p.recommendations.length>0);
  s.statuses[p.analysis.status]=(s.statuses[p.analysis.status]??0)+1;
  const input=p.analysis.input_snapshot_json;
  s.invalid_for_model+=Number(input.valid_for_model!==true);s.ambiguous_source+=Number(input.selected_raw_source_index==null);
  const locations=byId.get(p.source_id)??[];
  if(locations.length)s.existing_products++;
  for(const store of locations)s.existing_by_store[store]=(s.existing_by_store[store]??0)+1;
 }
 if(total!==manifest.products||recs!==manifest.recommendations)throw Error('Bundle totals mismatch');
 const candidates=[...sellers.values()].filter(s=>s.products>=20&&s.products<=60&&s.recommendations>0&&Object.keys(s.statuses).length>=3&&s.existing_products===0&&s.invalid_for_model===0&&s.ambiguous_source===0)
  .sort((a,b)=>Object.keys(b.statuses).length-Object.keys(a.statuses).length||b.products_with_recommendations-a.products_with_recommendations||a.products-b.products||a.seller_id.localeCompare(b.seller_id));
 const empty=stores.filter(s=>s.is_active&&s.owner_active&&s.role==='reviewer'&&s.products===0);
 return {mode:'read-only-plan',source_products:total,source_recommendations:recs,existing_stores:stores,
  criteria:{products_min:20,products_max:60,statuses_min:3,no_existing_source_product:true,no_invalid_or_ambiguous_input:true},
  eligible_sellers:candidates.length,
  proposed_shops:candidates.slice(0,count).map((s,i)=>({...s,proposed_existing_store_id:empty[i]?.store_id??null,proposed_owner:empty[i]?.owner_name??null,needs_new_account:!empty[i]})),
  alternative_sellers:candidates.slice(count,count+3),
  note:'Demo mapping only; no ownership of the external seller is asserted. Existing nonempty stores, products, analyses and human action history remain untouched. No database write has been performed.'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);let directory=resolve('../data/processed/ml-import-v1');
  if(args.length){if(args.length!==2||args[0]!=='--bundle')throw Error('Use --bundle PATH only');directory=resolve(args[1]);}
  const plan=await transaction(async db=>{await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');return planDemoStores(db,directory);});
  console.log(JSON.stringify(plan,null,2));
 }catch(e){const m=e instanceof Error?e.message:'';console.error(/^(Unsupported bundle|Bundle |Use --bundle)/.test(m)?m:'Planning failed; check local bundle, applied schema and DATABASE_URL. No write was performed.');process.exitCode=1;}
 finally{try{await pool().end();}catch{/* No pool initialized. */}}
}
