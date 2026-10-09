---
description: Proposed implementation backlog; all ownership is proposed.
---

# Tasks: Product Data, Imports, and Catalog

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/interfaces.md).

**Prerequisites**: Review these artifacts and confirm team assignments before starting. No task is assigned/started by this planning request.

**Tests**: Explicitly requested. Write/check meaningful tests with implementation; failed imports and missing environments are not passing tests.

## Format: `[ID] [P?] [Story] Description`

Identity is `F002/Tnnn`; feature directory is `002-product-catalog`. Each task has one proposed primary owner; reviewer and collaborators are separate. [P] is conditional concurrency after listed prerequisites; previews use draft contracts and real integration uses reviewed contracts. It is not an assignment.

## Path Conventions

Paths are repository-relative. Listed application/schema/test files are future deliverables, not files created by this planning request. Human verification/report paths store actual evidence.

## How to Read This Checklist

Tasks are displayed and numbered in a dependency-valid recommended order. Choose an unchecked task whose listed dependencies are complete; phase headings do not add hidden blockers. Early mock/visual tasks use draft specs and synthetic fixtures; real integration requires reviewed contracts and verified dependencies. Mock completion never completes the real story.

Task IDs were revised at the user's request before any task was claimed or completed. Use the [ID migration](../../docs/decisions/0003-ui-preview-first-task-order.md) when referring to the older checklist. Do not renumber once execution starts.

## Phase 1: User Story 1: mock import UI

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T001 [P] [US1] Build the Admin import validation/mapping UI with labeled mock responses in `frontend/src/features/admin/imports/import-panel.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F001/T002.
  - Completion criteria: Admin sees row errors, validation stage and assignment preview using visibly labeled fixtures; no fake-success state or claim of real API integration.
  - Verification: Mock component cases; real import integration is T010.

## Phase 2: User Story 2: mock catalog UI

**Goal**: Produce an inspectable synthetic preview without waiting for a real service.

**Independent Test**: Inspect labeled fixture states; no real session, API, database or model result is claimed.

- [ ] T002 [P] [US2] Build catalog list/search/filter/pagination UI with labeled mocks in `frontend/src/features/products/product-list.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: F001/T002.
  - Completion criteria: Loading/empty/error states work against the draft contract; mock adapter is clearly separate from real API.
  - Verification: Mock component cases for all states and reset-to-first-page behavior.

## Phase 3: Setup (Shared Infrastructure)

**Purpose**: Review scope/environment and existing work.

- [ ] T003 Review import/catalog cases and demo ownership mapping requirements in `docs/qa/catalog-cases.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: None.
  - Dependencies: F001/T005.
  - Completion criteria: Mapping source, row error behavior, missing-value presentation and cross-store cases are reviewed.
  - Verification: Human review with Mai and Nhung.

- [ ] T004 Verify the existing cleaning pipeline in a prepared Python environment in `docs/verification/cleaning-results.md`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: Nhung.
  - Dependencies: T003.
  - Completion criteria: Record exact environment, run existing tests and cleaning on approved data; preserve cleaning source unless a tested gap is found.
  - Verification: Existing unittest suite plus raw-to-clean counts/rejection/duplicate audit evidence.

## Phase 4: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared prerequisites.

- [ ] T005 Implement catalog/snapshot/import staging schema in `frontend/db/migrations/002_catalog.sql`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T004, F001/T008.
  - Completion criteria: Explicit StoreProduct tenant FK and unique (store_id,snapshot_id,source_product_id); immutable snapshots and row-error staging exist.
  - Verification: Constraint and rollback tests; source seller ID cannot establish ownership.

- [ ] T006 Verify required analysis fields and cleaning null semantics in `docs/verification/catalog-analysis-fields.md`.
  - Primary owner (proposed): **Nhung**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T004.
  - Completion criteria: Field-by-field mapping covers price/quantity_sold/taxonomy and rejected/missing rows; differences from contract are resolved.
  - Verification: Review representative anonymized rows and documented expected outputs.

## Phase 5: User Story 1 - Import and explicitly assign demo products (Priority: P1)

**Goal**: publish a validated dataset with explicit application ownership.

**Independent Test**: Validate/import a small approved fixture and a malformed fixture, then inspect both stores.

- [ ] T007 [US1] Write import validation/idempotency/rollback contract tests in `frontend/tests/integration/imports.test.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T005, T006, F001/T011.
  - Completion criteria: Tests cover required fields, bounds, duplicates, rejected rows, invalid mappings, and failed publish rollback.
  - Verification: Run against disposable database using fixtures after contract review.

- [ ] T008 [US1] Implement staged CSV import validation in `frontend/src/server/services/imports.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T007.
  - Completion criteria: Accept the existing Python CLI's clean CSV; validate the reviewed field mapping without porting cleaning to routes; structured row errors appear; active data is unchanged on failure.
  - Related deliverables: `frontend/src/app/api/v1/admin/imports/route.ts` and `frontend/src/app/api/v1/admin/imports/[importId]/route.ts`.
  - Verification: Execute import tests and compare with cleaned contract.

- [ ] T009 [US1] Implement atomic snapshot publication and explicit ownership mappings in `frontend/src/app/api/v1/admin/imports/[importId]/publish/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T008.
  - Completion criteria: Only Admin publishes; checksum idempotency and unique mapping constraints hold; failures roll back all publication writes.
  - Verification: Rollback and duplicate-import integration tests.

- [ ] T010 [US1] Connect import validation and mapping UI to real Admin endpoints in `frontend/src/features/admin/imports/import-client.ts`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: Mai.
  - Dependencies: T009, T001.
  - Completion criteria: Real upload/staging errors and atomic publish outcomes are shown; endpoint failures never fall back to mock success.
  - Verification: Browser import smoke check with valid, rejected and duplicate clean CSV fixtures.

## Phase 6: User Story 2 - Find store-owned products (Priority: P1)

**Goal**: search and browse the current catalog.

**Independent Test**: Use a fixed fixture with two stores to verify list counts, search, filters and pagination.

- [ ] T011 [US2] Implement scoped catalog queries and product-list route in `frontend/src/app/api/v1/products/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T009.
  - Completion criteria: page>=1; page_size 1..100 default20; search<=200; all counts/rows scoped from session and ordered stably.
  - Verification: Contract tests for list/search/filter/pagination and forged store IDs.

- [ ] T012 [US2] Connect the catalog UI to scoped web APIs in `frontend/src/features/products/catalog-client.ts`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T011, T002.
  - Completion criteria: Real source is visibly distinguished from mock data; request failures and stale pagination are handled.
  - Verification: Browser cases using published two-store fixture.

## Phase 7: User Story 3 - Inspect product provenance and missing values (Priority: P2)

**Goal**: understand a product's data before requesting analysis.

**Independent Test**: Open one complete, one sparse and one unauthorized product through direct URLs.

- [ ] T013 [US3] Implement product-detail DTO with scoped provenance in `frontend/src/app/api/v1/products/[productId]/route.ts`.
  - Primary owner (proposed): **Mai**. Reviewer: **Nhung**. Collaborators: None.
  - Dependencies: T011.
  - Completion criteria: Ownership enforced by StoreProduct relation; optional nulls preserved; capture/scoring/import times distinguished.
  - Verification: Detail contract, absent/foreign-ID and null-value tests.

- [ ] T014 [US3] Build product detail and unavailable-data presentation in `frontend/src/app/(owner)/products/[productId]/page.tsx`.
  - Primary owner (proposed): **Huy**. Reviewer: **Như**. Collaborators: None.
  - Dependencies: T013.
  - Completion criteria: Shows source/snapshot facts and honest missing fields; no zero imputation or invented metrics.
  - Verification: UI checks for complete, sparse, unauthorized and archived entries.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify acceptance and hand off evidence.

- [ ] T015 Verify imports and catalog handoff in `docs/qa/catalog-results.md`.
  - Primary owner (proposed): **Như**. Reviewer: **Mai**. Collaborators: Mai, Huy, Nhung.
  - Dependencies: T010, T012, T014.
  - Completion criteria: Reviewed evidence covers atomic imports, ownership, row errors, search/pagination and null presentation.
  - Verification: Execute feature quickstart and record unresolved data provenance.

## Dependencies & Execution Order

### Phase Dependencies

Early previews depend on the runnable frontend/shared mock shell, not on database/auth/model readiness. Follow only the prerequisites listed below. Review real requirements and contracts before dependent schema/API/auth work. Real connected UI waits for its real server contracts and the corresponding preview.

### User Story and Task Dependencies

- T001: F001/T002

- T002: F001/T002

- T003: F001/T005

- T004: T003

- T005: T004, F001/T008

- T006: T004

- T007: T005, T006, F001/T011

- T008: T007

- T009: T008

- T010: T009, T001

- T011: T009

- T012: T011, T002

- T013: T011

- T014: T013

- T015: T010, T012, T014

### Parallel Opportunities

- T001 may run after its listed prerequisites while another owner edits different files. Use this feature's draft interfaces and visibly labeled fixtures; final contract/runtime verification belongs to real integration.

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

Generated 15 unchecked tasks. All pre-existing work remains unchecked; no implementation is claimed.

## Requirement Coverage

This is planned coverage, not evidence of completed requirements.
Cross-feature references identify the bounded feature owning the
remaining delivery; they do not add a cyclic prerequisite.

| Requirement | Planned implementation / verification tasks |
| --- | --- |
| FR-001 | `T004`, `T007`, `T008`, `T001`, `T010` |
| FR-002 | `T005`, `T009` |
| FR-003 | `T005`, `T009` |
| FR-004 | `T005`, `T015` |
| FR-005 | `T011`, `T002`, `T012`, `T013` |
| FR-006 | `T006`, `T013`, `T014` |
| FR-007 | `T007`, `T008`, `T009` |
| FR-008 | `T006`, `T008` |
| FR-009 | `T013`, [F007/T008](../007-system-admin/tasks.md), [F007/T009](../007-system-admin/tasks.md) |
