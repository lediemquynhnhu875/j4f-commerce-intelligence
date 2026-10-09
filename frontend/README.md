# Web Application

Owner: Nhung. Reviewer: Nhu.

Agreed stack: Next.js for both the frontend and web backend. The application
has not been initialized yet. UI ownership remains with Nhung; web backend and
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

