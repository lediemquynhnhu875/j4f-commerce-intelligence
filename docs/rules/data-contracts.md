# Data contracts

This document is the initial interface between the data, ML, backend, and frontend workstreams. Column names may evolve, but changes must be reviewed by all affected owners.

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
