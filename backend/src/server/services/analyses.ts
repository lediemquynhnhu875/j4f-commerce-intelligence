import { pool, transaction } from "../db";
import { ApiError, missing } from "../errors";
import { type Account } from "../auth";
import { insert } from "./catalog";

const relation = `SELECT a.*, jsonb_build_object('id',p.id::text,'name',p.name,'category_id',p.category_id::text) AS product,
 CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('id',u.id::text,'full_name',u.full_name) END AS analyst
 FROM product_analyses a JOIN products p ON p.id=a.product_id LEFT JOIN users u ON u.id=a.analyzed_by`;
export async function listAnalyses(page: number, limit: number, productId?: string) {
  const where=productId ? " WHERE a.product_id=$3" : "";
  const rows=await pool().query(`${relation}${where} ORDER BY a.id LIMIT $1 OFFSET $2`, productId ? [limit,(page-1)*limit,productId] : [limit,(page-1)*limit]);
  const count=await pool().query(`SELECT count(*)::int AS total FROM product_analyses ${productId ? "WHERE product_id=$1" : ""}`,productId ? [productId] : []);
  return { data:rows.rows,pagination:{page,limit,total:count.rows[0].total} };
}
export async function getAnalysis(recordId: string) {
  const rows=await pool().query(`${relation} WHERE a.id=$1`,[recordId]);
  if (!rows.rows[0]) missing(); return rows.rows[0];
}
export async function createAnalysis(data: Record<string,unknown>, actor: Account) {
  return transaction(async client=>{
    const result=await client.query("SELECT * FROM products WHERE id=$1 FOR SHARE",[data.product_id]);
    if (!result.rows[0]) missing();
    const product=result.rows[0];
    const config=data.config_json as Record<string,unknown>;
    if (!["new_input","holdout","out_of_fold","unavailable"].includes(config.prediction_origin as string))
      throw new ApiError(422,"VALIDATION_ERROR","config_json.prediction_origin must be new_input, holdout, out_of_fold or unavailable");
    if (data.is_eligible && (!product.sales_label_verified || product.quantity_sold === null || data.reference_sold == null || config.prediction_origin === "unavailable"))
      throw new ApiError(422,"VALIDATION_ERROR","Eligible analyses require verified observed sales, a reference and out-of-sample prediction provenance");
    const snapshot = { ...product, quantity_sold:product.quantity_sold === null ? null : Number(product.quantity_sold) };
    return insert(client,"product_analyses",{ ...data,analyzed_by:actor.id,input_snapshot_json:snapshot,
      sales_gap:data.reference_sold == null || product.quantity_sold === null ? null : Number(product.quantity_sold)-Number(data.reference_sold) });
  });
}
