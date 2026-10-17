import { createHash } from "node:crypto";

export const retirementKey = "sellens-mvp-v1:catalog-retired";
export const productSeedKeys = Array.from({ length: 10 }, (_, i) => `sellens-mvp-v1:product:${i + 1}`);
type Row = Record<string, unknown>;
export type CleanupPlan = {
  products: Row[];
  analyses: Row[];
  actions: Row[];
  history: Row[];
  registry: Row[];
};
export class CleanupError extends Error {}
function requireCondition(value: unknown, message: string): asserts value {
  if (!value) throw new CleanupError(message);
}
export function validatePlan(plan: CleanupPlan) {
  const keys = new Set(plan.products.map(p => (p.source_data_json as Row)?.seed_key));
  requireCondition(plan.products.length === 10 && productSeedKeys.every(k => keys.has(k)), "Expected exactly the ten registered sample products.");
  for (const product of plan.products) {
    requireCondition((product.source_data_json as Row)?.synthetic === true && product.source_system == null && product.source_product_id == null,
      "A sample product has real-source metadata; refusing cleanup.");
  }
  const productIds = new Set(plan.products.map(p => String(p.id)));
  const analysisKeys = [1,2,3].map(i => `sellens-mvp-v1:analysis:${i}`);
  requireCondition(plan.analyses.length === 3 && analysisKeys.every(k => plan.analyses.some(a => (a.config_json as Row)?.seed_key === k)), "Unexpected analysis membership; refusing cleanup.");
  for (const analysis of plan.analyses) {
    requireCondition(productIds.has(String(analysis.product_id)) && (analysis.config_json as Row)?.synthetic === true && analysis.run_id == null && analysis.status_schema_version === "legacy_v1",
      "Non-synthetic analysis found; refusing cleanup.");
  }
  const analysisIds = new Set(plan.analyses.map(a => String(a.id)));
  for (const action of plan.actions) {
    const original = action.original_suggestion_json as Row;
    const seeded = original?.synthetic === true;
    const integration = original?.source === "manual_user_work" && action.type === "other" && /^Integration (work|rejection) \d+$/.test(String(action.title));
    requireCondition(analysisIds.has(String(action.analysis_id)) && action.origin !== "ml_rule" && (seeded || integration), "Unrecognized work attached to a sample; refusing cleanup.");
  }
  const actionIds = new Set(plan.actions.map(a => String(a.id)));
  requireCondition(plan.history.every(h => actionIds.has(String(h.action_id))), "Unexpected audit relation.");
  const expectedRegistry: [string,string,Row[]][] = [
    ["product","products",plan.products], ["analysis","product_analyses",plan.analyses],
    ["action","improvement_actions",plan.actions], ["history","action_history",plan.history],
  ];
  const expectedKeys = expectedRegistry.flatMap(([prefix]) => Array.from({length:prefix === "product" ? 10 : 3}, (_,i) => `sellens-mvp-v1:${prefix}:${i+1}`));
  requireCondition(plan.registry.length === 19 && expectedKeys.every(key => plan.registry.some(r => r.seed_key === key)), "Sample registry is incomplete or changed.");
  for (const [prefix,entity,rows] of expectedRegistry) {
    const rowIds = new Set(rows.map(r => String(r.id)));
    const entries = plan.registry.filter(r => String(r.seed_key).startsWith(`sellens-mvp-v1:${prefix}:`));
    requireCondition(entries.every(r => r.entity === entity && rowIds.has(String(r.record_id))), "Registry identity does not match target records.");
  }
  requireCondition(plan.registry.filter(r => r.entity === "improvement_actions").every(r => plan.actions.some(a => String(a.id) === String(r.record_id) && (a.original_suggestion_json as Row)?.synthetic === true)), "Registered sample actions have changed origin.");
}
export function planHash(plan: CleanupPlan) {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
