# Live User/Admin UI alignment verification

Date: 2026-10-17 (Asia/Saigon). Requesting contributor, Codex-assisted.
Branch: `feature/backend-neon-mvp`. Continued the existing dirty presentation
work; no pull, merge, stash, commit or push. Scope continues the F005/F006/F007
presentation amendments; original store/model/human acceptance stays unchecked.

## Delivered behavior

The direct request expands the dashboard-only change to all live User/Admin
pages. Header, Sidebar, Navigation and product identity are shared with preview
through explicit live props. Palette, cards, charts, tables, breadcrumbs, menus,
filters, dialogs and responsive styles follow the preview. Preview fixture data
remains in `frontend/src/lib/preview-fixtures.ts`; live records come through the
authenticated HTTP proxy and existing PostgreSQL-backed API.

| Area | Live behavior |
| --- | --- |
| User overview | Dynamic scoped counts, colored status bars, category donut, priority table and evidence-linked work cards |
| Catalog | Real product identity/placeholder, category/status/search filters, sort, selection, four rows per page and bounded numbered navigation |
| Saved analysis | Frozen product values, observed/reference chart, metric evidence table, original hypotheses, limitations, history and JSON export |
| Suggestions | Actual work states, colored totals, type/status/search filters, twelve cards per list page, six-state Kanban and existing versioned API operations |
| Admin overview | Actual accounts/catalog/results/work totals, seven-day saved-analysis counts, distributions and database readiness |
| Admin monitor | Ten results per page, selectable frozen result details, exact-result deep links and original JSON download |
| Admin configuration | Saved model/rule/taxonomy metadata and peer settings, version selection, four preview-style panels; read-only |
| Stores | Preview-shaped metrics/filter/table with an explicit unavailable state; no invented store records |
| Accounts/categories/product management | Existing API operations retained inside the shared preview-style shell |

List page sizes and bounded summary sections are presentation limits, not import
limits. Totals derive from all fetched records; production code does not hardcode
the sample counts or category proportions. Legacy and ML status meanings remain
unchanged. Missing references are not zero; missing image URLs are not replaced
with preview photos. Frozen evidence stays distinct from mutable catalog fields.

## Executed checks

- `npm run lint`: passed. `npm run build`: passed, including TypeScript and route
  generation, after final responsive and navigation changes.
- `npm run test:connected -- overview.spec.ts ml-sample.spec.ts preview-parity.spec.ts`:
  **6 passed together** against the production frontend on port 3101 and the
  local PostgreSQL-backed backend on port 3002. Four real-data journeys check the
  imported sample, API-derived overview, User pages and Admin pages. Two cases
  explicitly intercept HTTP: empty overview and versioned work transitions with
  immutable original evidence. These two do not prove database persistence.
- `npm run test:connected -- sellens.spec.ts --grep "legacy login|real login|backend outages"`:
  **3 passed together**. Real login entry points, HttpOnly session behavior,
  dynamic catalog pagination, seed evidence after reload, regular-user denial
  from Admin and write endpoints, logout, and explicit outage/retry without mock
  fallback were checked. Outage responses are deliberately intercepted.
- `npm run test:e2e`: **6 passed together** in Chromium on port 3100. Existing
  synthetic login, catalog, decisions, Kanban, stores, monitor, configuration,
  role and mobile behavior remain operational. The last subsequent production
  edits were confined to live components and CSS scoped by `.live-app-shell`.
- Real login/read requests succeeded; readiness displayed a confirmed Neon
  connection. The existing boundary journey asserted HTTP 403 for a regular user
  accessing Admin accounts or product creation, HTTP 403 for a forbidden origin,
  and HTTP 401 for product access after logout.
- User/Admin mobile containment checks passed at 390 px for overview, catalog,
  evidence, suggestions, monitoring, configuration and stores. No page JavaScript
  errors were captured by the User/Admin journeys.
- Inspected desktop screenshots of catalog, evidence, suggestions, Admin monitor
  and configuration, plus earlier overview desktop/mobile captures. Artifacts
  stay under ignored `tmp/`; traces and video are disabled.
- `git diff --check`: passed. Documentation paths checked. No backend, migrations,
  import, ML or source-data edits. Normal test login/logout sessions were created
  and revoked; no product/work/account business records were mutated by these
  runs. The owned temporary backend was stopped; user servers were left alone.

Local first-user password configuration was incomplete. Real User checks used the
configured second regular account through process-only aliases. No credentials
were printed or written into source, documentation or environment files.
An unrelated formatting-only edit to `use-live-session.ts` appeared during the
session; it was inspected and preserved, not reverted or claimed as this work.

## Limits and follow-up

- Store CRUD/ownership, model deployment/config writes and live inference/job
  telemetry lack implemented APIs. Their controls remain unavailable/read-only;
  matching presentation does not make those features complete.
- Existing account/category/product write handlers were retained. The three
  legacy browser journeys that create durable work/audit/account fixtures were
  not rerun for this presentation task. Their UI selectors were updated; their
  current database-write behavior is not newly verified here.
- Work-transition UI was verified with explicit interception, not new persistent
  decisions on the imported suggestions. Earlier integration evidence covers
  actual persistence; this session makes no new persistence acceptance claim.
- `allPages` still loads the bounded shared catalog before client filtering.
  Full-corpus import requires server aggregation and scalable page-level fetching.
- Screens do not establish model quality, causal uplift, tenant isolation or
  human acceptance. Existing multi-store proposals remain unapplied.

## Follow-up: distinct status colors, 2026-10-17

The subsequent direct request assigns one color per live status. A shared
`status-colors.ts` registry replaces repeated generic tones and position-based
Admin status-chart colors. `StatusBadge` adds readable tinted backgrounds while
preserving visible labels. It covers 15 analysis identifiers, UI-only no-analysis
and six work states, with 22 unique colors. Existing preview fixtures are unchanged.

Executed after the final palette adjustment:

- Frontend `npm run lint` and final `npm run build`: passed.
- `npm run test:connected -- overview.spec.ts preview-parity.spec.ts --grep "empty overview|preview-style work"`:
  two existing intercepted Chromium regressions passed.
- One-off `node tmp/status-color-qa.mjs`: passed browser-computed color checks for
  all 16 catalog states; User status bars and saved evidence; six work badges and
  Kanban headers; and 15 Admin monitor states and matching donut/legend colors.
  This ignored local inspection script intercepts all API responses with explicit
  fixtures. It does not verify Neon records, authentication or model behavior.
- Badge foreground against its alpha-tinted background: minimum calculated
  contrast 4.51:1 across the 22 colors. Overview/workflow screenshots inspected
  under ignored tmp/. Diff whitespace checked.
- No database/backend/ML/environment changes. Full real-data suites were not
  rerun for this color-only change. Concurrent contributor edits were retained,
  and the owned frontend on port 3103 was stopped after inspection.

## Follow-up: product code placement, 2026-10-17

Live ProductIdentity now places the SP-prefixed source identifier inside the
text column, under the existing product information. Missing source IDs fall
back to the application ID; existing SP prefixes are retained. Catalog, priority
table, saved analysis and monitor share this formatter. Search accepts displayed
codes, while navigation continues to use actual application IDs.

- Frontend lint and production build passed.
- `npm run test:e2e -- --grep "catalog pagination"`: one existing Chromium
  regression passed, preserving preview selection/navigation behavior.
- One-off `node tmp/product-code-qa.mjs`: passed source/fallback/already-prefixed
  formatting, name/information/code alignment, code search, internal-ID navigation,
  User/Admin catalog/overview/evidence/monitor placement and mobile containment.
  Responses were explicitly intercepted fixtures; no Neon writes were performed.
- Desktop screenshot inspected under ignored tmp/. Diff whitespace checked;
  owned temporary frontend stopped. No backend/schema/ML/environment changes.
  Full real-data suites were not rerun for this presentation-only change.

## Follow-up: evidence review-action column, 2026-10-17

Added the preview's missing review-action column alongside the existing numeric
difference column. Colored links associate supported metrics with actions already
saved for the selected analysis, and jump to their existing explanation cards.
Absent/unsupported associations say "Chưa có đề xuất". No action is synthesized
from a difference or copied from another analysis; the backend/model is unchanged.

- Frontend `npm run lint` and `npm run build`: passed.
- One-off `node tmp/evidence-actions-qa.mjs`: passed six canonical action types,
  absent/unsupported row behavior, exclusion of another analysis's suggestion,
  history switching to a result with no suggestions, working anchor links, Admin
  rendering and mobile containment at 390px. No page JavaScript errors.
- The inspection used explicit HTTP fixtures against the production frontend on
  port 3103, not Neon writes. Screenshot inspected under ignored tmp/. Full
  real-data suites were not rerun for this scoped presentation change.
- Diff checked; owned temporary frontend stopped. No migration/import, model
  execution, backend or environment changes, commit or push.

## Follow-up: remove overview source controls, 2026-10-17

The later direct request removes the ML/all-product switch and its state/styles.
Overview now always summarizes the entire API catalog and shows a neutral dynamic
product count, without the stale "Bao gồm dữ liệu mẫu cũ" caption. This supersedes
the optional-source presentation described in the earlier verification entries.

- Frontend lint and production build passed.
- Updated `overview.spec.ts`: two Chromium cases passed, checking the actual
  API-derived catalog total/category chart/evidence navigation without source
  controls, and an explicitly intercepted empty catalog without invalid values.
- Desktop screenshot inspected; mobile containment passed. The real-data journey
  used the second configured account through process-only credential aliases and
  revoked its temporary login session. No business records or environment files
  changed. Owned temporary frontend/backend servers stopped.
