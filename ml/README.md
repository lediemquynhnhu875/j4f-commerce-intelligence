# Data and machine learning pipeline

Owner: Huy. Reviewer: Nhu.

## Outputs

| Stage | Main output |
| --- | --- |
| Prepare | `data/processed/clean_products.csv` |
| Taxonomy review | `data/processed/taxonomy_review_sample.csv` |
| Peer retrieval | `data/processed/peer_features.csv` |
| Model evaluation | `ml/artifacts/model_metrics.json` |
| Final scoring | `data/processed/product_scores.csv` |

Audit outputs include exact duplicates, duplicated product IDs, rejected rows, data quality metrics, and the saved model bundle.

The supplied six-file snapshot currently produces these checks:

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

## Model guardrail

Model A uses only actionable product fields and supplies the primary flags. Model B includes review count and rating only as a comparison because those fields accumulate after sales. All training metrics use out-of-fold predictions grouped by seller.
