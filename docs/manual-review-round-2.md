# Manual review round 2

This round separates model development from independent evaluation. Do not edit taxonomy rules
from the holdout results before its final accuracy has been recorded.

## 1. Independent taxonomy holdout

File: `data/processed/review_queues/taxonomy_holdout_review.csv`

- Read `product_name`, `description`, and `category_raw`.
- Fill `human_product_type` with exactly one label from `taxonomy_label_set.csv`.
- Use `ambiguous` only when the available text genuinely supports multiple product types.
- Use `out_of_scope` when the item is not a fashion product covered by the project.
- Do not open `taxonomy_holdout_predictions_private.csv` while reviewing.
- Do not change `taxonomy.yml` based on these 300 rows. This is the independent test set.

## 2. Fallback taxonomy development

File: `data/processed/review_queues/taxonomy_fallback_review.csv`

- Fill `proposed_product_type` from `taxonomy_label_set.csv`.
- If a reusable phrase identifies the type, put only that phrase in `rule_keyword_suggestion`.
- Leave the keyword blank when the decision depends on the whole context.
- This file may be used to improve `taxonomy.yml`, but the holdout file may not.

## 3. Peer audit

File: `data/processed/review_queues/peer_pairs_review.csv`

- Compare each target product with the peer on the same row.
- Enter `đúng` when both are products a seller would reasonably compare for sales reference.
- Enter `sai` when they differ materially in product function or intended use.
- Ignore differences in brand, price, color, or style unless they change the product type itself.
- Use `review_note` to record recurring failure patterns, not cosmetic differences.

## Evaluate

After all three files are complete, run:

```bash
python3 -m ml.src.cli evaluate-review-queues
```

Targets for the first independent round:

- Taxonomy holdout accuracy: at least 85%.
- Peer-pair relevance: at least 80% overall and no major collapse in the low-similarity band.
- Fallback review: 100% completed before adding new rules.
