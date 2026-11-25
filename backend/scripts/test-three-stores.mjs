/** Runs the existing business-read-only ownership suite for all three account pairs. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

export function runMatrix(users,runPair){
 assert.equal(users.length,3,'Exactly three demo Users are required');
 assert.equal(new Set(users.map(u=>u.email.trim().toLowerCase())).size,3,'Configure three distinct User emails');
 const stores=new Map(),slots=new Map(),directions=[],pairs=[];
 let requests=0,assignees=0;
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
  const report=runPair(users[i],users[j],i,j);
  assert.equal(report.result,'PASS','A two-store test failed');
  assert.equal(report.mode,'business-read-only','Install the revised business-read-only test-store-http.ts');
  assert.equal(report.both_stores_populated,true,'Both stores must contain demo products');
  const pairStores=[report.user1,report.user2].map(s=>({store_id:String(s.store_id),products:s.products,analyses:s.analyses,actions:s.actions}));
  assert.notEqual(pairStores[0].store_id,pairStores[1].store_id,'Two accounts resolved to the same store');
  for(const [slot,store] of [[i,pairStores[0]],[j,pairStores[1]]]){if(slots.has(slot))assert.equal(slots.get(slot),store.store_id,'Account resolved to a different store between pairs');slots.set(slot,store.store_id);}
  assert(Number.isSafeInteger(report.requests)&&report.requests>0,'Invalid request count');
  for(const s of pairStores){
   assert(/^[1-9]\d*$/.test(s.store_id),'Invalid store ID in test report');
   assert([s.products,s.analyses,s.actions].every(n=>Number.isSafeInteger(n)&&n>0),'Each demo store needs products, analyses and work');
   if(stores.has(s.store_id))assert.deepEqual(s,stores.get(s.store_id),'Store counts changed between pairs; retry without concurrent edits');
   stores.set(s.store_id,s);
  }
  assert.equal(report.cross_store_directions?.length,2,'Missing two-way ownership coverage');
  for(const [owner,reader] of [[pairStores[0],pairStores[1]],[pairStores[1],pairStores[0]]]){
   const d=report.cross_store_directions.find(x=>String(x.owner_store)===owner.store_id&&String(x.reader_store)===reader.store_id);
   assert(d&&d.products===true&&d.analyses===true&&d.actions===true,'Incomplete product/analysis/action isolation');
   directions.push({owner_store:owner.store_id,reader_store:reader.store_id,products:true,analyses:true,actions:true});
  }
  assert.equal(report.sql_assignee_rejections,2,'Missing SQL assignee checks');
  requests+=report.requests;assignees+=report.sql_assignee_rejections;
  pairs.push({users:[i+1,j+1],result:'PASS',requests:report.requests});
 }
 assert.equal(stores.size,3,'Expected three different stores');
 assert.equal(new Set(directions.map(d=>d.owner_store+'>'+d.reader_store)).size,6,'Expected six unique cross-store directions');
 return {result:'PASS',mode:'business-read-only',stores:[...stores.values()],pairs,cross_store_directions:directions,sql_assignee_rejections:assignees,requests};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let report={result:'FAIL',mode:'business-read-only'};
 try{
  assert.equal(process.argv.length,2,'No options are accepted; fixture writes are disabled in this runner');
  const {requiredEnv}=await import('../src/server/config.ts');
  const users=[1,2,3].map(i=>({email:requiredEnv(`SEED_USER${i}_EMAIL`),password:requiredEnv(`SEED_USER${i}_PASSWORD`)}));
  requiredEnv('SEED_ADMIN_EMAIL');requiredEnv('SEED_ADMIN_PASSWORD');
  report=runMatrix(users,(left,right,i,j)=>{
   console.error(`Checking demo User ${i+1} against User ${j+1}...`);
   const child=spawnSync(process.execPath,['--import','tsx',fileURLToPath(new URL('./test-store-http.ts',import.meta.url))],{
    cwd:resolve(dirname(fileURLToPath(import.meta.url)),'..'),encoding:'utf8',shell:false,timeout:180000,maxBuffer:8*1024*1024,
    env:{...process.env,SEED_USER1_EMAIL:left.email,SEED_USER1_PASSWORD:left.password,SEED_USER2_EMAIL:right.email,SEED_USER2_PASSWORD:right.password},
   });
   assert.equal(child.status,0,`Pair ${i+1}/${j+1} failed; inspect tmp/store-http-results.json and local backend logs`);
   try{return JSON.parse(child.stdout.trim());}catch{throw Error('Could not read child test result; install the current two-store test patch');}
  });
  console.log(JSON.stringify(report,null,2));
 }catch(error){
  const message=error instanceof Error?error.message:'';
  console.error(message.startsWith('Missing environment variable:')?message:'Three-store test failed. Check local account configuration and tmp/store-http-results.json.');
  process.exitCode=1;
 }finally{
  try{await mkdir(new URL('../../tmp/',import.meta.url),{recursive:true});await writeFile(new URL('../../tmp/three-store-http-results.json',import.meta.url),JSON.stringify(report,null,2));}
  catch{console.error('Could not save the three-store report locally.');process.exitCode=1;}
 }
}
