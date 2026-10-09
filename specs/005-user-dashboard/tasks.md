---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: User Dashboard and Analysis Presentation

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F005/Tnnn`; feature directory is `005-user-dashboard`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: Setup: dashboard visual draft

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T001 Prepare dashboard wireframes and draft DTO mock mapping in `docs/ux/dashboard-wireframes.md`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F001/T002.
  - Completion criteria: Wireframes use draft supported metrics/DTOs and clearly labeled synthetic data. Final metric/interpretation review happens before real integration, not before this visual draft.
  - Verification: UX review against draft spec/interfaces; record assumptions for final interpretation review.

## Phase 2: User Story 1: mock dashboard UI

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T002 [P] [US1] Build metric cards and review-priority UI using labeled fixtures in `frontend/src/features/user/overview.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T001.
  - Completion criteria: All availability states and metric labels follow draft DTOs; fixtures do not claim real model completion.
  - Verification: Component cases and keyboard/readability checks.

## Phase 3: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T003 Review dashboard metrics, denominators and no-data acceptance cases in `docs/qa/dashboard-cases.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Nhung.
  - Dependencies: F002/T006.
  - Completion criteria: Supported metrics and gap sign approved; forbidden unsupported metrics explicitly excluded.
  - Verification: Review with Nhung for analytical meaning.

## Phase 4: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T004 Implement scoped dashboard aggregation/query contract tests in `frontend/tests/integration/dashboard-scope.test.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T003, F002/T011.
  - Completion criteria: Two-store totals/denominators and absent-value cases have expected outputs; IDs cannot select another store.
  - Verification: Run against disposable fixture database.

- [ ] T005 Review display DTO semantics for references, gaps and peer evidence in `docs/ml/dashboard-interpretation.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T003, F003/T014.
  - Completion criteria: Nullable basis/feedback distinctions and public peer field allowlist are reviewed; no causal or forecast labels.
  - Verification: Review outputs against F003/F004 contracts.

## Phase 5: User Story 1 - Understand store snapshot statistics (Priority: P1)

**Goal**: see an honest overview of their products and review needs.

**Independent Test**: Use known two-store counts and empty-store cases before real ML output is available.

- [ ] T006 [US1] Implement current-store dashboard aggregation and endpoint in `frontend/src/app/api/v1/dashboard/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004, F004/T011.
  - Completion criteria: Denominators/source snapshot declared; tenant scope cannot be client-selected; no fabricated financial/trend metrics.
  - Verification: Run scoped query/contract tests.

- [ ] T007 [US1] Connect overview to real scoped dashboard data in `frontend/src/features/dashboard/dashboard-client.ts`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T006, T002, T005.
  - Completion criteria: Real/mocked sources separated; no hidden fixture fallback on API failure.
  - Verification: Browser comparison with known store totals.

## Phase 6: User Story 2 - Interpret analysis evidence and limitations (Priority: P1)

**Goal**: compare observed and reference sales without overstating evidence.

**Independent Test**: Inspect valid, feedback-only-insufficient and no-basis saved runs through the presentation.

- [ ] T008 [US2] Implement observed/reference/gap and peer evidence components in `frontend/src/features/user/evidence-panel.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: Nhung.
  - Dependencies: T005, F004/T001.
  - Completion criteria: Gap is reference minus observed; no-basis fields remain unavailable; approved peer fields and limitations displayed.
  - Verification: Semantic component tests on reviewed result cases.

- [ ] T009 [US2] Connect result presentation to real frozen analysis DTOs in `frontend/src/app/(owner)/analyses/[analysisId]/page.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T008, F004/T012.
  - Completion criteria: Uses saved inputs/results rather than recomputing from current product fields; foreign IDs deny content.
  - Verification: Real saved-analysis and cross-ID browser scenarios.

## Phase 7: User Story 3 - Review immutable analysis history (Priority: P2)

**Goal**: see previous conclusions with their original inputs.

**Independent Test**: Save two versioned runs, edit current catalog data and compare historical presentation.

- [ ] T010 [US3] Implement scoped deterministic analysis history queries in `frontend/src/app/api/v1/products/[productId]/analyses/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: F004/T011, T004.
  - Completion criteria: page>=1/page_size1..100; original-store scope; frozen histories survive product/version changes.
  - Verification: History/foreign-ID/null-value contract tests.

- [ ] T011 [US3] Build history navigation and immutable input comparison in `frontend/src/features/analysis/history.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T010, T009.
  - Completion criteria: Scored/source times distinguished; old analyses not recalculated; failure/no-analysis states understandable.
  - Verification: Browser history cases using real saved runs.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T012 Evaluate dashboard comprehension and acceptance in `docs/qa/dashboard-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Huy, Nhung.
  - Dependencies: T007, T011.
  - Completion criteria: Actual review evidence covers denominators, gap meaning, missing basis and immutable history; no invented interview results.
  - Verification: Execute quickstart and record observed usability issues.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: F001/T002

- T002: T001

- T003: F002/T006

- T004: T003, F002/T011

- T005: T003, F003/T014

- T006: T004, F004/T011

- T007: T006, T002, T005

- T008: T005, F004/T001

- T009: T008, F004/T012

- T010: F004/T011, T004

- T011: T010, T009

- T012: T007, T011

### Parallel Opportunities

- T002 may run after its listed prerequisites while another owner edits different files. Use this feature's draft interfaces and visibly labeled fixtures; final contract/runtime verification belongs to real integration.

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
| FR-001 | `T004`, `T006`, `T007` |
| FR-002 | `T003`, `T006`, `T002` |
| FR-003 | `T005`, `T008`, `T009` |
| FR-004 | `T005`, `T008` |
| FR-005 | `T008`, `T009`, `T010`, `T011` |
| FR-006 | `T010`, `T011` |
| FR-007 | `T002`, `T008`, `T011` |
| FR-008 | `T003`, `T012` |
| FR-009 | `T004`, `T008`, `T012` |
