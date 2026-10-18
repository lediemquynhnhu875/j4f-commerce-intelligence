# Explained "Chưa đủ dữ liệu" Verification

Date: 2026-10-18. Owner: requesting contributor, Claude-assisted.
Branch: `feature/insufficient-data-explained`, branched from clean `main` at `5381af3`.
Scope: the directly requested presentation fix for analyses the scoring run
declined to conclude. Presentation only. No model, scoring rule, database schema,
API field or stored analysis was changed, and no feature acceptance task is completed.

## Problem

`insufficient_data` reached the interface as a bare label with an empty reference,
an empty gap and an empty suggestion list, so a reader could not tell whether the
system had failed, the product was broken, or the result was deliberately withheld.

The information to explain it was already stored and simply never rendered:
`status_reason` appeared once in a TypeScript type and in zero components, and had
no Vietnamese label for any of its six values. The saved `comparison_json` and
`evidence_json.items` stay fully populated for these analyses — all nine observed
metrics against their peer medians.

## Distribution

Across the 41,576-product snapshot, 5,128 products (12.3%) are `insufficient_data`:

| `status_reason` | Products | Share |
| --- | --- | --- |
| `peer_similarity_below_minimum` | 3,222 | 62.8% |
| `out_of_scope_product` | 1,015 | 19.8% |
| `peer_count_below_minimum` | 600 | 11.7% |
| `insufficient_feedback_for_low_sales_interpretation` | 183 | 3.6% |
| `unresolved_product_type` | 107 | 2.1% |
| `invalid_essential_data` | 1 | <0.1% |

The imported demo catalog shows 25 of 100 (25%) because the sample was deliberately
stratified at 25 products per status. The demo therefore overstates the real rate by
about double; it is not a data-quality regression.

## Changes

| Area | Change |
| --- | --- |
| `src/lib/insufficient-data.ts` | New. Vietnamese labels for all six reasons; `explainInsufficient` builds the explanation from the stored numbers; `observedGaps` extracts comparable attribute differences; shared `metricLabels` |
| `src/components/analysis/insufficient-data.tsx` | New. `InsufficientReason`, `ObservableSummary`, `UnblockPanel` |
| `src/features/connected/evidence.tsx` | Renders the three blocks when the status is undecided; the empty reference stat now states why; reuses the shared `metricLabels` instead of a local copy |
| `src/features/connected/catalog.tsx` | "Chỉ hiện sản phẩm đã phân tích được" filter; default order sinks undecided and unanalysed products to the end; reset clears the filter |
| `src/app/globals.css` | Styles for the new blocks and the filter toggle |

### Honesty constraints kept

No recommendation is generated for an undecided analysis. The unblocking panel
states the missing condition and says in the interface that it is not a sales
recommendation. The observable comparison carries an explicit line that a
difference does not prove a cause and does not substitute for a reference.
Every number shown comes from the saved analysis.

Gaps below 20% relative difference are suppressed, as are absolute differences
under 2 images, 3 reviews or 40 characters of description. Without that floor a
product with no reviews against a peer median of one review rendered as "100%
below", which is noise rather than evidence.

## Checks run

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | passed |
| `npm run lint` | passed, no warnings |
| `npm run build` | passed |
| `insufficient-data.spec.ts` (new) | 1 passed |
| `ml-sample.spec.ts` | 1 passed |
| `overview.spec.ts` | 2 passed |
| Reason rendering, two reasons on real data | `peer_similarity_below_minimum` on product 33 and `insufficient_feedback_for_low_sales_interpretation` on product 53 both render their own wording and their own numbers |
| Leakage onto concluded analyses | product 18 renders zero of the three new blocks |
| Catalog filter | 100 products to 75; no remaining row carries the undecided badge |
| Default order | all 100 rows walked across 25 pages; the first undecided row is at index 75 and the final 25 rows are all undecided |
| Browser console | no page errors |

The new test asserts the heading is not the bare status label and that the
explanation contains digits, so a regression to generic wording fails it.

## Known failure, not caused by this change

`preview-parity.spec.ts` fails on `real User pages …` and `real Admin pages …`.
Verified as pre-existing: the same two tests fail identically on clean `main`
with these changes stashed. The test expects a `.copilot-card` element, which
exists in `globals.css` but is not rendered by any component on `main`.

`sellens.spec.ts` was not run: it creates and deletes products and suspends an
account in the shared database and does not cover this change.

## Not covered

No human acceptance or design review. No change to how the scoring run decides
`insufficient_data`; reducing the 12.3% rate is a model and taxonomy question,
not a presentation one. The Admin-side analysis views reuse the same component
but were only verified through the shared evidence page.
