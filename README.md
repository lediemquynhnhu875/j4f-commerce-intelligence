# J4F Commerce Intelligence

Decision support system for e-commerce sales performance analysis and product improvement opportunity detection.

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

1. Review [the implementation backlog](docs/PROJECT_BACKLOG.md) and claim a
   feature/task through team coordination.
2. Start F001/T001 frontend setup, then F001/T002–T004 mock previews. F003 ML
   verification can start independently. Review real contracts before integrating
   auth/database/model behavior; reuse existing cleaning and scoring code.
3. Obtain the six source CSVs and trusted artifacts locally. Do not commit them.
4. Copy `.env.example` to `.env` when implementing runtime setup.
5. Use clearly labeled mocks only for the planned UI tasks; real integration
   requires verified source/artifacts and acceptance evidence.

Admin provisions email/password accounts; each User has one explicit store.
User access is enforced server-side; Admin manages the system. Demo assignments
do not derive account ownership from source seller metadata.

Spec Kit and the constitution are initialized. Eight feature plans contain 110
unchecked tasks. Existing ML runtime readiness remains unverified: the current
test attempt fails at import because `pandas` is missing, and source/model
artifacts are absent. See [the evidence audit](docs/verification/planning-audit.md)
and [ml/README.md](ml/README.md) for commands and checkpoints. Web and service
runtime commands will be supplied by their implementation tasks.

## Git workflow

- Branch from `main` using `feature/<area>-<task>`, for example `feature/ml-peer-groups`.
- Keep each pull request focused on one deliverable.
- Request at least one review from the listed reviewer.
- Never commit raw data, trained model binaries, local databases, `.env`, or generated build output.
- Update the relevant contract or decision document when a shared interface changes.
