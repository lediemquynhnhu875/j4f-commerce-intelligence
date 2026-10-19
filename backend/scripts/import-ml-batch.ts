import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool, transaction } from "../src/server/db";
import { insert } from "../src/server/services/catalog";
import { frozenInput, ruleTypes, sampleGroups } from "../src/server/ml-sample";
import {
  batchRunKey,
  batchSize,
  batchTargets,
  resultingDistribution,
  selectBatch,
} from "../src/server/ml-batch";

/**
 * Adds a second bounded batch so the demo catalog mirrors the corpus status
 * distribution instead of the 25-per-status stratification of the first import.
 *
 * Reuses the first import's mapping, categories and guarantees: one transaction,
 * frozen inputs, original suggestions only, and no overwrite of existing rows.
 */

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

try {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => arg !== "--apply" && arg !== "--dry-run") ||
    (args.includes("--apply") && args.includes("--dry-run"))
  )
    throw new Error("Invalid command arguments");
  const apply = args.includes("--apply");

  const bytes = await readFile(new URL("../../data/processed/products_full.json", import.meta.url));
  const sourceHash = digest(bytes);
  const source = JSON.parse(bytes.toString("utf8").replace(/^﻿/, ""));
  if (source.metadata?.schema_version !== "j4f-web-snapshot-v1" || !Array.isArray(source.products))
    throw new Error("Unsupported snapshot contract");

  const selected = selectBatch(source.products);
  const selectedHash = digest(JSON.stringify(selected));
  const first = selected[0];
  if (
    selected.some(
      (p) =>
        p.model_version !== first.model_version ||
        p.scoring_rules_version !== first.scoring_rules_version ||
        p.scored_at !== first.scored_at ||
        p.taxonomy_version !== first.taxonomy_version,
    )
  )
    throw new Error("Mixed scoring versions");

  const recommendations = selected.reduce((total, p) => total + p.recommendations.length, 0);
  const groups = sampleGroups.map((group) => ({
    code: group.code,
    type: group.type,
    products: selected.filter((p) => p.product_type === group.type).length,
  }));
  const statusCounts = Object.fromEntries(
    Object.keys(batchTargets).map((status) => [
      status,
      selected.filter((p) => p.status === status).length,
    ]),
  );
  for (const [status, target] of Object.entries(batchTargets))
    if (statusCounts[status] !== target) throw new Error("Batch status counts do not match targets");

  const manifest = {
    run_key: batchRunKey,
    purpose: "Second bounded import aligning the demo catalog with the corpus status distribution",
    batch_size: batchSize,
    status_targets: batchTargets,
    resulting_distribution: resultingDistribution(),
    groups,
    selection_rule:
      "per status and product type, source IDs ascending, valid positive price, unambiguous raw source, " +
      "excluding every product selected by the first import",
    quality_acceptance: source.metadata?.quality_acceptance ?? false,
    source_taxonomy_holdout_accuracy: source.metadata?.source_taxonomy_holdout_accuracy ?? null,
    representativeness:
      "Status shares approximate the scored corpus; product types remain the original five and are not representative of the corpus mix",
  };

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          source_sha256: sourceHash,
          selection_sha256: selectedHash,
          products: selected.length,
          analyses: selected.length,
          actions: recommendations,
          status_counts: statusCounts,
          groups,
          resulting_distribution: manifest.resulting_distribution,
        },
        null,
        2,
      ),
    );
    console.log("Dry run only. Rerun with --apply to write the batch.");
  } else {
    const result = await transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(736551004)");

      const existing = await client.query("SELECT * FROM analysis_runs WHERE run_key=$1", [batchRunKey]);
      if (existing.rows[0]) {
        const old = existing.rows[0];
        if (old.source_sha256 !== sourceHash || old.selection_sha256 !== selectedHash)
          throw new Error("Import identity conflict; existing data preserved");
        const counts = (
          await client.query(
            `SELECT count(DISTINCT a.product_id)::int products,count(DISTINCT a.id)::int analyses,count(w.id)::int actions
             FROM product_analyses a LEFT JOIN improvement_actions w ON w.analysis_id=a.id AND w.origin='ml_rule'
             WHERE a.run_id=$1`,
            [old.id],
          )
        ).rows[0];
        return { mode: "already-imported", run_id: old.id, inserted_products: 0, ...counts };
      }

      // Every selected product must be genuinely new to the catalog.
      const clashes = await client.query(
        "SELECT count(*)::int AS n FROM products WHERE source_system='tiki' AND source_product_id = ANY($1::text[])",
        [selected.map((p) => p.product_id)],
      );
      if (clashes.rows[0].n > 0) throw new Error("Selected products already exist; refusing to duplicate");

      const actor = await client.query(
        "SELECT id FROM users WHERE role='admin' AND is_active=true ORDER BY id LIMIT 1",
      );
      if (!actor.rows[0]) throw new Error("An active admin is required");

      const run = await insert(client, "analysis_runs", {
        run_key: batchRunKey,
        source_sha256: sourceHash,
        selection_sha256: selectedHash,
        manifest_json: manifest,
        scored_at: first.scored_at,
      });

      let products = 0;
      let actions = 0;
      for (const group of sampleGroups) {
        const category = (await client.query("SELECT * FROM categories WHERE code=$1", [group.code])).rows[0];
        if (!category) throw new Error("Expected category from the first import is missing");
        for (const p of selected.filter((p) => p.product_type === group.type)) {
          const product = await insert(client, "products", {
            category_id: category.id,
            name: p.product_name,
            description: p.description,
            currency: "VND",
            price: p.price,
            original_price: p.original_price,
            quantity_sold: p.quantity_sold,
            rating_average: p.rating_average,
            review_count: p.review_count,
            number_of_images: p.image_count,
            has_video: p.has_video,
            thumbnail_url: p.image_url,
            source_system: "tiki",
            source_product_id: p.product_id,
            observed_at: p.source_captured_at,
            imported_by: actor.rows[0].id,
            sales_scope: "unknown",
            sales_label_verified: false,
            source_data_json: {
              import_run_key: batchRunKey,
              source_product_id: p.product_id,
              taxonomy_version: p.taxonomy_version,
              product_type: p.product_type,
            },
          });
          products++;
          const comparison = Object.fromEntries(
            Object.entries(p).filter(
              ([key]) =>
                key.startsWith("peer_") || key.startsWith("good_peer_") || key === "mean_peer_similarity",
            ),
          );
          const analysis = await insert(client, "product_analyses", {
            product_id: product.id,
            run_id: run.id,
            status_schema_version: "ml_v2",
            status: p.status,
            status_reason: p.status_reason,
            product_type: p.product_type,
            taxonomy_version: p.taxonomy_version,
            reference_sold: p.reference_sales,
            probability_positive_sales: p.sale_probability,
            prediction_lower: p.prediction_lower,
            prediction_upper: p.prediction_upper,
            priority_score: p.opportunity_score,
            sales_gap: p.reference_sales === null ? null : p.observed_sales - p.reference_sales,
            is_eligible: false,
            needs_review: true,
            model_version: p.model_version,
            pipeline_version: p.scoring_rules_version,
            input_snapshot_json: frozenInput(p),
            comparison_json: comparison,
            evidence_json: {
              items: p.evidence,
              status_reason: p.status_reason,
              explanation: p.status_explanation_vi,
            },
            config_json: {
              prediction_origin: "out_of_fold",
              prediction_origin_basis: "ML run report: seller-grouped out-of-fold Model A",
              quality_acceptance: manifest.quality_acceptance,
              analysis_is_hypothesis: true,
              scoring_rules_version: p.scoring_rules_version,
              taxonomy_version: p.taxonomy_version,
              peer_config: p.peer_config,
              source_sha256: sourceHash,
            },
            limitation_note: p.analysis_limitations_vi,
            scored_at: p.scored_at,
            analyzed_at: p.scored_at,
          });
          for (const suggestion of p.recommendations) {
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
              comment: "Imported original ML hypothesis",
            });
            actions++;
          }
        }
      }
      if (products !== batchSize || actions !== recommendations)
        throw new Error("Inserted counts do not match the selection");
      return {
        mode: "imported",
        run_id: run.id,
        inserted_products: products,
        analyses: products,
        actions,
        status_counts: statusCounts,
      };
    });
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  // Never print source rows, SQL parameters or connection errors.
  console.error(
    "ML batch import failed; no partial batch committed. " +
      (error instanceof Error &&
      /^(Import identity|Selected products|Expected category|An active|Unsupported snapshot|Mixed scoring|Insufficient batch|Batch |Duplicate product|Inserted counts|Invalid command)/.test(
        error.message,
      )
        ? error.message
        : "Check source contract, migrations and connectivity."),
  );
  process.exitCode = 1;
} finally {
  await pool().end().catch(() => {});
}
