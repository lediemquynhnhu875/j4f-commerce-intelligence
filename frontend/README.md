# Sellens frontend

Next.js 16.4.0 / React 19.3.0 / TypeScript / Tailwind. UI owner: Huy; API/database:
Mai; reviewer: Như. The main entry point now uses the real shared-catalog backend.
The original isolated mock interface remains under `/preview/*`.

The connected User/Admin pages share the preview's Header, Sidebar, Navigation,
product identity, cards, charts, tables, filters and responsive styles. Catalog
selection opens saved evidence; suggestions offer list/Kanban views and the real
versioned work API. Admin overview/monitor/configuration display saved metadata.
Accounts and catalog management retain their existing backend operations.
All counts and percentages adapt to API data. User overview always covers the whole
catalog with no source-switch controls. Stores remain an unavailable empty
state, configuration is read-only, and absent image URLs use placeholders.
Preview records are hardcoded in `src/lib/preview-fixtures.ts`; live pages do not
read those records or substitute them when requests fail. PostgreSQL development
seed records are separate from these preview fixtures.

Live status colors are centralized in `src/lib/status-colors.ts` and rendered by
`src/components/status-badge.tsx`. Every analysis/work status has a distinct color;
badges, distribution bars, Admin donut/legend, filters and Kanban share this map.
No status or record is changed by the palette.

Connected product identity follows name, information, then `SP-<source_product_id>`
(or `SP-<id>` when no source ID exists). The shared `productCode` formatter avoids
double prefixes. Catalog search accepts this code; links retain internal API IDs.

Saved evidence includes a **Hành động rà soát** column, linking each supported
metric to matching actions from that exact analysis. Clicking opens its saved
explanation below the table. Rows with no matching action explicitly say
"Chưa có đề xuất"; the frontend does not regenerate recommendation rules.

## Install and run

The 2026-10-16 bounded import adds 100 real ML products in five groups of 20.
Use the category filter on `/user/products` or `/admin/products`, then open a
product to inspect its frozen analysis and original suggestions. Existing seed
records remain. Imported results show the six ML status labels and an experimental
notice; image URLs are unavailable, so the existing icon placeholder is used.
See [verification](../docs/verification/ml-sample-import.md).

Run the sample browser check after building the frontend and starting backend:
set `CONNECTED_BACKEND_API_URL=http://127.0.0.1:3001/api/v1` and supply
`SEED_USER1_EMAIL`/`SEED_USER1_PASSWORD` through the local process environment,
then run `npm run test:connected -- ml-sample.spec.ts` from `frontend/`.

From the repository root:

```powershell
cd backend
npm ci
npm run dev
# In another terminal:
cd frontend
npm ci
npm run dev -- --port 3000
```

Open `http://localhost:3000` or `/login`. Legacy `/preview` and `/preview/login`
also use real API login; mock authentication lives at `/preview/demo-login`.
Use an account provisioned in PostgreSQL. Development seed credentials are stored
only in root `.env`. No sample-account
password is displayed on the live login page. If port 3001 is already serving the
backend, reuse it or stop that process before starting a second backend.

The frontend server forwards browser calls through `/api/backend/*` to the backend
REST API. Default `BACKEND_API_URL` is `http://127.0.0.1:3001/api/v1`. For another
backend port, set this variable in `frontend/.env.local` or the frontend process:

```powershell
$env:BACKEND_API_URL = 'http://127.0.0.1:3002/api/v1'
npm run dev -- --port 3000
```

Do not add database credentials or `NEXT_PUBLIC_DATABASE_URL` to the frontend.
Root `.env` is not automatically loaded by the frontend; the proxy needs only
the backend HTTP URL. Same-origin requests avoid browser CORS configuration.
For HTTPS behind a reverse proxy, configure `FRONTEND_ORIGIN` to the exact public
origin. HttpOnly/SameSite cookies carry the opaque backend session; HTTPS origins
set Secure. Browser JavaScript never receives or stores the Bearer token.

## Connected pages and APIs

| Page | Route | Backend data / behavior |
| --- | --- | --- |
| Login | `/`, `/login` | POST auth/login; active account from auth/me; logout revokes session |
| User overview | `/user/overview` | Counts from paginated products, categories, analyses and actions |
| Catalog | `/user/products` | Search/category/status filters, sort, selection and pagination over actual records |
| Saved analysis | `/user/analysis?product=ID&analysis=ID` | GET product detail, product analyses; frozen input/evidence, original history |
| Work | `/user/suggestions?analysis=ID` | List/Kanban, filters, pagination; GET/POST actions, versioned PATCH transitions/edits, GET history |
| Admin overview | `/admin/overview` | Shared catalog/analysis/work/account counts |
| Accounts | `/admin/accounts` | Provision, suspend/reactivate via admin/accounts |
| Product management | `/admin/products` | GET/POST/PATCH/DELETE products; reference-conflict errors surfaced |
| Categories | `/admin/categories` | GET/POST/DELETE categories; referenced categories cannot be removed |
| Analysis monitor | `/admin/monitor` | Actual saved analyses, links to frozen evidence; no invented jobs |
| Frozen configuration | `/admin/configuration` | Read-only config_json from saved results; unsupported save disabled |
| Unsupported stores | `/admin/stores` | Explicit unavailable state; no fake stores/ownership |

The supplied schema uses a shared catalog, not one store per user. API regular
role `user` maps to PostgreSQL `reviewer`; never infer ownership from seller fields.
The nine legacy and six versioned ML analysis statuses retain their identifiers
and translated labels. They are not converted into the five preview labels.
Missing reference, sales, rating and timestamps stay unavailable rather than zero.
Seven seeded products have no saved analysis; the other three have synthetic
insufficient-basis results. Saved analyses do not perform new inference.

Work follows backend transitions and optimistic `expected_updated_at`. Rejection
needs a reason; original suggestions and audit events cannot be rewritten. Manual
work records identify their user-created origin and do not claim model generation.
Completion reports work progress, not measured sales uplift.

Loading, empty, unavailable, validation, role denial, session expiry, backend error
and retry states are explicit. Failed requests never substitute mock records.
The backend remains the authorization boundary for every protected request.

## Mock preview

`/preview/demo-login` and preview workspace pages retain synthetic screens and public
demo accounts from `src/lib/preview-fixtures.ts`. Their browser-tab role selection
cannot authenticate with the backend or grant access to live pages. Mock workflow
edits stay local. The default `/` entry point now deliberately uses real login.

## Source map

- `src/app/api/backend/[...path]/route.ts`: same-origin proxy, private session cookie,
  exact origin checks, safe 503 response and timeout.
- `src/lib/api-client.ts`, `src/types/api.ts`: typed HTTP client, full pagination,
  labels and nullable formatting.
- `src/lib/use-live-session.ts`: active session refresh, expiry/change notifications,
  protection against stale session responses.
- `src/components/live-login.tsx`, `live-shell.tsx`, `live-page.tsx`: live UI entry,
  navigation, role/session guards and data loading.
- `src/features/connected/`: catalog/overview/evidence/config, actions/history and
  Admin management using existing visual styles, cards, icons and dialogs.
- Preview feature data and local workflows remain isolated; shared presentation
  components accept explicit live props rather than choosing mock records.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

The preview suite runs the production frontend on port 3100. Live integration
tests use port 3101 and a running backend at port 3002 (override
`CONNECTED_BACKEND_API_URL`). Provide seed test credentials through environment
variables without printing them:

```powershell
# From frontend/, load only development seed variables for the test process:
foreach ($line in Get-Content ../.env) {
  if ($line -match '^(SEED_[A-Z0-9_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
npm run test:connected
```

Build first; install Chromium with `npx playwright install chromium` if absent.
Live tests use actual PostgreSQL-backed requests. Disposable product fixtures are
removed; manually created work/audit fixtures remain immutable, and generated
test accounts are left suspended. Seeds/unrelated records are not overwritten.
Live traces/video are disabled to avoid recording credentials. Browser artifacts
are ignored under `tmp/frontend-connected/`. Do not use production accounts/data.

For the presentation regression subset used in the latest UI verification:

```powershell
npm run test:connected -- overview.spec.ts ml-sample.spec.ts preview-parity.spec.ts
```

This subset reads real User/Admin data without changing product/work/account
records. Its empty-data and work-transition cases explicitly intercept HTTP with
synthetic test responses; they do not prove PostgreSQL persistence. Login/logout
still creates and revokes normal sessions. The full connected suite also includes
legacy write journeys and must use a development database.

Scope conflicts and authorization: [ADR 0005](../docs/decisions/0005-frontend-api-integration.md).
Executed results and limitations: [integration verification](../docs/verification/sellens-frontend-integration.md).
Full User/Admin presentation: [preview alignment verification](../docs/verification/live-preview-ui-alignment.md).
