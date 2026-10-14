# 0004: Shared catalog backend from the supplied MVP architecture

Date: 2026-10-14 (Asia/Saigon).
Status: implementation authorized directly by the requesting contributor.
Owner: requesting contributor, Codex-assisted; reviewer: Mai / Nhung.

## Context

The contributor supplied [the preserved DBML](../architecture/sellens-shared-catalog.dbml)
in `Pasted text.txt`, describing six tables and one shared
admin/reviewer catalog, and requested a real PostgreSQL backend while retaining
all frontend mocks. This overrides the older one-store-per-User application plan
for this deliverable. The existing `backend/` is already a Next.js TypeScript
headless scaffold, contrary to the earlier FastAPI folder description.

## Decision

- Extend the separate Next.js backend; keep the frontend unchanged. Model serving
  remains unimplemented; do not relocate or rewrite Python ML code.
- Translate MySQL DBML types to PostgreSQL: identity bigint, timestamptz, numeric,
  jsonb and checked text enums. Preserve all six entities and foreign keys.
- Store regular accounts as `reviewer` per the supplied enum; expose `user` in the
  API and accept `user` or `reviewer` when provisioning. These are the same role.
- All active regular accounts can read the shared catalog and update improvement
  work. Admins manage products/categories/accounts and append saved analyses.
  There are no private tenant stores or ownership inferred from seller metadata.
- Use pooled parameterized `pg`, scrypt passwords and database-backed opaque Bearer
  sessions (24 hours). This bounded backend replaces the previously proposed
  Better Auth default; no public registration or frontend auth integration.
- Keep analyses, original suggestions and action history immutable. Mutations of
  action state and audit events share transactions and optimistic version checks.
- Add auxiliary sessions, login throttling, migration ledger and seed registry.
  Seeds insert missing fixtures only, never replace existing records/passwords.
- Stop migration if unmanaged tables conflict; inspect schema before applying.

## Consequences

F001/F002/F004/F006/F007 task IDs remain unchanged and unchecked wherever their
original store, model, UI or human-review acceptance still applies. This backend
is a separately documented scope amendment, not retrospective acceptance of those
features. The attached analysis enum differs from the six ML statuses: no automatic
conversion or inference is implemented. Dataset/model files remain outside SQL.

Shared catalog access needs review before connecting the existing store-oriented
frontend. Samples are synthetic decision-support fixtures, never actual inference
or evidence of sales uplift. No production or human-review acceptance is claimed.
