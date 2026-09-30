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
| `scored_at` | ISO 8601 string | Scoring timestamp |

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
