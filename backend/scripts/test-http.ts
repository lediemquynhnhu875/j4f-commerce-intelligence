import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { pool } from "../src/server/db";
import { requiredEnv } from "../src/server/config";

const base=process.env.BACKEND_TEST_URL ?? "http://127.0.0.1:3001";
if (!["127.0.0.1","localhost"].includes(new URL(base).hostname) && process.env.ALLOW_REMOTE_HTTP_TESTS !== "true")
  throw new Error("HTTP tests require a loopback backend URL unless explicitly enabled");
type Result = {test:string;method:string;path:string;status:number;pass:boolean;example:unknown};
const results:Result[]=[];
const sessionTokens:string[]=[];
function sanitizedExample(path:string,response:any) {
  if (path.includes("login") && response.data) return {data:{token_type:response.data.token_type,expires_in:response.data.expires_in,account:{id:response.data.account.id,role:response.data.account.role}}};
  if (response.error) return {error:{code:response.error.code,message:response.error.message,...(response.error.details?{details:response.error.details}:{})}};
  if (response.status) return response;
  const row=Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row) return {data:response.data,pagination:response.pagination};
  const fields=Object.fromEntries(["id","name","full_name","role","status","product_id","analysis_id","category_id","analyzed_by","reference_sold","is_eligible","product","analyst","event_type","logged_out"].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
  return {data:Array.isArray(response.data)?[fields]:fields,...(response.pagination?{pagination:response.pagination}:{})};
}
async function request(test:string,path:string,status:number,token?:string,method="GET",data?:unknown,extraHeaders?:Record<string,string>) {
  const response=await fetch(`${base}/api/v1${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(data!==undefined?{"Content-Type":"application/json"}:{}),...extraHeaders},body:data===undefined?undefined:JSON.stringify(data)});
  const json=response.status === 204 ? {} : await response.json();
  const pass=response.status === status;
  results.push({test,method,path,status:response.status,pass,example:sanitizedExample(path,json)});
  assert.equal(response.status,status,`${test}: expected ${status}, received ${response.status}`);
  assert.equal(JSON.stringify(json).includes("password_hash"),false,`${test}: no hashes in DTOs`);
  return json;
}
async function allPages(resource:string,token:string) {
 const rows:any[]=[];
 for(let page=1;page<=1000;page++) {
   const response=await request(`${resource} page ${page}`,`${resource}?page=${page}&limit=4`,200,token);
   rows.push(...response.data);
   if(rows.length>=response.pagination.total) return rows;
 }
 throw new Error("Pagination exceeded test bound");
}
let tempProduct:string|undefined, tempCategory:string|undefined, adminToken:string|undefined;
try {
  await request("Liveness","/health",200);
  await request("PostgreSQL readiness","/ready",200);
  await request("Protected catalog without login","/products",401);
  await request("Protected accounts without login","/admin/accounts",401);
  await request("Invalid login input","/auth/login",422,undefined,"POST",{email:"not-an-email",password:"x"});
  const tokens:string[]=[];
  let seededAdminId="";
  for (const [index,label] of ["USER1","USER2","ADMIN"].entries()) {
    const response=await request(`Seed ${label} login`,"/auth/login",200,undefined,"POST",{email:requiredEnv(`SEED_${label}_EMAIL`),password:requiredEnv(`SEED_${label}_PASSWORD`)});
    assert.equal(response.data.account.role,index===2 ? "admin" : "user");
    tokens.push(response.data.access_token);
    sessionTokens.push(response.data.access_token);
    if(index===2) seededAdminId=response.data.account.id;
  }
  const [userToken,secondToken,admin]=tokens;adminToken=admin;
  await request("Invalid credentials","/auth/login",401,undefined,"POST",{email:requiredEnv("SEED_USER1_EMAIL"),password:"incorrect-test-password"});
  await request("Current account","/auth/me",200,userToken);
  await request("Admin list denied to user","/admin/accounts",403,userToken);
  await request("Product mutation denied to user","/products",403,userToken,"POST",{name:"Denied fixture"});
  await request("Admin list accounts","/admin/accounts",200,admin);
  const registry=await pool().query("SELECT seed_key,entity,record_id FROM sellens_seed_records WHERE seed_key LIKE 'sellens-mvp-v1:%' ORDER BY seed_key");
  const productIds=registry.rows.filter(r=>r.entity === "products").map(r=>r.record_id);
  const analysisIds=registry.rows.filter(r=>r.entity === "product_analyses").map(r=>r.record_id);
  assert.equal(productIds.length,10);assert.equal(analysisIds.length,3);
  const products=await allPages("/products",userToken);
  assert.equal(new Set(products.filter(p=>productIds.includes(p.id)).map(p=>p.id)).size,10);
  const dbProducts=await pool().query("SELECT * FROM products WHERE id=ANY($1::bigint[]) ORDER BY id",[productIds]);
  for(const product of dbProducts.rows) {
    const response=await request(`Seed product ${product.id} matches PostgreSQL`,`/products/${product.id}`,200,userToken);
    assert.deepEqual(response.data,JSON.parse(JSON.stringify(product)));
  }
  const saved=await allPages("/analysis-results",userToken);
  assert.equal(new Set(saved.filter(a=>analysisIds.includes(a.id)).map(a=>a.id)).size,3);
  for(const analysisId of analysisIds) {
    const db=await pool().query("SELECT * FROM product_analyses WHERE id=$1",[analysisId]);
    const response=await request(`Seed analysis ${analysisId} matches PostgreSQL`,`/analyses/${analysisId}`,200,userToken);
    const {product,analyst,...fields}=response.data;
    assert.deepEqual(fields,JSON.parse(JSON.stringify(db.rows[0])));
    assert.equal(product.id,db.rows[0].product_id);assert.equal(analyst.id,db.rows[0].analyzed_by);
    assert.equal(fields.input_snapshot_json.id,fields.product_id);
    await request(`Analysis ${analysisId} actions`,`/analyses/${analysisId}/actions`,200,userToken);
  }
  await request("Shared catalog accessible to second user",`/products/${productIds[0]}`,200,secondToken);
  await request("Product analysis relationship",`/products/${productIds[0]}/analyses`,200,userToken);
  await request("List categories","/categories",200,userToken);
  await request("List actions","/actions",200,userToken);
  const actionId=registry.rows.find(r=>r.entity === "improvement_actions")!.record_id;
  const action=await request("Action detail",`/actions/${actionId}`,200,userToken);
  await request("Append-only action history",`/actions/${actionId}/history`,200,userToken);
  await request("Stale action update rejected",`/actions/${actionId}`,409,userToken,"PATCH",{expected_updated_at:"2000-01-01T00:00:00.000Z",title:"Should not change"});
  await request("Rejection needs a reason",`/actions/${actionId}`,422,userToken,"PATCH",{expected_updated_at:action.data.updated_at,status:"rejected"});
  await request("Immutable analyses reject edits",`/analyses/${analysisIds[0]}`,405,admin,"PATCH",{status:"undecided"});
  await request("Immutable history rejects mutation",`/actions/${actionId}/history`,405,userToken,"POST",{});
  await request("Nonexistent product","/products/9223372036854775807",404,userToken);
  await request("Nonexistent analysis","/analyses/9223372036854775807",404,userToken);
  await request("Invalid product","/products",422,admin,"POST",{name:"",price:-1});
  await request("Invalid page size","/products?limit=101",422,userToken);
  await request("SQL-like ID rejected","/products/1%20OR%201=1",422,userToken);
  await request("No arbitrary SQL route","/sql",404,admin,"POST",{query:"SELECT 1"});
  await request("Unapproved browser origin","/health",403,undefined,"GET",undefined,{Origin:"https://forbidden.invalid"});
  const origin=(process.env.CORS_ORIGINS??"").split(",")[0];
  if(origin) await request("Configured CORS preflight","/products",204,undefined,"OPTIONS",undefined,{Origin:origin,"Access-Control-Request-Method":"GET"});
  const suffix=Date.now().toString();
  const category=await request("Create disposable category","/categories",201,admin,"POST",{code:`http_test_${suffix}`,name:"HTTP Test Category"});tempCategory=category.data.id;
  const product=await request("Create disposable product","/products",201,admin,"POST",{name:"Disposable HTTP Test Product",price:199000,category_id:tempCategory});tempProduct=product.data.id;
  const patched=await request("Update disposable product",`/products/${tempProduct}`,200,admin,"PATCH",{price:209000});assert.equal(patched.data.price,"209000.00");
  const dbChanged=await pool().query("SELECT price FROM products WHERE id=$1",[tempProduct]);assert.equal(dbChanged.rows[0].price,"209000.00");
  await request("Referenced category deletion blocked",`/categories/${tempCategory}`,409,admin,"DELETE");
  await request("Delete disposable product",`/products/${tempProduct}`,200,admin,"DELETE");tempProduct=undefined;
  await request("Delete disposable category",`/categories/${tempCategory}`,200,admin,"DELETE");tempCategory=undefined;
  const activeAdmins=await pool().query("SELECT count(*)::int AS n FROM users WHERE role='admin' AND is_active=true");
  if(activeAdmins.rows[0].n === 1) await request("Last active administrator protected",`/accounts/${seededAdminId}`,409,admin,"PATCH",{is_active:false});
  for(const token of tokens) await request("Logout revokes session","/auth/logout",200,token,"POST");
  await request("Revoked session rejected","/products",401,userToken);
  console.log(JSON.stringify({pass:true,http_checks:results.length,seeded_products_verified:10,seeded_analyses_verified:3,postgresql_response_comparison:true},null,2));
} catch { console.error("HTTP verification failed; inspect the sanitized results file and local backend.");process.exitCode=1; }
finally {
  if(adminToken && (tempProduct || tempCategory)) {
    for (const [entity,recordId] of [["products",tempProduct],["categories",tempCategory]]) if(recordId) {
      await fetch(`${base}/api/v1/${entity}/${recordId}`,{method:"DELETE",headers:{Authorization:`Bearer ${adminToken}`}}).catch(()=>{});
    }
  }
  for(const token of sessionTokens) {
    await fetch(`${base}/api/v1/auth/logout`,{method:"POST",headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
  }
  await writeFile(new URL("../../tmp/backend-http-results.json",import.meta.url),JSON.stringify({pass:process.exitCode!==1,results},null,2));
  await pool().end().catch(()=>{});
}
