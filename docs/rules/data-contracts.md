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

## Retiring development data (prepared, not executed)

Development maintenance exception: [ADR 0008](../decisions/0008-retire-development-catalog.md)
defines an explicit preview/fingerprint/backup CLI for retiring the ten original
registered synthetic products and their verified test-only dependents. It does
not change API history immutability or ML data. No deletion was executed during
the instruction session. A committed cleanup adds the seed-retirement marker,
which prevents full development seed from recreating the sample catalog.

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

Presentation amendment (2026-10-17, updated by the later UI request): live overview
always includes all API products; the ML/all source-switch controls are removed.
Charts use the catalog product count as denominator, including a no-analysis segment.
Only each product's latest saved analysis contributes to status/reference/work
metrics. "Cần rà soát" counts distinct analyses with proposed/accepted/in_progress
actions; it is not the importer's needs_review flag and is not a new ML status.
No API field, database record or rule output is changed by this presentation.

Full UI presentation amendment (2026-10-17): live User/Admin pages reuse preview
layout primitives with explicit authenticated data. Preview fixture accounts,
products, stores, thresholds and job metrics are never live fallback values.
User evidence uses frozen input values and original evidence; Admin monitoring
counts saved analysis history, not live jobs. Configuration displays saved model,
rule and taxonomy versions read-only. Missing store APIs show an unavailable
layout; missing image URLs show a placeholder. Suggestion list/Kanban uses actual
action states, preserving expected_updated_at and immutable originals/history.
Mai/Huy/Nhung should review these presentation meanings; no DTO/schema/status
identifier or ML rule changes accompany this UI amendment.

Status-color presentation: `frontend/src/lib/status-colors.ts` assigns stable,
distinct colors to all 15 analysis identifiers, the UI-only no-analysis state and
six work states. Live badges, status chart segments/legends, filters and Kanban
reuse these colors. Colors do not change labels, ML decisions or API identifiers.

Product display codes: live identity blocks render `SP-<source_product_id>` below
the product information, falling back to `SP-<id>` when the source ID is absent.
An existing SP prefix is not duplicated. This is a display convention, not a new
SKU/database column; API paths and mutations continue to use the application ID.

Evidence review-action presentation: the live evidence table retains numeric
differences and adds links to existing actions from the selected analysis only.
Associations use canonical action types: price -> review_price; images/video ->
their respective review types; description length -> complete_description;
rating/review count -> inspect_reviews; observed sales/probability -> visibility
or stock review. Legacy combined media actions can appear on both media rows.
No matching action displays "Chưa có đề xuất". Unknown metrics do not receive
automatic actions; numeric differences never generate recommendations in the UI.
These links target saved suggestion details; they do not accept or create work.

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

## Proportional ML batch (2026-10-19)

A second bounded import, run key `ml-v2-proportional-125-v1`, adds 125 products so
the demo catalog reflects the corpus status distribution instead of the first
import's 25-per-status stratification. Combined catalog: 225 products, 225
analyses, 255 actions. Each status lands within 0.16 percentage points of the
corpus share. `positive_feedback_low_sales` and `low_rating_low_sales` stay at
zero because the scored corpus contains none.

No DTO, column or status changed. The batch reuses the first import's mapping,
its five categories and its quality gates, and records its own `analysis_runs`
row. Selection excludes the first import's products by recomputing them from the
snapshot, so it is a pure function of the source file and reruns insert nothing.

Status shares now approximate the corpus; product types do not. The catalog
remains the original five fashion types and is not a sample of the corpus mix.
The run manifest states this.

`products.thumbnail_url` is filled by `scripts/fetch-thumbnails.ts` from the public
Tiki product API, verified to serve before being stored, and only ever where the
column is null. Listings delisted since the 2023 snapshot keep a null thumbnail.
Live media is a display asset and is never analysis input: snapshot `has_video`
and `number_of_images` stay canonical.

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

## Live Model A pilot

`POST /api/v1/products/:id/analyses` requires the active owning User and an
`Idempotency-Key` of 1–200 printable non-space ASCII characters. The application
constructs the request from the saved product. Responses are 201 for a new
successful run and 200 when replaying the same key and snapshot, with
`{data:{id,status,reused}}`. Snapshot changes cause 409. Failed calls return
controlled 4xx/5xx responses without a saved result. Any existing product
analysis remains available. Import preview and commit do not invoke ML.

Backend sends a separate, bearer-authenticated `POST /v1/infer` request with
`schema_version: "sellens-inference-v1"`. Allowed product fields are name,
up to 10,000 description characters, category name, source product ID,
price, original price, quantity sold, rating, review count, image count and
video presence. Sales and feedback are observations for scoring rules, excluded
from Model A features. The pilot supports VND and uses a fixed corpus; other
stores' private application data stays in Neon. IDs in the training corpus
return 409. No raw peer rows are returned.

Results save the Model A version, taxonomy/rules versions and the bundle,
corpus, taxonomy and configuration hashes. Input version, comparable-product
evidence, new original suggestions and their audit events are saved atomically.
Gap remains observed minus reference in the app database. Missing numeric
values are JSON null; insufficient basis may be saved with a specific reason.
The pilot is synchronous and does not persist technical processing failures.
See the [deployment guide](../ml/trien-khai-ml-render.md) and
[architecture decision](../decisions/0012-live-model-a-pilot.md).

## Current import and admin privacy contract — 2026-11-13

This amendment supersedes earlier Admin catalog/detail permissions above.
Each regular account owns its persisted store. Preview and commit derive store
ownership from authentication, never file-provided account/store fields.
POST `/api/v1/products/import/preview` accepts `{items: [...]}` and returns
`{data:{total,create_count,update_count,invalid_count,ignored_columns,rows}}`.
Each row includes its one-based data-row index, operation, name, price, errors and
warnings. CSV headers are excluded from data-row numbering. Commit accepts the
same raw items, revalidates them and returns counts for created/updated records.
The existing bare-array commit body remains accepted. Missing/blank update fields
retain existing values. Imports do not recompute or mutate historical analyses.
Import identity is a source product code scoped to the store, or a warned
deterministic name key. Category names resolve/create supporting categories.
Product writes now also validate HTTP(S) `image_urls` and `video_url`.
Limits are 1,000 data rows and 256 KiB JSON body. Preview never writes records.

Admin's `/api/v1/admin/summary` DTO exposes counts, `recent` saved batches and
technical `versions`. `analysis_requests` and `running_requests` are null until
job tracking exists. Detailed customer product/category/analysis/action routes
return 403 for Admin. Correct-password suspended login returns
`403 ACCOUNT_SUSPENDED`; wrong credentials remain 401.

## Saved analysis timeline — 2026-11-18

The Analysis page uses the existing owner-scoped
`GET /api/v1/products/:id/analyses` endpoint. The chart maps `analyzed_at`
to the horizontal time axis and frozen `input_snapshot_json.quantity_sold`
to the vertical sales axis. Every analysis has a selectable marker. Missing
sales use a separate diamond marker outside the numeric scale. Zero is a
valid observation. The selected analysis controls the evidence and actions.
The page defaults to the newest result within the active range. Date filters
are inclusive in Asia/Ho_Chi_Minh, from the most recent June 1 through the
current date by default. Explicit analysis IDs select results within that range.


## Store-scoped workspace reads

- `GET /api/v1/workspace/summary` returns `store_name`,
  `latest_analyzed_at`, `proposed_count`, and `legacy_statuses` for the
  authenticated active store.
- `GET /api/v1/analysis-workspace?from=YYYY-MM-DD&to=YYYY-MM-DD` accepts
  optional `product_id` or `analysis_id` for a bookmarked analysis. The owner
  receives `product` with `category_name`, a `timeline` of `id`,
  `analyzed_at` and frozen `quantity_sold`, and `latest` with `analysis`
  and `actions`, or null when there is no result in range. Boolean `has_analysis`
  indicates whether any result exists for the scoped product across all dates. Vietnam calendar
  days are inclusive. Timeline order is `analyzed_at DESC, id DESC`.
- `GET /api/v1/products/:id/analyses/:analysisId` returns the matching
  `{analysis, actions}` only when the product belongs to the authenticated
  active store and the analysis belongs to the product. Unavailable IDs return
  404. Admin is denied access to these owner routes.
- `GET /api/v1/products?view=catalog` returns the requested page and total
  after applying name/code search, category, latest status and the concluded
  filter. The server supports default concluded-first ordering, price
  ascending and quantity sold descending with product ID as the tie-breaker.
  Each row exposes product table fields, `latest_status`, `product_type`,
  and `action_titles`. The response also includes `undecided_count` in
  the current product search/category scope before status filtering.


## Admin pagination and reporting

- `GET /api/v1/stores?page=1&limit=50` accepts optional `search` for Admin
  store name or ID, and optional `sort=products_desc|products_asc`. Sorting
  applies to the full matched set before pagination, includes empty stores,
  and breaks equal product counts by ascending store ID. Admin responses include `totals.stores` and
  `totals.products` for the whole system. The page count uses the matching
  stores. User responses preserve owner scope and contain no system totals.
- `GET /api/v1/admin/accounts?page=1&limit=50` supports optional literal
  case-insensitive name/email `search` and `status=active|suspended`.
  Counts reflect the filters. The legacy `accounts` alias shares the handler.
- `GET /api/v1/admin/summary` accepts `view=overview|monitor|configuration`.
  Overview includes system totals and recent activity, monitor includes
  `recent`, and configuration includes `versions`. Omitting the view
  returns the full aggregate contract. These endpoints require active Admin
  authorization.


## Current store statistics

- `store_stats` stores one current aggregate row per `store_id`, including
  product and saved-analysis totals, the latest result's status distribution,
  category counts, and open work counters. `proposed_count` includes all saved
  analyses for the sidebar. `pending_review_count` counts only proposals on
  the latest analysis of each product for the overview card.
- `store_current_analysis` stores one current pointer per analyzed product to
  maintain accurate deltas and limit priority reads. Latest order is
  `analyzed_at DESC, id DESC`. The immutable source records remain in
  `product_analyses`.
- `GET /api/v1/workspace/overview` returns `summary`, saved `metrics`,
  `categories`, up to eight `priority` rows and up to four `suggestions`
  scoped to the authenticated active store. An account with no active store
  receives null summary and metrics and empty lists.
- Migration 005 backfills and installs triggers in the same transaction.
  Product, result and action changes and their counter changes commit or
  roll back together. The Admin store endpoint uses the same saved counts
  for both sort directions and keeps its existing pagination contract.


## Paginated suggestion cards

- `GET /api/v1/actions?view=cards&page=1&limit=20` scopes the results to the
  authenticated active store. It accepts `analysis_id`, `type`, `status`,
  and literal `search` across action title and ID. It orders by
  `updated_at DESC, id DESC` before applying the requested page.
- The response extends the paginated action shape with `product` on each
  card, unfiltered `status_counts` and `types`, filtered
  `matched_status_counts`, and a `has_analyses` flag. Counts describe all
  matches in their respective scope. The UI groups the current page by
  status in Kanban.
- `GET /api/v1/analyses?view=picker` returns paged IDs and product names for
  the add-work dialog. Optional search matches product name or analysis ID.
  The default action and analysis endpoints retain their existing contracts.
