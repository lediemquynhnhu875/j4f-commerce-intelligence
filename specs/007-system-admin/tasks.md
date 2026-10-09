---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: System Administration

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F007/Tnnn`; feature directory is `007-system-admin`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: Setup: Admin visual draft

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T001 Prepare account/store/catalog/monitor wireframes in `docs/ux/admin-wireframes.md`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F001/T002.
  - Completion criteria: Wireframes show draft account/store/catalog/monitor operations and honest mocked/unavailable states. Real Admin API/permission review remains required before connected screens.
  - Verification: UX review against contracts.

## Phase 2: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T002 Review Admin permissions, safe suspension and reassignment cases in `docs/qa/admin-cases.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: F001/T005, F002/T003.
  - Completion criteria: Last-Admin, one-store, explicit mapping and historical-scope cases reviewed; no extra config/metrics assumed.
  - Verification: Human permission review with Mai.

## Phase 3: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T003 Create Admin API permission and management invariants tests in `frontend/tests/integration/admin-access.test.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T002, F004/T011.
  - Completion criteria: Every Admin endpoint denies Users; duplicates/lastAdmin/history reassignment cases covered.
  - Verification: Run direct API tests with Admin and two store Users.

- [ ] T004 Implement reusable Admin-management query/mutation boundary in `frontend/src/server/services/admin.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T003.
  - Completion criteria: Active-Admin guard and minimal DTOs; shared identity/catalog services reused; transactional management events preserved.
  - Verification: Guard/rollback and no-secret DTO tests.

## Phase 4: User Story 1 - Manage accounts and stores (Priority: P1)

**Goal**: provision, suspend and restore access safely.

**Independent Test**: Provision two Users, suspend/reactivate one and attempt last-Admin lockout.

- [ ] T005 [US1] Implement account/store provisioning and management endpoints in `frontend/src/app/api/v1/admin/accounts/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004.
  - Completion criteria: Library server provisioning; email unique; User exactly one active store; names nonblank<=200.
  - Related deliverables: `frontend/src/app/api/v1/admin/stores/route.ts` and `frontend/src/app/api/v1/admin/stores/[storeId]/route.ts`.
  - Verification: Admin provisioning and invalid/duplicate mapping tests.

- [ ] T006 [US1] Implement suspension/reactivation and last-Admin safeguards in `frontend/src/app/api/v1/admin/accounts/[accountId]/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T005.
  - Completion criteria: Sessions revoked; active status checked; reactivation never revives old sessions; last active Admin protected.
  - Verification: Existing-session, race and last-Admin integration tests.

- [ ] T007 [US1] Build account/store management screens in `frontend/src/features/admin/accounts.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T001, T006.
  - Completion criteria: Provisioning, validation and suspend/reactivate states work; no credentials leaked to list/history.
  - Verification: Browser management flow and permission review.

## Phase 5: User Story 2 - Manage catalog metadata and explicit assignments (Priority: P1)

**Goal**: maintain categories and demo store mappings without losing history.

**Independent Test**: Manage two stores and category/product assignments using F002 published data.

- [ ] T008 [US2] Implement category/archive/reassignment management through catalog services in `frontend/src/app/api/v1/admin/products/[productId]/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004, F002/T013.
  - Completion criteria: Category uniqueness/nonblank<=200; archived prior mapping preserves original analysis/action scope.
  - Related deliverables: `frontend/src/app/api/v1/admin/categories/route.ts` and `frontend/src/app/api/v1/admin/categories/[categoryId]/route.ts`; catalog service validates metadata edits separately from immutable source/analysis snapshots.
  - Verification: Reassignment-history and category validation tests.

- [ ] T009 [US2] Build category/product assignment management screens in `frontend/src/features/admin/catalog-management.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T008, T001.
  - Completion criteria: Explicit store mapping shown; archive/reassign consequences explained; F002 import panel reused.
  - Verification: Browser reassignment and inaccessible-old-history cases.

## Phase 6: User Story 3 - Monitor processing and operational outcomes (Priority: P2)

**Goal**: see actual failures and application activity.

**Independent Test**: Seed controlled operational records and trigger real service failure once available.

- [ ] T010 [US3] Implement operational overview, processing filters and stale-run reconciliation in `frontend/src/server/services/analysis-monitor.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004, F004/T011.
  - Completion criteria: Only actual counts exposed; status fields separate; stale runs marked failed with configured timeout evidence.
  - Verification: Monitor/filter/reconciliation tests; no secret-bearing failures in DTOs.

- [ ] T011 [US3] Build operational overview and analysis monitor UI in `frontend/src/features/admin/analysis-monitor.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T010, T001.
  - Completion criteria: Technical failures and successful insufficient-basis outcomes clearly separated; unknown metrics absent.
  - Verification: Browser cases for empty/failed/stale/succeeded analysis sets.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T012 Verify Admin management and monitoring handoff in `docs/qa/admin-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Huy.
  - Dependencies: T007, T009, T011.
  - Completion criteria: Reviewed direct API and UI evidence covers permissions, suspension, history-safe reassignment and real operational counters.
  - Verification: Execute quickstart and verify no unsupported configuration editor exists.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: F001/T002

- T002: F001/T005, F002/T003

- T003: T002, F004/T011

- T004: T003

- T005: T004

- T006: T005

- T007: T001, T006

- T008: T004, F002/T013

- T009: T008, T001

- T010: T004, F004/T011

- T011: T010, T001

- T012: T007, T009, T011

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

Generated 12 unchecked tasks. All pre-existing work remains unchecked; no implementation is claimed.

## Requirement Coverage

This is planned coverage, not evidence of completed requirements.
Cross-feature references identify the bounded feature owning the
remaining delivery; they do not add a cyclic prerequisite.

| Requirement | Planned implementation / verification tasks |
| --- | --- |
| FR-001 | `T003`, `T004` |
| FR-002 | `T005`, `T007` |
| FR-003 | `T006`, `T007`, `T012` |
| FR-004 | `T005`, `T008`, `T009` |
| FR-005 | `T008`, `T009` |
| FR-006 | `T010`, `T011` |
| FR-007 | `T010`, `T011` |
| FR-008 | `T010`, `T012` |
| FR-009 | `T002`, `T012` |
