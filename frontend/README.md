# Web Application

Owner: Huy. Reviewer: Như. Web backend/database owner: Mai.

Agreed stack: Next.js App Router and TypeScript for the frontend and web backend.
The application has not been initialized yet. UI ownership is with Huy; web backend and
database ownership remain with Mai.

The MVP contains a dashboard, searchable product table, product profile,
comparable-product view, recommendations, and action tracking. Web APIs under
`/api/v1` handle application logic and use PostgreSQL on Neon for persistence.
The Next.js server calls the Python/FastAPI model service in `backend/` when
model inference is needed.

Database credentials and the model-service URL belong to server configuration.
The browser consumes the web application's API; it does not connect directly
to Neon or read processed CSV files.

The directory layout and runtime commands will be documented when the Next.js
application is initialized. See [the stack decision](../docs/decisions/0001-web-database-model-stack.md).

Start with [F001 foundation](../specs/001-web-foundation/plan.md). Auth-library
routes use `/api/auth`; domain APIs use `/api/v1`. Admin provisions accounts;
each User has one explicitly assigned store. Every server boundary checks
current account state and persisted resource ownership. Mock UI and real API
integration are separate tasks in [the backlog](../docs/PROJECT_BACKLOG.md).

The first task is now F001/T001: initialize Next.js/TypeScript with recorded
dev/build/lint checks. F001/T002–T004 build mock shell/navigation/login without
waiting for Neon, authentication or the model service. Review real behavior and
connect services in the later tasks; mock roles never grant server permissions.

