# Sellens PostgreSQL REST backend

## Current store ownership

Each regular User owns one store; existing catalog data belongs to user1's
`J4F store`. User2 starts empty. All catalog/analysis/work/history requests are
owner-scoped; Admin retains system monitoring. Product writes/import are User
operations with server-derived store_id. See [current contract](../specs/store-ownership.md).

Apply migrations with `npm run db:migrate`; first application of 004 requires
SEED_USER1_EMAIL to identify the existing catalog owner. Existing migration 003
is present on the configured database but its original SQL was absent in this
checkout; preserve its recorded checksum. Do not reset the database.

GET `/api/v1/stores` returns the own store (all for Admin), GET
`/api/v1/stores/me` returns a regular User's store. Existing IDs under products,
analyses, analysis-results, actions and action history are owner-checked.

Run actual ownership HTTP checks against a started updated backend:
`STORE_TEST_URL=http://127.0.0.1:3311/api/v1 npx tsx scripts/test-store-http.ts`
(PowerShell: set `$env:STORE_TEST_URL` first). Credentials come only from ignored
.env/process environment. The script creates/deletes its own temporary product,
uses rolled-back account provisioning, and logs out its test sessions.
Older shared-catalog descriptions below are historical and superseded here.


The existing Next.js 16.4.6 / TypeScript backend serves JSON at
`http://127.0.0.1:3001/api/v1`, using pooled parameterized `pg` queries.
Routes delegate to validation, authentication and services in `src/server/`.
The single `src/server/api.ts` file declares endpoints explicitly as
`"GET /api/v1/products": userRoute(listProducts)`. Named handlers follow the route
table; a shared matcher resolves `:id`, authorization, 404/405 and response handling.
The existing Next.js catch-all route remains the HTTP entry point; no per-endpoint
files or Express dependency are required.
The live frontend consumes these authenticated PostgreSQL-backed APIs.

The schema uses one store per regular User. API role `user` maps to database
`reviewer`. Saved analyses come from imported ML snapshots. Live inference remains
pending. The public API directory contains endpoint metadata and health links.

## Installation and environment

Use Node >=20.9 and npm. Tested with Node 25.2.1 / npm 11.6.2; team LTS review remains.

```sh
cd backend
npm ci
```

If absent, create root `.env` from [`.env.example`](../.env.example) and fill its
placeholders locally. Never commit it. Root `.env` is read without `$` expansion;
process environment takes precedence, then optional `backend/.env` fills missing
values. Credentials are never public environment variables.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL URI, including supplied SSL/channel-binding parameters; not an HTTP endpoint |
| `APP_ENV` | Environment label; legacy sample cleanup requires `development` |
| `CORS_ORIGINS` | Comma-separated exact allowed browser origins; empty denies cross-origin requests |
| `SEED_USER1_EMAIL`, `SEED_USER1_PASSWORD` | Existing first development account / ML import owner |
| `SEED_USER2_EMAIL`, `SEED_USER2_PASSWORD` | Existing second development account for integration checks |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Existing development admin for integration checks |
| `STORE_TEST_URL` | HTTP test API base; default `http://127.0.0.1:3311/api/v1` |

The URI passes unchanged to `pg`, with channel binding enabled. Pool max is five;
connection/query timeouts are 10 seconds, idle timeout 30 seconds. The supplied
`sslmode=require` emits a driver compatibility warning; SSL flags were not weakened.
Credentials, SQL and driver details are not logged or returned in errors.

## Database setup

From `backend/`, with Neon connectivity:

```sh
npm run db:inspect
npm run db:migrate
```

Inspection prints schema metadata only. The additive migration is transactional,
locked and checksummed; reruns do nothing. It stops on unmanaged conflicting table
names, leaves unrelated tables intact and never drops/resets/replaces data. Never
edit an applied migration. Auxiliary tables support sessions, login throttling,
seed keys and the migration ledger.

The synthetic catalog generator and its `db:seed` command have been removed.
Provision additional accounts through the authenticated Admin API/UI. Passwords
use salted scrypt. Existing credentials and records remain persisted in PostgreSQL.
The `SEED_*` variables identify existing development accounts for tests/imports.

## Import the bounded real ML sample

Place the supplied `products_full.json` in root `data/processed/` (ignored).
From `backend/`:

```sh
npm run db:migrate
npm run import:ml-sample -- --dry-run
npm run import:ml-sample -- --apply
```

Imports exactly 100 products across five types (20 each), 100 saved analyses and
matching suggestions/history. All writes are atomic. Exact reruns insert nothing;
different source bytes under the fixed run key stop without overwriting. Preserve
the original input for verification. This uses the shared catalog and preserves
the separate manual catalog entries; live inference remains pending. Results are experimental.
See [scope](../docs/decisions/0007-bounded-ml-sample-import.md).

With the backend running, verify the source, database and real HTTP responses:

```sh
npm run test:ml-sample
```

Uses local SEED_USER1 credentials and writes sanitized results to ignored
`tmp/ml-sample-http.json`. `npm test` checks selection and source/status validation.
The migration runner discovers ordered numbered SQL files and checks each checksum.

## Legacy sample cleanup

The original ten synthetic products have already been retired in the configured
database. The legacy `db:cleanup-samples` utility remains available for older
development databases, with its identity/dependency checks and unit tests.

```powershell
npm run db:cleanup-samples
```

The preview reports `already-cleaned` for a retired catalog. For an older database,
review its exact target list and returned fingerprint before using its `--apply
--confirm` command. The utility creates a private backup and uses a transaction.
See [the cleanup audit](../specs/mock-retirement.md) for current counts.

## Import the proportional batch and product images

The first import is stratified at 25 products per status, which overstates
`insufficient_data` in the initial selection. The second batch brings the catalog to the corpus
distribution. Place the same `products_full.json` in root `data/processed/`
(ignored). From `backend/`:

```sh
npm run import:ml-batch -- --dry-run
npm run import:ml-batch -- --apply
npm run fetch:thumbnails -- --apply
```

The batch adds 125 products, 125 analyses and 151 suggestions under run key
`ml-v2-proportional-125-v1`, reusing the first import's five categories and quality
gates. Its selection excludes the first import's products by recomputing them from
the snapshot, so it does not depend on database state and reruns insert nothing.
It refuses to start if any selected product already exists.

`fetch:thumbnails` fills `thumbnail_url` for imported products that have none, from
the public Tiki product API, one request at a time. It verifies each URL serves
before storing it, never replaces an image already stored, and leaves listings that
return HTTP 404 with a null thumbnail for the interface placeholder. It does not
touch `has_video` or `number_of_images`, which stay as the snapshot recorded them.

See [verification](../docs/verification/proportional-ml-batch.md).

## Start

```sh
npm run dev
# Or production:
npm run build
npm start
```

Both scripts bind loopback port 3001, leaving frontend port 3000 available.
Override deployment binding with `npx next start --hostname HOST --port PORT`
after building. Existing scaffold greeting routes remain available.

## Endpoints

All paths are under `/api/v1`. Opaque Bearer sessions expire after 24 hours; only
token hashes are stored. Each protected request checks the current active account
and role. Logout, suspension, password/role changes revoke sessions; reactivation
does not revive them. Login is limited to 20 attempts/email/15 minutes. No public
registration or arbitrary-SQL endpoint exists; account DTOs never include hashes.

| Path | Methods | Permission / behavior |
| --- | --- | --- |
| `/health`, `/ready` | GET | Public liveness / `SELECT 1` connectivity |
| `/auth/login` | POST | Public email/password login |
| `/auth/me`, `/auth/logout` | GET / POST | Active account / revoke current token |
| `/products`, `/products/:id` | GET | Active account; list/detail |
| `/products`, `/products/:id` | POST / PATCH, DELETE | Admin create/update/delete; references block deletion |
| `/products/:id/analyses` | GET | Active account; linked results |
| `/categories`, `/categories/:id` | GET | Active account |
| `/categories`, `/categories/:id` | POST / PATCH, DELETE | Admin mutations |
| `/analyses`, `/analyses/:id` | GET | Active account; product/analyst relationships |
| `/analyses` | POST | Admin appends output; server freezes current product and computes observed-minus-reference gap |
| `/analysis-results`, `/analysis-results/:id` | Same as analyses | Aliases |
| `/analyses/:id/actions` | GET | Active account; linked actions (alias also supported) |
| `/actions`, `/actions/:id` | GET | Active account |
| `/actions`, `/actions/:id` | POST / PATCH | Active account; atomic work and audit event |
| `/actions/:id/history` | GET | Active account; append-only audit |
| `/accounts`, `/accounts/:id` | GET | Admin only |
| `/accounts`, `/accounts/:id` | POST / PATCH, DELETE | Admin provision/update/suspend; protects last admin; DELETE suspends |
| `/admin/accounts`, `/admin/accounts/:id` | Same as accounts | Admin-management aliases |

Analyses/history cannot be edited/deleted (405), also enforced by SQL triggers.
Action originals and analysis links stay immutable. Status transitions: proposed
-> accepted/rejected/cancelled; accepted -> in_progress/cancelled; in_progress ->
completed/cancelled. Terminal statuses have no further transitions. Rejection
requires nonblank `decision_reason`; action PATCH requires `expected_updated_at`
from the last read. Stale writes return 409. Completion does not prove sales uplift.

Lists accept `page` (default 1), `limit` (default 20, max 100), return
`{data:[...],pagination:{page,limit,total}}`, and order by ID. Products support
`search`, analyses `product_id`, actions `analysis_id`. IDs and SQL numeric/bigint
outputs are strings to preserve precision. Numeric inputs are finite JSON numbers;
foreign-key inputs are positive ID strings. Optional unknowns remain null. Strict
schemas reject unknown fields. Analysis `config_json.prediction_origin` must be
`new_input`, `holdout`, `out_of_fold` or `unavailable`. Eligible results require
verified observed sales, a known reference and available prediction provenance.

Errors: `{error:{code,message,details?,request_id}}`. Statuses: 400 malformed JSON,
401 authentication, 403 role/origin denial, 404 missing, 405 unsupported mutation,
409 duplicate/relation/stale/transition conflict, 413 oversized body, 415 media
type, 422 validation, 429 throttling, sanitized 500 internal and 503 not ready.
Responses are JSON except empty 204 CORS preflight.

## curl examples

Use placeholders locally; never publish actual credentials or tokens:

```sh
curl http://127.0.0.1:3001/api/v1/health
curl http://127.0.0.1:3001/api/v1/ready
curl -X POST http://127.0.0.1:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"EMAIL_PLACEHOLDER","password":"PASSWORD_PLACEHOLDER"}'
# Set TOKEN locally from the login response.
curl 'http://127.0.0.1:3001/api/v1/products?page=1&limit=4' -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:3001/api/v1/products/1 -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:3001/api/v1/analysis-results -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:3001/api/v1/admin/accounts -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST http://127.0.0.1:3001/api/v1/auth/logout -H "Authorization: Bearer $TOKEN"
```

PowerShell: use `curl.exe` and `$env:TOKEN` / `$env:ADMIN_TOKEN`. Find actual IDs
through lists when working with a nonempty database.

## Tests and evidence

```powershell
npm run typecheck
npm test
npm run build
# Start the backend, then configure its API base in a separate terminal.
$env:STORE_TEST_URL = "http://127.0.0.1:3001/api/v1"
npm run test:http
```

The HTTP runner uses existing development credentials from ignored environment
configuration. It checks all three logins, health/readiness, pagination, direct
PostgreSQL counts and store ownership. It also exercises denied cross-store
requests, invalid inputs and an owned temporary product import/update/delete.
The temporary product is removed and test sessions are logged out. Account/store
provisioning is checked inside a rolled-back transaction.

Sanitized results are written to ignored `tmp/store-http-results.json`. The old
HTTP runner that required ten synthetic products has been removed. Unit tests
and isolated browser fixtures remain confined to test execution.

## Import and privacy update — 2026-11-13

- User `POST /api/v1/products/import/preview` previews raw `{items:[...]}` with
  automatic field mapping, normalization, ignored columns and all-row errors.
- User `POST /api/v1/products/import` revalidates and atomically creates/updates
  products within the signed-in store. Missing update fields retain their values.
- Admin `GET /api/v1/admin/summary` supplies system counts, saved batches by store
  and technical versions. Detailed customer-data routes now return 403 for Admin.
- Suspended accounts with a correct password receive `403 ACCOUNT_SUSPENDED`.
- `npm test` includes import parser/normalization regressions. No migration is
  required for this update on the existing media/store schema.
