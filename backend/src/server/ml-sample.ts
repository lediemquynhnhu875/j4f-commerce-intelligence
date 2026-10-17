import { z } from "zod";

export const sampleRunKey = "ml-v2-five-types-100-v1";
export const sampleGroups = [
  { type: "giày lười nam", code: "ml_mens_loafers", name: "Giày lười nam" },
  { type: "túi đeo chéo", code: "ml_crossbody_bags", name: "Túi đeo chéo" },
  { type: "balo", code: "ml_backpacks", name: "Balo" },
  { type: "ví nam", code: "ml_mens_wallets", name: "Ví nam" },
  { type: "mũ nón", code: "ml_hats", name: "Mũ nón" },
] as const;
export const mlStatuses = ["positive_feedback_low_sales","low_rating_low_sales","performing_well","untapped_potential","difficult_to_sell","insufficient_data"] as const;
export const sampledStatuses = ["performing_well","untapped_potential","difficult_to_sell","insufficient_data"] as const;
export const ruleTypes: Record<string,string> = {
  review_price_positioning:"review_price", add_product_images:"review_images",
  consider_product_video:"review_video", improve_product_description:"complete_description",
  review_quality_feedback:"inspect_reviews", review_visibility_and_stock:"verify_listing_and_stock",
};
const numeric = z.number().finite().nonnegative();
const suggestion = z.object({rule_id:z.string().refine(value=>Object.hasOwn(ruleTypes,value)),
  evidence:z.string().min(1), hypothesis:z.string().min(1), action:z.string().min(1).max(255), validation_needed:z.string().min(1)}).strict();
export const sourceProductSchema = z.object({
  product_id:z.string().regex(/^\d+$/),source_product_id:z.string(), product_name:z.string().min(1).max(500),
  product_type:z.string(), price:numeric.positive(), original_price:numeric.nullable(),
  description:z.string(), quantity_sold:numeric.int().max(Number.MAX_SAFE_INTEGER), observed_sales:numeric.int(),
  rating_average:numeric.max(5).nullable(), review_count:numeric.int().nullable(),
  image_count:numeric.int().nullable(), has_video:z.boolean().nullable(), image_url:z.string().nullable(),
  status:z.enum(mlStatuses), status_reason:z.string(), status_explanation_vi:z.string(),
  reference_sales:numeric.nullable(), sale_probability:numeric.max(1).nullable(),
  prediction_lower:numeric.nullable(), prediction_upper:numeric.nullable(), opportunity_score:numeric.nullable(),
  model_version:z.string().min(1),scoring_rules_version:z.string().min(1),taxonomy_version:z.string().min(1),
  scored_at:z.iso.datetime({offset:true}), analysis_is_hypothesis:z.literal(true), analysis_limitations_vi:z.string(),
  peer_ids:z.array(z.string()),peer_count:numeric.int(),peer_config:z.record(z.string(),z.json()),
  peer_quality_reason:z.string().nullable(), evidence:z.array(z.record(z.string(),z.json())),
  recommendations:z.array(suggestion), valid_for_model:z.literal(true), selected_raw_source_index:numeric.int(),
  source_captured_at:z.iso.datetime({offset:true}).nullable(), store_id:z.null(),
}).passthrough().superRefine((p,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:"custom",message});
  if(p.product_id!==p.source_product_id || p.quantity_sold!==p.observed_sales) fail("Source identity/observation mismatch");
  if(p.prediction_lower!==null && p.prediction_upper!==null && p.prediction_lower>p.prediction_upper) fail("Inverted reference interval");
  if(p.peer_count!==p.peer_ids.length) fail("Peer count mismatch");
  if(new Set(p.recommendations.map(a=>a.rule_id)).size!==p.recommendations.length) fail("Duplicate rule");
  if(p.status==="insufficient_data" && p.opportunity_score!==null) fail("Insufficient analysis must have null priority");
});
export type SourceProduct = z.infer<typeof sourceProductSchema>;

export function selectSample(rows: Record<string,unknown>[]): SourceProduct[] {
  const ids=new Set<string>();
  for(const row of rows) {
    if(typeof row.product_id!=="string" || ids.has(row.product_id)) throw new Error("Source IDs are missing or duplicated");
    ids.add(row.product_id);
  }
  const selected: SourceProduct[]=[];
  for(const group of sampleGroups) for(const status of sampledStatuses) {
    const candidates=rows.filter(p=>p.product_type===group.type && p.status===status && p.valid_for_model===true
      && typeof p.price==="number" && p.price>0 && p.selected_raw_source_index!==null)
      .sort((a,b)=>String(a.product_id).localeCompare(String(b.product_id),"en",{numeric:true}));
    if(candidates.length<5) throw new Error(`Insufficient sample candidates for ${group.code}/${status}`);
    selected.push(...candidates.slice(0,5).map(p=>sourceProductSchema.parse(p)));
  }
  return selected;
}

export function frozenInput(p:SourceProduct) {
  return Object.fromEntries(["product_id","source_product_id","product_name","product_type","price","original_price",
    "description","quantity_sold","observed_sales","rating_average","review_count","image_count","has_video",
    "description_length","discount_rate","fulfillment_type","taxonomy_version","valid_for_model","data_quality_issue",
    "source_captured_at"].map(key=>[key,p[key]??null]));
}
