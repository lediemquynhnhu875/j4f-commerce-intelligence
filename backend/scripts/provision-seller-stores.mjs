/** Offline account provisioning only; never transfers products or imports ML rows. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {randomBytes,scrypt as callback} from 'node:crypto';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {sha,makePlan,accountName,storeName} from './lib/seller-plan.mjs';
const scrypt=promisify(callback),args=process.argv.slice(2),applying=args.includes('--apply');
const out=fileURLToPath(new URL('../../tmp/seller-provision/',import.meta.url));
const secrets=fileURLToPath(new URL('../.env.seller-accounts.json',import.meta.url));
let db,client,committed=false;
async function snapshot(c){
 const stores=(await c.query(`SELECT s.id::text,s.owner_user_id::text,s.name,s.is_active,u.role,u.is_active AS owner_active FROM stores s JOIN users u ON u.id=s.owner_user_id ORDER BY s.id`)).rows;
 const products=(await c.query(`SELECT id::text,store_id::text,source_product_id FROM products WHERE source_system='tiki' ORDER BY id`)).rows;
 const users=(await c.query('SELECT id::text,email,full_name,role,is_active FROM users ORDER BY id')).rows;
 return {stores,products,users};
}
try{
 if(!(args.length===0||(args.length===3&&args[0]==='--apply'&&args[1]==='--confirm'&&/^[a-f0-9]{64}$/.test(args[2]))))throw Error('Use no arguments for dry-run, or --apply --confirm HASH');
 const bundle=resolve('../data/processed/ml-import-v1');
 const manifest=JSON.parse(await readFile(resolve(bundle,'manifest.json'),'utf8'));
 const bytes=await readFile(resolve(bundle,'records.ndjson'));
 if(manifest.schema_version!=='sellens-ml-import-v1'||sha(bytes)!==manifest.records_sha256)throw Error('Bundle integrity mismatch');
 const records=[];let recommendations=0;
 for await(const line of createInterface({input:createReadStream(resolve(bundle,'records.ndjson')),crlfDelay:Infinity})){if(!line.trim())continue;const p=JSON.parse(line);records.push({source_id:p.source_id,seller_id:p.seller_id});recommendations+=p.recommendations.length;}
 if(records.length!==manifest.products||recommendations!==manifest.recommendations)throw Error('Bundle count mismatch');
 db=(await import('../src/server/db.ts')).pool();client=await db.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const initial=await snapshot(client),plan=makePlan(records,initial.stores,initial.products,initial.users);
 const fingerprint=sha(JSON.stringify({bundle:manifest.records_sha256,...initial,plan}));
 await client.query('ROLLBACK');
 await mkdir(out,{recursive:true});await writeFile(resolve(out,'plan.json'),JSON.stringify({fingerprint,...plan},null,2));
 const creates=plan.targets.filter(t=>t.operation==='create');
 if(applying){
  if(args[2]!==fingerprint)throw Error('Plan changed; run dry-run again');
  // Save credentials before DB writes. Reruns preserve all existing passwords.
  const credentials={};
  for(let i=0;i<creates.length;i++){
   const t=creates[i],password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
   const hash=`scrypt:${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;
   credentials[t.email]={seller:t.seller,password,password_hash:hash};
   if(i%100===0)console.error(`Preparing accounts ${i}/${creates.length}`);
  }
  // Exclusive creation avoids overwriting the only copy of earlier credentials.
  let saved={};try{saved=JSON.parse(await readFile(secrets,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const t of creates){if(saved[t.email]){if(saved[t.email].seller!==t.seller)throw Error('Credential identity conflict');credentials[t.email]=saved[t.email];}}
  if(Object.keys(saved).length===0)await writeFile(secrets,JSON.stringify(credentials,null,2),{flag:'wx',mode:0o600});
  else{for(const [email,value]of Object.entries(credentials))if(!saved[email])throw Error('Credential file belongs to an earlier partial plan; retain it and review locally');}
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(736551004)');
  await client.query('LOCK TABLE users, stores, products IN SHARE ROW EXCLUSIVE MODE');
  const fresh=await snapshot(client),freshPlan=makePlan(records,fresh.stores,fresh.products,fresh.users);
  if(sha(JSON.stringify({bundle:manifest.records_sha256,...fresh,plan:freshPlan}))!==fingerprint)throw Error('Database changed; run dry-run again');
  for(let start=0;start<creates.length;start+=100){
   const batch=creates.slice(start,start+100),values=[],slots=batch.map(t=>{const c=credentials[t.email];const offset=values.length;values.push(accountName(t.seller),t.email,c.password_hash);return `($${offset+1},$${offset+2},$${offset+3},'reviewer')`;});
   await client.query(`INSERT INTO users(full_name,email,password_hash,role) VALUES ${slots.join(',')}`,values);
   const names=batch.map(t=>({email:t.email,name:storeName(t.seller)}));
   await client.query(`UPDATE stores s SET name=x.name FROM users u, jsonb_to_recordset($1::jsonb) AS x(email text,name text) WHERE s.owner_user_id=u.id AND u.email=x.email`,[JSON.stringify(names)]);
   console.error(`Created ${Math.min(start+100,creates.length)}/${creates.length} accounts`);
  }
  const after=await snapshot(client);const completed=makePlan(records,after.stores,after.products,after.users);
  if(completed.targets.some(t=>!t.store_id))throw Error('Missing target stores after provisioning');
  await client.query('COMMIT');committed=true;
  await writeFile(resolve(out,'store-mapping-all.json'),JSON.stringify({run_key:'ml-v2-all-sellers-v1',seller_to_store:Object.fromEntries(completed.targets.map(t=>[t.seller,t.store_id]))},null,2));
  await writeFile(resolve(out,'pending-transfers.json'),JSON.stringify(completed.transfers,null,2));
 }
 console.log(JSON.stringify({mode:applying?'accounts-created':'dry-run',source_products:plan.products,source_sellers:plan.sellers,reuse:plan.targets.length-creates.length,create:creates.length,products_pending_transfer:plan.transfers.length,fingerprint,report:resolve(out,'plan.json'),...(applying?{mapping:resolve(out,'store-mapping-all.json'),credentials_file:secrets}:{}),next:'Resolve pending product transfers before running full ML import'},null,2));
}catch(e){
 if(client)await client.query('ROLLBACK').catch(()=>{});
 const safe=/^(Use no arguments|Bundle |Plan changed|Database changed|Invalid source|Duplicate database|Generated account|Ambiguous seller|Inactive seller|Credential |Missing target)/.test(e?.message??'');
 console.error(safe?e.message:`Provisioning failed (${e?.name??'Error'}); inspect local connectivity/schema. No credentials printed.`);
 if(committed)console.error('Accounts were committed; rerun dry-run/apply to regenerate output mappings.');process.exitCode=1;
}finally{client?.release();if(db)await db.end();}
