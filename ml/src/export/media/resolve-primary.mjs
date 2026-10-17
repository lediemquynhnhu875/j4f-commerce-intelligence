import fs from 'node:fs';

const file = process.argv[2];
const media = JSON.parse(fs.readFileSync(file, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PLACEHOLDER = /\/media\/catalog\/product\/f5\/15\/2228f38cf84d1b8451bb49e2c4537081\.png$/;

const upscale = (u) => (u ? u.replace(/\/cache\/[^/]+\//, '/cache/w1200/') : null);

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    return res.status;
  } catch { return -1; }
}

let placeholders = 0, verified = 0, unresolved = 0;
for (const r of media.records) {
  if (!r.found) { r.primary_image_url = null; r.primary_image_http_status = null; r.gallery_is_placeholder = null; continue; }
  const im = r.images[0] ?? {};
  const isPlaceholder = PLACEHOLDER.test(im.base_url ?? '') || PLACEHOLDER.test(im.large_url ?? '');
  r.gallery_is_placeholder = isPlaceholder;
  if (isPlaceholder) placeholders++;
  const candidates = isPlaceholder
    ? [upscale(r.thumbnail_url), r.thumbnail_url]
    : [im.large_url, im.base_url, im.medium_url, upscale(r.thumbnail_url), r.thumbnail_url];
  r.primary_image_url = null;
  r.primary_image_http_status = null;
  for (const c of candidates.filter(Boolean)) {
    const st = await head(c);
    await sleep(120);
    if (st === 200) { r.primary_image_url = c; r.primary_image_http_status = st; verified++; break; }
    r.primary_image_http_status = st;
  }
  if (!r.primary_image_url) unresolved++;
}
media.metadata.primary_image_resolution = {
  resolved_at: new Date().toISOString(),
  strategy: 'first gallery variant returning HTTP 200; Tiki no-image placeholder gallery entries fall back to the w1200 thumbnail variant',
  verified_200: verified,
  placeholder_galleries: placeholders,
  unresolved: unresolved,
};
fs.writeFileSync(file, JSON.stringify(media, null, 2));
console.log(`verified=${verified} placeholder_galleries=${placeholders} unresolved=${unresolved}`);
