import { test } from "node:test";
import assert from "node:assert/strict";
import { planHash, productSeedKeys, validatePlan, type CleanupPlan } from "../scripts/lib/sample-cleanup";

function fixture(): CleanupPlan {
  const products = productSeedKeys.map((key,i) => ({id:String(20+i),source_system:null,source_product_id:null,source_data_json:{synthetic:true,seed_key:key}}));
  const analyses = [1,2,3].map(i => ({id:String(100+i),product_id:products[i-1].id,run_id:null,status_schema_version:"legacy_v1",config_json:{synthetic:true,seed_key:`sellens-mvp-v1:analysis:${i}`}}));
  const actions = [1,2,3].map(i => ({id:String(200+i),analysis_id:analyses[i-1].id,type:"verify_listing_and_stock",origin:"legacy",title:"Synthetic work",original_suggestion_json:{synthetic:true}}));
  const history = actions.map((a,i) => ({id:String(300+i),action_id:a.id}));
  const registry = products.map((p,i) => ({seed_key:productSeedKeys[i],entity:"products",record_id:p.id}));
  for (const [prefix,entity,rows] of [["analysis","product_analyses",analyses],["action","improvement_actions",actions],["history","action_history",history]] as const)
    rows.forEach((r,i) => registry.push({seed_key:`sellens-mvp-v1:${prefix}:${i+1}`,entity,record_id:r.id}));
  return {products,analyses,actions,history,registry};
}
test("cleanup accepts registered synthetic fixtures and identified integration test work",()=>{
  const plan=fixture();
  plan.actions.push({id:"501",analysis_id:"101",origin:"manual",type:"other",title:"Integration work 123",original_suggestion_json:{source:"manual_user_work"}});
  plan.history.push({id:"601",action_id:"501"});
  assert.doesNotThrow(()=>validatePlan(plan));
});
test("cleanup refuses a missing or partially deleted sample set",()=>{
  const plan=fixture();plan.products.pop();assert.throws(()=>validatePlan(plan),/ten registered/);
});
test("cleanup preserves products with real-source metadata",()=>{
  const plan=fixture();plan.products[0].source_system="tiki";
  const original=JSON.stringify(plan);assert.throws(()=>validatePlan(plan),/real-source/);assert.equal(JSON.stringify(plan),original);
});
test("cleanup refuses additional or non-synthetic analyses",()=>{
  const plan=fixture();plan.analyses[0].run_id="real-run";assert.throws(()=>validatePlan(plan),/Non-synthetic/);
  const extra=fixture();extra.analyses.push({...extra.analyses[0],id:"900"});assert.throws(()=>validatePlan(extra),/analysis membership/);
});
test("cleanup refuses ML actions or unrecognized human work",()=>{
  const plan=fixture();plan.actions[0].origin="ml_rule";assert.throws(()=>validatePlan(plan),/Unrecognized work/);
  const extra=fixture();extra.actions.push({id:"999",analysis_id:"101",type:"other",title:"Customer follow-up",original_suggestion_json:{source:"manual_user_work"}});assert.throws(()=>validatePlan(extra),/Unrecognized work/);
});
test("cleanup verifies seed identities and audit relationships",()=>{
  const plan=fixture();plan.registry[0].record_id="9999";assert.throws(()=>validatePlan(plan),/Registry identity/);
  const other=fixture();other.history.push({id:"999",action_id:"9000"});assert.throws(()=>validatePlan(other),/audit relation/);
});
test("preview fingerprint changes when target data or audit history changes",()=>{
  const plan=fixture();const hash=planHash(plan);assert.equal(planHash(plan),hash);
  plan.history.push({id:"999",action_id:"201",comment:"New review"});assert.notEqual(planHash(plan),hash);
});
