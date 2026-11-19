import { pool, transaction } from "../db";
import { ApiError, missing } from "../errors";
import { type Account } from "../auth";
import { insert } from "./catalog";

import { productScope } from "./stores";

const relation = `SELECT a.*, jsonb_build_object('id',p.id::text,'name',p.name,'category_id',p.category_id::text) AS product,
 CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('id',u.id::text,'full_name',u.full_name) END AS analyst
 FROM product_analyses a JOIN products p ON p.id=a.product_id LEFT JOIN users u ON u.id=a.analyzed_by`;
export async function listAnalyses(page:number,limit:number,productId:string|undefined,actor:Account) {
  const filter = `$1::bigint IS NOT NULL AND ${productScope(actor,"p")}` + (productId ? " AND a.product_id=$2" : "");
  const args:unknown[]=[actor.id,...(productId?[productId]:[])];
  const rows=await pool().query(`${relation} WHERE ${filter} ORDER BY a.id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,limit,(page-1)*limit]);
  const count=await pool().query(`SELECT count(*)::int AS total FROM product_analyses a JOIN products p ON p.id=a.product_id WHERE ${filter}`,args);
  return {data:rows.rows,pagination:{page,limit,total:count.rows[0].total}};
}
export async function listAnalysisChoices(page: number, limit: number, search: string, actor: Account) {
  const { rows: [result] } = await pool().query(
    `WITH matched AS MATERIALIZED (
      SELECT a.id AS id, p.name AS product_name
      FROM product_analyses a JOIN products p ON p.id=a.product_id
      WHERE ${productScope(actor,"p")}
        AND ($2='' OR strpos(lower(p.name || ' ' || a.id::text),lower($2))>0)
    )
    SELECT coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', id::text, 'product_name', product_name) ORDER BY id)
      FROM (SELECT * FROM matched ORDER BY id LIMIT $3 OFFSET $4) current_page
    ),'[]') AS data, (SELECT count(*)::int FROM matched) AS total`,
    [actor.id, search, limit, (page - 1) * limit],
  );
  return { data: result.data, pagination: { page, limit, total: result.total } };
}
export async function getAnalysis(recordId: string) {
  const rows = await pool().query(`${relation} WHERE a.id=$1`, [recordId]);
  if (!rows.rows[0]) missing();
  return rows.rows[0];
}
export async function createAnalysis(
  data: Record<string, unknown>,
  actor: Account,
) {
  return transaction(async (client) => {
    const result = await client.query(
      "SELECT * FROM products WHERE id=$1 FOR SHARE",
      [data.product_id],
    );
    if (!result.rows[0]) missing();
    const product = result.rows[0];
    const config = data.config_json as Record<string, unknown>;
    if (
      !["new_input", "holdout", "out_of_fold", "unavailable"].includes(
        config.prediction_origin as string,
      )
    )
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "config_json.prediction_origin must be new_input, holdout, out_of_fold or unavailable",
      );
    if (
      data.is_eligible &&
      (!product.sales_label_verified ||
        product.quantity_sold === null ||
        data.reference_sold == null ||
        config.prediction_origin === "unavailable")
    )
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Eligible analyses require verified observed sales, a reference and out-of-sample prediction provenance",
      );
    const snapshot = {
      ...product,
      quantity_sold:
        product.quantity_sold === null ? null : Number(product.quantity_sold),
    };
    return insert(client, "product_analyses", {
      ...data,
      analyzed_by: actor.id,
      input_snapshot_json: snapshot,
      sales_gap:
        data.reference_sold == null || product.quantity_sold === null
          ? null
          : Number(product.quantity_sold) - Number(data.reference_sold),
    });
  });
}

export async function productAnalysis(actor: Account, productId: string, analysisId: string) {
  const { rows } = await pool().query(
    `${relation} WHERE ${productScope(actor, "p")} AND a.product_id=$2 AND a.id=$3`,
    [actor.id, productId, analysisId],
  );
  if (!rows[0]) missing();
  const actions = await pool().query(
    "SELECT * FROM improvement_actions WHERE analysis_id=$1 ORDER BY id",
    [analysisId],
  );
  return { analysis: rows[0], actions: actions.rows };
}

export async function analysisWorkspace(
  actor: Account, productId: string | undefined, analysisId: string | undefined,
  from: string, to: string,
) {
  const lookup = productId ? "AND p.id=$2" : analysisId
    ? "AND p.id=(SELECT product_id FROM product_analyses WHERE id=$2)"
    : `ORDER BY EXISTS (
        SELECT 1 FROM product_analyses a WHERE a.product_id=p.id AND a.status_schema_version='ml_v2'
      ) DESC, p.id LIMIT 1`;
  const selection = productId ?? analysisId;
  const { rows } = await pool().query(
    `SELECT p.*, c.name AS category_name,
      EXISTS (SELECT 1 FROM product_analyses a WHERE a.product_id=p.id) AS has_analysis
      FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE ${productScope(actor, "p")} ${lookup}`,
    selection ? [actor.id, selection] : [actor.id],
  );
  if (!rows[0]) {
    if (selection) missing();
    return { product: null, has_analysis: false, timeline: [], latest: null };
  }
  const { has_analysis, ...product } = rows[0];
  if (!has_analysis) return { product, has_analysis, timeline: [], latest: null };

  const timeline = await pool().query(
    `SELECT id, analyzed_at, input_snapshot_json->'quantity_sold' AS quantity_sold
      FROM product_analyses WHERE product_id=$1
      AND analyzed_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
      AND analyzed_at < (($3::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY analyzed_at DESC, id DESC`,
    [product.id, from, to],
  );
  const latestId = timeline.rows[0]?.id;
  return {
    product,
    has_analysis,
    timeline: timeline.rows,
    latest: latestId ? await productAnalysis(actor, product.id, latestId) : null,
  };
}
