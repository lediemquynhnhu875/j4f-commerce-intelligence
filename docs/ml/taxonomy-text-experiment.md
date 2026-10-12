# User-Confirmed Taxonomy Development Experiment

The contributor explicitly confirmed on 2026-10-12 that they checked the 400
round-3 labels individually. Recorded `requesting_contributor` as a stable
participant ID, not an inferred real name. The annotation origin remains
AI-assisted, user-confirmed; confidence and independent second review were
not supplied. Local `user_confirmation.json` stores the confirmed-label hash.
Human labels were not changed or replaced by this experiment.

## Error Diagnosis

AI heuristics organized the 143 candidate mismatches into:

| Hypothesized issue | Rows |
| --- | --- |
| Compositional wording or semantic gap | 50 |
| Missing outside-scope recognition | 26 |
| Taxonomy gap or insufficient information | 24 |
| Relevant description evidence missed | 17 |
| Rule precedence conflict | 14 |
| Category overrides the main item | 10 |
| Sparse/code-only title | 2 |

These are development triage hypotheses, not verified root causes. The local
`candidate_errors_diagnosed.csv` preserves product details and proposed next steps.
`ambiguous_cases_analysis.csv` discusses all 24 ambiguous cases: eight unclear
type/gender, five multiple/conflicting main items, three generic unisex-shoe gaps,
three gender-neutral boot gaps, two unisex-sandal gaps, two unisex-loafer gaps
and one frame-versus-complete-glasses uncertainty. No new label was automatically
added. Scope and structural distinctions require a team decision.

## Text Classifier

`ml/src/taxonomy/text_classifier.py` loads only the original 200 development
reviews, 150 fallback reviews and 400 user-confirmed round-3 labels. It excludes
holdout IDs, conflicting labels for the same product, and ambiguous labels.
750 input annotations produced 689 usable examples and 54 classes. Eight
annotation rows overlapped locked holdout IDs and were excluded; 55 ambiguous
annotation rows were excluded (these exclusions can overlap). No holdout labels
were read for training, tuning or classifier evaluation.

Model input is the title repeated twice plus up to 2,000 description characters.
It uses word TF-IDF (1-2 grams), character TF-IDF (3-5 grams) and balanced LinearSVC.
Category, source filename, sales, rating and IDs are not classifier inputs.

Five-fold GroupKFold keeps near-duplicate title families in the same fold.
Title grouping uses char TF-IDF with cosine similarity >=0.90 and connected
components; digits are removed for grouping. The grouping transform uses only
unlabelled titles; the classifier's TF-IDF is fitted within each training fold.
This prevents identified duplicate families crossing folds but is not a proof
that all semantic duplicates were detected. There are 679 detected groups.

| Development out-of-fold metric | Result |
| --- | --- |
| Exact accuracy | 64.59% |
| Macro F1 | 0.575 |
| Round-3 subset accuracy, excluding ambiguous | 61.97% |
| Accuracy on rows with decision margin >=0.8 | 90.38% |
| Coverage at that margin | 15.09% (104 / 689 rows) |

The margin threshold was fixed before seeing the scores. SVM decision margins
are not calibrated probabilities. The selected subset's accuracy does not imply
90% accuracy across all products. Five classes have fewer than five duplicate
groups; three have only one group, limiting learning/evaluation support.

These results cannot be directly compared with the 64.25% candidate rule score:
that score used 400 development samples for rule tuning, while this classifier
score uses out-of-fold predictions on a different 689-row corpus. Neither is
a blind holdout acceptance result. The prototype is not promoted into production.

## Reproduce

Run from the repository root:

```bash
.venv/bin/python -B -m ml.src.evaluation.taxonomy_errors
.venv/bin/python -B -m ml.src.taxonomy.text_classifier \
  --processed-dir '/Users/nhule/Desktop/COMPETITION/AISC 2026/data/processed'
```

Local outputs under `data/local_reviews/taxonomy_round_3/text_model/` include OOF
predictions, OOF errors, a confusion matrix and an experimental fitted joblib
bundle. Models/CSVs stay outside Git; aggregate metrics are shared under
`ml/reports/metrics/`. Production taxonomy, reference-sales models and scoring
are unaffected.

Next: settle missing-label/scope definitions, improve description/rule priority
on development evidence, add examples for poorly supported labels and evaluate
a frozen final candidate on a new blind holdout. Maintain the existing 85%
quality gate; AI-assisted development confirmation is not independent review.
