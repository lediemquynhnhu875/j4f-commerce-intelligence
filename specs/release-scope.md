# Connected workspace release scope

> Latest ownership implementation: [one User / one store](store-ownership.md). Store scoping is applied; older shared-catalog/pending-ownership statements below are historical.

Direct user request: remove demo pages and Admin product/category management.
This amendment supersedes earlier preview-delivery and Admin catalog-screen scope.

## Available pages

| Role | Menu pages | Additional detail route |
| --- | --- | --- |
| User | overview, products, analysis, suggestions | Product-specific saved evidence |
| Admin | overview, stores, accounts, monitor, configuration | /admin/analysis via monitoring |

All /preview routes, demo login, fixture sessions and mock-only views are removed.
/admin/products and /admin/categories return 404, including direct navigation.
The login page exposes real authentication only. Shared layout has no mock-account fallback.
Stores remain an explicit unavailable state; configuration remains read-only.

## Boundaries and remaining work

This is a frontend surface cleanup. Existing backend catalog APIs, database rows,
saved analyses, accounts and work history are not deleted or reauthorized here.
User catalog writes/imports, tenant ownership and live ML inference remain future
work. Removing Admin screens does not implement those capabilities or remove
existing Admin API permissions. Account management and monitoring remain usable.

F001 mock tasks are historical implementation evidence, not current release pages.
F007/T009's Admin catalog-screen deliverable is retired, not completed. Its former
acceptance is excluded from the current UI release. F007/T008 API policy changes
remain unimplemented pending owner-scoped catalog design. Original IDs are retained.
F008 demonstrations must use the authenticated connected application and stored
results; successful release navigation does not establish model quality acceptance.

## Verification

- Retired routes return HTTP 404.
- Login has no mock/preview entry point.
- User retains its four production menu pages.
- Admin retains its five menu pages and saved-analysis detail access.
- Authenticated account management remains available.
- Executed: production build, TypeScript check and changed-file lint passed.
- Four release browser tests passed, covering retired URLs, real login entry and
  User/Admin navigation with isolated API responses and no database writes.
- Full-project lint remains blocked by 13 existing explicit-any errors in
  unchanged catalog/API-client files. Next.js reports a dependency security
  advisory; the final unchanged build retry passed. No deployment was performed.

## Runtime mock cleanup

The API Explorer quick login, Hello route, demo CSS and synthetic catalog generator
have been removed. See [current audit](mock-retirement.md).
