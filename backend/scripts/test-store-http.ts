import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { pool } from "../src/server/db";
import { requiredEnv } from "../src/server/config";

const base=process.env.STORE_TEST_URL ?? "http://127.0.0.1:3311/api/v1";
const results:Array<{endpoint:string;status:number;result:string}>=[];
const tokens:string[]=[];
let temporaryProduct:string|undefined;
async function call(path:string,token?:string,method="GET",body?:unknown,status=200) {
 const response=await fetch(`${base}/${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{"Content-Type":"application/json"}: {})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const json=await response.json();
 assert.equal(response.status,status,`${method} ${path}: unexpected response (${json.error?.code ?? ""})`);
 results.push({endpoint:`${method} ${path}`,status:response.status,result:"PASS"});
 return json;
}
async function login(prefix:string) {
 const result=await call("auth/login",undefined,"POST",{email:requiredEnv(`${prefix}_EMAIL`),password:requiredEnv(`${prefix}_PASSWORD`)});
 const token=result.data.access_token; tokens.push(token);return token as string;
}
async function all(path:string,token:string) {
 const rows=[];let total=0;
 for(let page=1;page<100;page++) {const r=await call(`${path}${path.includes("?")?"&":"?"}limit=100&page=${page}`,token);total=r.pagination.total;rows.push(...r.data);if(rows.length>=total)break;}
 assert.equal(rows.length,total);return rows;
}
try {
 await call("health"); await call("ready");await call("stores",undefined,"GET",undefined,401);
 const u1=await login("SEED_USER1"),u2=await login("SEED_USER2"),admin=await login("SEED_ADMIN");
 const s1=(await call("stores/me",u1)).data,s2=(await call("stores/me",u2)).data;
 assert.equal(s1.name,"J4F store");assert.notEqual(s1.id,s2.id);
 assert.equal((await all("stores",u1)).length,1);assert.equal((await all("stores",u2)).length,1);
 const p1=await all("products",u1),a1=await all("analyses",u1),w1=await all("actions",u1);
 const dbCounts=(await pool().query("SELECT (SELECT count(*)::int FROM products) products,(SELECT count(*)::int FROM product_analyses) analyses,(SELECT count(*)::int FROM improvement_actions) actions")).rows[0];
 assert.equal(p1.length,dbCounts.products);assert.equal(a1.length,dbCounts.analyses);assert.equal(w1.length,dbCounts.actions);
 assert(p1.length>0&&a1.length>0&&w1.length>0);assert(p1.every(p=>p.store_id===s1.id));
 for(const path of ["products","analyses","analysis-results","actions","categories"]) assert.equal((await all(path,u2)).length,0,`user2 ${path} must be empty`);
 const pid=p1[0].id,aid=a1[0].id,wid=w1[0].id;
 await call(`products/${pid}`,u1);await call(`analyses/${aid}`,u1);await call(`actions/${wid}/history`,u1);
 for(const path of [`products/${pid}`,`products/${pid}/analyses`,`analyses/${aid}`,`analysis-results/${aid}`,`analyses/${aid}/actions`,`analysis-results/${aid}/actions`,`actions/${wid}`,`actions/${wid}/history`,`categories/${p1.find(p=>p.category_id)?.category_id}`]) await call(path,u2,"GET",undefined,404);
 assert.equal((await all(`analyses?product_id=${pid}`,u2)).length,0);
 assert.equal((await all(`actions?analysis_id=${aid}`,u2)).length,0);
 await call(`products/${pid}`,u2,"PATCH",{name:"Forbidden change"},404);
 await call(`products/${pid}`,u2,"DELETE",undefined,404);
 await call(`actions/${wid}`,u2,"PATCH",{title:"Forbidden change",expected_updated_at:w1[0].updated_at},404);
 await call("actions",u2,"POST",{analysis_id:aid,type:"other",title:"Forbidden",original_suggestion_json:{}},404);
 await call("actions",u1,"POST",{analysis_id:aid,type:"other",title:"Invalid assignee",original_suggestion_json:{},assigned_to:s2.owner_user_id},422);
 const spoofPreview=(await call("products/import/preview",u2,"POST",{items:[{name:"Ownership preview",store_id:s1.id}]})).data;
 assert(spoofPreview.ignored_columns.includes("store_id"));
 await call("products",admin,"POST",{name:"Admin must not own products"},403);
 for(const path of ["products","analyses","analysis-results","actions","categories"]) await call(path,admin,"GET",undefined,403);
 await call("admin/summary",admin);
 const search=encodeURIComponent(p1[0].name.slice(0,10));
 const matched=await all(`products?search=${search}`,u1);assert(matched.length>0);assert.equal((await all(`products?search=${search}`,u2)).length,0);
 // Successful import resolves store on the server; clean up only this newly created test row.
 const inserted=(await call("products/import",u2,"POST",{items:[{name:`Store isolation HTTP check ${Date.now()}`,price:1000}]},201)).data;
 temporaryProduct=inserted.items[0].id;assert.equal(inserted.items[0].store_id,s2.id);
 await call(`products/${temporaryProduct}`,u1,"GET",undefined,404);
 await call(`products/${temporaryProduct}`,u2);
 await call(`products/${temporaryProduct}`,u2,"PATCH",{price:2000});
 await call(`products/${temporaryProduct}`,u2,"DELETE");temporaryProduct=undefined;
 assert.equal((await all("products",u2)).length,0);
 assert((await all("stores",admin)).length>=2);await call("admin/accounts",u2,"GET",undefined,403);
 // Test automatic creation and uniqueness entirely inside a rolled-back transaction.
 const client=await pool().connect();try {await client.query("BEGIN");const u=await client.query("INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id",["Rollback store check",`store-check-${Date.now()}@example.test`,"unused-test-hash","reviewer"]);const sid=(await client.query("SELECT id FROM stores WHERE owner_user_id=$1",[u.rows[0].id])).rows;assert.equal(sid.length,1);await client.query("UPDATE users SET full_name=$1 WHERE id=$2",["Renamed",u.rows[0].id]);assert.equal((await client.query("SELECT count(*)::int n FROM stores WHERE owner_user_id=$1",[u.rows[0].id])).rows[0].n,1);await client.query("ROLLBACK");}finally{await client.query("ROLLBACK").catch(()=>{});client.release();}
 console.log(JSON.stringify({result:"PASS",user1:{store:s1.name,products:p1.length,analyses:a1.length,actions:w1.length},user2:{products:0,analyses:0,actions:0},requests:results.length}));
 await writeFile(new URL("../../tmp/store-http-results.json",import.meta.url),JSON.stringify(results,null,2));
} catch(e) {console.error(e instanceof Error?e.message:"Store HTTP check failed");process.exitCode=1;}
finally {
 if(temporaryProduct&&tokens[1]) await call(`products/${temporaryProduct}`,tokens[1],"DELETE").catch(()=>{});
 for(const token of tokens) await call("auth/logout",token,"POST").catch(()=>{});
 await pool().end();
}
