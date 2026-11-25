# Catalog server pagination — 2026-11-17

Owner: Mai, Codex-assisted. User-authorized continuation of F002 catalog and
connected integration amendments after a successful small ML import. Source is
code_hien_tai.zip plus the preceding import CLI additions. No Git metadata/remote
checkout is supplied. No commit, push, deployment or live Neon mutation.

## Observed local user verification preceding this change

The user ran prepare-ml-import.py successfully and listed two active stores.
User1 owns store3 (J4F store); User2 owns store2 (empty). An explicit Atuni → store3
mapping selected 30 source products/18 suggestions. Actual Neon dry-run planned
29 new products/analyses and 17 actions, reusing one analysis and its suggestion.
Apply reported imported; rerun reported already-imported with all insert counts 0.

User screenshots showed J4F store with 256 products and 254 analyzed products.
Action278 was accepted with an API-backed history event; action277 required a
nonempty rejection reason in the UI and recorded that text in its history.
A user-run fetch for action278 returned404 while testing User2. This is one
cross-store read check, not comprehensive permission/mutation test coverage.
Opening API links from the chat produced ORIGIN_DENIED; same-origin application
loading subsequently succeeded without weakening the origin guard.

## Implementation

- New centrally declared GET /api/v1/products/catalog, protected by the current
  active-user and aggregate-only-Admin privacy rules. Existing routes unchanged.
- services/catalog-page.ts resolves the active owned store before querying.
  Optional store must match it. Strict bounded query schema; parameterized literal
  search over name/brand/internal ID/display source code; category/type/status,
  analysable flag and fixed price/sales/default ordering.
- Deterministic latest analysis by analyzed_at DESC,id DESC; only latest analysis
  summaries and associated action ID/title summaries are returned for page rows.
  No source_data_json, input_snapshot_json, comparison/evidence JSON or original
  suggestion/audit payload is sent to the catalog table.
- Numeric IDs and SQL numeric listing values stay strings. List description is
  null rather than transmitting large descriptions; detail endpoints keep originals.
- Read-only repeatable-read transaction aligns total, facets and page results.
  Global owner-scoped facets/undecided/proposed counts remain distinct from filtered
  pagination totals. Empty/deleted final pages are clamped. Sort ties use product ID.
- Additive005 migration indexes store+ID and latest-analysis lookup. Existing
  applied migration bytes and unknown historical003 remain untouched.
- /user/products bypasses LivePage.fetchData/allPages completely and uses a
  dedicated paged component. Other screens retain the existing loaders.
- 300ms search debounce, abort plus stale-response guard, filter/page-size reset,
  reset selection on query changes, loading/error/retry and empty states. Import
  preview/commit remains the existing component, refreshing the current query.
- Current-page export is explicitly labelled; full catalog export is not implied.
- No dependencies, .env, product/action data, ownership, auth or origin checks changed.

## Executed checks

- All21 backend tests passed, including3 new validation/SQL-parameter/route checks.
- Backend and frontend TypeScript passed; both production builds passed.
- ESLint passed for the four changed frontend TS/TSX files using the existing
  repository ESLint config from the earlier supplied complete source archive.
  The current partial ZIP omits that config. No lint config is included in patch.
- Frontend build retained an unrelated warning at globals.css43 (@theme parsing)
  in the supplied partial source/config. CSS was not modified.
- PGlite PostgreSQL/WASM ran actual001/002/004/005 schema SQL and the service
  executor with two synthetic Users/stores. Assertions covered latest-analysis
  time/ID ties, bounded pages, stable price/sales sorting with nulls, source IDs
  above JS safe integer, literal percent/underscore/backslash query handling,
  category/type/status/unanalysed/concluded filtering, empty results, page clamping,
  scoped facets/actions, cross-store404 and Admin403.
- Scale fixture:41,580 products in one store, including41,576 additional products
  with synthetic stored analyses. Response:20 product rows,10,356 JSON bytes.
  This proves response bounding, not production throughput; local WASM runtime
  (~406ms for the measured service call) is not a Neon latency claim.
- React DOM/JSDOM exercised actual LivePage → PagedCatalog → LiveCatalog with
  mocked HTTP and Next navigation/image/link adapters.14 requests verified default
  20 rows, page2, limit10 resetting page, correct latest-action badge, stale request
  cancellation, empty search, reset, status/type/sort, and recovery after API503.
  All catalog data requests used products/catalog; no allPages collection requests.
- Included Playwright regression is syntax/discovery checked, not browser executed.
  Chromium startup was blocked by the environment's Unix-socket restriction.
  Browser layout/mobile overflow checks and real local HTTP behavior still need
  user-side verification. No sandbox escalation was requested.

## Scope limits and next work

Only the catalog screen is converted. Overview, evidence and actions still load
complete collections; full-data import should not be treated as deployment-ready.
No new store-summary or peer-detail API, media job or deploy is included. Real
Neon application of005, live page/filter checks and broader permission tests remain
pending. Keep original feature acceptance unchecked until their criteria are met.
See README_CATALOG_PAGINATION.md for installation and tests.
