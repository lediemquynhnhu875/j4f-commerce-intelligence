# 0002: MVP Scope, Ownership, and Planning Defaults

Date: 2026-10-09 (Asia/Saigon).
Status: user-confirmed scope and roster; technical defaults proposed for review.

## Context

The user requested implementation planning for Sellens, preserving existing ML
work and separating reusable code from verified runtime capability. Older
documents had swapped the ML and frontend owners. The current request overrides
those assignments. The full project report and actual source/model artifacts
are absent from this checkout.

## Confirmed decisions

- **Như** leads product scope, QA, reporting, genuine interviews/usability testing
  and demo coordination.
- **Nhung** owns data science/ML: EDA, taxonomy, peers, models, evaluation and
  interpretation.
- **Mai** owns cleaning/data engineering, database, web authentication/APIs/imports,
  and FastAPI integration.
- **Huy** owns frontend/UX and User/Admin screens.
- Admin provisions email/password accounts. There is no self-registration in
  the MVP. Each User manages one explicitly assigned store.
- User accesses only their store's application resources. Admin manages accounts,
  stores, categories, imports, assignments, system statistics and processing.
- Demo stores are explicit assignments from the single Tiki dataset.
  `seller_id` remains source metadata and does not establish account ownership.
- Next.js App Router and TypeScript serve UI and web backend; PostgreSQL on Neon
  stores application state; Python/FastAPI serves existing `ml/src/` logic.
- Results are snapshot decision support, without future forecasts, guaranteed
  causal improvements or fabricated human evaluation.

## Proposed implementation defaults

These choices make the plans executable; they require team review before the
related setup tasks. They are not installed or verified in this planning session.

- Use Better Auth email/password with database sessions and self-registration
  disabled; keep account provisioning on a protected Admin service.
- Start with a 24-hour session lifetime and disable session cookie caching.
  Every server boundary verifies account state and persisted ownership. Immediate
  suspension requires revocation and current-state checks, including for active sessions.
- Use server-only `pg` access and versioned SQL migrations in a Next.js Node runtime.
  Dependent state changes and history inserts share a database transaction.
- Auth-library endpoints use `/api/auth`; domain endpoints use `/api/v1`.
  Bootstrap the first Admin through an operator command with local secrets.
  Pin frontend runtime versions in F001/T001; review/pin auth/database
  versions in F001/T005–T007 before real integration. UI previews follow
  [the revised execution order](0003-ui-preview-first-task-order.md).
- Use synchronous, bounded model calls with a configurable initial 30-second
  timeout. Persist `pending/running/succeeded/failed` processing states separately
  from analytic statuses. Do not silently substitute mock output on failure.
- Load only trusted, configured bundles/corpora at FastAPI startup; validate
  compatibility and readiness. Do not fit/train per request or load uploaded artifacts.
- Keep recommendation rules in Python. Freeze input, original output, peer/source
  evidence and model/config versions for each analysis.
- User actions are versioned decisions/progress updates with atomic append-only
  history; original analysis evidence remains immutable.
- Archived historical resources retain their original store. Reassignment creates
  the appropriate new store resource instead of rewriting prior analysis ownership.

Password recovery, OAuth, self-registration, multi-store Users, a queue platform,
a generic configuration editor, and unsupported financial/forecast metrics are
outside this MVP. Deployment hosts and resource limits remain to be selected.

## Consequences and review gates

Eight feature plans cover the complete requested scope. Owners are proposed task
responsibility holders, not confirmed work claims. Record actual branch/assignment
in the handoff before starting.

F003 must verify existing ML and close inference/export/eligibility gaps before
F004 claims real model integration. Mock UI can progress independently only after
contract review and task dependencies are met. F008 requires real human and
integration evidence.

The team still needs the full report if available, actual snapshot provenance and
target/time semantics, demo store mapping, review of the technical defaults,
human-evaluation logistics, and deployment/resource decisions. See the
[backlog decision table](../PROJECT_BACKLOG.md).

## References

- [Stack decision](0001-web-database-model-stack.md)
- [Planning evidence audit](../verification/planning-audit.md)
- [Shared rules](../../AGENTS.md)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password)
- [Better Auth sessions](https://better-auth.com/docs/concepts/session-management)
- [Better Auth PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql)
- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/)
