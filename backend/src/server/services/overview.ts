import type { Account } from "../auth";
import { pool } from "../db";
import { workspaceStatsFields } from "./stores";

export async function storeOverview(actor: Account) {
  const { rows: [overview] } = await pool().query(
    `WITH scope AS MATERIALIZED (
      SELECT ${workspaceStatsFields}, stats.* FROM stores s
      JOIN store_stats stats ON stats.store_id=s.id
      WHERE s.owner_user_id=$1 AND s.is_active
    ), priorities AS (
      SELECT c.analysis_id, c.product_id, c.status, coalesce(c.priority_score,-1) AS score
      FROM scope s JOIN store_current_analysis c ON c.store_id=s.store_id
      WHERE c.open_count>0 ORDER BY score DESC,c.analysis_id LIMIT 8
    ), suggestions AS (
      SELECT w.id,w.type,w.status,w.title,w.analysis_id,c.product_id,
        w.original_suggestion_json->'evidence' AS evidence
      FROM scope s JOIN store_current_analysis c ON c.store_id=s.store_id
      JOIN improvement_actions w ON w.analysis_id=c.analysis_id
      WHERE c.open_count>0 AND w.status IN ('proposed','accepted','in_progress')
      ORDER BY w.id LIMIT 4
    )
    SELECT
      (SELECT jsonb_build_object(
        'store_name',store_name,'latest_analyzed_at',latest_analyzed_at,
        'proposed_count',proposed_count,'legacy_statuses',legacy_statuses
      ) FROM scope) AS summary,
      (SELECT jsonb_build_object(
        'product_count',product_count,'analyzed_product_count',analyzed_product_count,
        'reference_product_count',reference_product_count,'review_product_count',review_product_count,
        'ml_product_count',ml_product_count,'in_progress_count',in_progress_count,
        'pending_review_count',pending_review_count,'open_suggestion_count',open_suggestion_count,
        'status_counts',status_counts
      ) FROM scope) AS metrics,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id',counts.key,'name',coalesce(c.name,'Chưa phân loại'),'count',counts.value::int
        ) ORDER BY c.id NULLS LAST)
        FROM scope s CROSS JOIN LATERAL jsonb_each_text(s.category_counts) counts
        LEFT JOIN categories c ON c.id=nullif(counts.key,'none')::bigint
      ),'[]') AS categories,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'analysis_id',a.id::text,'status',r.status,'id',p.id::text,'name',p.name,
          'thumbnail_url',p.thumbnail_url,'source_product_id',p.source_product_id,
          'classification',coalesce(a.product_type,c.name),
          'observed_sold',a.input_snapshot_json->'quantity_sold',
          'reference_sold',a.reference_sold::text,'sales_gap',a.sales_gap::text
        ) ORDER BY r.score DESC,r.analysis_id)
        FROM priorities r JOIN product_analyses a ON a.id=r.analysis_id
        JOIN products p ON p.id=r.product_id LEFT JOIN categories c ON c.id=p.category_id
      ),'[]') AS priority,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id',w.id::text,'type',w.type,'status',w.status,'title',w.title,
          'analysis_id',w.analysis_id::text,'product_id',p.id::text,'product_name',p.name,'evidence',w.evidence
        ) ORDER BY w.id)
        FROM suggestions w JOIN products p ON p.id=w.product_id
      ),'[]') AS suggestions`,
    [actor.id],
  );
  return overview;
}
