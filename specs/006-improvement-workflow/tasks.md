---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: Suggestions and Improvement Workflow

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F006/Tnnn`; feature directory is `006-improvement-workflow`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: User Story 1: mock suggestion UI

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T001 [P] [US1] Build suggestion review/accept/reject UI against draft DTOs in `frontend/src/features/improvements/suggestion-card.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F001/T002.
  - Completion criteria: Original evidence always available; rejection reason required; no guaranteed-uplift wording.
  - Verification: Component tests against labeled fixture states before real wiring.

## Phase 2: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T002 Review decision/progress transitions and completion meaning in `docs/qa/improvement-workflow-cases.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: F003/T014.
  - Completion criteria: Transition/rejection/completion cases reviewed; deadlines excluded until confirmed; no sales-uplift acceptance claim.
  - Verification: Review with Nhung and Huy.

- [ ] T003 Audit suggestion originals and evidence from existing rule outputs in `docs/ml/recommendation-evidence.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T002, F004/T008.
  - Completion criteria: Original field mappings and hypothesis/validation language reviewed; absent suggestions do not create fabricated work.
  - Verification: Compare reviewed F003/F004 outputs with current rules.

## Phase 3: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T004 Implement immutable originals, action state and append-only events schema in `frontend/db/migrations/004_actions.sql`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T003, F004/T004.
  - Completion criteria: Originals read-only; decision pending/accepted/rejected; progress not_started/in_progress/completed; version>=1; tenant FKs.
  - Verification: Constraint tests and history write rollback cases.

- [ ] T005 Add transition/ownership/concurrency/atomicity contract tests in `frontend/tests/integration/action-history.test.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004.
  - Completion criteria: reason/notes/text nonblank<=2000; stale409; invalid422; foreign404; failed history write rolls back action.
  - Verification: Run controlled transaction-failure and concurrent-edit tests.

## Phase 4: User Story 1 - Review and accept or reject a suggestion (Priority: P1)

**Goal**: decide whether evidence warrants improvement work.

**Independent Test**: Use real saved suggestion originals to accept/reject while checking immutable evidence.

- [ ] T006 [US1] Implement scoped original suggestion retrieval and decisions in `frontend/src/server/services/improvements.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T005.
  - Completion criteria: Single Python-generated originals reused; accept/reject preserves originals and records decision event atomically.
  - Verification: Decision, ownership and original-immutability integration cases.

- [ ] T007 [US1] Expose suggestion/action decision endpoints in `frontend/src/app/api/v1/suggestions/[suggestionId]/actions/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T006.
  - Completion criteria: Tenant guards plus422/409 semantics; original result identity cannot be altered by browser input.
  - Related deliverables: `frontend/src/app/api/v1/products/[productId]/suggestions/route.ts`; optional analysis_id must resolve to an authorized run of that same product.
  - Verification: Route-level contract and cross-store tests.

## Phase 5: User Story 2 - Update and complete improvement work (Priority: P1)

**Goal**: track actual work without claiming measured sales impact.

**Independent Test**: Update accepted work from two clients and force history-write failure.

- [ ] T008 [US2] Implement transactional action updates with optimistic concurrency in `frontend/src/app/api/v1/actions/[actionId]/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T007.
  - Completion criteria: expected_version>=1; legal transitions only; completed requires nonblank<=2000 notes; state/event atomic.
  - Verification: Concurrent409, illegal422 and rollback integration tests.

- [ ] T009 [US2] Build editable copy, progress and completion controls in `frontend/src/features/improvements/progress-panel.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T001, T008.
  - Completion criteria: Original untouched; invalid states disabled but server still enforces; conflict prompts reload/reconcile.
  - Verification: UI cases for progress, notes, stale version and terminal states.

## Phase 6: User Story 3 - Inspect an append-only change history (Priority: P2)

**Goal**: trace who changed improvement work and why.

**Independent Test**: Verify history preserves originals and both successful and rolled-back updates.

- [ ] T010 [US3] Implement scoped append-only history endpoint in `frontend/src/app/api/v1/actions/[actionId]/history/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T008.
  - Completion criteria: Only original store scope can read; no update/delete operation; stable event ordering and actor identity.
  - Verification: History/foreign-ID/immutability route tests.

- [ ] T011 [US3] Connect decisions/progress/history to real APIs in `frontend/src/features/improvements/history-panel.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T009, T010.
  - Completion criteria: Real originals and events displayed; failure/conflict states preserved; mock adapter removed from real path.
  - Verification: Browser decision-to-completion flow and cross-ID denial.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T012 Verify improvement workflow and history in `docs/qa/improvement-workflow-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Nhung, Huy.
  - Dependencies: T011.
  - Completion criteria: Actual test evidence covers originals, rejection reason, completion meaning, concurrent edits and atomic rollback.
  - Verification: Run quickstart; review history with Mai/Nhung and update handoff.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: F001/T002

- T002: F003/T014

- T003: T002, F004/T008

- T004: T003, F004/T004

- T005: T004

- T006: T005

- T007: T006

- T008: T007

- T009: T001, T008

- T010: T008

- T011: T009, T010

- T012: T011

### Parallel Opportunities

- T001 may run after its listed prerequisites while another owner edits different files. Use this feature's draft interfaces and visibly labeled fixtures; final contract/runtime verification belongs to real integration.

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
| FR-001 | `T003`, `T006`, `T001` |
| FR-002 | `T004`, `T006`, `T009` |
| FR-003 | `T006`, `T007` |
| FR-004 | `T002`, `T008`, `T009` |
| FR-005 | `T004`, `T008`, `T010`, `T011` |
| FR-006 | `T005`, `T006`, `T008` |
| FR-007 | `T005`, `T006`, `T007`, `T010` |
| FR-008 | `T005`, `T008` |
| FR-009 | `T002`, `T009`, `T012` |
| FR-010 | `T002`, `T012` |
