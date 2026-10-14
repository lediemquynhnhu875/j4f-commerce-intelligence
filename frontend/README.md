# Sellens frontend

Next.js 16.4.0 / React 19.3.0 / TypeScript / Tailwind. UI owner: Huy; API/database:
Mai; reviewer: Như. The main entry point now uses the real shared-catalog backend.
The original isolated mock interface remains under `/preview/*`.

## Install and run

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
| Catalog | `/user/products` | Product search/category/status filters and pagination over actual fetched records |
| Saved analysis | `/user/analysis?product=ID&analysis=ID` | GET product detail, product analyses; frozen input/evidence, original history |
| Work | `/user/suggestions` | GET/POST actions; PATCH transitions, edits, self-assignment; GET action history |
| Admin overview | `/admin/overview` | Shared catalog/analysis/work/account counts |
| Accounts | `/admin/accounts` | Provision, suspend/reactivate via admin/accounts |
| Product management | `/admin/products` | GET/POST/PATCH/DELETE products; reference-conflict errors surfaced |
| Categories | `/admin/categories` | GET/POST/DELETE categories; referenced categories cannot be removed |
| Analysis monitor | `/admin/monitor` | Actual saved analyses, links to frozen evidence; no invented jobs |
| Frozen configuration | `/admin/configuration` | Read-only config_json from saved results; unsupported save disabled |
| Unsupported stores | `/admin/stores` | Explicit unavailable state; no fake stores/ownership |

The supplied schema uses a shared catalog, not one store per user. API regular
role `user` maps to PostgreSQL `reviewer`; never infer ownership from seller fields.
All nine backend analysis statuses keep their exact identifiers and translated
display labels; they are not mapped into the five mock labels or six ML statuses.
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
- Existing preview components/features remain isolated and intact.

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

Scope conflicts and authorization: [ADR 0005](../docs/decisions/0005-frontend-api-integration.md).
Executed results and limitations: [integration verification](../docs/verification/sellens-frontend-integration.md).
