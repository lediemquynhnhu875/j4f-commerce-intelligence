---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: ML Analysis Readiness

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F003/Tnnn`; feature directory is `003-ml-readiness`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T001 Reproduce the existing ML environment and module/test audit in `docs/verification/ml-audit.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: None.
  - Completion criteria: Dependency versions and synthetic-test results recorded; audit distinguishes existing code from executed behavior and gaps.
  - Verification: Run existing unittest suite after environment preparation; preserve original failed-run evidence.

- [ ] T002 Obtain approved source snapshot and verify cleaning provenance in `docs/data/source-provenance.md`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T001.
  - Completion criteria: Source/checksum and available files documented; unavailable source report remains explicitly missing.
  - Verification: Human/source verification plus cleaned/rejected-row reports.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T003 Verify observed-sales semantics and freeze the no-leakage feature allowlist in `docs/ml/sales-label-and-features.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T002.
  - Completion criteria: Unit/window/scope/missingness confirmed or explicitly unknown; target sales and derived target-sale values never enter estimator features.
  - Verification: Human source evidence and regression-test specification; Như reviews interpretation.

- [ ] T004 Set evaluation and low-similarity peer acceptance criteria before review in `docs/qa/ml-evaluation-criteria.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Nhung.
  - Dependencies: T003.
  - Completion criteria: Existing numeric gates preserved; low-band acceptance criterion and baseline/model comparisons are fixed before inspecting evaluation results.
  - Verification: Human approval record dated before evaluation.

## Phase 3: User Story 1 - Verify taxonomy and comparable evidence (Priority: P1)

**Goal**: establish trustworthy product groups without contaminating evaluation.

**Independent Test**: Review queue separation plus taxonomy and peer metrics can be audited without any web application.

- [ ] T005 [US1] Audit existing EDA/taxonomy outputs and reuse the current notebook in `docs/verification/eda-taxonomy.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T004.
  - Completion criteria: Notebook/figure lineage and cleaned-data metrics are reproduced; missing source/report artifacts are documented.
  - Verification: Run existing notebook only on approved processed data; record hashes and measured outputs.

- [ ] T006 [US1] Coordinate real blind taxonomy and peer annotations in `docs/verification/human-review-record.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Nhung.
  - Dependencies: T005.
  - Completion criteria: Named human reviewers, dates and completed annotations exist; no fabricated labels or holdout-driven tuning.
  - Verification: Actual human review evidence against docs/manual-review-round-2.md.

- [ ] T007 [US1] Evaluate existing taxonomy/peer checkpoints and document only evidenced gaps in `docs/verification/taxonomy-peers.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T006.
  - Completion criteria: Coverage>=90%, reviewed accuracy>=85%, holdout>=85%, peer relevance>=80%, and predeclared band criterion are reported honestly.
  - Verification: Run validation/evaluation commands; failing gates remain blocked and corrective tasks use development data.

- [ ] T008 [US1] Export/version the peer snapshot and verify retrieval exclusions in `ml/src/peers/build.py`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T007.
  - Completion criteria: Frozen corpus/retrieval config/taxonomy identity exists; target and same seller excluded; no tenant records leak through peer evidence.
  - Verification: Deterministic peer tests and round-trip artifact check.

## Phase 4: User Story 2 - Verify reference modeling and a deployable bundle (Priority: P1)

**Goal**: produce reproducible estimates with fitted preprocessing and honest evaluation.

**Independent Test**: Use controlled synthetic and approved out-of-sample fixtures before exposing a serving API.

- [ ] T009 [US2] Add targeted leakage, split and baseline invariants to existing tests in `ml/tests/test_model_guardrails.py`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T004.
  - Completion criteria: Target-sale features forbidden; Model A excludes ratings/reviews; seller grouping and self-free baseline evidence verified.
  - Verification: Run targeted and existing unittest suites; do not rewrite expectations to pass.

- [ ] T010 [US2] Evaluate baseline and existing reference models out of sample in `docs/verification/model-evaluation.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T009, T007.
  - Completion criteria: Metrics, seller split, calibration/evaluation distinction and limitations are recorded; no in-sample quality claim.
  - Verification: Run existing training/evaluation on approved data and review regression/calibration evidence.

- [ ] T011 [US2] Complete the existing saved bundle with calibration, config and provenance in `ml/src/models/reference.py`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T010, T008.
  - Completion criteria: Manifest includes fitted preprocessing/models, calibration, feature/config/taxonomy/corpus versions, checksum and dependency versions.
  - Verification: Bundle round-trip and missing/incompatible-field rejection tests.

- [ ] T012 [US2] Add reusable inference over the saved fitted models without retraining in `ml/src/inference/predict.py`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T011.
  - Completion criteria: Feature preparation reuses fitted pipelines; observed sales remains separate; request path performs no fit/train.
  - Verification: Fixed-bundle prediction tests and explicit distinction from OOF CSV output.

## Phase 5: User Story 3 - Freeze eligibility, null semantics and limitations (Priority: P1)

**Goal**: understand when analysis is valid and when evidence is insufficient.

**Independent Test**: Run eligibility cases with missing peers, missing model, sparse feedback and complete evidence.

- [ ] T013 [US3] Audit/fix reason-specific eligibility and finite-or-null scoring behavior in `ml/src/scoring/status.py`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T012.
  - Completion criteria: No unsupported numeric fallback; valid feedback-only references distinguished; six stable statuses and existing rules preserved.
  - Verification: Tests for missing model/peers, feedback-only insufficiency, NaN serialization and baseline identity.

- [ ] T014 [US3] Review user-facing status explanations and analytical limitations in `docs/ml/interpretation-guide.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Nhung, Huy.
  - Dependencies: T013.
  - Completion criteria: Observed/reference/gap semantics and insufficient-basis cases explained without forecast/causal claims.
  - Verification: Human review against representative result cases and source uncertainty.

- [ ] T015 [US3] Freeze the serving input/output and artifact compatibility contract in `docs/contracts/inference-v1.md`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: Nhung.
  - Dependencies: T014.
  - Completion criteria: Reviewed contract maps every field/nullable reason and bundle/corpus/config identity for F004.
  - Verification: Contract review by Nhung and validation fixtures covering all analytic statuses.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T016 Review the ML readiness gate and handoff in `docs/verification/ml-readiness.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Nhung, Mai.
  - Dependencies: T015.
  - Completion criteria: Human/metric evidence, artifact hash and unresolved limitations recorded; real serving remains blocked if required gates fail.
  - Verification: Review all readiness evidence, not task-count percentage.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: none

- T002: T001

- T003: T002

- T004: T003

- T005: T004

- T006: T005

- T007: T006

- T008: T007

- T009: T004

- T010: T009, T007

- T011: T010, T008

- T012: T011

- T013: T012

- T014: T013

- T015: T014

- T016: T015

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
| FR-001 | `T002`, `T003` |
| FR-002 | `T001`, `T005`, `T007` |
| FR-003 | `T003`, `T009`, `T012` |
| FR-004 | `T009`, `T010` |
| FR-005 | `T006`, `T007` |
| FR-006 | `T004`, `T006`, `T007` |
| FR-007 | `T009`, `T010` |
| FR-008 | `T008`, `T011`, `T012` |
| FR-009 | `T007`, `T008` |
| FR-010 | `T013`, `T014` |
| FR-011 | `T015`, `T016` |
