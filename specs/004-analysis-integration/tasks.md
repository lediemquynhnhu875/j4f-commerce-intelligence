---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: Model Serving and Application Integration

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F004/Tnnn`; feature directory is `004-analysis-integration`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: User Story 3: mock analysis result UI

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T001 [P] [US3] Build result/loading/error UI against clearly labeled analysis mocks in `frontend/src/features/analysis/result-panel.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F001/T002.
  - Completion criteria: Processing vs analytic status separated; unavailable values are not zero; mocks visibly identified.
  - Verification: Component cases for pending/running/succeeded/failed and insufficient_data.

## Phase 2: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T002 Review analysis integration and failure acceptance cases in `docs/qa/analysis-integration-cases.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: F003/T015.
  - Completion criteria: Cases distinguish processing failure, insufficient basis, baseline identity and cross-store nested IDs.
  - Verification: Human review of F003/F004 contracts.

- [ ] T003 Prepare serving dependency manifest and trusted artifact configuration in `backend/requirements.txt`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T002, F003/T016.
  - Completion criteria: Pinned compatible dependencies and trusted bundle/corpus paths are documented; request uploads cannot select artifacts.
  - Verification: Record compatibility with F003 artifact manifest; missing env/artifact fails readiness.

## Phase 3: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T004 Implement immutable analysis-run persistence schema in `frontend/db/migrations/003_analyses.sql`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T003, F002/T005.
  - Completion criteria: Processing enum pending/running/succeeded/failed; frozen input/output/version fields; tenant FK; unique idempotency scope.
  - Verification: Constraints and transaction rollback tests.

- [ ] T005 Provide reviewed serving validation cases and expected semantics in `docs/verification/inference-cases.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F003/T016.
  - Completion criteria: Cases cover finite/null fields, incompatible bundle, no-basis vs feedback-only insufficiency and no target leakage.
  - Verification: Review against frozen F003 contract and recorded artifact identity.

## Phase 4: User Story 1 - Serve validated inference without retraining (Priority: P1)

**Goal**: invoke the reviewed analysis engine reproducibly.

**Independent Test**: Use the real verified F003 bundle with direct service validation scenarios before web integration.

- [ ] T006 [US1] Implement FastAPI schemas and authenticated inference contract tests in `backend/tests/test_inference_contract.py`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T003, T005.
  - Completion criteria: Invalid input/token/nonfinite output and all F003 cases have explicit expected outcomes.
  - Verification: Run backend test suite with trusted small test artifact; no fake production result.

- [ ] T007 [US1] Implement lifespan loading, compatibility checks and readiness in `backend/app/main.py`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T006.
  - Completion criteria: One trusted bundle/corpus load per worker; invalid bundle blocks readiness; no request-time fit/train.
  - Verification: Startup/missing/incompatible-artifact tests.

- [ ] T008 [US1] Implement inference adapter using reusable ML prediction/scoring in `backend/app/services/inference.py`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: Nhung.
  - Dependencies: T007.
  - Completion criteria: F003 logic and single recommendation rule implementation reused; response validation/null semantics applied.
  - Related deliverables: `backend/app/schemas/inference.py` and `backend/app/api/inference.py`; service token, readiness route and the reviewed schema version are enforced.
  - Verification: Run fixed-input inference and no-retraining tests; record actual artifact hash.

## Phase 5: User Story 2 - Request and persist store-owned analysis (Priority: P1)

**Goal**: create a traceable analysis of their own product.

**Independent Test**: Request analysis as two Users and simulate invalid/service failure cases.

- [ ] T009 [US2] Implement the server-only authenticated model client in `frontend/src/server/clients/model-service.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T005, F001/T008.
  - Completion criteria: Token/url never shipped to browser; configurable30s timeout; schema version and validated responses required.
  - Verification: Mock transport tests for timeout, malformed body and auth failure; label mocked tests.

- [ ] T010 [US2] Implement analysis request, idempotency and frozen input/output persistence in `frontend/src/server/services/analysis.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004, T009, T008, F001/T011.
  - Completion criteria: Store/resource scope checked; key1..200; same-key changed-input409; state transitions persisted; original output immutable.
  - Verification: Integration tests for duplicate keys, reassignment races, service errors and rollback.

- [ ] T011 [US2] Expose authorized request and saved-analysis routes in `frontend/src/app/api/v1/products/[productId]/analyses/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T010.
  - Completion criteria: 401/403/404/422/502/503/504 match contracts; every nested ID checks original store; no mock result saved as real.
  - Related deliverables: `frontend/src/app/api/v1/analyses/[analysisId]/route.ts`; the product analyses route initially supports POST, while F005/T010 adds its paginated GET history.
  - Verification: Contract tests through public web routes.

## Phase 6: User Story 3 - Present saved processing and analytic outcomes (Priority: P2)

**Goal**: understand success, insufficiency and technical failure.

**Independent Test**: Use distinct mock and real saved-analysis cases for each processing/analytic state.

- [ ] T012 [US3] Connect the result UI to real saved analysis endpoints in `frontend/src/features/analysis/analysis-client.ts`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T011, T001, F002/T014.
  - Completion criteria: Real results carry version/basis provenance; failure flow handles persisted failed IDs and never falls back to mocks.
  - Verification: Browser flow with verified F003 bundle and unavailable-service test.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T013 Verify real inference integration and ownership/failure handoff in `docs/qa/analysis-integration-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Nhung, Huy.
  - Dependencies: T012.
  - Completion criteria: Recorded evidence proves trusted real bundle inference, ownership denial, frozen snapshots and controlled failure cases.
  - Verification: Execute quickstart with actual service; mock checks are recorded separately.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: F001/T002

- T002: F003/T015

- T003: T002, F003/T016

- T004: T003, F002/T005

- T005: F003/T016

- T006: T003, T005

- T007: T006

- T008: T007

- T009: T005, F001/T008

- T010: T004, T009, T008, F001/T011

- T011: T010

- T012: T011, T001, F002/T014

- T013: T012

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

Generated 13 unchecked tasks. All pre-existing work remains unchecked; no implementation is claimed.

## Requirement Coverage

This is planned coverage, not evidence of completed requirements.
Cross-feature references identify the bounded feature owning the
remaining delivery; they do not add a cyclic prerequisite.

| Requirement | Planned implementation / verification tasks |
| --- | --- |
| FR-001 | `T010`, `T011`, `T013` |
| FR-002 | `T004`, `T007`, `T010` |
| FR-003 | `T007`, `T008` |
| FR-004 | `T004`, `T010`, `T011` |
| FR-005 | `T005`, `T006`, `T010`, `T001` |
| FR-006 | `T006`, `T009`, `T010`, `T012` |
| FR-007 | `T011`, `T013` |
| FR-008 | `T008`, [F006/T003](../006-improvement-workflow/tasks.md) |
| FR-009 | `T001`, `T012`, `T013` |
