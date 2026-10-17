# Sellens PostgreSQL REST backend

The existing Next.js 16.4.0 / TypeScript backend serves JSON at
`http://127.0.0.1:3001/api/v1`, using pooled parameterized `pg` queries.
Routes delegate to validation, authentication and services in `src/server/`.
The single `src/server/api.ts` file declares endpoints explicitly as
`"GET /api/v1/products": userRoute(listProducts)`. Named handlers follow the route
table; a shared matcher resolves `:id`, authorization, 404/405 and response handling.
The existing Next.js catch-all route remains the HTTP entry point; no per-endpoint
files or Express dependency are required.
The live frontend consumes these APIs; isolated preview pages retain mock data.

The supplied six-table architecture defines one shared admin/reviewer catalog.
API role `user` maps to database `reviewer`; provisioning accepts either spelling.
This supersedes the older store plan for this backend deliverable. See the
[scope decision](../docs/decisions/0004-shared-catalog-backend.md) and
[SQL schema](db/migrations/001_shared_catalog.sql). Datasets/models stay external;
saved analyses do not run inference or convert the separate ML status enum.

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
| `APP_ENV` | Must be `development` for seeds |
| `CORS_ORIGINS` | Comma-separated exact allowed browser origins; empty denies cross-origin requests |
| `SEED_USER1_EMAIL`, `SEED_USER1_PASSWORD` | First development regular account |
| `SEED_USER2_EMAIL`, `SEED_USER2_PASSWORD` | Second development regular account |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Development admin |
| `BACKEND_TEST_URL` | HTTP test target; default `http://127.0.0.1:3001` |

The URI passes unchanged to `pg`, with channel binding enabled. Pool max is five;
connection/query timeouts are 10 seconds, idle timeout 30 seconds. The supplied
`sslmode=require` emits a driver compatibility warning; SSL flags were not weakened.
Credentials, SQL and driver details are not logged or returned in errors.

## Database setup

From `backend/`, with Neon connectivity:

```sh
npm run db:inspect
npm run db:migrate
npm run db:seed
```

Inspection prints schema metadata only. The additive migration is transactional,
locked and checksummed; reruns do nothing. It stops on unmanaged conflicting table
names, leaves unrelated tables intact and never drops/resets/replaces data. Never
edit an applied migration. Auxiliary tables support sessions, login throttling,
seed keys and the migration ledger.

Development seeds create 10 realistic synthetic products, 3 descriptive analyses,
2 regular accounts, 1 admin, 3 categories, 3 actions and 3 history events. Stable
keys reuse records without changing existing data/passwords. Identity conflicts
roll back the seed. Passwords use salted scrypt, like backend authentication.
The user-supplied development seed passwords are accepted with a six-character
minimum; API provisioning/password changes require 12. Emails must be valid/distinct.
Seed analyses explicitly have insufficient basis, unverified sales labels/peers,
null reference, unknown observation time and unavailable prediction origin. They
make no model, forecast or causal claim.

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
old seeds; stores and live inference remain pending. Results are experimental.
See [scope](../docs/decisions/0007-bounded-ml-sample-import.md).

With the backend running, verify the source, database and real HTTP responses:

```sh
npm run test:ml-sample
```

Uses local SEED_USER1 credentials and writes sanitized results to ignored
`tmp/ml-sample-http.json`. `npm test` checks selection and source/status validation.
The migration runner discovers ordered numbered SQL files and checks each checksum.

## Import real product media

The source CSVs hold no media URLs, so real images and video come from the public
Tiki product API, fetched offline into `data/external/tiki_media_sample.json`
(schema `j4f-tiki-media-v1`, ignored). The fetch scripts live in the data checkout
under `ml/src/export/media/`. From `backend/`:

```sh
npm run db:migrate
npm run import:media -- --dry-run
npm run import:media -- --apply
```

Migration `003_product_media.sql` adds nullable `video_url`, `image_urls` and
`media_source_json` to `products`. The import matches products on
(`source_system`, `source_product_id`), writes only those columns plus
`thumbnail_url`, and is idempotent: a rerun reports `rows_changed: 0`. It rejects
any URL that is not `https`, stops when the media columns are missing, and never
touches `has_video`, `number_of_images` or `product_url`, which remain the
snapshot's own values.

Of the 100 sample products, 92 resolve to a verified image and 3 carry a video;
8 return HTTP 404 because their listings were delisted after 2023, keep null media
and are rendered with the existing placeholder tile. These URLs are external CDN
links, are not archived locally, may break at any time, and are display assets
only: they are never analysis input. See
[data contracts](../docs/rules/data-contracts.md) and
[verification](../docs/verification/product-media.md).

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

```sh
npm run typecheck
npm test
npm run build
# With a backend running and seeds configured:
npm run test:http
npm audit
```

HTTP tests send real requests and compare full seed responses with direct SQL.
They verify pagination, all logins, permissions, invalid/missing inputs, immutable
records, stale actions, rejection validation, CORS, CRUD and logout. Temporary
products/categories are deleted; only test-created fixtures are removed. Identity
sequences may advance; seed/unrelated data is not overwritten. Run in development.
Sanitized results are in ignored `tmp/backend-http-results.json`, without tokens,
emails or hashes. See [verification report](../docs/verification/sellens-backend.md).
