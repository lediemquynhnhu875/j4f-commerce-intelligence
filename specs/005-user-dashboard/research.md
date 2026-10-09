# Research: User Dashboard and Analysis Presentation

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Aggregations

**Decision**: Read tenant-scoped StoreProduct and completed AnalysisRun records; counts state their denominator and snapshot.

**Rationale**: The dataset is one snapshot rather than a sales time series.

**Alternatives considered**: Unsupported revenue/profit/conversion/trend charts are excluded.

## Result selection

**Decision**: Latest completed authorized analysis by scored_at plus stable run ID; processing failures are separate and do not erase prior successful runs.

**Rationale**: Makes newest-known analytical result explicit while exposing request failures.

**Alternatives considered**: Treating the last failed request as a new analytic status is excluded.

## Mock split

**Decision**: UI can use labeled fixture DTOs after F001/F002 contracts; real data task waits for F004.

**Rationale**: Allows honest parallel UX work without claiming ML integration.

**Alternatives considered**: Silent fallback from unavailable real API to mock results is excluded.

## Gap meaning

**Decision**: gap = reference_sales - observed_sales; positive means observed sales below the reference, not guaranteed recoverable sales.

**Rationale**: User requires gap interpretation and limitation disclosure.

**Alternatives considered**: Calling the gap lost future revenue or predicted uplift is excluded.

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
