export type Account = { id: string; full_name: string; email: string; role: "user" | "admin"; is_active: boolean };
export type ProductImage = {
  base_url: string | null; large_url: string | null; medium_url: string | null;
  small_url: string | null; thumbnail_url: string | null; position: number | null;
};
/** Provenance of the live media fetch; media is a display asset, not snapshot evidence. */
export type ProductMediaSource = {
  source: string; fetched_at: string | null; http_status: number | null; resolved: boolean;
  primary_image_url: string | null; gallery_is_placeholder: boolean | null;
  api_image_count: number | null; product_url: string | null; note?: string;
};
export type Product = {
  id: string; category_id: string | null; name: string; description: string | null; brand: string | null;
  price: string | null; currency: string; quantity_sold: string | null; rating_average: string | null;
  review_count: number | null; thumbnail_url: string | null; observed_at: string | null;
  sales_scope: string; sales_label_verified: boolean; number_of_images: number | null; has_video: boolean | null;
  video_url?: string | null; image_urls?: ProductImage[] | null; media_source_json?: ProductMediaSource | null;
};
export type Category = { id: string; code: string; name: string; description: string | null };
export type Analysis = {
  run_id?:string|null;status_schema_version?:string;status_reason?:string|null;product_type?:string|null;
  scored_at?:string|null;prediction_lower?:string|null;prediction_upper?:string|null;taxonomy_version?:string|null;
  id: string; product_id: string; analyzed_by: string | null; status: string; reference_sold: string | null;
  sales_gap: string | null; is_eligible: boolean; needs_review: boolean; pipeline_version: string;
  model_version: string | null; analyzed_at: string; input_snapshot_json: Record<string, unknown>;
  comparison_json: Record<string, unknown> | null; evidence_json: Record<string, unknown> | null;
  config_json: Record<string, unknown>; limitation_note: string | null;
  product: { id: string; name: string }; analyst: { id: string; full_name: string } | null;
};
export type Action = {
  origin?:string;rule_id?:string|null;
  id: string; analysis_id: string; type: string; title: string; description: string | null;
  original_suggestion_json: Record<string, unknown>; information_needed: string | null;
  status: string; assigned_to: string | null; decision_reason: string | null; outcome_note: string | null;
  updated_at: string; completed_at: string | null; due_at: string | null;
};
export type History = { id: string; event_type: string; created_at: string; comment: string | null; before_json: unknown; after_json: unknown };
export type List<T> = { data: T[]; pagination: { page: number; limit: number; total: number } };
export type Dataset = { products: Product[]; categories: Category[]; analyses: Analysis[]; actions: Action[]; accounts: Account[] };
