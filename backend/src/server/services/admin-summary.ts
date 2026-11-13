import { pool } from "../db";

export async function systemSummary() {
  const totals = await pool().query(`SELECT
    (SELECT count(*)::int FROM users) AS accounts,
    (SELECT count(*)::int FROM users WHERE is_active) AS active_accounts,
    (SELECT count(*)::int FROM stores) AS stores,
    (SELECT count(*)::int FROM products) AS products,
    (SELECT count(*)::int FROM product_analyses) AS saved_results`);
  const recent = await pool()
    .query(`SELECT s.id::text AS store_id,s.name AS store_name,
    count(*)::int AS product_count,max(a.analyzed_at) AS completed_at
    FROM product_analyses a JOIN products p ON p.id=a.product_id JOIN stores s ON s.id=p.store_id
    GROUP BY s.id,s.name,COALESCE(a.run_id::text,'record:' || a.id::text)
    ORDER BY max(a.analyzed_at) DESC LIMIT 20`);
  const versions = await pool()
    .query(`SELECT model_version,pipeline_version,taxonomy_version,max(analyzed_at) AS last_used
    FROM product_analyses GROUP BY model_version,pipeline_version,taxonomy_version ORDER BY max(analyzed_at) DESC LIMIT 20`);
  return {
    ...totals.rows[0],
    analysis_requests: null,
    running_requests: null,
    recent: recent.rows,
    versions: versions.rows,
  };
}
