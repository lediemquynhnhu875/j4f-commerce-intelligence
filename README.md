# J4F Commerce Intelligence

Decision support system for e-commerce sales performance analysis and product improvement opportunity detection.

## Product scope

The MVP processes a Tiki fashion-product snapshot, finds comparable products, estimates reference sales, assigns an opportunity status, and presents evidence-backed improvement suggestions in a web application.

The system provides decision-support hypotheses. It does not claim causal effects or forecast future sales.

## Agreed technology stack

| Component | Technology |
| --- | --- |
| Web backend | Next.js |
| Frontend | Next.js |
| Database | PostgreSQL on Neon |
| Model service | Python / FastAPI |

The planned Next.js application in `frontend/` serves the UI and web APIs.
The Python service in `backend/` serves model inference using `ml/src/`.
Web, database, and model-service runtime setup is still pending. See
[the architecture decision](docs/decisions/0001-web-database-model-stack.md).

## Repository structure

```text
.
|-- backend/              # Python/FastAPI model-service scaffold
|-- frontend/             # Planned Next.js frontend and web backend
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
| Product, QA, report, demo | Nhu | All members |
| Data science and ML | Huy | Nhu |
| Data pipeline, backend, database | Mai | Huy |
| Frontend and UX | Nhung | Nhu |

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

1. Put the six original CSV files in `data/raw/`. Do not commit them.
2. Copy `.env.example` to `.env` when local services are introduced.
3. Implement data cleaning first and write `data/processed/clean_products.csv`.
4. Implement scoring and write `data/processed/product_scores.csv` according to the shared contract.
5. Let the backend and frontend use sample data until the full model is ready.

The data and model pipeline is ready. See [ml/README.md](ml/README.md) for commands and checkpoints. Backend and frontend runtime commands will be added when those applications are initialized.

## Git workflow

- Branch from `main` using `feature/<area>-<task>`, for example `feature/ml-peer-groups`.
- Keep each pull request focused on one deliverable.
- Request at least one review from the listed reviewer.
- Never commit raw data, trained model binaries, local databases, `.env`, or generated build output.
- Update the relevant contract or decision document when a shared interface changes.
