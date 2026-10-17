# Complete Web Integration Export

Date: 2026-10-16. Owner: requesting contributor, Codex-assisted.
Scope: requested offline export supporting F002/F003. This does not complete
catalog publication, database, serving, authentication or frontend integration tasks.

## Deliverable

Local ignored file: `data/processed/web_integration/products_full.json`.
UTF-8 JSON, schema `j4f-web-snapshot-v1`, 41,576 unique products,
42,652 recommendations on 27,696 products. Size: 252,384,304 bytes (~252 MB).
SHA-256: `a1393f5e3510abb75bc3d0344bbe093b695138af5be8e6c8be8ca003c19c0e09`.
The 2026-10-17 media merge added image and video URLs for the 100 imported
sample products; see [Media merge](#media-merge). The export before that merge
was 252,148,028 bytes, SHA-256
`98c28e4b10f2bbcd874e1258609d905c8111b0eb975ff56c7c598e57117bc658`.
This contains every clean product, including insufficient-data and out-of-scope
rows. It preserves every column of the latest MVP v2 scores, plus source attributes.
Raw rows rejected by cleaning are not application products; raw duplicate variants
for retained products are preserved under their unique product entry.

## JSON Structure

```json
{
  "metadata": {
    "schema_version": "j4f-web-snapshot-v1",
    "product_count": 41576,
    "quality_acceptance": false,
    "source_taxonomy_holdout_accuracy": 0.63
  },
  "products": []
}
```

The real `products` array contains all records; the empty array above illustrates
the envelope only. Metadata also includes the original scoring summary, export
timestamp, input SHA-256 hashes, all six status labels and field interpretation notes.

Each product keeps these original score fields:

| Group | Fields |
| --- | --- |
| Identity and content | `product_id`, `product_name`, `seller_id`, `brand`, `category_raw`, `product_type`, `description`, `fulfillment_type` |
| Attributes | `price`, `original_price`, `discount_rate`, `quantity_sold`, `rating_average`, `review_count`, `has_video`, `image_count`, `name_length`, `description_length` |
| Taxonomy and provenance | `source_file`, `date_created_raw`, `taxonomy_match`, `taxonomy_source`, `taxonomy_version`, `data_quality_issue`, `valid_for_model` |
| Primary analysis | `observed_sales`, `sale_probability`, `conditional_sales`, `reference_sales`, `prediction_lower`, `prediction_upper`, `opportunity_score` |
| Status and interpretation | `status`, `status_label_vi`, `status_reason`, `status_explanation_vi`, `insufficient_data`, `peer_insufficient_data`, `analysis_is_hypothesis`, `analysis_limitations_vi` |
| Suggestions and evidence | `recommendations`, `evidence` |
| Peer retrieval | `peer_ids`, `peer_count`, `mean_peer_similarity`, `peer_quality_reason`, `peer_config`, `price_quartile` |
| Baseline | `baseline_peer_count`, `baseline_median_sales`, `baseline_sold_rate` |
| Peer attributes | `peer_median_quantity_sold`, `peer_median_price`, `peer_median_discount_rate`, `peer_median_image_count`, `peer_video_share`, `peer_median_rating_average`, `peer_median_review_count`, `peer_median_description_length` |
| Good-selling peer evidence | `good_peer_sales_threshold`, `good_peer_count`, `good_peer_video_known_count`, `good_peer_video_share` |
| Comparison model only | `sale_probability_model_b`, `conditional_sales_model_b`, `reference_sales_model_b`, `prediction_lower_model_b`, `prediction_upper_model_b` |
| Versions | `model_version`, `scoring_rules_version`, `scored_at` |

Additional integration fields:

| Field | Meaning |
| --- | --- |
| `source_product_id` | String alias of source `product_id`; preserve strings when importing |
| `product_status` | Alias of `status`, using the six stable data-contract values |
| `product_recommendations` | Array alias of `recommendations`; no recommendation is `[]` |
| `recommendation_count` | Number of original recommendations for this product |
| `store_id` | `null`: explicit application mapping has not been supplied |
| `source_captured_at` | `null`: source capture time is unknown |
| `image_url` | Primary image URL for the 100 sample products, verified HTTP 200 at merge time; `null` for every other product, because the source CSVs hold no media URLs |
| `thumbnail_url` | Tiki CDN thumbnail URL; present only on the 100 sample products |
| `image_urls` | Ordered gallery image variants (`base_url`, `large_url`, `medium_url`, `small_url`, `thumbnail_url`, `position`); present only on the 100 sample products |
| `video_url` | Product video URL, or `null` when the listing has none; present only on the 100 sample products |
| `media_source` | Media provenance: API source, fetch time, HTTP status, resolution flag, live image count, product URL, placeholder flag |
| `raw_source_records` | Original records grouped by source product ID, including duplicate variants |
| `selected_raw_source_index` | Zero-based raw record matching the clean `source_file` when variants are identical; `null` if ambiguous |
| `candidate_raw_source_indices` | All raw indices matching the selected clean source filename |

Each raw record contains `source_file`, `csv_record_number` (header is record 1)
and `attributes`. Attributes retain original nonblank cell strings, including
`id`, `name`, `description`, `original_price`, `price`, `fulfillment_type`, `brand`,
`review_count`, `rating_average`, `favourite_count`, `pay_later`, `current_seller`,
`date_created`, `number_of_images`, `vnd_cashback`, `has_video`, `category` and
`quantity_sold`. Empty cells are null. Unnamed CSV index columns are omitted.
Raw variant values do not override the canonical clean attributes. Some same-file
duplicates cannot be traced to a unique original row with existing provenance;
the export exposes the ambiguity instead of choosing an arbitrary authoritative row.

`recommendations`/`product_recommendations` and `evidence` are parsed JSON arrays,
`peer_ids` is an array of string IDs and `peer_config` is a parsed JSON object.
Recommendations contain `rule_id`, `evidence`, `hypothesis`, `action`,
`validation_needed`. Canonical numeric fields are numbers, booleans are booleans,
and absent values are JSON null. Raw timestamps remain unverified strings.

## Web Integration

Import this offline snapshot in a server-side job, validate the schema/version,
and persist explicit store mappings with the existing catalog services. This JSON
bundle is a new offline interchange format; the planned CSV upload endpoint does
not yet accept it. Mai/Nhung/Huy should review the additive format before real integration.

Use `products` for product details and status filtering, `reference_sales` and
`observed_sales` for the comparison chart, and `product_recommendations` for
suggestion cards. Resolve peer IDs against the imported source-product table.
The frontend's current synthetic status union is different; use the six canonical
statuses and `status_label_vi` instead of silently mapping to mock categories.

Serve authorized, paginated DTOs through web APIs. The full 252 MB file contains
the entire source corpus and audit variants; keep it outside `frontend/public/`.
Source seller strings do not create accounts or establish store ownership.
Image and video URLs exist only for the 100 imported sample products and were
fetched live on 2026-10-17, not captured with the 2023 snapshot; treat them as
display assets, never as snapshot evidence. There are no verified source capture
dates, user decisions, action progress, accounts or durable user history in this
source; these require separate assets or application records. Do not fabricate
them from scoring data.

Model A fields remain authoritative, including null references cleared by scope
and evidence guards. Model B is comparison-only. All suggestions are hypotheses;
the 63% taxonomy holdout remains below the 85% readiness gate.

## Media merge

Date: 2026-10-17. Requested by the contributor to give the demo real product
images. The six source CSVs carry only `number_of_images` and `has_video` and no
media URLs at all, so the URLs come from the public Tiki product API
(`https://tiki.vn/api/v2/products/{id}?platform=web&version=3`), one request per
second, for the 100 products already imported into the application catalog.

Scope and results:

| Measure | Value |
| --- | --- |
| Products requested | 100 (the imported sample: five product types, 20 each) |
| Resolved | 92 |
| HTTP 404, delisted since 2023 | 8 |
| Products with a verified `image_url` | 92 |
| Products with a `video_url` | 3 |
| Gallery entries that were Tiki's no-image placeholder | 8, fallen back to the verified `w1200` thumbnail |

Consistency against the 2023 snapshot: the API product id matched the source
product id for all 92, and `has_video` agreed for 92 of 92. Live image counts
differ for 33 of 92 because listings changed since 2023, so snapshot `has_video`
and `image_count` remain canonical and were not overwritten.

Every other product and every pre-existing field is unchanged. The merge streams
the snapshot product by product and records a per-product SHA-256 fingerprint of
all non-media fields; a separate verification pass recomputes those fingerprints
from the written file and fails on any difference. That pass also confirms 41,576
unique ids, the unchanged product count, and media keys on exactly the 100 sample
products. Scripts, exact commands and limitations:
[`ml/src/export/media/README.md`](../../ml/src/export/media/README.md).

The fetched media live in ignored `data/external/tiki_media_sample.json`, and the
pre-merge snapshot is kept as ignored
`data/processed/web_integration/products_full.before_media_20261017.json`.
URLs point at an external CDN, are not archived locally and may break at any time.

## Reproduce and Verify

```bash
.venv/bin/python -B -m ml.src.export.web \
  --raw-dir '/Users/nhule/Desktop/COMPETITION/AISC 2026/data/raw'
```

Use `--output` with a new filename on rerun; completed exports are not overwritten.
The exporter checks unique IDs, complete clean-product coverage, every clean
attribute against scores, raw-source coverage, status and recommendation totals,
finite JSON values and unchanged input hashes before publishing the output.
It does not retrain, rescore or change existing inputs.

Real-file verification additionally compares every flat recommendation row and
every product status to the existing scoring tables, resolves all peer IDs and
checks scope guards. Local evidence is in
`data/processed/web_integration/verification.json`. Run the ML suite with:

```bash
.venv/bin/python -B -m unittest discover -s ml/tests -v
```

Database import, web rendering, authorization and image display are not verified
by an offline export.
