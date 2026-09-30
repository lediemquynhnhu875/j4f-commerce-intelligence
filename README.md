# J4F Commerce Intelligence

Decision support system for e-commerce sales performance analysis and product improvement opportunity detection.

## Product scope

The MVP processes a Tiki fashion-product snapshot, finds comparable products, estimates reference sales, assigns an opportunity status, and presents evidence-backed improvement suggestions in a web application.

The system provides decision-support hypotheses. It does not claim causal effects or forecast future sales.

## Repository structure

```text
.
|-- backend/              # API, database, and model integration
|-- frontend/             # Web dashboard and product analysis UI
|-- ml/                   # Data preparation, peer groups, models, scoring
|-- data/                 # Local datasets (large/sensitive files are ignored)
|-- docs/                 # Architecture, contracts, decisions, and reports
|-- scripts/              # Reproducible project commands
|-- tests/                # End-to-end and cross-component tests
`-- .github/              # GitHub templates and CI workflows
```

See [docs/repository-structure.md](docs/repository-structure.md) for ownership and file placement rules, and [docs/data-contracts.md](docs/data-contracts.md) for the first shared output contract.

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

Runtime commands and dependencies will be added when the backend and frontend frameworks are initialized.

## Git workflow

- Branch from `main` using `feature/<area>-<task>`, for example `feature/ml-peer-groups`.
- Keep each pull request focused on one deliverable.
- Request at least one review from the listed reviewer.
- Never commit raw data, trained model binaries, local databases, `.env`, or generated build output.
- Update the relevant contract or decision document when a shared interface changes.

