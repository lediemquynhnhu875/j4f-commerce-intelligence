# Bounded ML import verification

Date: 2026-10-16 (Asia/Saigon). Owner: requesting contributor, Codex-assisted.
Branch: feature/backend-neon-mvp. Scope: [ADR 0007](../decisions/0007-bounded-ml-sample-import.md).

## Actual database result

Migration 001 was checksum-verified unchanged. Migration 002_ml_sample applied
successfully to Neon. Import committed 100 products, 100 analyses, 104 original
ML suggestions and 104 initial history events. Database totals: 110 products,
103 analyses and one import run; the existing 10 products/three analyses remain.

| Product type | Imported products |
| --- | ---: |
| Giày lười nam | 20 |
| Túi đeo chéo | 20 |
| Balo | 20 |
| Ví nam | 20 |
| Mũ nón | 20 |

Selection takes five products from each of four observed statuses per group;
25 each of performing_well, untapped_potential, difficult_to_sell and
insufficient_data. This is a stratified review sample, not a population estimate.
Rerunning the importer returned already-imported with inserted_products=0 and
unchanged 100/100/104 counts. The seed registry retains all original records.

## Executed checks

- Import dry-run selected exactly 100 products and 104 suggestions.
- Backend typecheck and eight unit tests passed: existing guards, deterministic
  selection, invalid source data and incompatible status versions.
- Backend and frontend production builds passed. Initial sandbox failures were
  junction permissions/font fetching. A subsequent frontend worker/cache failure
  was resolved by clearing only generated `.next` output and rebuilding.
- `npm run test:ml-sample`: 32 real HTTP checks passed. All 100 selected snapshots,
  status/reason/version values, evidence/peer IDs and all 104 original suggestions
  were compared with source JSON. Numeric DB rounding was checked against declared
  four-decimal precision. Catalog values were independently cross-checked with
  PostgreSQL and 104 initial audit events were verified.
- `npm run test:connected -- ml-sample.spec.ts` with backend on port 3001:
  one Chromium journey passed. Real user login; all five category filters show
  20 products; experimental analysis/interval display; readable suggestion evidence
  and validation steps; no page errors. The test logs out and changes no imported data.
- Frontend lint passed; final checks are recorded in CURRENT_STATE.

## HTTP evidence (all passed)

| Method/path under /api/v1 | Status | Sanitized result |
| --- | ---: | --- |
| GET /health | 200 | status=ok |
| GET /ready | 200 | status=ready, database=connected |
| GET /products, unauthenticated | 401 | auth required |
| POST /auth/login, seeded user | 200 | session established; token not logged |
| GET /admin/accounts, regular user | 403 | admin access rejected |
| GET /products, /analyses, /actions across six pages each | 200 | imported records verified against source |
| GET /products/:id and /products/:id/analyses | 200 | imported product and saved analysis |
| GET /analyses/:id and /analysis-results/:id | 200 | ml_v2 result with frozen snapshot |
| GET /analyses/:id/actions | 200 | original rule suggestions |
| GET /actions/:id/history | 200 | created audit event |
| GET /products/9223372036854775807 | 404 | missing product |
| GET /products?limit=101 | 422 | invalid pagination |
| POST /auth/logout | 200 | session revoked |

Detailed sanitized HTTP evidence: ignored `tmp/ml-sample-http.json`.
Reproduce with backend `.env` configured and the source JSON in data/processed.

## Limitations

Images remain null; UI uses its icon placeholder. Stores and multi-store isolation
remain pending; active accounts share the catalog. Peer source IDs can refer to
products outside the 100; their product rows were not imported. No live inference,
Python changes or quality acceptance. Capture time/sales window remain unknown.
Large-corpus UI pagination/performance are outside this bounded import. Full
original legacy HTTP/browser suites were not rerun; evidence is limited to the
executed checks above. No source datasets or credentials are committed.
