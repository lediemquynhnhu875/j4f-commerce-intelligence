const base = 'http://127.0.0.1:3001/api/v1';
const r = await fetch(base + '/auth/login', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ email: process.env.E, password: process.env.P })
});
const tok = (await r.json()).data.access_token;
let page = 1, all = [];
for (;;) {
  const res = await fetch(`${base}/products?page=${page}&limit=100`, { headers: { Authorization: 'Bearer ' + tok } });
  const j = await res.json();
  const rows = j.data ?? [];
  all.push(...rows);
  if (rows.length < 100) break;
  page++;
}
const imported = all.filter(p => p.source_data_json?.import_run_key);
console.log('total products:', all.length, '| imported:', imported.length);
const ids = imported.map(p => String(p.source_data_json.source_product_id));
console.log('unique source ids:', new Set(ids).size);
const byCat = {};
for (const p of imported) byCat[p.source_data_json.product_type ?? p.category_id] = (byCat[p.source_data_json.product_type ?? p.category_id] ?? 0) + 1;
console.log('groups:', byCat);
await import('node:fs').then(fs => fs.writeFileSync(process.argv[2], JSON.stringify(imported.map(p => ({ db_id: p.id, source_product_id: String(p.source_data_json.source_product_id), name: p.name, number_of_images: p.number_of_images, has_video: p.has_video })), null, 2)));
console.log('written', process.argv[2]);
