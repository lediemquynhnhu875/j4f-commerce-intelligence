import { pool, transaction } from "../src/server/db";

/**
 * Fills products.thumbnail_url for imported products that have none.
 *
 * The 2023 source CSVs carry no media URLs, so images come from the public Tiki
 * product API. They describe the listing as it exists today, not at snapshot
 * time, and are display assets only: has_video and number_of_images keep the
 * values the snapshot recorded and are never recomputed from live media.
 *
 * Listings delisted since 2023 return HTTP 404 and keep a null thumbnail, which
 * the interface renders as its existing placeholder tile.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
/** Tiki's shared "no image" gallery entry; its presence means fall back to the thumbnail. */
const PLACEHOLDER = /\/media\/catalog\/product\/f5\/15\/2228f38cf84d1b8451bb49e2c4537081\.png$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const upscale = (url: string) => url.replace(/\/cache\/[^/]+\//, "/cache/w1200/");

type Candidate = { id: string; sourceId: string };

async function fetchJson(sourceId: string) {
  const url = `https://tiki.vn/api/v2/products/${sourceId}?platform=web&version=3`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 404) return { status: 404, body: null };
      if (!response.ok) {
        await sleep(2000 * attempt);
        continue;
      }
      return { status: response.status, body: (await response.json()) as Record<string, unknown> };
    } catch {
      if (attempt === 3) return { status: 0, body: null };
      await sleep(2000 * attempt);
    }
  }
  return { status: 0, body: null };
}

async function reachable(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    return response.status === 200;
  } catch {
    return false;
  }
}

/** First variant that actually serves, so a stored URL is never a broken link. */
async function primaryImage(body: Record<string, unknown>) {
  const images = Array.isArray(body.images) ? (body.images as Record<string, unknown>[]) : [];
  const thumbnail = typeof body.thumbnail_url === "string" ? body.thumbnail_url : null;
  const first = images[0] ?? {};
  const gallery = [first.large_url, first.base_url, first.medium_url].filter(
    (value): value is string => typeof value === "string",
  );
  const isPlaceholder = gallery.some((url) => PLACEHOLDER.test(url));
  const candidates = isPlaceholder
    ? [thumbnail ? upscale(thumbnail) : null, thumbnail]
    : [...gallery, thumbnail ? upscale(thumbnail) : null, thumbnail];
  for (const candidate of candidates) {
    if (!candidate || !/^https:\/\//.test(candidate)) continue;
    if (await reachable(candidate)) return candidate;
    await sleep(120);
  }
  return null;
}

try {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => arg !== "--apply" && arg !== "--dry-run") ||
    (args.includes("--apply") && args.includes("--dry-run"))
  )
    throw new Error("Invalid command arguments");
  const apply = args.includes("--apply");

  const candidates: Candidate[] = (
    await pool().query(
      `SELECT id, source_product_id FROM products
       WHERE source_system='tiki' AND source_product_id IS NOT NULL AND thumbnail_url IS NULL
       ORDER BY id`,
    )
  ).rows.map((row) => ({ id: String(row.id), sourceId: String(row.source_product_id) }));
  console.log(`Products without an image: ${candidates.length}`);

  const resolved: { id: string; url: string }[] = [];
  let missing = 0;
  let failed = 0;
  for (const [index, candidate] of candidates.entries()) {
    const response = await fetchJson(candidate.sourceId);
    if (response.status === 404) missing++;
    else if (!response.body) failed++;
    else {
      const url = await primaryImage(response.body);
      if (url) resolved.push({ id: candidate.id, url });
      else failed++;
    }
    if ((index + 1) % 25 === 0)
      console.log(
        `  ${index + 1}/${candidates.length} (images=${resolved.length} 404=${missing} failed=${failed})`,
      );
    await sleep(350);
  }

  let updated = 0;
  if (apply && resolved.length > 0)
    updated = await transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(736551005)");
      let changed = 0;
      for (const row of resolved) {
        // Only ever fills a gap; never replaces an image already stored.
        const result = await client.query(
          "UPDATE products SET thumbnail_url=$2, updated_at=now() WHERE id=$1 AND thumbnail_url IS NULL",
          [row.id, row.url],
        );
        changed += result.rowCount ?? 0;
      }
      return changed;
    });

  console.log(
    JSON.stringify(
      {
        mode: apply ? "applied" : "dry-run",
        candidates: candidates.length,
        resolved: resolved.length,
        not_found_404: missing,
        unresolved: failed,
        rows_updated: apply ? updated : null,
      },
      null,
      2,
    ),
  );
  if (!apply) console.log("Dry run only. Rerun with --apply to store the URLs.");
} catch (error) {
  console.error(
    "Thumbnail fetch failed; no partial batch committed. " +
      (error instanceof Error && /^Invalid command/.test(error.message)
        ? error.message
        : "Check connectivity and database access."),
  );
  process.exitCode = 1;
} finally {
  await pool().end().catch(() => {});
}
