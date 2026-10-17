import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleGroups,sampledStatuses,selectSample,sourceProductSchema } from "../src/server/ml-sample";
import { analysisSchema } from "../src/server/validation";

function fixture(id:number,type:string,status:string) {
  return {product_id:String(id),source_product_id:String(id),product_name:"Synthetic test product",product_type:type,
    price:100,original_price:100,description:"Test",quantity_sold:0,observed_sales:0,rating_average:null,review_count:0,
    image_count:1,has_video:null,image_url:null,status,status_reason:"test",status_explanation_vi:"Test",
    reference_sales:null,sale_probability:null,prediction_lower:null,prediction_upper:null,opportunity_score:null,
    model_version:"test",scoring_rules_version:"test",taxonomy_version:"test",scored_at:"2026-10-12T00:00:00Z",
    analysis_is_hypothesis:true,analysis_limitations_vi:"Test",peer_ids:[],peer_count:0,peer_config:{},peer_quality_reason:"test",
    evidence:[],recommendations:[],valid_for_model:true,selected_raw_source_index:0,source_captured_at:null,store_id:null};
}
test("selection is order-independent, exactly 20 per group, and excludes invalid source candidates",()=>{
  let id=1;
  const rows=sampleGroups.flatMap(g=>sampledStatuses.flatMap(s=>Array.from({length:7},()=>fixture(id++,g.type,s))));
  const bad={...rows[0],product_id:"0",source_product_id:"0",price:0};
  const first=selectSample([...rows,bad]);
  const second=selectSample([...rows].reverse());
  assert.equal(first.length,100);
  assert.deepEqual(first.map(p=>p.product_id),second.map(p=>p.product_id));
  for(const g of sampleGroups) assert.equal(first.filter(p=>p.product_type===g.type).length,20);
  assert.throws(()=>selectSample([...rows,rows[0]]));
  assert.throws(()=>selectSample(rows.filter(p=>p.product_type!==sampleGroups[0].type)));
});
test("source validation rejects identity, interval and unsupported rule errors",()=>{
  const row=fixture(1,"balo","performing_well");
  assert.equal(sourceProductSchema.safeParse(row).success,true);
  assert.equal(sourceProductSchema.safeParse({...row,source_product_id:"2"}).success,false);
  assert.equal(sourceProductSchema.safeParse({...row,prediction_lower:10,prediction_upper:1}).success,false);
  assert.equal(sourceProductSchema.safeParse({...row,recommendations:[{rule_id:"invented",evidence:"x",hypothesis:"x",action:"x",validation_needed:"x"}]}).success,false);
});
test("API requires matching analysis status version and ordered reference interval",()=>{
  const base={product_id:"1",pipeline_version:"test",config_json:{prediction_origin:"unavailable"}};
  assert.equal(analysisSchema.safeParse(base).success,true);
  assert.equal(analysisSchema.safeParse({...base,status:"performing_well"}).success,false);
  assert.equal(analysisSchema.safeParse({...base,status_schema_version:"ml_v2",status:"performing_well"}).success,true);
  assert.equal(analysisSchema.safeParse({...base,status_schema_version:"ml_v2",status:"insufficient_basis"}).success,false);
  assert.equal(analysisSchema.safeParse({...base,prediction_lower:20,prediction_upper:2}).success,false);
});
