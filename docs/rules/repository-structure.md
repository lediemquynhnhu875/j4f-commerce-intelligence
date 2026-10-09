# Repository structure and ownership

## Agreed stack and component boundaries

- Next.js serves the frontend and web backend in the planned `frontend/` web application.
- The web backend owns application logic, PostgreSQL access on Neon, and user actions.
- Python/FastAPI in `backend/` serves model inference and reuses `ml/src/`.
- These are target responsibilities; the existing scaffolds are not complete runtimes.
- See [the stack decision](../decisions/0001-web-database-model-stack.md).

## `backend/` - Mai, with Huy for model integration

- `app/api/`: model-service HTTP routes only; service logic stays in services.
- `app/core/`: configuration, logging, and shared application setup.
- `app/db/`: existing scaffold; web persistence belongs to the Next.js backend.
- `app/schemas/`: model-service request and response contracts.
- `app/services/`: model loading, inference, and scoring integration.
- `tests/`: model-service unit and API tests.

## `frontend/` - Nhung (UI), Mai (web backend and database)

- Planned Next.js application with frontend and web backend code; initialize its
  framework structure when implementation begins.
- `src/components/`: reusable UI components.
- `src/features/dashboard/`: summary metrics, charts, and priority products.
- `src/features/products/`: product list, filters, profile, peers, and actions.
- `src/lib/`: API client and generic helpers; keep database and model-service
  integration code in server-only modules when the application is initialized.
- `src/types/`: shared TypeScript types.
- `tests/`: web UI and web API tests.

## `ml/` - Huy

- `notebooks/`: numbered exploration notebooks; no production logic.
- `src/data/`: merge, validation, and cleaning steps.
- `src/taxonomy/`: product-type assignment.
- `src/peers/`: comparable-product retrieval.
- `src/models/`: baselines, training, prediction, and evaluation.
- `src/scoring/`: status assignment, evidence, and recommendation rules.
- `tests/`: deterministic tests for transformations and scoring.
- `artifacts/`: generated models and vectorizers; not committed.

## `data/` - Mai and Huy

- `raw/`: untouched source CSV files.
- `interim/`: intermediate outputs used for debugging.
- `processed/`: clean products and final product scores.
- `samples/`: small anonymized fixtures that may be committed for tests and UI work.

## `docs/` - Nhu

- Product requirements, architecture, data contracts, decisions, evaluation results, test cases, and demo material.
- Existing competition documents at the repository root remain source references until the team decides how to organize them.

## `scripts/` and `tests/`

- `scripts/`: thin entry points for repeatable local tasks. Core logic belongs in application modules.
- `tests/integration/`: checks that span ML output, API responses, and frontend assumptions.

## Shared rules

- A notebook may explore an idea, but reusable code must move into `ml/src/`.
- Backend routes must not contain data-cleaning or model-training logic.
- Frontend code must consume documented API responses, not read processed CSV files in production.
- Commit only small, anonymized sample data required for development or testing.
- Changes to column names, API fields, or status labels require a matching update to `docs/rules/data-contracts.md`.

