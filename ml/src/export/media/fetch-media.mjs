import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';
const idsFile = process.argv[2];
const outFile = process.argv[3];
const sample = JSON.parse(fs.readFileSync(idsFile, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchProduct(id) {
  const url = `https://tiki.vn/api/v2/products/${id}?platform=web&version=3`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (res.status === 404) return { http_status: 404, found: false };
      if (!res.ok) { await sleep(2000 * attempt); continue; }
      return { http_status: res.status, found: true, body: await res.json() };
    } catch (e) {
      if (attempt === 3) return { http_status: null, found: false, error: String(e.message ?? e) };
      await sleep(2000 * attempt);
    }
  }
  return { http_status: null, found: false, error: 'retries exhausted' };
}

const records = [];
let ok = 0, missing = 0, failed = 0;
for (const [i, p] of sample.entries()) {
  const id = p.source_product_id;
  const r = await fetchProduct(id);
  if (r.found) {
    const b = r.body;
    const images = Array.isArray(b.images) ? b.images.map((im) => ({
      base_url: im.base_url ?? null, large_url: im.large_url ?? null,
      medium_url: im.medium_url ?? null, small_url: im.small_url ?? null,
      thumbnail_url: im.thumbnail_url ?? null, position: im.position ?? null,
    })) : [];
    records.push({
      source_product_id: String(id),
      fetched_at: new Date().toISOString(),
      http_status: r.http_status,
      found: true,
      api_product_id: b.id != null ? String(b.id) : null,
      api_name: b.name ?? null,
      product_url: b.short_url ?? (b.url_path ? `https://tiki.vn/${b.url_path}` : null),
      thumbnail_url: b.thumbnail_url ?? null,
      images,
      image_url_count: images.length,
      video_url: b.video_url ?? null,
      has_video_api: Boolean(b.video_url),
    });
    ok++;
  } else {
    records.push({
      source_product_id: String(id), fetched_at: new Date().toISOString(),
      http_status: r.http_status, found: false, error: r.error ?? null,
      thumbnail_url: null, images: [], image_url_count: 0, video_url: null, has_video_api: null,
    });
    if (r.http_status === 404) missing++; else failed++;
  }
  if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${sample.length} (ok=${ok} 404=${missing} err=${failed})`);
  await sleep(1000);
}

const out = {
  metadata: {
    schema_version: 'j4f-tiki-media-v1',
    source: 'https://tiki.vn/api/v2/products/{id}?platform=web&version=3',
    fetched_at: new Date().toISOString(),
    requested: sample.length, resolved: ok, not_found: missing, failed,
    note: 'Live Tiki media URLs fetched 2026-10-17 for the 100 imported sample products. The 2023 source CSVs contain no media URLs. URLs are external CDN links and are not archived locally; availability is not guaranteed.',
  },
  records,
};
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`done: ok=${ok} not_found=${missing} failed=${failed} -> ${outFile}`);
