# 0010 Admin loads one page at a time

Date 2026-11-19 (Asia/Saigon).
Owner requesting contributor, Codex-assisted.
Status implemented on `remove_demo`, pending deployment.

## Context

Every Admin page fetched the whole account list, the whole store list and
system aggregates. At 3,808 stores and 3,809 accounts, the old 20-row
request loop used 383 data requests for the initial load.

## Decision

- Show 50 rows at a time for stores and accounts, with backend filters
  applied before pagination.
- Return store and assigned-product totals with the Admin store page.
- Request aggregate data by reporting view. Fetch full Admin data when
  exporting explicitly.
- Reuse the existing database schema, indexes and authorization boundaries.

## Consequences

The first Admin store or account page requires one data request after
authentication. System totals and large-store latency remain measurable
separately. See [the API contract](../rules/data-contracts.md#admin-pagination-and-reporting).
