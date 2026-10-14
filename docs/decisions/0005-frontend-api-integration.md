# 0005: Connect the frontend to the shared-catalog API

Date: 2026-10-14 (Asia/Saigon). Owner: requesting contributor, Codex-assisted.
Status: implementation explicitly authorized; reviewers: Mai, Huy, Nhung.

## Context

The contributor now requests integration of the existing mock UI with the real
backend and sample database, overriding the earlier instruction to keep them
disconnected. The backend uses the supplied shared catalog and nine analysis
statuses; mock store ownership, inference jobs and editable model configuration
have no matching tables/endpoints.

## Decision

- Make `/` and `/login` real login entry points; use `/user/*` and `/admin/*` for
  connected workspaces. Preserve `/preview/*` as an explicit isolated mock mode.
- Reuse the existing visual styles/components. Connected screens fetch actual
  products/categories/analyses/actions/history/accounts with loading/error/empty
  states. No automatic mock fallback. Preserve missing values and exact statuses.
- A same-origin Next.js proxy forwards to the separately configured backend. The
  opaque token stays in an HttpOnly, SameSite cookie and is forwarded server-side;
  no token in localStorage or public database environment variables. Mutation
  origins are checked. HTTPS gives Secure cookies; local HTTP remains testable.
- Admin account management replaces unavailable store operations in the connected
  navigation. Monitor shows saved analyses rather than invented jobs. Model
  configuration shows frozen configuration only, with unsupported writes disabled.
- Dashboard counts derive from paginated PostgreSQL DTOs. Analysis views use
  frozen input/evidence and distinguish unavailable reference from zero.
- Action writes use exact backend transitions and expected_updated_at; original
  suggestions/history stay immutable. Backend remains the authorization boundary.

## Consequences

This changes the frontend integration scope of ADR 0004. The user's direct request
authorizes integration despite the older review-before-connect note; team review
and original store/model/human acceptance criteria remain pending, not fabricated.
Existing F001/F002/F004/F005/F006/F007 IDs remain unchecked where their full older
acceptance differs. No store schema, live ML or job/config API is added implicitly.
