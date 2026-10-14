# Sellens Backend Verification

Date: 2026-10-14 (Asia/Saigon). Branch: `feature/backend-neon-mvp`.

The supplied architecture was read before implementation. Read-only Neon inspection returned zero tables/columns/constraints before applying the migration. No existing application data was removed or replaced.

## Executed commands

### Explicit endpoint table regression — 2026-10-14

Replaced resource/method branching with explicit `METHOD /api/v1/path` entries
and named handlers in the same `api.ts`; no endpoint files, dependencies or database
schema/configuration changes. The existing dirty feature branch was retained.
Typecheck, production build, five unit tests (including alias/nested route matching
and 404/405 regressions) and all 62 live HTTP checks passed. The refactored build
was run temporarily on port 3002 to avoid interrupting port 3001, then stopped.
Seed product/analysis responses still matched independent PostgreSQL queries.
Only HTTP-created disposable CRUD fixtures were deleted. Detailed sanitized
requests: [refactor HTTP evidence](sellens-backend-refactor-http.json).

### Initial implementation

- `npm run db:inspect`: succeeded against Neon; empty schema before migration.
- `npm run db:migrate`: additive transaction succeeded; rerun reported already applied, no changes.
- `npm run db:seed`: inserted 10 products, 3 analyses, 3 accounts (2 Users/database reviewers, 1 Admin), 3 categories, 3 actions and 3 audit events. Rerun inserted zero records and reused every fixture; no data/password replacement.
- `npm run typecheck`: passed.
- `npm test`: 4 tests passed; password derivation/verification, strict validation, bounded IDs/pagination and safe unauthenticated responses.
- `npm run build`: production build passed. Started the final build with `npm start` on loopback port 3001.
- `npm run test:http`: 62 actual HTTP requests passed. Compared every seeded product and analysis DTO against independent PostgreSQL reads, including frozen snapshots and product/analyst relations. All 10 product IDs found across 3 pages; all 3 analysis IDs found in the results API.
- `npm audit`: zero vulnerabilities after removing unused scaffold lint dependencies.
- `git diff --check`: passed; `git diff --exit-code -- frontend`: passed (no frontend changes). `.env`, generated build output and local test results are ignored.

Temporary CRUD product/category fixtures were removed; only test-created records were deleted. PostgreSQL identity sequences advanced. Seed records remain unchanged. Sample credentials are stored only in ignored `.env`; no tokens, addresses, connection strings or password hashes appear in this report.

## Issues found and resolved

- Next.js Cache Components rejected an explicit route runtime setting; removed it, using the default Node runtime. Rebuilt successfully.
- Invalid SQL-like record IDs raised a BigInt conversion exception (500). Guarded conversion; final request returns 422 and the regression check passed.
- PostgreSQL ON DELETE RESTRICT raised SQLSTATE 23001. Added sanitized relationship-conflict mapping; final request returns 409 and the full HTTP suite passed.
- Login now rechecks and locks current account state after password derivation, preventing suspension/password changes from racing session creation. Final login/logout/permission checks rerun successfully.

## Actual HTTP results

All paths below are under `/api/v1`. Examples are shortened and sanitized; each row corresponds to an executed request. Full machine-readable evidence: [HTTP JSON](sellens-backend-http.json).

| Check | Request | HTTP | Result | Sanitized example |
| --- | --- | --- | --- | --- |
| Liveness | GET `/health` | 200 | PASS | `{"status":"ok"}` |
| PostgreSQL readiness | GET `/ready` | 200 | PASS | `{"status":"ready","database":"connected"}` |
| Protected catalog without login | GET `/products` | 401 | PASS | `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}` |
| Protected accounts without login | GET `/admin/accounts` | 401 | PASS | `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}` |
| Invalid login input | POST `/auth/login` | 422 | PASS | `{"error":{"code":"VALIDATION_ERROR","message":"Invalid request input","details":[{"field":"email","message":"Invalid email address"}]}}` |
| Seed USER1 login | POST `/auth/login` | 200 | PASS | `{"data":{"token_type":"Bearer","expires_in":86400,"account":{"id":"1","role":"user"}}}` |
| Seed USER2 login | POST `/auth/login` | 200 | PASS | `{"data":{"token_type":"Bearer","expires_in":86400,"account":{"id":"2","role":"user"}}}` |
| Seed ADMIN login | POST `/auth/login` | 200 | PASS | `{"data":{"token_type":"Bearer","expires_in":86400,"account":{"id":"3","role":"admin"}}}` |
| Invalid credentials | POST `/auth/login` | 401 | PASS | `{"error":{"code":"INVALID_CREDENTIALS","message":"Invalid email or password"}}` |
| Current account | GET `/auth/me` | 200 | PASS | `{"data":{"id":"1","full_name":"Sample Reviewer 1","role":"user"}}` |
| Admin list denied to user | GET `/admin/accounts` | 403 | PASS | `{"error":{"code":"FORBIDDEN","message":"Administrator access required"}}` |
| Product mutation denied to user | POST `/products` | 403 | PASS | `{"error":{"code":"FORBIDDEN","message":"Administrator access required"}}` |
| Admin list accounts | GET `/admin/accounts` | 200 | PASS | `{"data":[{"id":"1","full_name":"Sample Reviewer 1","role":"user"}],"pagination":{"page":1,"limit":20,"total":3}}` |
| /products page 1 | GET `/products?page=1&limit=4` | 200 | PASS | `{"data":[{"id":"1","name":"Canvas Everyday Tote","category_id":"1"}],"pagination":{"page":1,"limit":4,"total":10}}` |
| /products page 2 | GET `/products?page=2&limit=4` | 200 | PASS | `{"data":[{"id":"5","name":"Linen Summer Shirt","category_id":"3"}],"pagination":{"page":2,"limit":4,"total":10}}` |
| /products page 3 | GET `/products?page=3&limit=4` | 200 | PASS | `{"data":[{"id":"9","name":"Minimal Leather Wallet","category_id":"1"}],"pagination":{"page":3,"limit":4,"total":10}}` |
| Seed product 1 matches PostgreSQL | GET `/products/1` | 200 | PASS | `{"data":{"id":"1","name":"Canvas Everyday Tote","category_id":"1"}}` |
| Seed product 2 matches PostgreSQL | GET `/products/2` | 200 | PASS | `{"data":{"id":"2","name":"Classic Leather Handbag","category_id":"1"}}` |
| Seed product 3 matches PostgreSQL | GET `/products/3` | 200 | PASS | `{"data":{"id":"3","name":"Lightweight Running Sneakers","category_id":"2"}}` |
| Seed product 4 matches PostgreSQL | GET `/products/4` | 200 | PASS | `{"data":{"id":"4","name":"Unisex Canvas Sneakers","category_id":"2"}}` |
| Seed product 5 matches PostgreSQL | GET `/products/5` | 200 | PASS | `{"data":{"id":"5","name":"Linen Summer Shirt","category_id":"3"}}` |
| Seed product 6 matches PostgreSQL | GET `/products/6` | 200 | PASS | `{"data":{"id":"6","name":"Cotton Polo Shirt","category_id":"3"}}` |
| Seed product 7 matches PostgreSQL | GET `/products/7` | 200 | PASS | `{"data":{"id":"7","name":"Straight Leg Denim Jeans","category_id":"3"}}` |
| Seed product 8 matches PostgreSQL | GET `/products/8` | 200 | PASS | `{"data":{"id":"8","name":"Pleated Midi Skirt","category_id":"3"}}` |
| Seed product 9 matches PostgreSQL | GET `/products/9` | 200 | PASS | `{"data":{"id":"9","name":"Minimal Leather Wallet","category_id":"1"}}` |
| Seed product 10 matches PostgreSQL | GET `/products/10` | 200 | PASS | `{"data":{"id":"10","name":"Comfort Strap Sandals","category_id":"2"}}` |
| /analysis-results page 1 | GET `/analysis-results?page=1&limit=4` | 200 | PASS | `{"data":[{"id":"1","status":"insufficient_basis","product_id":"1","analyzed_by":"1","reference_sold":null,"is_eligible":false,"product":{"id":"1","name":"Canvas Everyday Tote","category_id":"1"},"analyst":{"id":"1","full_name":"Sample Reviewer 1"}}],"pagination":{"page":1,"limit":4,"total":3}}` |
| Seed analysis 1 matches PostgreSQL | GET `/analyses/1` | 200 | PASS | `{"data":{"id":"1","status":"insufficient_basis","product_id":"1","analyzed_by":"1","reference_sold":null,"is_eligible":false,"product":{"id":"1","name":"Canvas Everyday Tote","category_id":"1"},"analyst":{"id":"1","full_name":"Sample Reviewer 1"}}}` |
| Analysis 1 actions | GET `/analyses/1/actions` | 200 | PASS | `{"data":[{"id":"1","status":"proposed","analysis_id":"1"}],"pagination":{"page":1,"limit":20,"total":1}}` |
| Seed analysis 2 matches PostgreSQL | GET `/analyses/2` | 200 | PASS | `{"data":{"id":"2","status":"insufficient_basis","product_id":"2","analyzed_by":"2","reference_sold":null,"is_eligible":false,"product":{"id":"2","name":"Classic Leather Handbag","category_id":"1"},"analyst":{"id":"2","full_name":"Sample Reviewer 2"}}}` |
| Analysis 2 actions | GET `/analyses/2/actions` | 200 | PASS | `{"data":[{"id":"2","status":"proposed","analysis_id":"2"}],"pagination":{"page":1,"limit":20,"total":1}}` |
| Seed analysis 3 matches PostgreSQL | GET `/analyses/3` | 200 | PASS | `{"data":{"id":"3","status":"insufficient_basis","product_id":"3","analyzed_by":"1","reference_sold":null,"is_eligible":false,"product":{"id":"3","name":"Lightweight Running Sneakers","category_id":"2"},"analyst":{"id":"1","full_name":"Sample Reviewer 1"}}}` |
| Analysis 3 actions | GET `/analyses/3/actions` | 200 | PASS | `{"data":[{"id":"3","status":"proposed","analysis_id":"3"}],"pagination":{"page":1,"limit":20,"total":1}}` |
| Shared catalog accessible to second user | GET `/products/1` | 200 | PASS | `{"data":{"id":"1","name":"Canvas Everyday Tote","category_id":"1"}}` |
| Product analysis relationship | GET `/products/1/analyses` | 200 | PASS | `{"data":[{"id":"1","status":"insufficient_basis","product_id":"1","analyzed_by":"1","reference_sold":null,"is_eligible":false,"product":{"id":"1","name":"Canvas Everyday Tote","category_id":"1"},"analyst":{"id":"1","full_name":"Sample Reviewer 1"}}],"pagination":{"page":1,"limit":20,"total":1}}` |
| List categories | GET `/categories` | 200 | PASS | `{"data":[{"id":"1","name":"Sample Bags"}],"pagination":{"page":1,"limit":20,"total":3}}` |
| List actions | GET `/actions` | 200 | PASS | `{"data":[{"id":"1","status":"proposed","analysis_id":"1"}],"pagination":{"page":1,"limit":20,"total":3}}` |
| Action detail | GET `/actions/1` | 200 | PASS | `{"data":{"id":"1","status":"proposed","analysis_id":"1"}}` |
| Append-only action history | GET `/actions/1/history` | 200 | PASS | `{"data":[{"id":"1","event_type":"created"}],"pagination":{"page":1,"limit":20,"total":1}}` |
| Stale action update rejected | PATCH `/actions/1` | 409 | PASS | `{"error":{"code":"STALE_VERSION","message":"Action changed; reload and retry with the current updated_at"}}` |
| Rejection needs a reason | PATCH `/actions/1` | 422 | PASS | `{"error":{"code":"VALIDATION_ERROR","message":"decision_reason is required when rejecting an action"}}` |
| Immutable analyses reject edits | PATCH `/analyses/1` | 405 | PASS | `{"error":{"code":"METHOD_NOT_ALLOWED","message":"Method not allowed for this resource"}}` |
| Immutable history rejects mutation | POST `/actions/1/history` | 405 | PASS | `{"error":{"code":"METHOD_NOT_ALLOWED","message":"Method not allowed for this resource"}}` |
| Nonexistent product | GET `/products/9223372036854775807` | 404 | PASS | `{"error":{"code":"NOT_FOUND","message":"Record not found"}}` |
| Nonexistent analysis | GET `/analyses/9223372036854775807` | 404 | PASS | `{"error":{"code":"NOT_FOUND","message":"Record not found"}}` |
| Invalid product | POST `/products` | 422 | PASS | `{"error":{"code":"VALIDATION_ERROR","message":"Invalid request input","details":[{"field":"name","message":"Too small: expected string to have >=1 characters"},{"field":"price","message":"Too small: expected number to be >=0"}]}}` |
| Invalid page size | GET `/products?limit=101` | 422 | PASS | `{"error":{"code":"VALIDATION_ERROR","message":"Invalid request input","details":[{"field":"limit","message":"Too big: expected number to be <=100"}]}}` |
| SQL-like ID rejected | GET `/products/1%20OR%201=1` | 422 | PASS | `{"error":{"code":"VALIDATION_ERROR","message":"Invalid request input","details":[{"field":"","message":"Expected a positive record ID"},{"field":"","message":"Record ID exceeds bigint range"}]}}` |
| No arbitrary SQL route | POST `/sql` | 404 | PASS | `{"error":{"code":"NOT_FOUND","message":"Record not found"}}` |
| Unapproved browser origin | GET `/health` | 403 | PASS | `{"error":{"code":"ORIGIN_DENIED","message":"Origin is not allowed"}}` |
| Configured CORS preflight | OPTIONS `/products` | 204 | PASS | `{}` |
| Create disposable category | POST `/categories` | 201 | PASS | `{"data":{"id":"7","name":"HTTP Test Category"}}` |
| Create disposable product | POST `/products` | 201 | PASS | `{"data":{"id":"14","name":"Disposable HTTP Test Product","category_id":"7"}}` |
| Update disposable product | PATCH `/products/14` | 200 | PASS | `{"data":{"id":"14","name":"Disposable HTTP Test Product","category_id":"7"}}` |
| Referenced category deletion blocked | DELETE `/categories/7` | 409 | PASS | `{"error":{"code":"RELATION_CONFLICT","message":"Related record is missing or still referenced"}}` |
| Delete disposable product | DELETE `/products/14` | 200 | PASS | `{"data":{"id":"14"}}` |
| Delete disposable category | DELETE `/categories/7` | 200 | PASS | `{"data":{"id":"7"}}` |
| Last active administrator protected | PATCH `/accounts/3` | 409 | PASS | `{"error":{"code":"LAST_ADMIN","message":"The last active administrator cannot be suspended or demoted"}}` |
| Logout revokes session | POST `/auth/logout` | 200 | PASS | `{"data":{"logged_out":true}}` |
| Logout revokes session | POST `/auth/logout` | 200 | PASS | `{"data":{"logged_out":true}}` |
| Logout revokes session | POST `/auth/logout` | 200 | PASS | `{"data":{"logged_out":true}}` |
| Revoked session rejected | GET `/products` | 401 | PASS | `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}` |

## Limits and next steps

No blocker remains for the requested migration, seed or listed health/auth/catalog/result HTTP checks. This is development verification, not production or human acceptance.

Successful account provisioning/suspension, appending analyses and successful action transitions were implemented but not exercised by this HTTP suite; account listing/login/last-admin denial, action reads/history/stale/rejection denials and analysis immutability were exercised. Do not treat those unexecuted success paths as passing HTTP tests.

Frontend integration was deliberately excluded. Live inference, ML status mapping, deployment/HTTPS, large-data/load/concurrency testing, expiry elapsed in real time and human acceptance remain outside this requested run. Seed analyses explicitly have insufficient basis and synthetic evidence; no inference or sales-uplift claim.

The source DBML uses MySQL notation; its PostgreSQL translation and API `user` to database `reviewer` alias are documented in [ADR 0004](../decisions/0004-shared-catalog-backend.md). Existing store-oriented Spec Kit acceptance tasks remain unchecked. Mai/Huy/Nhung should review the amended shared catalog before frontend/model integration.

Setup, available endpoints and curl commands: [backend README](../../backend/README.md). No commit or push was performed.
