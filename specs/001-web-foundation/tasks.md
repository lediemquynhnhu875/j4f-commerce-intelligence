---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: Web Foundation, Authentication, and Store Ownership

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F001/Tnnn`; feature directory is `001-web-foundation`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: Setup: runnable frontend

**Goal**: Start a Next.js/TypeScript development page without requiring auth, Neon or FastAPI.

**Independent Test**: Run the dev page, production build and lint using the recorded Node/dependency versions.

- [ ] T001 Initialize the Next.js App Router TypeScript app and pin its frontend runtime dependencies in `frontend/package.json`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: None.
  - Completion criteria: Working App Router under frontend/; compatible Node/Next.js/TypeScript versions, lockfile and dev/build/lint scripts recorded. Existing ML remains intact. No database/auth/service is required for this task.
  - Verification: Run the development page, production build and lint on the selected Node version; record exact commands/versions/results. npm install alone is insufficient.

## Phase 2: User Story 3: mock shell and navigation

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T002 [US3] Build the shared User/Admin shell with visibly labeled synthetic previews in `frontend/src/components/layout/app-shell.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T001.
  - Completion criteria: Preview layouts, sidebar and responsive structure render using synthetic role fixtures. They make no auth/API/database/model calls and establish no real permissions.
  - Related deliverables: `frontend/src/app/(preview)/preview/page.tsx` and `frontend/src/lib/preview-fixtures.ts`; preview mode is explicit and separate from protected routes.
  - Verification: Open both preview roles and check layout/responsiveness without service credentials or sessions.

- [ ] T003 [US3] Build navigation and denied/expired/unassigned states against preview fixtures in `frontend/src/components/navigation.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T002.
  - Completion criteria: Mock role links and interaction states are visible and keyboard accessible; simulated role changes are UI examples, not authorization. No fixture can grant access to a real server resource.
  - Verification: Check both role menus and keyboard paths with labeled fixtures; record preview-only evidence.

## Phase 3: User Story 1: mock login

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T004 [US1] Build the login form and pending/failure/logout states with synthetic fixtures in `frontend/src/app/(preview)/preview/login/page.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T003.
  - Completion criteria: Login/error/loading/logout presentation is demonstrated with clearly labeled synthetic responses; no real account or session is created.
  - Verification: Exercise fixture success/failure/loading/expiry states. Do not claim real authentication, session expiry or server permission tests passed.

## Phase 4: Real integration prerequisites

**Goal**: Review login/permission expectations and prepare compatible persistence before real auth.

**Independent Test**: Review the permission/login cases, apply migrations to a disposable database and verify transaction rollback.

- [ ] T005 Review scope and confirm the authorization acceptance matrix in `docs/qa/auth-ownership-matrix.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: None.
  - Completion criteria: Confirm already-agreed email/password, no sign-up, one-store scope, both roles and permission cases; review proposed auth/SQL/session defaults before real integration. This review does not block frontend setup or labeled previews.
  - Verification: Human review links each case to this feature's spec.

- [ ] T006 Define login/logout/expiry acceptance cases in `docs/qa/login-cases.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: T005.
  - Completion criteria: Positive/negative cases and expected messages are reviewed; no real credentials are committed.
  - Verification: Review against US1 scenarios.

- [ ] T007 Add Neon connection and reviewed account/store/auth-schema migrations in `frontend/db/migrations/001_identity_stores.sql`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T001, T005, T006.
  - Completion criteria: Roles are user/admin; states active/suspended; email unique; one active store per User; names nonblank <=200; auth schema matches reviewed pinned library; record auth/pg versions and server environment configuration.
  - Verification: Apply on a disposable database, verify constraints and rollback/rebuild instructions.

- [ ] T008 Create server-only configuration and database transaction helpers in `frontend/src/server/db/client.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T007.
  - Completion criteria: Credentials cannot enter client bundles and helpers use one client for dependent transactions.
  - Verification: Invalid/missing env fails setup; rollback test and client-import/build check.

## Phase 5: User Story 1: real login and logout

**Goal**: Enter and leave a real authenticated session.

**Independent Test**: Use provisioned accounts to verify success/failure, logout, expiry and disabled public registration.

- [ ] T009 [US1] Implement the maintained email/password session integration and operator bootstrap in `frontend/src/server/auth/config.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: Huy.
  - Dependencies: T008, T006.
  - Completion criteria: Public sign-up disabled; passwords handled by library; database sessions expire/revoke; bootstrap secret stays local.
  - Related deliverables: `frontend/src/app/api/auth/[...all]/route.ts` and `frontend/scripts/bootstrap-admin.ts`; controlled local fixture provisioning supports two-store tests before F007.
  - Verification: Library integration tests for login/logout/expiry and public-signup rejection.

- [ ] T010 [US1] Connect the login/logout UI to real authentication in `frontend/src/app/(auth)/login/page.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T009, T004.
  - Completion criteria: Reuse the reviewed mock presentation with the real library handler; login/logout/loading/failure work and no mock response is used as a real session.
  - Verification: Browser tests against the real library for login/logout/expiry, suspended/unknown accounts and sign-up rejection; preview evidence is recorded separately.

## Phase 6: User Story 2: real roles and store ownership

**Goal**: Access only permitted operations and persisted store resources.

**Independent Test**: Use two stores and an Admin to test direct requests, forged role/store IDs, suspended accounts and assignment changes.

- [ ] T011 [US2] Implement session, role, active-account, and store authorization guards in `frontend/src/server/auth/authorization.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T009.
  - Completion criteria: Protected handlers/actions require active account; ownership comes from persisted relations; 401/403/404 policy applied.
  - Verification: Integration cases for forged store/role, unassigned User, suspension and assignment changes.

- [ ] T012 [US2] Expose the normalized session endpoint with minimal account DTO in `frontend/src/app/api/v1/session/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T011.
  - Completion criteria: Returns only authorized account/role/store metadata; no credentials or source-derived ownership.
  - Verification: Contract tests for active User, Admin, revoked session, and unassigned User.

- [ ] T013 [US2] Implement the cross-store and account-state regression suite in `frontend/tests/integration/auth-ownership.test.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: Như.
  - Dependencies: T012.
  - Completion criteria: Every defined guard denies bypass and stale sessions; tests cover direct API/action entry points.
  - Verification: Run suite using disposable Neon/local PostgreSQL and record all cases.

## Phase 7: User Story 3: real session layouts and navigation

**Goal**: Reach the correct workspace from a validated session.

**Independent Test**: Walk both real layouts, logout, expiry and denied/unassigned states; redirects never replace server guards.

- [ ] T014 [US3] Connect the shared shell to real role-specific session layouts in `frontend/src/app/(owner)/layout.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T012, T002.
  - Completion criteria: Owner/admin layouts use session DTO and include logout; layout redirects do not replace server authorization.
  - Related deliverables: `frontend/src/app/(admin)/layout.tsx` and a shared application shell; wireframes/components are scoped to the same task.
  - Verification: UI tests for both roles and expired session.

- [ ] T015 [US3] Connect navigation and denied-access states to the real session contract in `frontend/src/components/navigation.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T014, T003.
  - Completion criteria: Links respect role, keyboard access works, and denied/unassigned states have actionable text.
  - Verification: Manual keyboard review and browser role-switch scenarios.

## Phase 8: Polish: verify and hand off

**Goal**: Verify the complete foundation with actual evidence.

**Independent Test**: Run the joined foundation quickstart and distinguish mock checks from real auth/ownership/navigation results.

- [ ] T016 Verify the full foundation flow and handoff in `docs/qa/foundation-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Huy.
  - Dependencies: T010, T013, T015.
  - Completion criteria: Reviewed results cover both roles, two stores, logout, expiry, suspension, and preserved ML boundaries.
  - Verification: Execute quickstart scenarios; link logs and update CURRENT_STATE.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: none

- T002: T001

- T003: T002

- T004: T003

- T005: none

- T006: T005

- T007: T001, T005, T006

- T008: T007

- T009: T008, T006

- T010: T009, T004

- T011: T009

- T012: T011

- T013: T012

- T014: T012, T002

- T015: T014, T003

- T016: T010, T013, T015

### Parallel Opportunities

No [P] claim is made. Owners may coordinate independent work after its explicit dependencies; do not infer a phase-wide barrier.

## Parallel Example

After F001's shared mock shell is ready, a UI owner may work on a labeled preview while another owner reviews requirements or implements the real server in different files. Coordinate assignments first; never treat mocked state as server authorization.

## Implementation Strategy

### MVP First

Build the runnable frontend and early previews first where provided. Then review real contracts, implement the real server, connect the UI, and verify acceptance. F003's ML/human gates and F008's human/release evidence remain mandatory for real delivery.

### Incremental Delivery

A completed preview checks off only its own task. Keep real integration and failed/unverified work unchecked. Task counts do not measure effort or product completion.

### Team Coordination

Owners are proposed, not confirmed claims. Record actual owner/branch/status in CURRENT_STATE after team coordination. This revision changes documentation only.

## Notes

Generated 16 unchecked tasks. All pre-existing work remains unchecked; no implementation is claimed.

## Requirement Coverage

This is planned coverage, not evidence of completed requirements.
Cross-feature references identify the bounded feature owning the
remaining delivery; they do not add a cyclic prerequisite.

| Requirement | Planned implementation / verification tasks |
| --- | --- |
| FR-001 | `T009`, [F007/T005](../007-system-admin/tasks.md) |
| FR-002 | `T007`, `T011`, `T013` |
| FR-003 | `T011`, `T013` |
| FR-004 | `T009`, `T013` |
| FR-005 | `T011`, `T013` |
| FR-006 | `T011`, `T013` |
| FR-007 | `T002`, `T003`, `T004`, `T010`, `T014`, `T015` |
| FR-008 | `T013`, [F007/T006](../007-system-admin/tasks.md) |
| FR-009 | `T001`, `T016` |
