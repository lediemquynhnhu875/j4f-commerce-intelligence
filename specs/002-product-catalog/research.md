# Research: Product Data, Imports, and Catalog

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Pipeline reuse

**Decision**: Verify ml/src/data/clean.py and cli.prepare first; add only demonstrated gaps.

**Rationale**: The cleaning code already exists but current tests fail to import pandas.

**Alternatives considered**: Recreating cleaners or treating filename existence as working behavior is excluded.

The Admin uploader accepts the clean-products CSV produced offline by the existing
Python preparation CLI. Next.js validates that contract and stages database rows;
it does not port the Python cleaning/model pipeline into TypeScript or execute
training/cleaning inside HTTP routes. Raw source preparation remains Mai's
F002/T004 deliverable. Uploading a raw/nonconforming CSV returns row/field errors.

## Import policy

**Decision**: Validate into staging; publish an immutable snapshot atomically. Identical checksum uploads are idempotent; conflicting duplicate IDs fail publication with row errors.

**Rationale**: Preserves reproducibility without silently replacing rows or changing analysis history.

**Alternatives considered**: Partial import publication and silent last-row-wins obscure audit evidence.

## Ownership

**Decision**: StoreProduct ID is the web resource ID; source_product_id and seller_id are provenance. Explicit mappings can reuse public source data across stores, with unique (store_id, snapshot_id, source_product_id).

**Rationale**: The demo dataset does not provide application accounts.

**Alternatives considered**: Inferring ownership from seller_id is prohibited.

## Scope split

**Decision**: F002 owns imports and read catalog services; F007 owns ongoing category/product/store management UI using those services.

**Rationale**: Avoids duplicate admin CRUD implementations across features.

**Alternatives considered**: Separate catalog engines would drift.

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
