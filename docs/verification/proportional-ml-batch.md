# Proportional ML Batch Verification

Date: 2026-10-19. Owner: requesting contributor, Claude-assisted.
Branch: `feature/proportional-ml-batch`. Scope: the directly requested second
bounded import that makes the demo catalog reflect the real status distribution.
No model, scoring rule, taxonomy or stored analysis was changed, and no feature
acceptance task is completed.

## Why

The first import ([ADR 0007](../decisions/0007-bounded-ml-sample-import.md)) was
stratified at 25 products per status so every branch of the status logic had test
coverage. That makes the demo misrepresent the corpus: `insufficient_data` filled
25% of the catalog against 12.3% in the scored snapshot, so the product looked far
less conclusive than it is.

## Composition

125 products were added. The batch size was chosen because it lands the combined
catalog closest to the corpus: each status ends within 0.16 percentage points.

| Status | Corpus | Was | Added | Now | Catalog share | Corpus share | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `performing_well` | 18,176 | 25 | 73 | 98 | 43.56% | 43.72% | 0.16 pp |
| `difficult_to_sell` | 12,380 | 25 | 42 | 67 | 29.78% | 29.78% | 0.00 pp |
| `untapped_potential` | 5,892 | 25 | 7 | 32 | 14.22% | 14.17% | 0.05 pp |
| `insufficient_data` | 5,128 | 25 | 3 | 28 | 12.44% | 12.33% | 0.11 pp |
| **Total** | **41,576** | **100** | **125** | **225** | | | |

`positive_feedback_low_sales` and `low_rating_low_sales` have zero products in the
scored corpus, so they stay at zero here. The catalog still shows them as defined
statuses with a zero count rather than hiding them.

## Selection

Products come from the same five product types as the first import, so existing
categories and the category filter stay meaningful. Each status target is spread
as evenly as possible across the five groups, giving 27/27/25/23/23 new products
per group and a final 47/47/45/43/43.

Within each group and status the rule is unchanged from the first import: source
IDs ascending, `valid_for_model`, positive price, unambiguous raw source. The
batch additionally excludes every product the first import selects, computed from
the snapshot rather than from the database, so the selection is a pure function of
the source file and its hash is stable across reruns.

Candidate pools were far larger than the targets (4,277 / 3,501 / 1,391 / 620
against 73 / 42 / 7 / 3), so no target was met by relaxing a quality gate.

**Representativeness:** status shares now approximate the corpus. Product types do
not: the catalog remains the original five fashion types and is not a sample of the
corpus mix. The manifest records this.

## Images

`thumbnail_url` was filled for products that had none, from the public Tiki product
API. 133 products were missing an image (the 125 new ones plus 8 delisted from the
first import); 118 resolved and 15 returned HTTP 404 because the listings were
removed after the 2023 snapshot. Those keep a null thumbnail and the interface
renders its existing placeholder tile.

Each stored URL was confirmed to serve with a HEAD request before being written,
and Tiki's shared no-image placeholder falls back to the verified `w1200`
thumbnail variant. The script only ever fills a null; it never replaces a stored
image. Snapshot `has_video` and `number_of_images` were not touched: live media is
a display asset, never analysis input.

## Checks run

| Check | Result |
| --- | --- |
| `npm run import:ml-batch` (dry run) | 125 products, 125 analyses, 151 actions, status counts equal to targets |
| `npm run import:ml-batch -- --apply` | `inserted_products: 125` |
| Rerun `--apply` | `already-imported`, `inserted_products: 0` |
| `npm run fetch:thumbnails -- --apply` | 133 candidates, 118 resolved, 15 HTTP 404, `rows_updated: 118` |
| `npm run fetch:thumbnails` after the fact | 15 candidates remaining, all HTTP 404, nothing left to resolve |
| Database totals | 225 products, 225 analyses, 255 actions, 262 history rows, 210 with an image |
| Duplicate source IDs | 0 |
| Products without an analysis | 0 |
| Per-run totals | `ml-v2-five-types-100-v1` 100, `ml-v2-proportional-125-v1` 125 |
| Backend typecheck, unit tests, build | passed |
| Frontend typecheck, lint, build | passed |
| `insufficient-data.spec.ts`, `overview.spec.ts` | passed |
| `ml-sample.spec.ts` | passed after the assertion update below |
| Browser | overview reports 225 products with the new shares; catalog paginates 225 and 197 under the analysable filter; page-one images all decode |

### Reconstruction note

The import ran on 2026-10-19 and its scripts were lost before being committed,
when the working copy was deleted and recloned. They were rewritten and verified
against the data they had already produced: the rewritten selection yields
`selection_sha256 d6dd5aee…`, byte-identical to the hash stored on the
`analysis_runs` row, and `--apply` returns `already-imported` with zero inserts.
The database was not rewritten during reconstruction.

## Test changed, and why

`ml-sample.spec.ts` asserted `"/ 20 sản phẩm"` for each category. That number was an
artifact of the first bounded import, not a property of the feature, and this
request deliberately grows the catalog. The assertion now reads the category total
from the footer and requires at least 20, which is the floor the first import still
guarantees, and the test title no longer says "of twenty". The test was not
weakened in any other way; it still checks all five groups, their saved ML
statuses, the experimental notice and the saved recommendations.

Without this change the test contradicts the live database, since each group now
holds 43 to 47 products.

## Not covered

No human acceptance or design review. The remaining 41,351 snapshot products were
not imported; full-corpus import and its storage cost on the current Neon plan
remain open. `sellens.spec.ts` was not run because it creates and deletes products
and suspends an account in the shared database. `preview-parity.spec.ts` continues
to fail for a reason unrelated to this change, recorded in
[the previous verification](insufficient-data-explained.md).
