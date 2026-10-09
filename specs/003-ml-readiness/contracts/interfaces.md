# Interface Contracts: ML Analysis Readiness

**Feature ID**: F003

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Inference readiness contract (review before F004)

Model features are an explicit allowlist derived from reference.py; quantity_sold,
observed_sales and all derived target-sale values are forbidden estimator inputs.
Observed sales remains a separate nonnegative-integer observation used after prediction
for gaps/status interpretation. Review count/rating are excluded from Model A.
Required feature presence, nullable values and unknown categories must match the
fitted preprocessing schema; never refit preprocessing on a request.

Inspected Model A allowlist in `ml/src/models/reference.py`:

| Feature | Input type / mapping to verify in F003 |
| --- | --- |
| price | Finite nonnegative number; zero-price rows remain ineligible |
| discount_rate | Finite number 0..1 or null |
| description_length, name_length, image_count | Nonnegative integer or null; name_length derived by existing cleaner |
| has_video | Boolean or null, converted using the existing feature preparation |
| fulfillment_type, product_type | Reviewed strings; unknown handling follows the fitted pipeline |

Model B adds review_count and rating_average for an explicitly identified
comparison. Product/source/seller IDs are retrieval/provenance metadata, never
target-estimator features. Existing clean output includes name_length and
fulfillment_type beyond the minimum shared CSV table; F002/T006 and F003/T003
must preserve/validate them for serving. This allowlist is inspected code,
not proof that a saved compatible bundle is available.

The artifact manifest must identify model_version, artifact checksum, dependency
versions, feature schema, fitted pipelines, calibration parameters, config_version,
taxonomy_version, peer_snapshot_id, source provenance and evaluation evidence.
Fitted-model serving is evaluated independently; it need not equal per-row OOF CSV values.

Result fields preserve product_id, peer_count, peer_quality_reason, observed_sales,
reference_sales, prediction_lower, prediction_upper, opportunity_score, status,
status_reason, evidence, recommendations, model_version and scored_at.
Extensions include result_schema_version, basis_reason, limitations, config_version,
peer_snapshot_id and source_snapshot_id. None silently renames the existing fields.
Numeric values must be finite or JSON null; no NaN/Infinity or fabricated zero.
No-model and insufficient-peer references/intervals are null. Feedback-only
insufficiency can retain valid references with a clear reason. A baseline result
must have an explicit baseline model version and cannot masquerade as trained inference.

Approved analytic status values remain positive_feedback_low_sales,
low_rating_low_sales, performing_well, untapped_potential, difficult_to_sell,
insufficient_data. Recommendation objects retain evidence-linked reasoning and
validation-needed language. Technical processing state is not an analytic status.

Human verification gates: taxonomy coverage >=90%, reviewed accuracy >=85%;
round2 holdout accuracy >=85%, overall peer relevance >=80% with band breakdown,
fallback review 100% complete before rule additions. A team reviewer must define
the low-band non-collapse criterion before evaluating it, not after seeing results.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
