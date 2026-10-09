# Model Service

Owner: Mai. Reviewer: Nhung.

Agreed stack: Python and FastAPI for model serving. This directory contains the
existing Python service scaffold; the model-service runtime has not been initialized.

The web backend uses Next.js as part of the web application in `frontend/`.
It owns web APIs under `/api/v1`, application logic, PostgreSQL access on Neon,
and user action tracking. This service exposes model inference to that backend
and reuses the model and scoring modules in `ml/src/`.

Keep HTTP routes in `app/api/`, service logic in `app/services/`, configuration
in `app/core/`, and request/response schemas in `app/schemas/`. The existing
`app/db/` directory is a scaffold; it does not establish ownership of the web
application's persistence layer. Endpoint contracts and runtime commands will
be documented when the service is implemented.

See [the stack decision](../docs/decisions/0001-web-database-model-stack.md) and
[the shared data contract](../docs/rules/data-contracts.md).

Planned delivery: [F003 readiness](../specs/003-ml-readiness/plan.md) must verify
the bundle/corpus before [F004 serving](../specs/004-analysis-integration/plan.md)
claims real inference. Models load from trusted configuration at startup;
recommendation rules stay in Python. All implementation tasks remain unchecked.
