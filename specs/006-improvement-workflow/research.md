# Research: Suggestions and Improvement Workflow

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Rule reuse

**Decision**: F004 result snapshots supply originals from Python ml/src/scoring/status.py; this feature does not implement a second recommendation engine.

**Rationale**: Existing analysis logic already produces evidence-linked suggestions.

**Alternatives considered**: Independent frontend/Next rule generation is excluded.

## Workflow

**Decision**: Decision pending/accepted/rejected; progress not_started/in_progress/completed only when accepted. Rejected actions are terminal for MVP.

**Rationale**: Makes valid transitions testable and keeps rejection meaning stable.

**Alternatives considered**: Silent reset of completed/rejected work is excluded.

## History and concurrency

**Decision**: PostgreSQL transaction updates action plus append-only event; expected_version detects stale edits with 409.

**Rationale**: User explicitly requires atomic writes and preserved history.

**Alternatives considered**: Separate writes or last-writer-wins would lose accountability.

## Completion

**Decision**: Nonblank rejection and completion notes, <=2000 characters. Original content is immutable; editable copy is separate.

**Rationale**: Preserves original reasoning while recording actual work.

**Alternatives considered**: Editing originals or asserting uplift on completion is excluded.

## Sources and existing evidence

- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication)
- [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password)
- [Better Auth sessions](https://better-auth.com/docs/concepts/session-management)
- [Better Auth PostgreSQL](https://better-auth.com/docs/adapters/postgresql)
- [Better Auth Next.js](https://better-auth.com/docs/integrations/next)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Neon PostgreSQL connectivity](https://neon.com/docs/connect/connect-from-any-app)
- [Existing-code audit](../../docs/verification/planning-audit.md)
- [Confirmed architecture and ownership](../../docs/decisions/0002-planning-scope-and-ownership.md)

All technical unknowns are resolved to a concrete planning baseline or an explicitly scoped future verification task. No package is installed, service provisioned, or gate claimed passed by writing this document. Missing real data, artifacts, and human evidence are execution prerequisites.
