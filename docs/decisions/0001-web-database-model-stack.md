# 0001: Web, Database, and Model-Service Stack

Status: Accepted by the team; implementation pending.
Date: 2026-10-09 (Asia/Saigon).
Owners: Mai (web backend, database, and service integration), Huy (frontend),
Nhung (ML and model integration), Như (product and QA).

Ownership corrected on 2026-10-09 to follow the current user-confirmed roster;
the architecture decision is unchanged. See
[planning scope and ownership](0002-planning-scope-and-ownership.md).

## Context

The initial documentation described FastAPI/Pydantic/SQLite for the application
backend and React/TypeScript/Vite for the frontend. The team has agreed to use
Next.js for both web layers, PostgreSQL on Neon for persistence, and a separate
Python/FastAPI service for model serving. Existing Python and web scaffolds
have not yet been initialized as complete services.

## Decision

- Use Next.js for the frontend and web backend. The planned web application
  lives in `frontend/`, with UI ownership assigned to Huy and web backend
  ownership assigned to Mai.
- Use PostgreSQL hosted on Neon for application persistence. The Next.js server
  owns product queries, score retrieval, and user action tracking through the
  application's web API under `/api/v1`.
- Use Python/FastAPI in `backend/` for model serving. Reuse data preparation,
  model, and scoring logic from `ml/src/`; keep training logic in the ML pipeline.
- The Next.js server integrates with the model service. The browser uses the
  web application's API; database credentials remain in server configuration.
- Keep the existing CSV pipeline outputs and documented field/status contracts.
  Define web API schemas, model-service endpoints, and database import details
  during feature planning.

## Consequences

- Treat the existing Python `backend/` scaffold as the future model service,
  rather than the web application's backend or persistence layer.
- Update component READMEs, shared working rules, the state document, and the
  environment template to reflect the agreed responsibilities.
- Next.js initialization, Neon provisioning, schema/migrations, score import,
  and model-service implementation remain future work. Runtime commands will
  be documented when those components are initialized.
- ORM, deployment targets for the web/model services, service authentication,
  and inference execution details are not selected by this decision.
