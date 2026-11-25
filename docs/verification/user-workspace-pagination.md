# Bounded User workspace reads — 2026-11-17

Owner: Mai, Codex-assisted. User explicitly continued the F002/F004/F005/F006
connected integration/performance amendments. Based on the supplied current ZIP
and previous catalog/import patches. No Git metadata, remote synchronization,
commit, push, deployment, credentials or real Neon mutation in this session.
No feature acceptance checkbox is completed by this scoped implementation.

## User evidence carried forward

The user verified catalog search `balo` produced44 matching products, page size10
and page2 showed11–20 /44. Prior evidence recorded256 products after Atuni import,
zero-insert rerun, accepted/rejected action histories, required rejection text and
a User2 request for action278 returning404. These were user-run local observations,
not browser actions performed by this agent.

## Change and contracts

All four User screens now avoid allPages collection loading. Admin retains its
account/store loaders and aggregate-only system API; no product detail was added
for Admin. Central method/path/guard declarations remain in server/api.ts.

- stores/me/summary: counts over the complete owned store, latest saved result per
  product, global sidebar count, category/status distributions and bounded review
  previews. At most8 priority products and4 action cards are displayed. Data sent
  for associations is bounded (up to12 analysis/product/action summaries), not full
  frozen evidence. Current-result work counts remain distinct from historical work.
- analyses/workspace: one owned product and exactly the selected historical result
  or deterministic latest result. Explicit mismatched product/analysis IDs and
  cross-store IDs return404. Unanalysed products return an honest empty result.
  Result-history summaries and suggestions each page at20. Original input,
  comparison/evidence, references, eligibility, ML version and provenance stay intact.
- actions/workspace: SQL search/status/type/analysis filtering, stable updated_at
  DESC/id DESC, default12 rows, scoped global state totals and filtered Kanban
  state counts. Only product/analysis associations needed by those rows return.
- products/options and analyses/options: bounded/searchable choices, default20,
  maximum100; scalar ID strings. Source seller metadata never authorizes access.
- All new reads resolve ownStore and use read-only repeatable-read transactions.
  Admin is denied by ownStore and existing privacy guards. Existing write/import/
  audit APIs, optimistic version checks and rejection validation are untouched.
- New006 adds only recent-action and saved-analysis ordering indexes.001/002/004
  and historical003 are not changed. Prior005 is bundled unchanged for completeness.

Frontend uses abort plus stale-response guards and300ms search debouncing. Initial
loading does not render zero-valued overview charts. Action controls preserve their
state during page reloads; accepted/rejected changes retain expected_updated_at.
Action audit now requests20 rows instead of all history. Manual work opens a paged,
searchable analysis chooser on demand. Kanban is explicitly the current page and
paginates like the list; column labels show visible/filtered-total counts. Export
labels and metadata describe aggregate/current-profile/current-page scope.

## Verification executed

-23 backend tests passed: existing18 plus prior catalog3 and workspace2 schema/
  central-route authorization regressions. Command uses Node's tsx import hook
  because the environment blocks the tsx CLI's Unix IPC socket.
- Both production builds passed, including TypeScript. Scoped ESLint passed using
  the repository config from the earlier full source archive (omitted by current ZIP).
- Unchanged frontend globals.css43 still produced the known @theme parsing warning
  in this partial source/config environment. CSS was not modified.
- Actual SQL readers tested via isolated PGlite PostgreSQL/WASM with real schema
  migrations001/002/004/005/006. Verified latest-only aggregates, separate global
  work totals, owner isolation, paged/searchable choices, historical selection,
  mismatched/foreign IDs404, Admin403, work filtering and stable pagination,
  association correctness, and an empty owned store on all three readers.
- Scale fixture:41,580 owner-store products with41,576 added synthetic analyses;
  42,655 owner-store actions. Work response contained12 actions; a single profile
  returned1 analysis and20 of42,653 linked actions. Overview previews stayed bounded;
  the fixture response was2650 JSON characters. Local WASM timings do not establish
  Neon throughput, concurrency or deployment latency.
- React DOM/JSDOM mounted actual LivePage and the new components with HTTP fixtures
  and Next navigation/link/image adapters.20 requests verified global overview
  counts despite one preview record, one profile, history/action paging, product
  choice search,12-row work page, PATCH version token, HTML required reason plus
  rejection payload,20-row audit, page-bounded Kanban, paged manual analysis chooser
  and POST retaining manual_user_work provenance. No user collection allPages
  request occurred. These mock interactions are not real PostgreSQL mutations.
- Prior catalog DOM regression reran successfully (14 requests): page size, paging,
  latest badge association, debounce/cancellation, filters/reset, errors and no bulk.
- Playwright catalog/workspace tests are included and discovery/syntax checked.
  Native Chromium execution remains blocked by the environment's Unix-socket
  restriction; no new browser execution or screenshot claim is made.

## Remaining work

User-side live Neon migration006 and application smoke/regression checks, including
existing256-product stats, version conflicts and broader permission tests. Then
review source-seller/store mapping, storage capacity, full import dry-run and real
Neon latency. No full import or live Python inference is enabled. Media acquisition,
peer-detail resolution, Admin model/import monitor, deployment and local restore
acceptance remain outside this scoped change. See README_WORKSPACE_PAGINATION.md.
