import { z } from "zod";
import { ApiError } from "./errors";
import { mlStatuses, mlSuggestionSchema } from "./ml-sample";

export const inferenceVersion = "sellens-inference-v1";
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const quantity = z.number().finite().min(0).max(999999999999999).nullable();
const evidenceItem = z.object({ metric: z.string().max(100) })
  .catchall(z.union([z.number().finite(), z.boolean(), z.null()]));
const resultSchema = z.object({
  schema_version: z.literal(inferenceVersion),
  status: z.enum(mlStatuses),
  status_reason: z.string().min(1).max(150),
  explanation: z.string().min(1).max(500),
  product_type: z.string().min(1).max(150),
  taxonomy_version: z.string().min(1).max(100),
  model_version: z.string().min(1).max(100),
  pipeline_version: z.string().min(1).max(100),
  reference_sold: quantity,
  probability_positive_sales: z.number().finite().min(0).max(1).nullable(),
  prediction_lower: quantity,
  prediction_upper: quantity,
  priority_score: z.number().finite().min(0).max(1).nullable(),
  comparison: z.record(z.string(), z.number().finite().nullable()),
  evidence: z.array(evidenceItem).max(20),
  recommendations: z.array(mlSuggestionSchema).max(6),
  limitation_note: z.string().min(1).max(2000),
  bundle_sha256: sha,
  corpus_sha256: sha,
  config_sha256: sha,
  taxonomy_sha256: sha,
}).strict().refine((result) => {
  const { reference_sold: value, prediction_lower: lower, prediction_upper: upper,
    probability_positive_sales: probability, recommendations, status } = result;
  const validReference = value !== null && lower !== null && upper !== null &&
    probability !== null && lower <= value && value <= upper;
  const unavailable = [value, lower, upper, probability].every((field) => field === null);
  return (validReference || (unavailable && status === "insufficient_data" && !recommendations.length))
    && new Set(recommendations.map(({ rule_id }) => rule_id)).size === recommendations.length;
});

export type InferenceProduct = {
  name: string;
  description: string | null;
  category: string | null;
  source_product_id: string | null;
  price: number | null;
  original_price: number | null;
  quantity_sold: number | null;
  rating_average: number | null;
  review_count: number | null;
  number_of_images: number | null;
  has_video: boolean | null;
};

const notConfigured = () => new ApiError(
  503, "ML_NOT_CONFIGURED", "Dịch vụ phân tích ML chưa được cấu hình.",
);
const invalidResponse = () => new ApiError(
  502, "ML_INVALID_RESPONSE", "Dịch vụ ML trả về kết quả không hợp lệ. Kết quả chưa được lưu.",
);

export async function inferProduct(product: InferenceProduct) {
  const base = process.env.ML_SERVICE_URL;
  const token = process.env.ML_SERVICE_TOKEN;
  if (!base || !token || token.length < 32) throw notConfigured();
  let endpoint: URL;
  try {
    endpoint = new URL(base);
    const localhost = ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
    if (
      (endpoint.protocol !== "https:" && !(localhost && endpoint.protocol === "http:")) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      endpoint.pathname !== "/"
    ) throw notConfigured();
    endpoint.pathname = "/v1/infer";
  } catch {
    throw notConfigured();
  }

  const signal = AbortSignal.timeout(30_000);
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ schema_version: inferenceVersion, product }),
      cache: "no-store",
      redirect: "error",
      signal,
    });
    if (response.ok) payload = await response.json();
    else await response.body?.cancel();
  } catch (error) {
    if (signal.aborted)
      throw new ApiError(504, "ML_TIMEOUT", "Dịch vụ ML phản hồi quá lâu. Vui lòng thử lại.");
    if (error instanceof SyntaxError) throw invalidResponse();
    throw new ApiError(503, "ML_UNAVAILABLE", "Chưa kết nối được dịch vụ ML. Vui lòng thử lại.");
  }
  if (response.status === 409)
    throw new ApiError(409, "PRODUCT_IN_MODEL_CORPUS",
      "Sản phẩm đã nằm trong bộ dữ liệu huấn luyện. Hãy xem kết quả đã lưu hoặc chọn sản phẩm mới.");
  if (response.status === 503)
    throw new ApiError(503, "ML_UNAVAILABLE", "Dịch vụ ML chưa sẵn sàng hoặc đang bận. Vui lòng thử lại.");
  if (response.status === 422 || response.status === 413)
    throw new ApiError(422, "ML_INVALID_INPUT", "Dữ liệu sản phẩm vượt phạm vi hỗ trợ của ML.");
  if (!response.ok) throw invalidResponse();
  const result = resultSchema.safeParse(payload);
  if (!result.success) throw invalidResponse();
  return result.data;
}
