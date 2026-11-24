# Sellens frontend

Current ownership: each User has one store. The header uses `/stores` data;
User1 sees J4F store's catalog, User2 sees empty catalog/analyses/suggestions.
Admin store view shows persisted owners and product counts. See
[store contract](../specs/store-ownership.md). Store reassignment and live ML
inference remain unavailable; old pending-ownership text below is superseded.


Next.js / React / TypeScript connected to the separate PostgreSQL-backed API.
All demo/preview pages and mock authentication have been removed. See
[current Spec Kit scope](../specs/release-scope.md).

## Run

```powershell
npm ci
npm run dev -- --port 3000
```

Set server-only BACKEND_API_URL to the backend URL including /api/v1 (default:
http://127.0.0.1:3001/api/v1). For deployment, set FRONTEND_ORIGIN to the exact
public HTTPS origin. Never expose DATABASE_URL or tokens to browser environment
variables. Sessions use the existing HttpOnly cookie proxy at /api/backend/*.

## Pages

- Login: / and /login; real backend accounts only.
- User: /user/overview, /user/products, /user/analysis, /user/suggestions.
- Admin: /admin/overview, /admin/stores, /admin/accounts, /admin/monitor,
  /admin/configuration; /admin/analysis remains a monitoring detail view.
- /preview/*, /admin/products and /admin/categories return 404.
- Store ownership is enforced by the API. Configuration is read-only and live
  inference remains pending. Product import/write requests use the signed-in
  User's store. Saved analysis data is loaded from PostgreSQL.

Shared navigation/route policy is in src/lib/workspace-pages.ts. Connected UI
components are in src/page/connected/. Product identity and work evidence
continue to use API data with missing/broken-image fallbacks and immutable history.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

Release smoke tests use isolated API fixtures without credentials or database
writes. Existing connected integration checks use playwright.connected.config.ts
and require their documented backend/environment configuration. Historical
verification reports describe prior UI versions, including removed previews.
