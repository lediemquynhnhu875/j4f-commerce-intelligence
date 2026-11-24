# 0009 Store-scoped workspace queries

Date 2026-11-19 (Asia/Saigon).  
Owner requesting contributor, Codex-assisted. Reviewers Mai and Huy.  
Status implemented on `remove_demo`, pending deployment.

## Context

The connected frontend paged through the full catalog, analyses and actions
before showing single-product evidence or one page of the catalog. Each saved
analysis could add substantial snapshot and evidence JSON.

## Decision

- Derive store access from the authenticated account. Use the product ID and
  latest timestamp or requested analysis ID to read the applicable saved result.
- Return a date-bounded timeline projection beside the latest in-range detail.
  Resolve older evidence and actions when selected.
- Apply catalog search, filters and ordering before returning one server page.
  Use a separate lightweight header summary and keep broad exports on demand.
- Reuse existing tables and indexes. Keep API payload contracts in
  [data contracts](../rules/data-contracts.md#store-scoped-workspace-reads).

## Consequences

Analysis transfers scale with the chosen product and date window. Catalog
transfers scale with page size. Catalog status filtering, the exact matching
count and the header totals still query store data. Deployed latency at larger
store sizes needs a separate measurement.


The suggestion workspace now follows the same bounded-client read model.
It loads a server page of 20 enriched action cards and on-demand pages of
analysis choices. See the [suggestion response contract](../rules/data-contracts.md#paginated-suggestion-cards).
