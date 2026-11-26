# Automated model retraining (ML part)

Status: ML job, gates and workflow template implemented on `feature/ml-retrain-automation`
(2026-11-26). Backend, database and frontend parts are not built; see "What the backend must provide".
Design and team decisions: the "Cập nhật model" design doc (Claude Docs, shared by the team).

## What the job does

`python -m ml.src.retrain.run` runs one job and writes `gate_report.json` with `status`:

| Status | Meaning |
| --- | --- |
| `skipped` | Fewer than 100 verified observations since the last training run, or fewer than 2 stores. Nothing is trained. |
| `rejected` | A gate failed. A ZIP may exist in the output directory but must not be released. |
| `ready` | All gates passed. The ZIP may become a GitHub Release; it is not active until an Admin applies it. |

Steps:

1. **Training set A'** (`training_set.py`): base corpus plus the latest verified observation per
   (`store_id`, `sku`). A corpus product with a newer observation is replaced (one row per product);
   store-only products are appended. Unusable observations are dropped and counted by reason
   (future or missing `observed_at`, unverified, non-VND, invalid quantity, protected evaluation ID).
2. **Store weights**: every row is kept. Rows from a store that contributed `n` rows get training
   weight `min(1, C / n)`, where `C` is the 0.99 quantile of products per seller in the base corpus
   (138 for the current corpus). Corpus rows keep weight 1. Weights only change learning: every
   reported metric stays unweighted, and `model_metrics.json` records `sample_weight`.
3. **Pipeline**: taxonomy v3 (fixed rules), peers, Model A/B training with seller-grouped 5-fold
   evaluation, scoring.
4. **Gates** (`gates.py`, thresholds in `ml/config/retrain.yml`):
   1. Data: required columns, unique IDs, no fewer rows than the base, no protected IDs from store data.
   2. Taxonomy: passes when the rules equal the running bundle's; changed rules need a random-sample
      score (`--taxonomy-report`) of at least 85%.
   3. Model A: same boosting library as the running model; ROC-AUC at most 0.01 below and RMSLE at
      most 0.02 above the champion; both better than the peer baseline. The champion is the running
      configuration retrained on the same A'; when pipeline and taxonomy are unchanged it equals the
      challenger, so this gate then guards library and baseline only.
   4. Output: no status share moves more than 5 percentage points from the running model's scoring
      summary, and the packed ZIP unpacks, loads in `ServingModel` and predicts.
5. **New-data slice** (report only): challenger out-of-fold metrics versus the frozen running model on
   store-sourced rows.
6. **Pack**: `sellens-ml-<model_version>.zip` with the A' corpus and taxonomy v3.

Run locally (scikit-learn, like production; LightGBM must not be importable):

```sh
python -m ml.src.serving.assets unpack --archive ml/artifacts/sellens-ml-v3.zip \
  --sha256 1d5be95fdd6a5a42acc3b33ccab90706490b05742f361f6053b6c2566466b574 --output /tmp/champion
python -m ml.src.retrain.run --base data/processed/clean_products.csv \
  --observations observations.csv --champion-dir /tmp/champion \
  --previous-summary data/processed/taxonomy_v3_run_sklearn/product_scores.summary.json \
  --output-dir /tmp/retrain-job --since 2026-11-01T00:00:00Z
```

## Workflow template

`ml/src/retrain/retrain.yml` is copied to `.github/workflows/retrain.yml` in the private
`sellens-ml-assets` repository. It runs weekly (Monday 02:00 ICT) and on `workflow_dispatch`, one job
at a time. It downloads and SHA-checks the running release, installs that bundle's exact Python and
library versions, exports observations from Neon, runs the job, and publishes a release
`auto-<model_version>` (with `gate_report.json` and `product_scores.summary.json`) only when `ready`.
It reports every outcome to the backend callback when one is configured.

Repository settings in `sellens-ml-assets`:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `RUNNING_TAG`, `RUNNING_FILE`, `RUNNING_SHA256` | Same values as the Render service; the backend updates them when an Admin applies a version |
| Variable | `PYTHON_VERSION` | `3.13.13` (must equal the bundle manifest) |
| Variable | `CODE_REPOSITORY`, `CODE_REF` | This repository and branch |
| Secret | `CODE_REPOSITORY_TOKEN` | Fine-grained token, Contents: read on this repository |
| Secret | `NEON_READONLY_URL` | Read-only role allowed to select `ml_training_observations` only |
| Secret | `RETRAIN_CALLBACK_URL`, `RETRAIN_CALLBACK_TOKEN` | Optional until the backend endpoint exists |
| File | `corpus/clean_products.csv` | Base corpus (`data/processed/clean_products.csv`) |
| File | `corpus/product_scores.summary.json` | v3 scoring summary, used until a job-made release is running |

The template is not yet run on GitHub; the job itself was run locally (below).

## What the backend must provide (owner: Mai)

- Table `product_sales_observations` and view `ml_training_observations` with the columns in
  [data contracts](../rules/data-contracts.md#retraining-observation-export-proposal-2026-11-26).
- Admin approval of import batches (sets `verified_at`), with warnings for decreasing cumulative
  sales, sudden jumps and future dates.
- Tables `model_training_jobs` and `model_versions`, `POST /admin/model-updates` (dispatches the
  workflow with `job_id`), the callback endpoint, and **Áp dụng**: switch Render
  `ML_ASSET_GITHUB_TAG`/`ML_ASSET_GITHUB_FILE`/`ML_ASSET_SHA256`, redeploy, check `/health/ready`,
  roll back on failure, then update the `RUNNING_*` variables above.
- Re-analysis after an approved sales update (separate from retraining).

## Known limitations

- `ServingModel.infer` refuses products whose `source_product_id` is in the bundle corpus
  (`AlreadyInCorpus`), because their predictions would be in-sample. All imported demo products come
  from the corpus, so "re-analyse after a sales update" cannot use live inference for them. Options:
  take their status from the job's out-of-fold `product_scores.csv` after an Admin applies a
  release, or accept in-sample live scoring with a visible note. Undecided.
- Store-only products enter the corpus after a release; the backend must send their
  `store-<store_id>-<sku>` ID as `source_product_id` so the same guard applies.
- Sales in the 2023 corpus have no capture date, so no period sales are computed against them.
- The protected-ID list and taxonomy labels are local files; the workflow passes neither yet.
EOF