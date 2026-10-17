import assert from "node:assert/strict";
import { readFile,writeFile,mkdir } from "node:fs/promises";
import { pool } from "../src/server/db";
import { requiredEnv } from "../src/server/config";
import { frozenInput,ruleTypes,sampleGroups,sampleRunKey,selectSample } from "../src/server/ml-sample";

const base=process.env.BACKEND_TEST_URL??"http://127.0.0.1:3001";
if(!["127.0.0.1","localhost"].includes(new URL(base).hostname)) throw new Error("Use a loopback HTTP test URL");
const checks:{path:string;method:string;status:number;pass:boolean}[]=[];
let token:string|undefined;
async function request(path:string,expected=200,method="GET",body?:unknown,authenticated=true) {
 const response=await fetch(`${base}/api/v1${path}`,{method,headers:{...(token&&authenticated?{Authorization:`Bearer ${token}`} : {}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
 checks.push({path,method,status:response.status,pass:response.status===expected});
 assert.equal(response.status,expected,`Unexpected HTTP status for ${path}`);
 const value=await response.json();assert.equal(JSON.stringify(value).includes("password_hash"),false);return value;
}
async function allPages(path:string) {
 const rows:Record<string,any>[]=[];
 for(let page=1;page<=100;page++) {
  const result=await request(`${path}?page=${page}&limit=20`);rows.push(...result.data);
  if(rows.length>=result.pagination.total)return rows;
 }
 throw new Error("Pagination did not terminate");
}
const sameNumber=(actual:unknown,expected:number|null)=>assert.ok(expected===null?actual===null:actual!==null&&Math.abs(Number(actual)-expected)<=0.000051,"Stored numeric value differs from ML source");
try {
 const source=JSON.parse(await readFile(new URL("../../data/processed/products_full.json",import.meta.url),"utf8"));
 const selected=selectSample(source.products);
 await request("/health");await request("/ready");await request("/products",401,"GET",undefined,false);
 const login=await request("/auth/login",200,"POST",{email:requiredEnv("SEED_USER1_EMAIL"),password:requiredEnv("SEED_USER1_PASSWORD")});token=login.data.access_token;
 await request("/admin/accounts",403);
 const products=await allPages("/products"),analyses=await allPages("/analyses"),actions=await allPages("/actions");
 const run=(await pool().query("SELECT id FROM analysis_runs WHERE run_key=$1",[sampleRunKey])).rows[0];assert.ok(run,"Import run missing");
 const imported=analyses.filter(a=>a.run_id===run.id);assert.equal(imported.length,100);
 const dbProducts=(await pool().query("SELECT p.* FROM products p JOIN product_analyses a ON a.product_id=p.id WHERE a.run_id=$1",[run.id])).rows;
 let checkedActions=0;
 for(const p of selected) {
  const product=products.find(row=>row.source_product_id===p.product_id && dbProducts.some(db=>db.id===row.id));assert.ok(product);
  const db=dbProducts.find(row=>row.id===product.id);
  assert.equal(product.name,db.name);assert.equal(product.name,p.product_name);
  sameNumber(product.price,p.price);sameNumber(product.quantity_sold,p.observed_sales);
  assert.equal(product.thumbnail_url,p.image_url);assert.equal(product.brand,null);assert.equal(product.product_url,null);
  const a=imported.find(row=>row.product_id===product.id);assert.ok(a);
  assert.equal(a.status,p.status);assert.equal(a.status_schema_version,"ml_v2");assert.equal(a.status_reason,p.status_reason);
  assert.equal(a.product_type,p.product_type);assert.equal(a.taxonomy_version,p.taxonomy_version);
  assert.equal(new Date(a.scored_at).getTime(),Date.parse(p.scored_at));
  assert.deepEqual(a.input_snapshot_json,frozenInput(p));assert.deepEqual(a.evidence_json.items,p.evidence);assert.deepEqual(a.comparison_json.peer_ids,p.peer_ids);
  sameNumber(a.reference_sold,p.reference_sales);sameNumber(a.prediction_lower,p.prediction_lower);sameNumber(a.prediction_upper,p.prediction_upper);
  sameNumber(a.sales_gap,p.reference_sales===null?null:p.observed_sales-p.reference_sales);
  assert.equal(a.is_eligible,false);assert.equal(a.config_json.quality_acceptance,false);
  const linked=actions.filter(row=>row.analysis_id===a.id);assert.equal(linked.length,p.recommendations.length);
  for(const suggestion of p.recommendations) {
   const action=linked.find(row=>row.rule_id===suggestion.rule_id);assert.ok(action);
   assert.equal(action.origin,"ml_rule");assert.equal(action.type,ruleTypes[suggestion.rule_id]);
   assert.deepEqual(action.original_suggestion_json,suggestion);checkedActions++;
  }
 }
 const groups=(await pool().query(`SELECT c.name,count(*)::int count FROM products p JOIN categories c ON c.id=p.category_id
 JOIN product_analyses a ON a.product_id=p.id WHERE a.run_id=$1 GROUP BY c.id,c.name ORDER BY c.name`,[run.id])).rows;
 assert.equal(groups.length,5);groups.forEach(g=>assert.equal(g.count,20));
 for(const group of sampleGroups)assert.ok(groups.some(g=>g.name===group.name));
 const a=imported[0];
 await request(`/products/${a.product_id}`);await request(`/products/${a.product_id}/analyses`);
 await request(`/analyses/${a.id}`);await request(`/analysis-results/${a.id}`);
 const hasActions=imported.find(a=>actions.some(w=>w.analysis_id===a.id))!;
 await request(`/analyses/${hasActions.id}/actions`);
 const action=actions.find(w=>w.analysis_id===hasActions.id)!;
 const history=await request(`/actions/${action.id}/history`);assert.ok(history.data.some((h:{event_type:string})=>h.event_type==="created"));
 await request("/products/9223372036854775807",404);await request("/products?limit=101",422);
 const histories=(await pool().query(`SELECT count(*)::int n FROM action_history h JOIN improvement_actions w ON w.id=h.action_id
 JOIN product_analyses a ON a.id=w.analysis_id WHERE a.run_id=$1 AND h.event_type='created'`,[run.id])).rows[0].n;assert.equal(histories,checkedActions);
 const seeds=(await pool().query("SELECT entity,count(*)::int n FROM sellens_seed_records GROUP BY entity")).rows;
 await request("/auth/logout",200,"POST");token=undefined;
 const result={pass:true,verified_products:100,verified_analyses:100,verified_original_suggestions:checkedActions,created_history_events:histories,
  groups,seed_registry:seeds,http_checks:checks,verification:"Selected snapshots, evidence and suggestions compared with source; catalog cross-checked against PostgreSQL"};
 await mkdir(new URL("../../tmp/",import.meta.url),{recursive:true});
 await writeFile(new URL("../../tmp/ml-sample-http.json",import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} catch(error) { console.error("ML sample HTTP/data verification failed; no product data modified.");console.error(JSON.stringify({last_checks:checks.slice(-3),reason:error instanceof Error?error.message.split("\n")[0]:"unknown"}));process.exitCode=1;
} finally {
 if(token)await fetch(`${base}/api/v1/auth/logout`,{method:"POST",headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
 await pool().end().catch(()=>{});
}
