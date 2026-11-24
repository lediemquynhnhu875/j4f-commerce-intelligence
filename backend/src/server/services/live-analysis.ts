import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { tokenHash, type Account } from "../auth";
import { pool, transaction } from "../db";
import { ApiError, missing } from "../errors";
import { ruleTypes } from "../ml-sample";
import { inferProduct, type InferenceProduct } from "../model-service";
import { insert } from "./catalog";

type DB = Pick<PoolClient, "query">;
type ProductRow = {
  category_id: string | null;
  category: string | null;
  currency: string;
  description: string | null;
  has_video: boolean | null;
  name: string;
  number_of_images: number | null;
  observed_at: Date | null;
  original_price: string | null;
  price: string | null;
  quantity_sold: string | null;
  rating_average: string | null;
  review_count: number | null;
  sales_label_verified: boolean;
  sales_scope: string;
  source_product_id: string | null;
  updated_at: Date;
};

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function readProduct(db: DB, actor: Account, productId: string, sessionHash?: string) {
  const { rows: [store] } = await db.query<{ id: string }>(
    sessionHash
      ? `SELECT s.id FROM stores s JOIN users u ON u.id=s.owner_user_id
           JOIN sellens_sessions session ON session.user_id=u.id
         WHERE s.owner_user_id=$1 AND s.is_active AND u.is_active AND u.role='reviewer'
           AND session.token_hash=$2 AND session.expires_at>clock_timestamp()
         FOR SHARE OF s,u,session`
      : "SELECT id FROM stores WHERE owner_user_id=$1 AND is_active",
    sessionHash ? [actor.id, sessionHash] : [actor.id],
  );
  if (!store)
    throw new ApiError(403, "STORE_UNAVAILABLE", "Phiên đăng nhập hoặc cửa hàng không còn hoạt động.");
  const { rows: [product] } = await db.query<ProductRow>(
    `SELECT p.name,p.description,p.category_id,c.name AS category,p.currency,p.price,
      p.original_price,p.quantity_sold,p.rating_average,p.review_count,p.number_of_images,
      p.has_video,p.sales_scope,p.sales_label_verified,p.observed_at,p.source_product_id,p.updated_at
      FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE p.id=$1 AND p.store_id=$2 ${sessionHash ? "FOR SHARE OF p" : ""}`,
    [productId, store.id],
  );
  if (!product) missing();
  return { product, storeId: store.id };
}

async function savedRun(db: DB, runKey: string, inputHash: string) {
  const { rows: [existing] } = await db.query<{ input_hash: string; id: string; status: string }>(
    `SELECT r.source_sha256 AS input_hash, a.id, a.status FROM analysis_runs r
      JOIN product_analyses a ON a.run_id=r.id WHERE r.run_key=$1`, [runKey],
  );
  if (!existing) return null;
  if (existing.input_hash !== inputHash) throw changedInput();
  return { id: existing.id, status: existing.status, reused: true };
}

function changedInput() {
  return new ApiError(409, "ANALYSIS_INPUT_CHANGED",
    "Dữ liệu sản phẩm đã thay đổi. Hãy chạy lại phân tích để dùng dữ liệu mới.");
}

function amount(value: string | null) {
  return value === null ? null : Number(value);
}

export async function runProductAnalysis(actor: Account, productId: string, key: string, token: string) {
  const { product, storeId } = await readProduct(pool(), actor, productId);
  const inputHash = hash(product);
  const runKey = `live:${hash([storeId, productId, key])}`;
  const existing = await savedRun(pool(), runKey, inputHash);
  if (existing) return existing;

  if (product.currency !== "VND")
    throw new ApiError(422, "ML_UNSUPPORTED_CURRENCY", "Dịch vụ ML hiện phân tích sản phẩm có giá tính bằng VND.");
  const payload: InferenceProduct = {
    name: product.name,
    description: product.description === null ? null
      : Array.from(product.description).slice(0, 10000).join(""),
    category: product.category,
    source_product_id: product.source_product_id,
    price: amount(product.price),
    original_price: amount(product.original_price),
    quantity_sold: amount(product.quantity_sold),
    rating_average: amount(product.rating_average),
    review_count: product.review_count,
    number_of_images: product.number_of_images,
    has_video: product.has_video,
  };
  if (payload.quantity_sold !== null && !Number.isSafeInteger(payload.quantity_sold))
    throw new ApiError(422, "ML_INVALID_INPUT", "Số lượng đã bán vượt phạm vi hỗ trợ của ML.");
  const output = await inferProduct(payload);
  return transaction(async (client) => {
    const current = await readProduct(client, actor, productId, tokenHash(token));
    if (current.storeId !== storeId || hash(current.product) !== inputHash) throw changedInput();
    const provenance = {
      schema_version: output.schema_version,
      prediction_origin: output.reference_sold === null ? "unavailable" : "new_input",
      quality_acceptance: false,
      analysis_is_hypothesis: true,
      scoring_rules_version: output.pipeline_version,
      taxonomy_version: output.taxonomy_version,
      bundle_sha256: output.bundle_sha256,
      corpus_sha256: output.corpus_sha256,
      config_sha256: output.config_sha256,
      taxonomy_sha256: output.taxonomy_sha256,
    };
    const { rows: [run] } = await client.query<{ id: string }>(
      `INSERT INTO analysis_runs (run_key,source_sha256,selection_sha256,manifest_json,scored_at)
        VALUES ($1,$2,$3,$4,now()) ON CONFLICT(run_key) DO NOTHING RETURNING id`,
      [runKey, inputHash, hash(output), provenance],
    );
    if (!run) {
      const duplicate = await savedRun(client, runKey, inputHash);
      if (!duplicate) throw new Error("Analysis run has no saved result");
      return duplicate;
    }

    const analysis = await insert(client, "product_analyses", {
      product_id: productId,
      run_id: run.id,
      analyzed_by: actor.id,
      status_schema_version: "ml_v2",
      status: output.status,
      status_reason: output.status_reason,
      product_type: output.product_type,
      taxonomy_version: output.taxonomy_version,
      reference_sold: output.reference_sold,
      probability_positive_sales: output.probability_positive_sales,
      prediction_lower: output.prediction_lower,
      prediction_upper: output.prediction_upper,
      priority_score: output.priority_score,
      is_eligible: false,
      needs_review: true,
      model_version: output.model_version,
      pipeline_version: output.pipeline_version,
      input_snapshot_json: {
        ...payload,
        category_id: product.category_id,
        currency: product.currency,
        sales_scope: product.sales_scope,
        sales_label_verified: product.sales_label_verified,
        observed_at: product.observed_at,
      },
      comparison_json: output.comparison,
      evidence_json: {
        items: output.evidence, status_reason: output.status_reason, explanation: output.explanation,
      },
      config_json: provenance,
      limitation_note: output.limitation_note,
      scored_at: new Date(),
      sales_gap: output.reference_sold === null || payload.quantity_sold === null
        ? null : payload.quantity_sold - output.reference_sold,
    });
    for (const suggestion of output.recommendations) {
      const action = await insert(client, "improvement_actions", {
        analysis_id: analysis.id,
        type: ruleTypes[suggestion.rule_id],
        origin: "ml_rule",
        rule_id: suggestion.rule_id,
        title: suggestion.action,
        description: suggestion.hypothesis,
        original_suggestion_json: suggestion,
        information_needed: suggestion.validation_needed,
      });
      await insert(client, "action_history", {
        action_id: action.id,
        event_type: "created",
        after_json: action,
        comment: "Generated by live Model A inference",
      });
    }
    return { id: String(analysis.id), status: output.status, reused: false };
  });
}
