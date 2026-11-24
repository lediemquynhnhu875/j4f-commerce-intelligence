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
export type Dataset = {
  systemSummary?: SystemSummary;
  stores?: Store[];
  products: Product[];
  categories: Category[];
  analyses: Analysis[];
  actions: Action[];
  accounts: Account[];
};

// Catalog list summaries deliberately omit frozen evidence and action audit payloads.
export type CatalogAnalysis = Pick<Analysis, "id" | "product_id" | "status" | "product_type" | "analyzed_at">;
export type CatalogAction = Pick<Action, "id" | "analysis_id" | "title">;
export type CatalogData = { products: Product[]; categories: Category[]; analyses: CatalogAnalysis[]; actions: CatalogAction[] };
export type CatalogQuery = { q: string; category_id: string; status: string; type: string; sort: "" | "price" | "sales"; analysable_only: boolean; page: number; limit: number };
export type CatalogResponse = List<Product> & {
  categories: Category[]; analyses: CatalogAnalysis[]; actions: CatalogAction[]; store: Store;
  facets: { statuses: string[]; types: string[] };
  summary: { total: number; undecided_count: number; proposed_actions: number };
};

export type OverviewAnalysis=Pick<Analysis,'id'|'product_id'|'status'|'status_schema_version'|'product_type'|'priority_score'|'reference_sold'|'sales_gap'|'analyzed_at'|'input_snapshot_json'>;
export type OverviewAction=Pick<Action,'id'|'analysis_id'|'type'|'title'|'status'|'original_suggestion_json'>;
export type OverviewData={products:Product[];analyses:OverviewAnalysis[];actions:OverviewAction[];categories:Category[]};
export type OverviewSummary={total:number;analyzed_products:number;no_reference:number;has_ml:boolean;last_analysis_at:string|null;review_products:number;active_actions:number;in_progress:number;proposed:number;global_proposed:number;status_counts:Record<string,number>;categories:{id:string;name:string;count:number}[]};
export type OverviewResponse={store:Store;data:OverviewData;summary:OverviewSummary};
export type ProductOption=Pick<Product,'id'|'name'>;
export type AnalysisOption=Pick<Analysis,'id'|'product_id'|'status'|'analyzed_at'|'product'>;
export type DetailResponse={store:Store;proposed_actions:number;data:Dataset;history:Pick<Analysis,'id'|'product_id'|'status'|'analyzed_at'>[];history_pagination:List<never>['pagination'];actions_pagination:List<never>['pagination']};
export type WorkData={products:Product[];analyses:Pick<Analysis,'id'|'product_id'|'product'>[];actions:Action[]};
export type WorkQuery={q:string;status:string;type:string;page:number;limit:number};
export type WorkResponse={store:Store;data:WorkData;pagination:List<never>['pagination'];summary:{total:number;states:Record<string,number>};facets:{types:string[]};filtered_states:Record<string,number>};
