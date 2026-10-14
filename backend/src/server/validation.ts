import { z } from "zod";
import { ApiError } from "./errors";

export const id = z.string().regex(/^[1-9][0-9]{0,18}$/, "Expected a positive record ID")
  .refine(v => /^[1-9][0-9]{0,18}$/.test(v) && BigInt(v) <= BigInt("9223372036854775807"), "Record ID exceeds bigint range");
const fk = id.nullable().optional();
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max = 10000) => z.string().trim().max(max).nullable().optional();
const money = z.number().finite().min(0).max(999999999999999).multipleOf(0.01).nullable().optional();
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().optional();
const json = z.record(z.string(), z.json());
const url = z.url().refine(v => ["http:","https:"].includes(new URL(v).protocol), "Only HTTP(S) URLs are allowed").nullable().optional();
const timestamp = z.iso.datetime({ offset: true }).nullable().optional();
export const productSchema = z.object({
  category_id: fk, name: text(500), description: optionalText(100000), brand: optionalText(255),
  product_url: url, thumbnail_url: url, currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  price: money, original_price: money, quantity_sold: count,
  rating_average: z.number().finite().min(0).max(5).multipleOf(0.01).nullable().optional(),
  review_count: z.number().int().min(0).max(2147483647).nullable().optional(),
  number_of_images: z.number().int().min(0).max(2147483647).nullable().optional(), has_video: z.boolean().nullable().optional(),
  sales_scope: z.enum(["unknown","listing","product_page"]).optional(), sales_label_verified: z.boolean().optional(),
  source_data_json: json.nullable().optional(), observed_at: timestamp,
}).strict();
export const categorySchema = z.object({ code: text(80).regex(/^[a-z0-9_]+$/), name: text(150), description: optionalText() }).strict();
export const accountSchema = z.object({ full_name: text(150), email: z.email().max(254).transform(v=>v.toLowerCase()),
  password: z.string().min(12).max(128), role: z.enum(["admin","user","reviewer"]).optional(), is_active: z.boolean().optional() }).strict();
export const loginSchema = z.object({ email: z.email().max(254).transform(v=>v.toLowerCase()), password: z.string().min(1).max(128) }).strict();
export const analysisStatuses = ["positive_feedback_below_reference","low_rating_below_reference","at_or_above_reference",
  "zero_sales_needs_investigation","zero_sales_no_priority_signal","below_reference_insufficient_reviews","monitor_gap","undecided","insufficient_basis"] as const;
export const analysisSchema = z.object({
  product_id: id, reference_sold: z.number().finite().min(0).max(999999999999999).nullable().optional(),
  probability_positive_sales: z.number().finite().min(0).max(1).nullable().optional(),
  status: z.enum(analysisStatuses).optional(), is_eligible: z.boolean().optional(), needs_review: z.boolean().optional(),
  priority_score: z.number().finite().min(-999999).max(999999).nullable().optional(), model_version: optionalText(100),
  pipeline_version: text(100), comparison_json: json.nullable().optional(), evidence_json: json.nullable().optional(),
  config_json: json, limitation_note: optionalText(),
}).strict();
export const actionStatuses = ["proposed","accepted","in_progress","completed","rejected","cancelled"] as const;
export const actionSchema = z.object({ analysis_id: id,
  type: z.enum(["review_price","complete_description","review_images_or_video","inspect_reviews","verify_listing_and_stock","verify_exposure","other"]),
  title: text(255), description: optionalText(), original_suggestion_json: json,
  information_needed: optionalText(), assigned_to: fk, due_at: timestamp,
}).strict();
export const actionPatchSchema = z.object({ title: text(255).optional(), description: optionalText(), information_needed: optionalText(),
  status: z.enum(actionStatuses).optional(), assigned_to: fk, decision_reason: optionalText(), due_at: timestamp, outcome_note: optionalText(),
  expected_updated_at: z.iso.datetime({ offset: true }),
}).strict();
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid request input",
    result.error.issues.map(i=>({ field: i.path.join("."), message: i.message })));
  return result.data;
}
export function nonempty(data: Record<string, unknown>) {
  if (!Object.keys(data).length) throw new ApiError(422,"VALIDATION_ERROR","Provide at least one editable field");
}
export async function body(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw)>262144) throw new ApiError(413,"PAYLOAD_TOO_LARGE","JSON body must be at most 256 KiB");
  if (!(request.headers.get("content-type")??"").toLowerCase().includes("application/json")) throw new ApiError(415,"UNSUPPORTED_MEDIA_TYPE","Use application/json");
  try { return JSON.parse(raw); } catch { throw new ApiError(400,"INVALID_JSON","Malformed JSON body"); }
}
export function pagination(url: URL) {
  const schema = z.object({ page: z.coerce.number().int().min(1).max(1000000), limit: z.coerce.number().int().min(1).max(100) });
  return parse(schema,{ page:url.searchParams.get("page")??1,limit:url.searchParams.get("limit")??20 });
}
