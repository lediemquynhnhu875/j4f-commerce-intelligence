# Taxonomy V2 and Model Rerun

Date: 2026-10-12 (Asia/Saigon). The contributor requested missing unisex labels,
description/precedence fixes, holdout reevaluation and a full model rerun.

## Schema and Rules

Added eight labels, taking the canonical set from 59 to 67: sandal, loafer,
boots and generic shoes each get a unisex and unknown-gender label. Affirmative
unisex evidence differs from missing gender. Specific sneaker and wallet labels
keep their existing behavior. See `ml/config/taxonomy_label_guide_v2.yml`.

`ml/src/taxonomy/rules.py` uses the v2 path only when explicitly supplied v2 config.
Specific main-item title phrases precede category; broad terms defer to category
and compatible description. Gift phrases are removed from matching text, not
display names. Structural boot/sandal/wedge and backpack types precede generic
heel/laptop descriptions. Description matching is opt-in, capped at 900 characters,
requires item-family context and stops at known seller-advertising section markers.
Explicit title gender takes precedence over description gender. These heuristics
still require evaluation; they cannot resolve all listing ambiguities.

`build_v2.py` generates the full configuration from tracked v1/base, changes and
priority-phrase files. Runtime no longer depends on the local candidate prototype.

## Evaluated Results

| Metric | Result |
| --- | --- |
| Product rows | 41,576, all unique IDs |
| Rule coverage | 94.84% |
| Source fallback | 2,144 / 5.16% |
| Original 200 development labels | 81% (previously 94.5%) |
| Round-3 400 original frozen labels | 79.5% |
| Round-3 with 18 AI-proposed v2 schema migrations | 83.5% |
| Locked 300 original holdout labels | 63% (189 correct) |

The holdout was reevaluated once after the v2 rules were fixed and was not
automatically relabelled. New label IDs change the problem; a prediction in a
new class may differ from a valid old broad/ambiguous label. The frozen score
remains the auditable reference. Do not present the schema-migrated development
score as independent accuracy or alter holdout labels to reach the target.

V2 improves the frozen holdout over the prior 58% baseline and 59.67% candidate,
but regresses the old development set. The 85% holdout gate is unmet. The user
explicitly requested downstream model experiments regardless; the dedicated
runner marks `quality_acceptance=false`. Ordinary pipeline gate checks are unchanged.

## Reference Models and Scoring

Recomputed peers and trained two-part reference models on 41,575 eligible rows
with five seller-grouped folds across 3,806 sellers. One invalid product was
excluded. The sklearn histogram gradient boosting backend was used.

| Model | ROC-AUC | RMSLE |
| --- | --- | --- |
| Peer baseline | 0.655 | 1.521 |
| Model A | 0.700 | 1.361 |
| Model B | 0.868 | 0.646 |

Model A remains primary; Model B is comparison-only because review/rating signals
accumulate after sales. Model version: `j4f-20261011T181008Z` (UTC identifier;
training completed on 2026-10-12 at 01:10 Asia/Saigon). Original artifacts remain.
New peer groups have not received a new human peer audit; previous peer relevance
percentages must not be reused as validation of these groups.

Scoring produced 18,377 performing, 5,918 untapped-potential, 12,796 difficult-to-sell
and 4,485 insufficient-data products. The two feedback/low-sales statuses still
have zero rows under the interval/review conditions. 27,382 products received
40,331 evidence-backed suggestions. These are exploratory snapshot hypotheses.

## Taxonomy Text Model

Also retrained the grouped TF-IDF + LinearSVC experiment with the new schema.
The 18 explicitly documented AI-proposed migrations are used only for development;
original human labels remain unchanged. Training/evaluation excludes eight
holdout-overlap annotation rows and unresolved ambiguous examples.
707 examples / 60 observed training classes / 695 duplicate groups yielded:
OOF accuracy 62.52%, macro F1 0.525. At margin >=0.8, 95 rows (13.44% coverage)
reached 93.68% accuracy. This selected-subset figure is not global accuracy.
Several newly added classes have only one to three annotated groups; the text
classifier is not promoted to production or evaluated on holdout in this run.

## Outputs and Checks

Local `data/processed/taxonomy_v2_run/` contains clean products, peer features,
predictions, scores, schema comparison and summaries. Reference artifacts are
under ignored `ml/artifacts/taxonomy_v2_run/`; text artifacts under local
`data/local_reviews/taxonomy_round_3/text_model_v2/`.
Shared aggregate reports: `ml/reports/metrics/taxonomy_v2_run.json`,
`model_metrics_v2.json` and `taxonomy_text_experiment_v2.json`.

30 unittest tests passed. Real output checks confirmed unique IDs, strict JSON,
nullable unsupported references and unchanged source/holdout hashes. No full-data
CSV, model binary, commit, push or release acceptance was published.

Next: review the old-development regressions and sparse new classes, then obtain
a fresh independent holdout using frozen v2 definitions. Preserve the historical
holdout and avoid tuning from its answers.
