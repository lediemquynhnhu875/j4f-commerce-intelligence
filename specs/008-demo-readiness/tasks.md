---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: Final Integration, Evaluation, and Demo Readiness

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F008/Tnnn`; feature directory is `008-demo-readiness`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T001 Review release matrix, priorities and human evaluation protocol in `docs/qa/release-matrix.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: F001/T005.
  - Completion criteria: All confirmed capabilities and failure cases mapped; interview sample/criteria chosen before sessions.
  - Verification: Human team review; no completion claim from task count.

- [ ] T002 Prepare reproducible two-store/Admin fixture and artifact setup plan in `docs/demo/data-manifest.md`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T001, F003/T016, F002/T015.
  - Completion criteria: Explicit anonymized ownership mappings and artifact/config IDs recorded; secrets/raw data excluded.
  - Verification: Review fixture manifest against catalog and ML readiness contracts.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T003 Prepare the joined owner/Admin UI journey and accessibility checklist in `docs/qa/ui-journey-cases.md`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T001.
  - Completion criteria: Screen transitions, loading/error/no-data and keyboard interactions mapped to implemented features.
  - Verification: Review against F005/F006/F007 acceptance cases.

- [ ] T004 Consolidate reproducible ML metrics, peer quality and limitations in `docs/evaluation/ml-evidence.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F003/T016.
  - Completion criteria: Real output/split/artifact identities linked; human gates and source uncertainty honest.
  - Verification: Review F003 evidence and rerun only when required by changes.

## Phase 3: User Story 1 - Verify the integrated owner and Admin journeys (Priority: P1)

**Goal**: prove promised behavior with reproducible evidence.

**Independent Test**: Execute the release matrix using actual implemented runtime and real trusted bundle.

- [ ] T005 [US1] Implement integrated API ownership and failure regression scenarios in `tests/integration/test_application_flow.py`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T002, F004/T013, F006/T012, F007/T012.
  - Completion criteria: Tests cover all protected IDs, suspension, service outage, null semantics and action/history rollback.
  - Verification: Run against two-store/Admin fixtures and real service; label transport mocks separately.

- [ ] T006 [US1] Implement browser owner/Admin journey checks in `frontend/tests/e2e/sellens-flow.spec.ts`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T003, F005/T012, F006/T012, F007/T012.
  - Completion criteria: Login/catalog/analysis/action/history and management UI flows tested with approved fixtures.
  - Verification: Run browser suite with real web/service runtime.

- [ ] T007 [US1] Execute and review end-to-end and failure results in `docs/qa/release-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Huy, Nhung.
  - Dependencies: T004, T005, T006.
  - Completion criteria: Actual operator/date/logs recorded for full matrix; blockers remain open and human review is named.
  - Verification: Run reviewed release scenarios; compare expected vs actual behavior.

## Phase 4: User Story 2 - Evaluate usability with real people (Priority: P1)

**Goal**: learn whether Users understand evidence and workflow.

**Independent Test**: Review actual anonymized interview/session records, independent of code task completion.

- [ ] T008 [US2] Conduct real user interviews and record findings in `docs/evaluation/interviews.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: T001.
  - Completion criteria: Actual participants, consent/anonymization, dates and observed findings exist; no fabricated quotes.
  - Verification: Human fieldwork using the preapproved protocol.

- [ ] T009 [US2] Conduct usability evaluation of evidence and improvement work in `docs/evaluation/usability.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Huy.
  - Dependencies: T007, T008.
  - Completion criteria: Real observed task outcomes/comprehension issues recorded with sample limitations.
  - Verification: Human sessions using implemented flow and approved metrics.

## Phase 5: User Story 3 - Deliver a reproducible report and demo (Priority: P1)

**Goal**: demonstrate confirmed capabilities and limits reliably.

**Independent Test**: A second operator follows run instructions and rehearses the evidence-backed demo.

- [ ] T010 [US3] Write and validate clean-machine setup/run instructions in `docs/setup/runbook.md`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T007.
  - Completion criteria: Pinned runtime/dependency versions, migrations, secrets, data, bundle/corpus identities and service/web commands documented.
  - Verification: Second-person setup verification with command/output evidence.

- [ ] T011 [US3] Review report model claims and scientific limitations in `docs/reports/ml-claims-review.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T004, T009.
  - Completion criteria: Every model/peer claim linked to actual evaluation; reference is no forecast; interventions are hypotheses.
  - Verification: Human technical review against F003 and evaluation records.

- [ ] T012 [US3] Prepare the final report, slides outline and demo script in `docs/demo/demo-script.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Huy, Nhung.
  - Dependencies: T010, T011.
  - Completion criteria: Report/slide/demo sources exist, cite verified evidence and honest limitations; optional unsupported metrics omitted.
  - Verification: Team review of docs/reports/final-report.md and docs/reports/slides-outline.md with script.

- [ ] T013 [US3] Rehearse UI demo and resolve evidenced UX blockers within scoped tasks in `docs/demo/rehearsal.md`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T012.
  - Completion criteria: Actual rehearsal issues/results recorded; fixes linked to feature task IDs rather than silent scope expansion.
  - Verification: Live rehearsal using real data/service plus controlled failure cases.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T014 Approve or block demo readiness with evidence-based handoff in `docs/demo/readiness-review.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Nhung, Huy.
  - Dependencies: T013.
  - Completion criteria: Named team review lists verified acceptance, real human evidence and remaining blockers; no auto-merge or deployment.
  - Verification: Review release matrix/runbook/report/demo records and CURRENT_STATE.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: F001/T005

- T002: T001, F003/T016, F002/T015

- T003: T001

- T004: F003/T016

- T005: T002, F004/T013, F006/T012, F007/T012

- T006: T003, F005/T012, F006/T012, F007/T012

- T007: T004, T005, T006

- T008: T001

- T009: T007, T008

- T010: T007

- T011: T004, T009

- T012: T010, T011

- T013: T012

- T014: T013

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

Generated 14 unchecked tasks. All pre-existing work remains unchecked; no implementation is claimed.

## Requirement Coverage

This is planned coverage, not evidence of completed requirements.
Cross-feature references identify the bounded feature owning the
remaining delivery; they do not add a cyclic prerequisite.

| Requirement | Planned implementation / verification tasks |
| --- | --- |
| FR-001 | `T005`, `T006`, `T007` |
| FR-002 | `T005`, `T007` |
| FR-003 | `T005`, `T006`, `T007` |
| FR-004 | `T002`, `T010` |
| FR-005 | `T004`, `T011` |
| FR-006 | `T008`, `T009`, [F003/T006](../003-ml-readiness/tasks.md) |
| FR-007 | `T011`, `T012` |
| FR-008 | `T002`, `T010` |
| FR-009 | `T007`, `T014` |
