import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool, transaction } from "../src/server/db";

/**
 * Fills products.thumbnail_url, image_urls, video_url and media_source_json for
 * products already imported from the ML snapshot, matched on
 * (source_system, source_product_id).
 *
 * The 2023 source CSVs hold no media URLs, so these come from the live Tiki
 * product API (see ml/src/export/media/ in the data checkout). They are display
 * assets: has_video and number_of_images stay as the snapshot recorded them, and
 * nothing outside the four media columns is written.
 *
 * The script is idempotent: rerunning it writes the same values and reports how
 * many rows actually changed.
 */

type MediaImage = {
  base_url: string | null;
  large_url: string | null;
  medium_url: string | null;
  small_url: string | null;
  thumbnail_url: string | null;
  position: number | null;
};

type MediaRecord = {
  source_product_id: string;
  fetched_at: string;
  http_status: number | null;
  found: boolean;
  thumbnail_url: string | null;
  images: MediaImage[];
  image_url_count: number;
  video_url: string | null;
  primary_image_url?: string | null;
  primary_image_http_status?: number | null;
  gallery_is_placeholder?: boolean | null;
  product_url?: string | null;
};

const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const isHttps = (value: string | null | undefined) =>
  typeof value === "string" && /^https:\/\/[^\s]+$/.test(value);

try {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => arg !== "--apply" && arg !== "--dry-run") ||
    (args.includes("--apply") && args.includes("--dry-run"))
  )
    throw new Error("Invalid command arguments");
  const apply = args.includes("--apply");

  const bytes = await readFile(
    new URL("../../data/external/tiki_media_sample.json", import.meta.url),
  );
  const sourceHash = digest(bytes);
  const source = JSON.parse(bytes.toString("utf8").replace(/^﻿/, ""));
  if (
    source.metadata?.schema_version !== "j4f-tiki-media-v1" ||
    !Array.isArray(source.records)
  )
    throw new Error("Unsupported media contract");

  const records: MediaRecord[] = source.records;
  const ids = records.map((record) => String(record.source_product_id));
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate source IDs");

  const resolved = records.filter((record) => record.found);
  for (const record of resolved) {
    // Only https CDN links are stored; anything else is treated as unresolved.
    if (record.primary_image_url && !isHttps(record.primary_image_url))
      throw new Error("Invalid media URL");
    if (record.video_url && !isHttps(record.video_url))
      throw new Error("Invalid media URL");
    if (record.thumbnail_url && !isHttps(record.thumbnail_url))
      throw new Error("Invalid media URL");
  }

  const result = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(736551003)");
    const columns = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name IN ('video_url','image_urls','media_source_json')",
    );
    if (columns.rowCount !== 3)
      throw new Error("Missing media columns; apply migration 003 first");

    let matched = 0;
    let changed = 0;
    let withImage = 0;
    let withVideo = 0;
    let unresolved = 0;
    const missing: string[] = [];

    for (const record of records) {
      const id = String(record.source_product_id);
      const existing = await client.query(
        "SELECT id, thumbnail_url, image_urls, video_url FROM products WHERE source_system='tiki' AND source_product_id=$1",
        [id],
      );
      const rowCount = existing.rowCount ?? 0;
      if (rowCount === 0) {
        missing.push(id);
        continue;
      }
      if (rowCount > 1) throw new Error("Ambiguous source product ID");
      matched++;

      const images = record.found ? (record.images ?? []) : [];
      const thumbnail = record.found ? (record.thumbnail_url ?? null) : null;
      const primary = record.found ? (record.primary_image_url ?? null) : null;
      const video = record.found ? (record.video_url ?? null) : null;
      if (primary) withImage++;
      if (video) withVideo++;
      if (!record.found) unresolved++;

      const provenance = {
        source: "tiki_api_v2",
        fetched_at: record.fetched_at,
        http_status: record.http_status,
        resolved: Boolean(record.found),
        primary_image_url: primary,
        primary_image_http_status: record.primary_image_http_status ?? null,
        gallery_is_placeholder: record.gallery_is_placeholder ?? null,
        api_image_count: record.image_url_count ?? 0,
        product_url: record.product_url ?? null,
        media_source_sha256: sourceHash,
        note: "Live Tiki media fetched after the 2023 snapshot; display asset only.",
      };

      if (apply) {
        const updated = await client.query(
          `UPDATE products
             SET thumbnail_url=$2, image_urls=$3::jsonb, video_url=$4,
                 media_source_json=$5::jsonb, updated_at=now()
           WHERE id=$1
             AND (thumbnail_url IS DISTINCT FROM $2
               OR image_urls IS DISTINCT FROM $3::jsonb
               OR video_url IS DISTINCT FROM $4
               OR media_source_json IS DISTINCT FROM $5::jsonb)`,
          [
            existing.rows[0].id,
            primary ?? thumbnail,
            JSON.stringify(images),
            video,
            JSON.stringify(provenance),
          ],
        );
        changed += updated.rowCount ?? 0;
      }
    }

    if (missing.length > 0 && missing.length === records.length)
      throw new Error("No imported products matched; run import:ml-sample first");

    return {
      mode: apply ? "applied" : "dry-run",
      media_source_sha256: sourceHash,
      records: records.length,
      matched_products: matched,
      unmatched_source_ids: missing.length,
      with_image_url: withImage,
      with_video_url: withVideo,
      unresolved_404: unresolved,
      rows_changed: apply ? changed : null,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  if (!apply)
    console.log("Dry run only. Rerun with --apply to write the media columns.");
} catch (error) {
  // Never print source rows, SQL parameters or connection errors.
  console.error(
    "Media import failed; no partial batch committed. " +
      (error instanceof Error &&
      /^(Unsupported media|Duplicate source|Invalid media|Missing media|Ambiguous source|No imported|Invalid command)/.test(
        error.message,
      )
        ? error.message
        : "Check source contract, migrations and connectivity."),
  );
  process.exitCode = 1;
} finally {
  await pool().end().catch(() => {});
}
