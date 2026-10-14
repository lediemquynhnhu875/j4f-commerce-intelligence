# Sellens Frontend / Backend Integration Verification

Date: 2026-10-14 (Asia/Saigon). Branch: `feature/backend-neon-mvp`.
Owner: requesting contributor, Codex-assisted. Reviewers: Mai, Huy, Nhung.
Scope: later direct request to connect the mock-based UI to the real shared-catalog
backend. [ADR 0005](../decisions/0005-frontend-api-integration.md) records the changed
scope; original store/model/human acceptance tasks remain unchecked.

## Implementation and conflicts

Main `/` and `/login` use real authentication; `/user/*` and `/admin/*` fetch actual
API DTOs. `/preview/*` remains isolated mock mode. The same-origin proxy keeps the
token in an HttpOnly/SameSite cookie, strips it from browser login JSON and forwards
Bearer authorization server-side. HTTPS origins enable Secure. Requests use no-store,
timeouts and exact public-origin checks. Session change/expiry signals refresh cached
pages; stale auth responses cannot replace newer account state. No database URL or
Bearer token is exposed to browser JavaScript. Backend active/admin checks remain
authoritative.

Dashboard/catalog/detail/frozen analyses, work/history and Admin account/product/
category management use paginated PostgreSQL-backed endpoints. Local filtering,
four-row pagination and aggregation occur after fetching all API pages. Null is
unavailable, not zero; no-analysis differs from insufficient basis. The exact nine
backend statuses remain distinct from five mock labels and six ML statuses.

The schema has no stores, jobs, inference or configuration-write API. Account
management replaces store navigation; `/admin/stores` explicitly reports missing
support. Monitor shows saved results, and configuration shows frozen config_json
read-only. There are no invented jobs, model/causal claims or automatic mock fallback.

## Executed checks

### Legacy login correction

The old `/preview/login` and `/preview` entries still used demo credential checks,
which rejected the real seeded account shown by the contributor. They now render
LiveLogin, matching `/` and `/login`. Mock authentication moved to the explicit
`/preview/demo-login`; mock shell links and preview tests use that path.
Frontend lint/build passed. `npm run test:connected -- -g 'legacy login entry'`
passed in Chromium against the existing backend on port 3001: four entry points
render real login, Admin login via `/preview/login` returns 200, Admin account read
returns 200, and logout works. All six preview browser regressions passed with the
explicit demo-login path. No credentials/data/schema were changed.

- Frontend `npm run lint`: passed after correcting asynchronous loading effects.
- Frontend `npx tsc --noEmit`: passed.
- Frontend `npm run build`: production build passed with proxy, live routes and previews.
- `npm run test:e2e`: all six existing Chromium preview tests passed. The initial
  test deliberately starts at `/preview/login` because the root route now uses real login.
- `npx playwright test -c playwright.connected.config.ts`: work/audit, Admin CRUD/
  suspension and simulated outage/retry passed. Catalog failed on selectors including
  cached hidden pages; after fixing exact/visible selectors, `-g 'real login'` passed.
- `npm run test:connected -- -g 'rejection requires'`: passed for the final rejection
  form. All five journeys passed across scoped runs; a single final five-test batch
  was not executed and is not claimed.
- Read-only SQL confirmed original seed counts/states, final integration-fixture
  IDs/statuses and zero disposable products remaining.
- Visual QA inspected the live catalog screenshot; existing theme/layout intact.

Live tests used frontend 3101 and temporary backend 3002; preview used 3100. Existing
3001 backend was not interrupted. Temporary test processes were stopped. Live traces/
video were disabled; ignored artifacts are in `tmp/frontend-connected/`.

## Final browser results

| Journey | Actual evidence | Final result |
| --- | --- | --- |
| Real login/catalog/analysis/auth | Login 200; HttpOnly/Lax cookie, token absent from document.cookie; 10 seeded products, visible 4/4/2 pagination/search/detail; frozen insufficient-basis result/null reference and no-analysis state; refresh persistence; forged preview role denied; Admin reads/product writes 403; cross-origin logout 403; logout protected read 401; no page errors | PASS, affected scenario rerun |
| User work/audit | Create manual work; accepted -> in_progress -> completed; stale write 409; persisted after reload; original suggestion unchanged; accepted/completed events visible | PASS |
| Admin management | Product create/edit/delete; account provisioning with generated credentials; suspension blocks old session 401; reactivation does not revive it; new login succeeds; test account suspended; three saved results; config save disabled | PASS |
| Failure/retry | Explicit Playwright-simulated 503 on product reads; useful error, no mock rows; removing interception and retry restored real records | PASS, simulated failure identified |
| Rejection | Reject button sets rejection intent; blank reason prevents save; reason/status persist after reload; rejected terminal state and audit shown | PASS |
| Mock previews | Six preexisting synthetic journeys, including mobile/keyboard | PASS |

## Issues fixed and database effects

Next.js runtime params needed a Suspense boundary; asynchronous loading needed
promise callbacks rather than synchronous effect state changes. Origin checks now
use the public Host or explicit FRONTEND_ORIGIN because request.url can use an
internal hostname. Cached-page test selectors and modal-close labels were corrected.
The reject form now preselects the requested decision and requires its reason.

No migration, seed rerun or model/dataset change. Seed registry counts remain
10 products, 3 analyses, 3 accounts, 3 categories, 3 actions and 3 initial events.
Original seeded actions remain proposed. Additional manual test work IDs 4/5 are
completed, ID 6 rejected; append-only audit history remains intact. Generated test
account ID 4 is suspended; its random credentials were not logged/documented.
Disposable products, including one from an earlier failed assertion, were removed
by exact test identity. Zero integration product fixtures remain. No seeded or
unrelated record was replaced/overwritten.

## Limits and next steps

No blocker remains for the implemented shared-catalog integration. HTTPS/proxy
deployment, Secure-cookie behavior on real HTTPS, load/concurrency testing, live
ML, stores, model/config mutations, human evaluation and original feature acceptance
remain unverified/out of scope. Local cookie checks used HTTP. Fetch-all then local
pagination is suitable for this sample, not a large-data performance claim.

See [frontend README](../../frontend/README.md) for ports/configuration/test commands.
No secrets were added to source; no commit/push performed.
