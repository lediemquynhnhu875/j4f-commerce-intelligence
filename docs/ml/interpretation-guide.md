# Status and Recommendation Rules

These rules implement steps 6 and 7 of the MVP using Model A predictions and
peer evidence. All statuses and actions are hypotheses for human review.
Observed sales are snapshot totals with an unverified observation window;
reference sales are not forecasts. Taxonomy v2 frozen holdout accuracy is 63%,
below the 85% readiness gate, so these outputs remain exploratory.

## Decision Order

Rules are evaluated in the following order. Configuration comes from
`ml/config/pipeline.yml`.

| Condition | Status |
| --- | --- |
| Product type outside fashion scope, unknown, unmatched or ambiguous | `insufficient_data`; no actions or primary reference |
| Invalid essential data; fewer than 15 peers; mean similarity below 0.10; missing observed sales or valid Model A reference/interval | `insufficient_data` |
| Zero observed sales and sale probability >=0.50 | `untapped_potential` |
| Zero observed sales and sale probability <0.50 | `difficult_to_sell` |
| Positive observed sales >= prediction lower bound | `performing_well` |
| Positive sales below lower bound, but fewer than 10 reviews or unavailable valid rating | `insufficient_data` (feedback-only) |
| Positive sales below lower bound, >=10 reviews and rating >=4.0 | `positive_feedback_low_sales` |
| Positive sales below lower bound, >=10 reviews and rating <4.0 | `low_rating_low_sales` |

A wide interval can leave no products in the two feedback/low-sales statuses.
Do not change thresholds solely to populate all six statuses. Automated tests
exercise all six branches with controlled inputs. Model B never supplies the
primary status reference. Baseline mode is explicit and uses the group median
as both interval bounds; it has no learned uncertainty interval.

## Actions and Evidence

| Rule | Suggested action |
| --- | --- |
| Price > peer median by more than 15% | Review price positioning and product differentiation |
| Image count < peer median | Add material, dimension and use-angle photos |
| Video explicitly absent; >=5 good-selling peers have known video presence and >=40% of those have video | Assess adding a short product video |
| Description length < max(100 characters, 70% of peer median length) | Add material, size, use and care details |
| Rating below 4.0 with >=10 reviews | Read/group reviews and investigate quality or experience issues |
| Zero sales with high reference probability | Review search keywords, visibility and stock; obtain click/impression/stock data |

Good-selling peers have positive observed sales at or above the selected peers'
75th percentile (threshold at least 1). The target is excluded. Video share uses
only those good-selling peers with known video presence; unknown values do not
count as absence. This snapshot-based subset is not verified future performance.
Rules can emit recommendations for performing or difficult-to-sell products
when evidence supports a specific check. Insufficient peer/model basis suppresses
recommendations. Feedback-only insufficiency can retain listing recommendations.
Price/description thresholds are heuristics requiring human validation.

Each recommendation includes a stable `rule_id`, an observed fact, a tentative hypothesis, an action
and a validation step. Review product differences before applying suggestions;
neither peer associations nor before/after changes establish causality.

## Reproduce Scoring

For the completed v2 snapshot, reuse stored Model A predictions and export
full scores plus compact status/action tables into a separate directory:

```bash
.venv/bin/python -B -m ml.src.scoring.run_mvp \
  --input-dir data/processed/taxonomy_v2_run \
  --output-dir data/processed/scoring_mvp_v2
```

Use a new output directory when rerunning; completed scores are not overwritten.
`product_statuses.csv` has one row per product; `product_recommendations.csv`
has one row per action. `scoring_rules_version` is independent of `model_version`.
The aggregate report is `ml/reports/metrics/scoring_mvp_v2.json`.

With peer features and predictions in the default processed folder:

```bash
.venv/bin/python -B -m ml.src.cli score
```

To use the existing source snapshot and write separate outputs in this checkout:

```bash
.venv/bin/python -B -m ml.src.cli score \
  --processed-dir '/Users/nhule/Desktop/COMPETITION/AISC 2026/data/processed' \
  --output-file data/processed/product_scores.csv
```

This reuses stored out-of-fold predictions; it does not retrain models or verify
the saved model bundle. The CSV and adjacent `.summary.json` record scoring time
separately from the original model version. Generated full-data CSVs stay outside Git.
