# J4F Commerce Intelligence

Decision support system for e-commerce sales performance analysis and product improvement opportunity detection.

For page-by-page instructions for User and Admin, read the
[Vietnamese user guide](README_HUONG_DAN_SU_DUNG.md), located at the repository root.

## Current store ownership

Each regular account owns one store. User1 owns `J4F store` and the existing data;
User2 starts empty. The backend enforces store-scoped access including nested
analysis/work/history routes. See [current contract and tests](specs/store-ownership.md).
Earlier shared/multi-store planning references below are historical.

## Current UI release

Demo/preview pages and Admin product/category management screens have been removed.
See [current scope and pending ownership/import work](specs/release-scope.md) and
[frontend instructions](frontend/README.md). Older preview references below describe
historical milestones, not accessible routes in the current release.

## Product scope

The MVP processes a Tiki fashion-product snapshot, finds comparable products, estimates reference sales, assigns an opportunity status, and presents evidence-backed improvement suggestions in a web application.

The system provides decision-support hypotheses. It does not claim causal effects or forecast future sales.

## Agreed technology stack

| Component | Technology |
| --- | --- |
| Web backend | Next.js / TypeScript |
| Frontend | Next.js / TypeScript |
| Database | PostgreSQL on Neon |
| Model service | Python / FastAPI |

The Next.js application in `frontend/` uses authenticated PostgreSQL-backed
APIs served by the separate `backend/` application. Each User has one store.
Imported ML snapshots supply the saved analysis results and suggestions.
Python/FastAPI serving remains pending.

The API home page lists registered endpoints and links to health/readiness checks.
See [backend setup](backend/README.md) and
[runtime mock cleanup](specs/mock-retirement.md).

## Repository structure

```text
.
|-- backend/              # Next.js / TypeScript web API and PostgreSQL persistence
|-- frontend/             # Next.js authenticated UI backed by PostgreSQL APIs
|-- ml/                   # Data preparation, peer groups, models, scoring
|-- data/                 # Local datasets (large/sensitive files are ignored)
|-- docs/                 # Architecture, contracts, decisions, and reports
|-- scripts/              # Reproducible project commands
|-- tests/                # End-to-end and cross-component tests
`-- .github/              # GitHub templates and CI workflows
```

See [docs/rules/repository-structure.md](docs/rules/repository-structure.md) for ownership and file placement rules, and [docs/rules/data-contracts.md](docs/rules/data-contracts.md) for the first shared output contract.

All contributors and coding agents follow [AGENTS.md](AGENTS.md). Read
[docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) before starting a task and update
it when handing work over. See [docs/README.md](docs/README.md) for the documentation index.

## Team ownership

| Area | Primary owner | Reviewer |
| --- | --- | --- |
| Product, QA, real human evaluation, report, demo | Như | All members |
| Data science and ML | Nhung | Như |
| Data pipeline, web backend, database, model-service integration | Mai | Nhung |
| Frontend and UX | Huy | Như |

## MVP flow

```text
Raw CSV files
  -> cleaning and standardization
  -> product taxonomy
  -> comparable-product groups
  -> reference-sales scoring
  -> status and recommendations
  -> API and database
  -> dashboard and product profile
```

## Getting started

1. Copy `.env.example` to an ignored `.env` and configure the Neon connection.
2. Follow [backend setup](backend/README.md) for installation, inspection,
   migrations and server startup.
3. Follow [frontend setup](frontend/README.md) to configure BACKEND_API_URL and
   start the web application.
4. Use existing accounts to sign in. Admin manages accounts through the web UI.
5. Import product data and supplied ML snapshots using the documented commands.

See [the Vietnamese user guide](README_HUONG_DAN_SU_DUNG.md) for page-by-page
operation and [the current state](docs/CURRENT_STATE.md) for verification evidence.

## Git workflow

- Branch from `main` using `feature/<area>-<task>`, for example `feature/ml-peer-groups`.
- Keep each pull request focused on one deliverable.
- Request at least one review from the listed reviewer.
- Never commit raw data, trained model binaries, local databases, `.env`, or generated build output.
- Update the relevant contract or decision document when a shared interface changes.
