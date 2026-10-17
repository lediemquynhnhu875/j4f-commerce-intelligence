# Tiki media merge

Scripts that fetched live Tiki image/video URLs for the 100 imported sample
products and merged them into `data/processed/web_integration/products_full.json`.
Run on 2026-10-17. The 2023 source CSVs carry only `number_of_images` and
`has_video`; they contain no media URLs, so these URLs come from the live
public Tiki product API and describe the listing as it exists today.

## Order of execution

```sh
# 1. The 100 sample source IDs, read from the running backend API.
E=<admin email> P=<admin password> \
  node ml/src/export/media/list-ids.mjs /tmp/sample-ids.json

# 2. One request per product, 1 req/s, three retries.
node ml/src/export/media/fetch-media.mjs /tmp/sample-ids.json \
  data/external/tiki_media_sample.json

# 3. Pick a primary image per product and verify each URL returns HTTP 200.
node ml/src/export/media/resolve-primary.mjs data/external/tiki_media_sample.json

# 4. Stream the 252 MB snapshot and add media fields to matching products.
python3 -B ml/src/export/media/merge_media.py \
  data/processed/web_integration/products_full.json \
  data/external/tiki_media_sample.json /tmp/products_full.merged.json

# 5. Confirm no pre-existing field changed, then install the merged file.
python3 -B ml/src/export/media/verify_merge.py /tmp/products_full.merged.json \
  /tmp/products_full.merged.json.fingerprints.json data/external/tiki_media_sample.json
```

Step 4 never edits in place; step 5 compares a per-product SHA-256 fingerprint of
every field except the added media keys against the fingerprints recorded during
the merge, so a changed or dropped field fails the run.

## Result

100 requested, 92 resolved, 8 HTTP 404 (delisted since 2023). 92 verified image
URLs, 3 video URLs. `has_video` from the 2023 CSVs agreed with the live API for
all 92. Live image counts differ for 33 of 92, so the snapshot `image_count` and
`has_video` stay canonical and are not overwritten.

Eight products return Tiki's shared no-image placeholder as their gallery entry;
for those, `image_url` falls back to the verified `w1200` thumbnail variant while
`image_urls` keeps the raw API response.

## Limitations

The URLs are external CDN links, not archived locally, and may break at any time.
They reflect the listing on the fetch date, not the snapshot date, so they are
display assets only and must not be read back as snapshot evidence.
