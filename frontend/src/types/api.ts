export type Store = {
  id: string;
  owner_user_id: string;
  name: string;
  is_active: boolean;
  owner?: { id: string; full_name: string };
  product_count?: number;
};
export type Account = {
  id: string;
  full_name: string;
  updated_at?: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
};
export type Product = {
  store_id: string;
  source_system?: string | null;
  source_product_id?: string | null;
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  price: string | null;
  currency: string;
  quantity_sold: string | null;
  rating_average: string | null;
  review_count: number | null;
  thumbnail_url: string | null;
  observed_at: string | null;
  sales_scope: string;
  sales_label_verified: boolean;
  number_of_images: number | null;
  has_video: boolean | null;
};
export type Category = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};
export type Analysis = {
  priority_score?: string | null;
  run_id?: string | null;
  status_schema_version?: string;
  status_reason?: string | null;
  product_type?: string | null;
  scored_at?: string | null;
  prediction_lower?: string | null;
  prediction_upper?: string | null;
  taxonomy_version?: string | null;
  id: string;
  product_id: string;
  analyzed_by: string | null;
  status: string;
  reference_sold: string | null;
  sales_gap: string | null;
  is_eligible: boolean;
  needs_review: boolean;
  pipeline_version: string;
  model_version: string | null;
  analyzed_at: string;
  input_snapshot_json: Record<string, unknown>;
  comparison_json: Record<string, unknown> | null;
  evidence_json: Record<string, unknown> | null;
  config_json: Record<string, unknown>;
  limitation_note: string | null;
  product: { id: string; name: string };
  analyst: { id: string; full_name: string } | null;
};
export type Action = {
  origin?: string;
  rule_id?: string | null;
  id: string;
  analysis_id: string;
  type: string;
  title: string;
  description: string | null;
  original_suggestion_json: Record<string, unknown>;
  information_needed: string | null;
  status: string;
  assigned_to: string | null;
  decision_reason: string | null;
  outcome_note: string | null;
  updated_at: string;
  completed_at: string | null;
  due_at: string | null;
};
export type History = {
  id: string;
  event_type: string;
  created_at: string;
  comment: string | null;
  before_json: unknown;
  after_json: unknown;
};
export type List<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number };
};
export type SystemSummary = {
  accounts: number;
  active_accounts: number;
  stores: number;
  products: number;
  saved_results: number;
  analysis_requests: number | null;
  running_requests: number | null;
  recent: {
    store_id: string;
    store_name: string;
    product_count: number;
    completed_at: string;
  }[];
  versions: {
    model_version: string | null;
    pipeline_version: string;
    taxonomy_version: string | null;
    last_used: string;
  }[];
};
export type WorkspaceSummary = {
  store_name: string | null;
  latest_analyzed_at: string | null;
  proposed_count: number;
  legacy_statuses: string[];
};
export type AnalysisPoint = Pick<Analysis, "id" | "analyzed_at"> & {
  quantity_sold: unknown;
};
export type ProductAnalysis = { analysis: Analysis; actions: Action[] };
export type AnalysisWorkspace = {
  has_analysis: boolean;
  product: (Product & { category_name: string | null }) | null;
  timeline: AnalysisPoint[];
  latest: ProductAnalysis | null;
};
export type CatalogProduct = Pick<Product,
  "id" | "store_id" | "name" | "category_id" | "price" | "currency" |
  "source_product_id" | "thumbnail_url" | "quantity_sold" | "rating_average" | "review_count"
> & {
  latest_status: string | null;
  product_type: string | null;
  action_titles: string[];
};


export type StoreOverview = {
  summary: WorkspaceSummary | null;
  metrics: {
    product_count: number;
    analyzed_product_count: number;
    reference_product_count: number;
    review_product_count: number;
    ml_product_count: number;
    in_progress_count: number;
    pending_review_count: number;
    open_suggestion_count: number;
    status_counts: Record<string, number>;
  } | null;
  categories: { id: string; name: string; count: number }[];
  priority: (Pick<Product, "id" | "name" | "source_product_id" | "thumbnail_url"> & {
    analysis_id: string;
    classification: string | null;
    observed_sold: unknown;
    reference_sold: string | null;
    sales_gap: string | null;
    status: string;
  })[];
  suggestions: (Pick<Action, "id" | "type" | "status" | "title" | "analysis_id"> & {
    product_id: string;
    product_name: string;
    evidence: unknown;
  })[];
};
