# Repository structure and ownership

## Agreed stack and component boundaries

- Next.js serves the connected frontend and isolated previews in `frontend/` and web API in `backend/`.
- The web backend owns application logic, PostgreSQL access on Neon, and user actions.
- Python/FastAPI model serving remains pending and reuses `ml/src/`; no service was moved.
- The backend has a verified PostgreSQL REST runtime; the frontend uses a same-origin cookie proxy.
- See [the current scope amendment](../decisions/0004-shared-catalog-backend.md).

## `backend/` - Mai, with Nhung for model integration

- `src/app/api/v1/`: thin Next.js HTTP route; delegates to server router/services.
- `src/server/config.ts`, `db.ts`, `auth.ts`: configuration, pooled SQL and sessions.
- `src/server/validation.ts`, `errors.ts`: strict input and safe error contracts.
- `src/server/services/`: catalog/accounts, immutable analyses and audited actions.
- `db/migrations/`: checksummed additive SQL; never edit an applied migration.
- `scripts/`: schema inspection, migration, repeatable seeds and real HTTP verification.
- `tests/`: backend unit checks; integration report stored under `docs/verification/`.

## `frontend/` - Huy (UI), Mai (web backend and database)

- The contributor's later integration request supersedes the earlier disconnected
  scope. Live `/user/*` and `/admin/*` use APIs; preview workspace pages stay
  synthetic. `/preview` and `/preview/login` use real login; mock login lives at
  the explicitly named `/preview/demo-login`.
- `src/app/api/backend/`: server-side HTTP proxy; opaque session token stays in HttpOnly cookies.
- `src/features/connected/`: real catalog, analyses, actions/audit and Admin management.
- `src/components/live-*.tsx`, `src/lib/api-client.ts`, `use-live-session.ts` and
  `src/types/api.ts`: live workspace/session composition, client and DTOs.
- `src/components/`: reusable UI components; `layout/header.tsx` and
  `layout/sidebar.tsx` are composed by `layout/app-shell.tsx`.
- `src/features/admin/`: four Admin screen files: `overview.tsx`, `stores.tsx`,
  `monitor.tsx` and `configuration.tsx`.
- `src/features/user/`: four User screen files: `overview.tsx` (dashboard),
  `product-list.tsx` (catalog), `evidence-panel.tsx` (analysis) and
  `suggestions-view.tsx` (improvements). Keep reusable helpers in `components/`.
- `src/lib/`: API client and generic helpers; keep database and model-service
  integration code in server-only modules when the application is initialized.
- `src/types/`: shared TypeScript types.
- `tests/`: web UI and web API tests.

## `ml/` - Nhung

- `notebooks/`: numbered exploration notebooks; no production logic.
- `src/data/`: merge, validation, and cleaning steps.
- `src/taxonomy/`: product-type assignment.
- `src/peers/`: comparable-product retrieval.
- `src/models/`: baselines, training, prediction, and evaluation.
- `src/scoring/`: status assignment, evidence, and recommendation rules.
- `tests/`: deterministic tests for transformations and scoring.
- `artifacts/`: generated models and vectorizers; not committed.

## `data/` - Mai and Nhung

- `raw/`: untouched source CSV files.
- `interim/`: intermediate outputs used for debugging.
- `processed/`: clean products and final product scores.
- `samples/`: small anonymized fixtures that may be committed for tests and UI work.

## `docs/` - Như

- Product requirements, architecture, data contracts, decisions, evaluation results, test cases, and demo material.
- Use available reports as sources. No complete project/competition report was
  found in the current checkout; do not claim it was reviewed.

## `specs/` - Shared feature planning

- Eight bounded features store English specs, plans, contracts and task lists.
- Each task has one proposed member owner; actual claims are recorded in
  `docs/CURRENT_STATE.md` after team coordination.
- See [the backlog](../PROJECT_BACKLOG.md). Task counts are not effort estimates.
- Planned web server modules live in `frontend/src/server/`, domain handlers in
  `frontend/src/app/api/v1/`, auth handlers in `frontend/src/app/api/auth/`,
  and versioned SQL migrations in `frontend/db/migrations/`.

## `scripts/` and `tests/`

- `scripts/`: thin entry points for repeatable local tasks. Core logic belongs in application modules.
- `tests/integration/`: checks that span ML output, API responses, and frontend assumptions.

## Shared rules

- A notebook may explore an idea, but reusable code must move into `ml/src/`.
- Backend routes must not contain data-cleaning or model-training logic.
- Frontend code must consume documented API responses, not read processed CSV files in production.
- Commit only small, anonymized sample data required for development or testing.
- Changes to column names, API fields, or status labels require a matching update to `docs/rules/data-contracts.md`.

