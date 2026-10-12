# Data and machine learning pipeline

Owner: Nhung. Reviewer: Như. Cleaning/data engineering: Mai.

Python 3.13 and project dependencies are installed in the local `.venv`;
synthetic tests pass. Full source data and model binaries remain in the separate
AISC 2026 checkout. Independent taxonomy accuracy is 58%, below the 85% gate,
so full ML readiness is not established. See
[the evidence audit](../docs/verification/planning-audit.md) and
[F003 verification tasks](../specs/003-ml-readiness/tasks.md).

## Outputs

| Stage | Main output |
| --- | --- |
| Prepare | `data/processed/clean_products.csv` |
| Taxonomy review | `data/processed/taxonomy_review_sample.csv` |
| Peer retrieval | `data/processed/peer_features.csv` |
| Model evaluation | `ml/artifacts/model_metrics.json` |
| Final scoring | `data/processed/product_scores.csv` |

Audit outputs include exact duplicates, duplicated product IDs, rejected rows, data quality metrics, and the saved model bundle.

Historical six-file snapshot results, not reproduced in this planning session:

- 41,603 raw rows and 41,576 unique clean products.
- 22 exact duplicate rows removed.
- 27 duplicated product IDs in raw data; 5 remain non-identical after exact duplicate removal.
- One zero-price gift listing is retained for audit but marked `valid_for_model = false`.
- `favourite_count` is excluded and `date_created` is preserved only as raw metadata.

## Run

From the repository root:

```bash
python3 -m pip install -e .
python3 -m ml.src.cli prepare
python3 -m ml.src.cli peers
python3 -m ml.src.cli train
python3 -m ml.src.cli score
```

The default installation uses scikit-learn's histogram gradient boosting so the pipeline works without compiled optional packages. Install the competition model backend with:

```bash
python3 -m pip install -e ".[boosting]"
```

When LightGBM is available, the pipeline selects it automatically and records the backend in `model_metrics.json`.

Run every stage after the taxonomy sample has been reviewed and validated. Review annotations are preserved across `prepare` runs when both `product_id` and the predicted type are unchanged:

```bash
python3 -m ml.src.cli run-all
```

For a baseline result before model training:

```bash
python3 -m ml.src.cli score --baseline-only
```

## Taxonomy checkpoint

Edit the rules in `ml/config/taxonomy.yml`, run `prepare`, and manually fill `is_correct` plus `corrected_product_type` in the 200-row review sample. Then run:

```bash
python3 -m ml.src.cli validate-taxonomy
```

Do not proceed to peer groups unless coverage is at least 90% and reviewed accuracy is at least 85%. Corrections in the review file are evidence for improving the rules; they are not automatically applied to the full dataset.

`taxonomy_summary.json` separates assignments made by category/name rules from lower-confidence source-file fallbacks. `taxonomy_review_metrics.json` reports accuracy overall and by taxonomy source.

## Independent taxonomy and peer review

After building peers, create the next manual-review round with:

```bash
python3 -m ml.src.cli create-review-queues
```

This writes three editable files under `data/processed/review_queues/`:

- `taxonomy_holdout_review.csv`: assign `human_product_type` without opening the private predictions file.
- `taxonomy_fallback_review.csv`: assign `proposed_product_type` and optionally suggest a reusable keyword.
- `peer_pairs_review.csv`: enter `đúng` or `sai` in `is_relevant` for each target-peer pair.

The holdout excludes IDs from previous taxonomy review files. Do not update taxonomy rules from
the holdout; use the fallback queue for rule development. After all reviews are filled, run:

```bash
python3 -m ml.src.cli evaluate-review-queues
```

## Model guardrail

Model A uses only actionable product fields and supplies the primary flags. Model B includes review count and rating only as a comparison because those fields accumulate after sales. All training metrics use out-of-fold predictions grouped by seller.

## Status and Recommendations

`score` assigns six stable statuses, Vietnamese explanations and evidence-backed
rule recommendations; it also writes a `.summary.json` beside the output CSV.
Use `--output-file` to preserve existing results when scoring another snapshot.
Missing predictions do not fall back to baseline unless `--baseline-only` is
explicitly selected. See [interpretation rules](../docs/ml/interpretation-guide.md)
and [data contract](../docs/rules/data-contracts.md).

Export steps 6 and 7 from the existing v2 snapshot without retraining:

```bash
.venv/bin/python -B -m ml.src.scoring.run_mvp \
  --input-dir data/processed/taxonomy_v2_run \
  --output-dir data/processed/scoring_mvp_v2
```

Use a new output directory on subsequent runs. This adds good-selling-peer video
evidence, scope guards and stable action IDs. Outputs include full scores,
`product_statuses.csv` and flat `product_recommendations.csv`; CSVs stay ignored.
Shared aggregate results are in `ml/reports/metrics/scoring_mvp_v2.json`.
Taxonomy quality gates remain unmet; these are exploratory review suggestions.

## Taxonomy V2 Experiment

V2 adds eight unisex/unknown-gender types and fixes main-item, gift, description
and structural precedence. V1 configuration remains available. Rebuild v2 config:

```bash
.venv/bin/python -B -m ml.src.taxonomy.build_v2
```

The contributor explicitly requested a full model rerun despite the failing
independent gate. The dedicated experiment runner records that exception and
keeps results separate; ordinary CLI taxonomy checkpoints still apply.

```bash
.venv/bin/python -B -m ml.src.evaluation.rerun_taxonomy_v2 \
  --source-dir '/Users/nhule/Desktop/COMPETITION/AISC 2026/data/processed'
```

The completed run is in `data/processed/taxonomy_v2_run/`, with reference model
artifacts in `ml/artifacts/taxonomy_v2_run/`. Use new `--output-dir` and
`--artifact-dir` paths to preserve completed experiments on rerun. Frozen-v1
holdout accuracy is 63%, below 85%; the old 200-row development review is 81%.
The full pipeline ran experimentally, not as an acceptance/release pass.
See `docs/ml/taxonomy-v2-rerun.md` for schema and evaluation limitations.
