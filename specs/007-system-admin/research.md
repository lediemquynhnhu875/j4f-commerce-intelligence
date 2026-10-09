# Research: System Administration

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Reuse

**Decision**: Admin screens call F001 identity, F002 catalog and F004 processing services; do not create parallel CRUD/import stacks.

**Rationale**: These features already define their persistence/authorization primitives.

**Alternatives considered**: Independent management data stores would cause ownership drift.

## Suspension

**Decision**: Suspend/revoke sessions atomically where possible, and check active account per request; prohibit suspension of the last active Admin.

**Rationale**: Prevents account bypass and demo lockout.

**Alternatives considered**: Client-only hiding and delayed revocation are excluded.

## Reassignment/history

**Decision**: Archive old StoreProduct assignment and create explicit new entry; never transfer historical runs/actions to a different store silently.

**Rationale**: Frozen tenant-scoped evidence must remain valid.

**Alternatives considered**: Editing only store_id would expose prior store history.

## Monitoring

**Decision**: Use recorded processing states and safe failures; reconciliation marks timed-out stale running requests failed with audit evidence.

**Rationale**: Synchronous MVP has no durable worker queue; crashes must not remain invisible.

**Alternatives considered**: Inventing uptime/traffic/financial metrics without collected data is excluded.

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
