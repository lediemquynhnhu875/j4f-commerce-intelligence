# Data contracts

This document is the initial interface between the data, ML, backend, and frontend workstreams. Column names may evolve, but changes must be reviewed by all affected owners.

## Shared-catalog backend amendment

The separately implemented backend follows the contributor's later shared-catalog
schema. See [scope amendment](../decisions/0004-shared-catalog-backend.md),
[REST contract](../../backend/README.md) and [verification](../verification/sellens-backend.md).
Its six tables are `users`, `categories`, `products`, `product_analyses`,
`improvement_actions`, `action_history`; PostgreSQL uses timestamptz/jsonb/numeric.
Regular API role `user` maps to database `reviewer`. All active accounts share the
catalog; admins manage accounts/catalog and append analyses. This supersedes store
ownership only for this backend deliverable, leaving frontend mocks and older
feature acceptance untouched. The nine supplied analysis statuses are preserved
in the migration/validator; they are not renamed ML statuses. No CSV or ML enum
was changed. Saved inputs/original suggestions/history are immutable. Nullable
sales/observation values remain unknown; sample analyses are synthetic records
with insufficient basis, no inference and no eligibility claim. Lists use bounded
pagination, ID/numeric output strings, strict input and safe errors. Mai/Huy/Nhung
must review these changed interfaces before frontend/model integration.

The contributor subsequently authorized frontend integration; see
[ADR 0005](../decisions/0005-frontend-api-integration.md). Live pages fetch the
existing DTOs through `/api/backend/*`; the frontend proxy removes `access_token`
and `token_type` from successful login JSON and saves the token in an HttpOnly,
SameSite cookie. It forwards Bearer authorization server-side; backend active/role
checks remain authoritative. No database URL reaches the browser. Configuration
uses server-only BACKEND_API_URL and optional public FRONTEND_ORIGIN for HTTPS.
Main pages use the exact nine statuses and nullable/frozen evidence, without mock
fallback. Unsupported stores, inference jobs and model/config writes are explicit.
Preview fixtures stay under `/preview/*` and cannot grant real permissions. Work
updates use `expected_updated_at` and immutable originals/history. Original
store/model/human-review acceptance remains pending despite this direct authorization.

## Multi-store ownership proposal (not applied)

Latest user-confirmed ownership proposal: one User owns multiple stores and each
application product/listing belongs to one store. See [ADR 0006](../decisions/0006-user-multiple-stores.md)
and [schema proposal](../architecture/sellens-multi-store.md). Proposed fields are
stores.owner_user_id and products.store_id; actor IDs/seller metadata are not
ownership. Initial legacy membership is nullable until explicitly assigned, then
required. Store-owner/product-store reassignment is guarded to preserve history.
No SQL has been applied and current APIs still use shared-catalog scope; tenant
enforcement is pending, not implied by foreign keys. ML imports remain deferred.

## Bounded imported ML sample (2026-10-16)

[ADR 0007](../decisions/0007-bounded-ml-sample-import.md) authorizes 100 products
in five groups of 20 in the shared catalog. Local input: `data/processed/products_full.json`
(`j4f-web-snapshot-v1`). No ownership is inferred. Product DTOs add nullable
source_system/source_product_id. Analysis DTOs add run_id, status_schema_version
(legacy_v1/ml_v2), status_reason, product_type, taxonomy_version, scored_at and
nullable prediction_lower/prediction_upper. Legacy statuses remain readable;
new imported analyses use the six ML codes. Action DTOs add origin and rule_id;
review_images/review_video are distinct; legacy review_images_or_video stays valid.
Original ML fields cannot be edited.

Map reference_sales to reference_sold, sale_probability to probability_positive_sales,
opportunity_score to priority_score and image_count to number_of_images. Freeze
observed sales in input_snapshot_json; derive sales_gap from this observation.
Imported analyzed_at/scored_at use source scoring time; analysis_runs.imported_at
records import time. evidence_json.items holds metric evidence; each original
suggestion's evidence/hypothesis/action/validation_needed is a string. Missing
references remain null; feedback-only insufficient_data may retain a reference.
No synthetic image, capture time, sales scope or quality acceptance is inferred.

## Live product media (2026-10-17)

Directly requested so the application shows real product images. Migration
`003_product_media.sql` adds nullable `video_url`, `image_urls` (jsonb array) and
`media_source_json` (jsonb object) to `products`, and `backend/scripts/import-media.ts`
fills them plus the existing `thumbnail_url` for the imported sample, matched on
(`source_system`, `source_product_id`). Product DTOs expose all four fields;
products without media keep them null. The Product type in the frontend marks
them optional so older responses stay valid.

The six 2023 source CSVs contain no media URLs. These URLs come from the public
Tiki product API fetched on 2026-10-17, so they describe the listing today, not
at snapshot time. They are display assets and must never be read back as snapshot
evidence or analysis input. Snapshot `has_video` and `number_of_images` stay
canonical and are not recomputed from live media; the live API agreed with
`has_video` for all 92 resolved products, while live image counts differ for 33.

`image_urls` entries carry `base_url`, `large_url`, `medium_url`, `small_url`,
`thumbnail_url` and `position`. `media_source_json` records `source`, `fetched_at`,
`http_status`, `resolved`, `primary_image_url`, `primary_image_http_status`,
`gallery_is_placeholder`, `api_image_count`, `product_url` and the media file's
SHA-256. Only `https` URLs are stored. Eight sample products return HTTP 404
because their listings were delisted; they keep null media and `resolved: false`,
and the UI shows the existing placeholder tile with the reason. `products.product_url`
stays null, unchanged by this import.

## Clean products

Path: `data/processed/clean_products.csv`

Required fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `product_id` | string | Stable product identifier |
| `product_name` | string | Normalized display name |
| `seller_id` | string | Seller identifier used for grouped model splits |
| `brand` | string | Normalized brand |
| `category_raw` | string | Original category value |
| `product_type` | string | Normalized taxonomy label |
| `price` | number | Current product price |
| `original_price` | number/null | Price before discount, when available |
| `discount_rate` | number/null | Normalized discount rate |
| `rating_average` | number/null | Snapshot average rating |
| `review_count` | integer | Snapshot review count |
| `quantity_sold` | integer | Observed sales in the source snapshot |
| `has_video` | boolean/null | Whether a product video is present |
| `image_count` | integer/null | Number of product images |
| `description_length` | integer/null | Normalized description length |
| `data_quality_issue` | string | `none` or an auditable data issue |
| `valid_for_model` | boolean | Whether essential fields are valid for peer/model logic |
| `taxonomy_version` | string, v2 outputs | Version of the taxonomy used to assign product type |

Taxonomy v2 (`v2-unisex-description`) adds eight labels: `sandal unisex`,
`sandal khác`, `giày lười unisex`, `giày lười khác`, `boots unisex`, `boots khác`,
`giày unisex`, `giày khác`. Unisex requires affirmative evidence for both genders;
`khác` in these families means the structural type is known but gender or finer
subtype is not. Size and source filename do not establish gender. Existing
`giày thể thao khác` and `ví khác` retain their prior unisex/unspecified scope.
All 67 label definitions are in `ml/config/taxonomy_label_guide_v2.yml`.
Original annotation and holdout labels remain unchanged; AI-proposed schema
migrations are identified separately and do not become independent ground truth.

## Product scores

Path: `data/processed/product_scores.csv`

Required fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `product_id` | string | Joins to the clean product table |
| `peer_count` | integer | Number of valid comparable products |
| `peer_ids` | JSON string | Ordered comparable-product identifiers |
| `peer_quality_reason` | string | Empty when valid; otherwise explains insufficient peer evidence |
| `observed_sales` | integer | Observed quantity sold |
| `reference_sales` | number/null | Expected sales under the reference model |
| `prediction_lower` | number/null | Lower reference interval bound |
| `prediction_upper` | number/null | Upper reference interval bound |
| `opportunity_score` | number/null | Priority score; larger means higher priority |
| `status` | enum | One of the approved product statuses |
| `evidence` | JSON string | Facts used to explain the status |
| `recommendations` | JSON string | Suggested actions linked to evidence |
| `model_version` | string | Reproducible scoring version |
| `scoring_rules_version` | string | Status/action rule version, separate from model training |
| `scored_at` | ISO 8601 string | Scoring timestamp |
| `status_reason` | string | Stable reason code for the selected status |
| `status_label_vi` | string | Vietnamese display label for the stable status |
| `status_explanation_vi` | string | Human-readable explanation of the observed/reference comparison |
| `analysis_is_hypothesis` | boolean | Always true for this snapshot-based rule engine |
| `analysis_limitations_vi` | string | Snapshot, taxonomy/peer and non-causal interpretation limitations |

Scoring emits `product_scores.summary.json` beside the CSV with all six status
counts (including zero counts), reason/action counts, score timestamp and model
versions. Recommendations are JSON arrays of objects containing `rule_id`, `evidence`,
`hypothesis`, `action` and `validation_needed`; evidence arrays use finite numbers
or JSON null. Missing model predictions do not silently become baseline estimates.
Baseline mode must be explicitly selected and uses `peer-baseline-v1`.
Missing peer/model/observed-sales basis clears the primary reference and interval
fields. Feedback-only insufficiency retains valid reference fields and may emit
listing recommendations supported by peers; opportunity priority remains null.

Out-of-scope or unresolved product types also suppress actions and clear primary
references (`out_of_scope_product` / `unresolved_product_type`). Enriched peer
snapshots include `good_peer_sales_threshold`, `good_peer_count`,
`good_peer_video_known_count` and nullable `good_peer_video_share`. Good peers
have positive observed sales at or above the selected-peer 75th percentile;
unknown video presence is excluded from the share denominator.

The separate MVP v2 export lives in `data/processed/scoring_mvp_v2/`:
`product_statuses.csv` contains one row per product, while
`product_recommendations.csv` contains one row per action with `product_id`,
the five recommendation fields, model/rule versions and scoring time. Products
without recommendations have no rows in the action table. These full-data exports
stay outside Git; the aggregate report is shared under `ml/reports/metrics/`.

See [interpretation guide](../ml/interpretation-guide.md) for decision order and thresholds.

Approved statuses:

- `positive_feedback_low_sales`
- `low_rating_low_sales`
- `performing_well`
- `untapped_potential`
- `difficult_to_sell`
- `insufficient_data`

The frontend may display Vietnamese labels, but storage and API values use these stable identifiers.

## Guardrails

- `review_count` and `rating_average` are excluded from the primary actionable reference model; they may be used in a comparison model and status interpretation.
- `favourite_count` is excluded because it is zero throughout the supplied snapshot.
- `date_created` is excluded until its unit and meaning are verified.
- A recommendation must cite observable evidence and must not be phrased as a causal guarantee.

## Planned application and serving extension

Status: reviewed planning baseline, not an implemented API or applied schema.
The CSV fields above remain intact. Differences discovered in real data must
be resolved by Mai and Nhung before publication.

- `quantity_sold` and `observed_sales` are the observed target, never estimator
  features for predicting that same target. Missing essential cleaning values
  are rejected/audited. Optional values stay null rather than becoming zero.
- The app's product ID is a persisted `StoreProduct` ID. CSV `product_id`
  becomes `source_product_id` in provenance. Explicit assignments link app
  products to stores; source `seller_id` is not account ownership.
- Admin provisions accounts. An active User has one store; every nested product,
  analysis, suggestion, action and history lookup enforces original store scope.
- Imported snapshots are immutable and record source/checksum/import metadata.
  Unknown capture time or observed-sales window stays unknown; `scored_at`
  does not stand in for source capture time.
- Inference receives allowlisted model features and a separate observation.
  Artifacts include fitted preprocessing/model, calibration, dependency versions,
  config/taxonomy/corpus identity and evaluation provenance. No request-time fit.
- Inference numeric outputs must be finite or JSON null. No-model or insufficient
  peer basis yields unavailable references/intervals and explicit reasons.
  Feedback-only insufficiency can retain valid references with its reason.
  Nonfinite service responses violate the contract.
- Processing values `pending`, `running`, `succeeded` and `failed` are distinct
  from the six analytic statuses above. A successful `insufficient_data` result
  is not a technical processing failure.
- Saved analyses freeze input/output, approved peer/source evidence, recommendations,
  limitations and model/config versions. Reassignment and later product edits
  do not rewrite historical evidence or ownership.
- Recommendation rules run in Python and are reused by serving. Public peer
  fields may be disclosed through approved DTOs; other stores' private app records
  may not.
- Original suggestions remain immutable. Action state and append-only history
  are written atomically with version checks; completion is work progress, not
  verified sales uplift.

Authoritative feature details:
[identity](../../specs/001-web-foundation/contracts/interfaces.md),
[catalog](../../specs/002-product-catalog/contracts/interfaces.md),
[ML readiness](../../specs/003-ml-readiness/contracts/interfaces.md),
[serving](../../specs/004-analysis-integration/contracts/interfaces.md),
[presentation](../../specs/005-user-dashboard/contracts/interfaces.md),
[actions](../../specs/006-improvement-workflow/contracts/interfaces.md), and
[Admin](../../specs/007-system-admin/contracts/interfaces.md).
