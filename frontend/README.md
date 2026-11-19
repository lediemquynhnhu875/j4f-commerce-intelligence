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
  and /admin/configuration.
- /preview/*, /admin/products and /admin/categories return 404.
- Store ownership is enforced by the API. Configuration is read-only and live
  inference remains pending. Product import/write requests use the signed-in
  User's store. Saved analysis data is loaded from PostgreSQL.

The Next.js route `src/app/[role]/[page]/page.tsx` maps public URLs to screens:

- `src/page/user/` contains `overview.tsx`, `product.tsx`, `analysis.tsx`
  and `suggestion.tsx`. The product and suggestion files map to the existing
  plural URLs `/user/products` and `/user/suggestions`.
- `src/page/admin/` contains `overview.tsx`, `stores.tsx`, `accounts.tsx`,
  `monitor.tsx` and `configuration.tsx`.
- `src/page/auth.tsx` checks the session and requested role before mounting a
  screen. Backend authorization protects store data independently.
- `src/components/layout/workspace-layout.tsx` renders the shared layout,
  and `src/lib/workspace-pages.ts` holds menu labels and allowed route slugs.
  Each page supplies its own description and API reads.

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
