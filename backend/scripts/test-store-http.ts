/** Ownership regression for any two demo stores, including two populated stores.
 * Default: read business data + rejected write probes only (auth sessions are temporary).
 * --with-fixtures additionally tests CRUD on uniquely named temporary products.
 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pool} from '../src/server/db';
import {requiredEnv} from '../src/server/config';
import {assertAssignee} from '../src/server/services/stores';
import type {Account} from '../src/server/auth';

const base=(process.env.STORE_TEST_URL??process.env.BACKEND_TEST_URL??'http://127.0.0.1:3001/api/v1').replace(/\/$/,'');
const fixtures=process.argv.includes('--with-fixtures');
const results:Array<{endpoint:string;status:number;result:string}>=[],tokens:string[]=[];
const temporary:Array<{id:string;token:string}>=[];
const directions:Array<{owner_store:string;reader_store:string;products:boolean;analyses:boolean;actions:boolean}>=[];
let succeeded=false,assigneeChecks=0;
async function call(path:string,token?:string,method='GET',body?:unknown,status=200){
 console.error(`[REQUEST] ${method} ${path}`);
 const response=await fetch(`${base}/${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const payload=await response.json();
 assert.equal(response.status,status,`${method} ${path}: expected ${status}, received ${response.status} (${payload.error?.code??''})`);
 results.push({endpoint:`${method} ${path}`,status:response.status,result:'PASS'});return payload;
}
async function login(prefix:string){const r=await call('auth/login',undefined,'POST',{email:requiredEnv(`${prefix}_EMAIL`),password:requiredEnv(`${prefix}_PASSWORD`)});tokens.push(r.data.access_token);return r.data.access_token as string;}
async function all(path:string,token:string){
 const rows:Array<Record<string,any>>=[];
 for(let page=1;page<=1000000;page++){
  const r=await call(`${path}${path.includes('?')?'&':'?'}limit=100&page=${page}`,token);
  rows.push(...r.data);if(rows.length>=r.pagination.total||!r.data.length){assert.equal(rows.length,r.pagination.total);assert.equal(new Set(rows.map(x=>x.id)).size,rows.length,'Duplicate list IDs');return rows;}
 }
 throw Error('List pagination did not terminate');
}
async function inventory(token:string){
 const store=(await call('stores/me',token)).data;
 const [products,analyses,actions,categories]=await Promise.all([all('products',token),all('analyses',token),all('actions',token),all('categories',token)]);
 const db=(await pool().query(`SELECT
 (SELECT count(*)::int FROM products WHERE store_id=$1) AS products,
 (SELECT count(*)::int FROM product_analyses a JOIN products p ON p.id=a.product_id WHERE p.store_id=$1) AS analyses,
 (SELECT count(*)::int FROM improvement_actions w JOIN product_analyses a ON a.id=w.analysis_id JOIN products p ON p.id=a.product_id WHERE p.store_id=$1) AS actions,
 (SELECT count(DISTINCT category_id)::int FROM products WHERE store_id=$1) AS categories`,[store.id])).rows[0];
 for(const [kind,rows] of Object.entries({products,analyses,actions,categories}))assert.equal(rows.length,db[kind],`${kind} count must match owned store`);
 assert(products.every(p=>String(p.store_id)===String(store.id)),'Cross-store product in list');
 const pids=new Set(products.map(p=>p.id)),aids=new Set(analyses.map(a=>a.id));
 assert(analyses.every(a=>pids.has(a.product_id)),'Cross-store analysis in list');
 assert(actions.every(a=>aids.has(a.analysis_id)),'Cross-store action in list');
 assert.deepEqual((await all('analysis-results',token)).map(a=>a.id),analyses.map(a=>a.id));
 const ownStores=await all('stores',token);assert.equal(ownStores.length,1);assert.equal(ownStores[0].id,store.id);
 const catalog=await call('products/catalog?limit=1',token);assert.equal(catalog.pagination.total,products.length);assert(catalog.data.length<=1);assert.equal(catalog.store.id,store.id);
 const summary=await call('stores/me/summary',token);assert.equal(summary.summary.total,products.length);assert.equal(summary.store.id,store.id);
 const work=await call('actions/workspace?limit=1',token);assert.equal(work.summary.total,actions.length);assert.equal(work.pagination.total,actions.length);assert(work.data.actions.length<=1);
 return {token,store,products,analyses,actions,categories};
}
type Inventory=Awaited<ReturnType<typeof inventory>>;
async function denyForeign(owner:Inventory,intruder:Inventory){
 const p=owner.products[0],a=owner.analyses[0],w=owner.actions[0];
 const coverage={owner_store:String(owner.store.id),reader_store:String(intruder.store.id),products:Boolean(p),analyses:Boolean(a),actions:Boolean(w)};
 await call(`products/catalog?store=${owner.store.id}`,intruder.token,'GET',undefined,404);
 if(p){
  await call(`products/${p.id}`,owner.token);
  for(const path of [`products/${p.id}`,`products/${p.id}/analyses`,`analyses/workspace?product_id=${p.id}`])await call(path,intruder.token,'GET',undefined,404);
  assert.equal((await all(`analyses?product_id=${p.id}`,intruder.token)).length,0);
  // Empty PATCH cannot alter human data if a permission regression occurs; 422 would fail the test.
  await call(`products/${p.id}`,intruder.token,'PATCH',{},404);
 }
 if(a){
  await call(`analyses/${a.id}`,owner.token);
  for(const path of [`analyses/${a.id}`,`analysis-results/${a.id}`,`analyses/${a.id}/actions`,`analysis-results/${a.id}/actions`,`analyses/workspace?analysis_id=${a.id}`,`actions/workspace?analysis_id=${a.id}`])await call(path,intruder.token,'GET',undefined,404);
  assert.equal((await all(`actions?analysis_id=${a.id}`,intruder.token)).length,0);
 }
 if(w){
  await call(`actions/${w.id}/history`,owner.token);
  for(const path of [`actions/${w.id}`,`actions/${w.id}/history`])await call(path,intruder.token,'GET',undefined,404);
  // Valid edit shape with a deliberately stale token: cannot write even if ownership checks regress.
  const stale=new Date(w.updated_at).getTime()===0?'2000-01-01T00:00:00.000Z':'1970-01-01T00:00:00.000Z';
  await call(`actions/${w.id}`,intruder.token,'PATCH',{title:w.title,expected_updated_at:stale},404);
 }
 // Categories are shared reference metadata: access is legitimate if the intruder uses that category too.
 for(const c of owner.categories.slice(0,1))await call(`categories/${c.id}`,intruder.token,'GET',undefined,intruder.categories.some(x=>x.id===c.id)?200:404);
 directions.push(coverage);
}
async function businessFingerprint(){
 // Include all stores, so unrelated records are also protected. Never print row contents.
 const result:Record<string,string>={};
 for(const table of ['users','stores','categories','products','product_analyses','improvement_actions','action_history']){
  result[table]=(await pool().query(`SELECT md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),'')) AS hash FROM ${table} t`)).rows[0].hash;
 }
 return result;
}
async function productFixture(owner:Inventory,intruder:Inventory){
 const name=`Store HTTP fixture ${randomUUID()}`;
 const r=(await call('products/import',owner.token,'POST',{items:[{name,price:1000}]},201)).data;
 assert.equal(r.items.length,1);const p=r.items[0];temporary.push({id:p.id,token:owner.token});assert.equal(p.store_id,owner.store.id);
 await call(`products/${p.id}`,owner.token);await call(`products/${p.id}`,intruder.token,'GET',undefined,404);
 await call(`products/${p.id}`,intruder.token,'PATCH',{price:2000},404);
 await call(`products/${p.id}`,intruder.token,'DELETE',undefined,404);
 await call(`products/${p.id}`,owner.token,'PATCH',{price:2000});await call(`products/${p.id}`,owner.token,'DELETE');
 temporary.splice(temporary.findIndex(x=>x.id===p.id),1);
}
try{
 assert(process.argv.slice(2).every(x=>x==='--with-fixtures'),'Unknown test option');
 const before=await businessFingerprint();
 await call('health');await call('ready');await call('stores',undefined,'GET',undefined,401);
 const u1=await login('SEED_USER1'),u2=await login('SEED_USER2'),admin=await login('SEED_ADMIN');
 const left=await inventory(u1),right=await inventory(u2);assert.notEqual(left.store.id,right.store.id);
 await denyForeign(left,right);await denyForeign(right,left);
 for(const owner of [left,right]){
  const preview=(await call('products/import/preview',owner.token,'POST',{items:[{name:'Ownership preview',store_id:owner===left?right.store.id:left.store.id}]})).data;
  assert(preview.ignored_columns.includes('store_id'));
  await call('admin/accounts',owner.token,'GET',undefined,403);
 }
 for(const path of ['products','analyses','analysis-results','actions','categories','products/catalog','products/options','analyses/options','analyses/workspace','actions/workspace','stores/me/summary'])await call(path,admin,'GET',undefined,403);
 await call('products',admin,'POST',{name:'Admin must not own products'},403);await call('admin/summary',admin);
 assert((await all('stores',admin)).length>=2);
 for(const owner of [left,right])if(owner.products.length){
  const search=owner.products[0].name.slice(0,10),pattern=`%${search}%`;
  const actual=await all(`products?search=${encodeURIComponent(search)}`,owner.token);
  const expected=(await pool().query('SELECT count(*)::int AS n FROM products WHERE store_id=$1 AND (name ILIKE $2 OR brand ILIKE $2)',[owner.store.id,pattern])).rows[0].n;
  assert.equal(actual.length,expected);assert(actual.every(p=>p.store_id===owner.store.id));
 }
 for(const [owner,other] of [[left,right],[right,left]])if(owner.analyses.length){
  const actor=(await pool().query('SELECT id,full_name,email,role,is_active FROM users WHERE id=$1',[owner.store.owner_user_id])).rows[0] as Account;
  await assert.rejects(assertAssignee(actor,owner.analyses[0].id,other.store.owner_user_id,pool()),(e:any)=>e.status===422);assigneeChecks++;
 }
 if(fixtures){
  await productFixture(left,right);await productFixture(right,left);
  const db=await pool().connect();
  try{
   await db.query('BEGIN');
   const u=(await db.query("INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,'reviewer') RETURNING id",['Rollback store check',`store-check-${randomUUID()}@example.test`,'unused-test-hash'])).rows[0];
   assert.equal((await db.query('SELECT count(*)::int AS n FROM stores WHERE owner_user_id=$1',[u.id])).rows[0].n,1);
   await db.query('UPDATE users SET full_name=$1 WHERE id=$2',['Renamed fixture',u.id]);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM stores WHERE owner_user_id=$1',[u.id])).rows[0].n,1);
   await db.query('ROLLBACK');
  }finally{await db.query('ROLLBACK').catch(()=>{});db.release();}
 }
 assert.deepEqual(await businessFingerprint(),before,'Business records changed during test; run without concurrent edits/imports');
 succeeded=true;
 console.log(JSON.stringify({result:'PASS',mode:fixtures?'temporary-product-crud':'business-read-only',both_stores_populated:left.products.length>0&&right.products.length>0,
  user1:{store_id:left.store.id,products:left.products.length,analyses:left.analyses.length,actions:left.actions.length},
  user2:{store_id:right.store.id,products:right.products.length,analyses:right.analyses.length,actions:right.actions.length},cross_store_directions:directions,sql_assignee_rejections:assigneeChecks,requests:results.length},null,2));
}catch(e){
 if(e instanceof assert.AssertionError){
  console.error(e.message);
 }else{
  const error=e as {name?:string;cause?:{code?:string}};
  console.error('Test error:',error?.name??'Unknown');
  console.error('Cause code:',error?.cause?.code??'Unavailable');
 }
 process.exitCode=1;
}
finally{
 for(const p of temporary)await call(`products/${p.id}`,p.token,'DELETE').catch(()=>{});
 for(const token of tokens)await call('auth/logout',token,'POST').catch(()=>{});
 try{await mkdir(new URL('../../tmp/',import.meta.url),{recursive:true});await writeFile(new URL('../../tmp/store-http-results.json',import.meta.url),JSON.stringify({result:succeeded?'PASS':'FAIL',mode:fixtures?'temporary-product-crud':'business-read-only',directions,requests:results},null,2));}catch{console.error('Could not write local test report.');process.exitCode=1;}
 try{await pool().end();}catch{/* Initialization may have failed. */}
}
