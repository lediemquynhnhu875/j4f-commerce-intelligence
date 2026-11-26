# Repository structure and ownership

## Agreed stack and component boundaries

- Next.js serves the connected frontend and isolated previews in `frontend/` and web API in `backend/`.
- The web backend owns application logic, PostgreSQL access on Neon, and user actions.
- Python/FastAPI serves experimental inference from `ml/src/serving/` and reuses the trained Model A and offline scoring rules.
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

- `src/app/[role]/[page]/page.tsx`: maps URL slugs to User and Admin screens.
- `src/app/api/backend/`: server-side HTTP proxy. Session cookies are HttpOnly.
- `src/page/user/`: `overview.tsx`, `product.tsx`, `analysis.tsx` and
  `suggestion.tsx` define the User screens. The route maps the singular file names
  to the existing plural URLs for products and suggestions.
- `src/page/admin/`: `overview.tsx`, `stores.tsx`, `accounts.tsx`,
  `monitor.tsx` and `configuration.tsx` define the Admin screens.
- `src/page/auth.tsx`: workspace session and role boundary. Backend guards
  enforce role and data ownership independently.
- `src/components/`: reusable UI. `layout/workspace-layout.tsx` renders
  the shared page frame and receives page descriptions and controls as props.
- `src/lib/`: API client, the generic workspace request hook and shared helpers.
  Database and model-service integration belongs in server-only modules.
- `src/types/`: shared TypeScript types.
- `tests/`: web UI and web API tests.

## `ml/` - Nhung

- `notebooks/`: numbered exploration notebooks; no production logic.
- `src/data/`: merge, validation, and cleaning steps.
- `src/taxonomy/`: product-type assignment.
- `src/peers/`: comparable-product retrieval.
- `src/models/`: baselines, training, prediction, and evaluation.
- `src/scoring/`: status assignment, evidence, and recommendation rules.
- `src/retrain/`: scheduled retraining job (training set A', gates, candidate packing) and the
  GitHub Actions workflow template for the private model-asset repository.
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

