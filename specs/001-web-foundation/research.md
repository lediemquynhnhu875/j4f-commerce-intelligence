# Research: Web Foundation, Authentication, and Store Ownership

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Application placement

**Decision**: Next.js App Router with TypeScript in frontend/src/app; server logic in frontend/src/server.

**Rationale**: Preserves the already-agreed frontend/ app and Python backend/ model-service boundary.

**Alternatives considered**: A second Next.js app would duplicate routing and authorization.

## UI-first execution

**Decision**: Initialize the framework and produce labeled synthetic previews
before real auth/database integration. Review real permission/login cases before
implementing their server behavior.

**Rationale**: Visual drafts need no real session or model; premature runtime
dependencies prevented independent frontend progress.

**Impact**: Separate mock and real tasks; see the
[sequencing/ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md).
Business requirements, ownership and verification rules remain intact.

## Authentication

**Decision**: Planning baseline: Better Auth email/password with PostgreSQL-backed sessions; no public sign-up. Library versions are pinned and reviewed at implementation setup.

**Rationale**: User confirmed admin provisioning and email/password. A maintained integration avoids custom password/session primitives.

**Alternatives considered**: OAuth is outside the confirmed MVP; custom JWT auth would add unnecessary revocation complexity.

## Persistence

**Decision**: Node.js server runtime with pg Pool against Neon; versioned SQL migrations for application tables and reviewed auth-library schema migrations.

**Rationale**: Transactions and immediate session revocation are required. No additional application ORM is selected.

**Alternatives considered**: HTTP-only fixed transaction batches are insufficient for dependent mutation/history workflows.

## Session policy

**Decision**: Planning default: 24-hour session expiry, no client cookie session cache, server checks active status on every protected request, fresh login after reactivation.

**Rationale**: Avoids stale authorization after suspension. Team can amend the expiry before implementation.

**Alternatives considered**: Layout-only checks and cached client roles do not protect API access.

## Bootstrap

**Decision**: One-time operator bootstrap command with credentials from local secrets; subsequent account provisioning is Admin-only.

**Rationale**: Provides the first Admin without public registration or repository passwords.

**Alternatives considered**: Committed demo passwords or open sign-up are excluded.

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
