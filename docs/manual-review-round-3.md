# Taxonomy Development Review - Round 3

This is a targeted development set for improving rules, not a new holdout.
The existing label IDs remain unchanged. Annotation definitions are proposed
for team agreement in `ml/config/taxonomy_label_guide.yml`; keywords describe
current rules, not ground truth. Do not tune rules before completing the review.

## Local Files

Generated files live in ignored `data/local_reviews/taxonomy_round_3/`:

- `taxonomy_development_round_3.csv`: 400 rows to annotate.
- `taxonomy_label_set_round_3.csv`: all 59 labels with definitions/boundaries.
- `queue_manifest.json`: sampling quotas, exclusion paths and snapshot hashes.
- `HUONG_DAN.md`: Vietnamese annotation instructions for this local round.

Sampling reserves 50 name/category disagreement cases, then selects 200 fallback
and 150 category-rule rows without duplicate IDs. Samples are balanced across
product type and source file; this is not a random estimate of overall accuracy.
Disagreements are candidate issues, not confirmed prediction errors. Previous
review, holdout and peer-audit product IDs are excluded. The holdout file is read
only for product IDs, never human labels.

## Annotation

Edit only annotation columns; preserve row order and original product fields.
Import CSV as UTF-8 and product IDs as text. Choose `human_product_type` based on
the product being sold, using name then relevant description. Category can
corroborate but source filename does not establish product type or gender.
Avoid choosing the displayed prediction without checking the product evidence.

Fill `review_confidence` with `cao`, `vua` or `thap`, and identify `reviewer`.
Use `review_note` for ambiguity, conflicts or reasoning. Keyword suggestions
are optional; propose reusable product phrases, not IDs or brand-specific memorization.
Low-confidence and `ambiguous` rows require second review. Fill
`second_product_type` and `second_reviewer`; if reviewers disagree, discuss
and record the consensus in `final_product_type`. A final label is not an
automatic override by software. Resolved ambiguity may remain `ambiguous`.

Broad fallback-family labels require product evidence for that family. Use
specific types where justified. Unknown gender is not evidence of unisex.
Classify the main item, not included gifts, accessories or seller advertisements.
Review the guide's product-shape priority (e.g. laptop backpack is `balo`, shoe
cleaner is `phụ kiện vệ sinh giày`, a clearly identified sandal is a sandal).

## Commands

Create once from the existing source checkout:

```bash
.venv/bin/python -B -m ml.src.cli create-taxonomy-development \
  --processed-dir '/Users/nhule/Desktop/COMPETITION/AISC 2026/data/processed'
```

The creator refuses to overwrite an existing queue. To review another round,
use a distinct directory and ensure previous development IDs are also excluded
before sampling. Never regenerate this queue after people start annotating.

Validate after annotation:

```bash
.venv/bin/python -B -m ml.src.cli validate-taxonomy-development
```

If annotations were entered in the priority subset, merge them first:

```bash
.venv/bin/python -B -m ml.src.cli merge-taxonomy-development \
  --review-file data/local_reviews/taxonomy_round_3/ai_proposals_needing_review.csv
```

The merge validates product IDs/frozen fields, rejects conflicting existing
annotations, backs up the main queue and copies only supplied nonblank annotation
cells. It never invents confidence or reviewer identity. Remaining unlabelled
rows are exported to local `taxonomy_pending_review.csv`; merge that file using
the same command after annotation. Prefer editing the main queue directly if
its annotations have since changed, to avoid stale subset conflicts.

The validator checks frozen product fields, allowed labels, reviewer/confidence
and unresolved second-review cases. It exits 2 while incomplete and writes
local metrics plus accepted prediction errors. The CSV's frozen-prediction
accuracy is development evidence only; it is not an independent holdout result.
Use accepted labels for subsequent rule refinement and testing. Keep the
holdout independent and arrange a new blind test for the final quality claim.
