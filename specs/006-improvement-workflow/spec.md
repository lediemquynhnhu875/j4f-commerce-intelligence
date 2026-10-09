# Feature Specification: Suggestions and Improvement Workflow

**Feature Branch**: Not created; proposed implementation branch `feature/improvement-workflow`

**Feature ID**: F006 | **Created**: 2026-10-09 | **Status**: Draft for team review

**Input**: Confirmed Sellens / J4F Commerce Intelligence planning request: Preserve evidence-backed suggestion originals and record store-owned decisions, progress and append-only history.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review and accept or reject a suggestion (Priority: P1)

A store owner needs to decide whether evidence warrants improvement work.

**Why this priority**: This delivers decide whether evidence warrants improvement work within the feature's bounded scope.

**Independent Test**: Use real saved suggestion originals to accept/reject while checking immutable evidence.

**Acceptance Scenarios**:

1. **Given** a saved suggestion, **When** it is opened, **Then** original evidence/text remains visible.
2. **Given** a pending suggestion, **When** it is rejected with a reason, **Then** rejection and reason are recorded.
3. **Given** an empty rejection reason, **When** rejection is submitted, **Then** validation blocks the transition.

### User Story 2 - Update and complete improvement work (Priority: P1)

A store owner needs to track actual work without claiming measured sales impact.

**Why this priority**: This delivers track actual work without claiming measured sales impact within the feature's bounded scope.

**Independent Test**: Update accepted work from two clients and force history-write failure.

**Acceptance Scenarios**:

1. **Given** accepted work, **When** progress is updated, **Then** actor/time/state transition is recorded.
2. **Given** work is completed with notes, **When** completion is saved, **Then** work is marked done with no sales-uplift assertion.
3. **Given** two clients use the same version, **When** the second update arrives, **Then** it receives a conflict instead of overwriting new work.

### User Story 3 - Inspect an append-only change history (Priority: P2)

A store owner needs to trace who changed improvement work and why.

**Why this priority**: This delivers trace who changed improvement work and why within the feature's bounded scope.

**Independent Test**: Verify history preserves originals and both successful and rolled-back updates.

**Acceptance Scenarios**:

1. **Given** an action with changes, **When** history is opened, **Then** ordered actor/time/before/after events are shown.
2. **Given** history persistence fails, **When** an update is attempted, **Then** neither the action state nor event commits.
3. **Given** another store's action/history ID, **When** history is requested, **Then** access is denied.

### Edge Cases

- Blank rejection reason; stale update version; history insert fails; cross-store action ID.
- Duplicate accept/reject; product reassigned; original analysis changed elsewhere; no generated suggestion.
- Reject after progress begins; completion without notes; account suspended during update.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST satisfy this outcome: Suggestions cite evidence from a saved analysis and are review hypotheses, not guaranteed causal improvements.
- **FR-002**: The system MUST satisfy this outcome: Original generated suggestion text/evidence/versions remain immutable before and after User edits.
- **FR-003**: The system MUST satisfy this outcome: Users accept or reject suggestions; rejection requires a nonblank reason.
- **FR-004**: The system MUST satisfy this outcome: Accepted improvement work can move through progress states and be completed with notes.
- **FR-005**: The system MUST satisfy this outcome: Every update records actor, time and before/after values in append-only history.
- **FR-006**: The system MUST satisfy this outcome: Action updates and history writes succeed or roll back together.
- **FR-007**: The system MUST satisfy this outcome: Every action and nested history ID is checked against the User's persisted store scope.
- **FR-008**: The system MUST satisfy this outcome: Concurrent edits are detected instead of silently overwriting newer changes.
- **FR-009**: The system MUST satisfy this outcome: Work completion means the action was performed; it does not prove increased sales.
- **FR-010**: The system MUST satisfy this outcome: Deadlines are not part of the confirmed MVP and remain an explicit follow-up product decision.

### Key Entities *(include if feature involves data)*

- Suggestion: immutable original from an analysis, evidence, versions and editable user copy.
- Improvement action: store scope, decision, progress, rejection/completion notes and optimistic version.
- Action event: append-only actor/time/before/after record committed atomically with mutation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All stated acceptance scenarios have recorded expected/actual results before feature acceptance.

- **SC-002**: Every applicable role/ownership denial case exposes no protected content or mutation.

- **SC-003**: Every identified missing/error case is presented without invented successful results.

- **SC-004**: The primary journey can be demonstrated using approved inputs with traceable outcomes.

## Assumptions

- These specifications describe planned work; no implementation task is claimed or started.

- Account provisioning by Admin, email/password login, and one store per User were confirmed by the user.

- Domain roles and exact team names are supplied by the current user request.

- Source capture time, sales observation window and review evidence must not be invented.

- Feature dependencies: F001, F002, F003, F004.

- Automated verification is explicitly requested alongside the acceptance scenarios.

- Product decisions not included in the confirmed MVP require an explicit scope amendment.

## Scope Boundaries

- This planning request creates documentation only. It does not create application code, migrations or tests.

- Preserve existing data/model behavior except for specifically verified gaps described in the implementation plan.

- Do not introduce unsupported financial/trend metrics, forecasts, causal guarantees or duplicate services.

## Planning References

- [Project backlog](../../docs/PROJECT_BACKLOG.md)

- [Constitution](../../.specify/memory/constitution.md)
