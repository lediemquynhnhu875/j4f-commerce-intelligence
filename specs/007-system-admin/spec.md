# Feature Specification: System Administration

**Feature Branch**: Not created; proposed implementation branch `feature/system-admin`

**Feature ID**: F007 | **Created**: 2026-10-09 | **Status**: Draft for team review

**Input**: Confirmed Sellens / J4F Commerce Intelligence planning request: Provide Admin-only management and operational monitoring using the shared identity, catalog and analysis services.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage accounts and stores (Priority: P1)

An administrator needs to provision, suspend and restore access safely.

**Why this priority**: This delivers provision, suspend and restore access safely within the feature's bounded scope.

**Independent Test**: Provision two Users, suspend/reactivate one and attempt last-Admin lockout.

**Acceptance Scenarios**:

1. **Given** a new store owner, **When** Admin provisions credentials and store, **Then** the User can log in only to that store.
2. **Given** a User with an active session, **When** Admin suspends them, **Then** subsequent protected requests are denied.
3. **Given** a suspended account, **When** Admin reactivates it, **Then** only a fresh login restores access.

### User Story 2 - Manage catalog metadata and explicit assignments (Priority: P1)

An administrator needs to maintain categories and demo store mappings without losing history.

**Why this priority**: This delivers maintain categories and demo store mappings without losing history within the feature's bounded scope.

**Independent Test**: Manage two stores and category/product assignments using F002 published data.

**Acceptance Scenarios**:

1. **Given** source products, **When** Admin assigns them to a store, **Then** only explicitly assigned owners can view them.
2. **Given** a product with historical analyses, **When** it is reassigned, **Then** old runs stay scoped to the original store.
3. **Given** an invalid category or mapping, **When** management update is submitted, **Then** validation rejects it.

### User Story 3 - Monitor processing and operational outcomes (Priority: P2)

An administrator needs to see actual failures and application activity.

**Why this priority**: This delivers see actual failures and application activity within the feature's bounded scope.

**Independent Test**: Seed controlled operational records and trigger real service failure once available.

**Acceptance Scenarios**:

1. **Given** recorded successful/failed analyses, **When** monitor opens, **Then** processing state and analytical category are distinct.
2. **Given** no recorded operational data, **When** overview opens, **Then** unavailable/empty states are shown.
3. **Given** a stale running operation, **When** reconciliation runs, **Then** failure is recorded with an auditable reason.

### Edge Cases

- Last active Admin suspension; duplicate normalized email; User without store; store removal with history.
- Reassignment during request; invalid category; public sign-up bypass; non-Admin calling management endpoints.
- Missing operational data; service failure; stale running operation; old sessions after reactivation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST satisfy this outcome: Only active Admins manage accounts, stores, categories and product assignments.
- **FR-002**: The system MUST satisfy this outcome: Admins provision email/password accounts without public registration; every active User has one explicit store.
- **FR-003**: The system MUST satisfy this outcome: Account suspension blocks active sessions immediately; reactivation requires new login.
- **FR-004**: The system MUST satisfy this outcome: Admins manage stores and explicit product assignments without deriving ownership from seller metadata.
- **FR-005**: The system MUST satisfy this outcome: Product/category management reuses the import/catalog services and preserves frozen analysis history.
- **FR-006**: The system MUST satisfy this outcome: Operational statistics use actual recorded accounts, imports and processing outcomes.
- **FR-007**: The system MUST satisfy this outcome: Monitoring distinguishes pending/running/succeeded/failed processing from analytic result categories.
- **FR-008**: The system MUST satisfy this outcome: Failures and stale processing are visible without exposing credentials or private artifact paths.
- **FR-009**: The system MUST satisfy this outcome: Configuration editing and unsupported additional metrics are excluded from the confirmed MVP.

### Key Entities *(include if feature involves data)*

- Managed account/store: persistent role/state and explicit assignment.
- Managed category/product: version-aware catalog metadata and archive state.
- Operational view: counts and processing failures from recorded application data.
- Management event: administrator/time/change evidence.

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

- Feature dependencies: F001, F002, F004.

- Automated verification is explicitly requested alongside the acceptance scenarios.

- Product decisions not included in the confirmed MVP require an explicit scope amendment.

## Scope Boundaries

- This planning request creates documentation only. It does not create application code, migrations or tests.

- Preserve existing data/model behavior except for specifically verified gaps described in the implementation plan.

- Do not introduce unsupported financial/trend metrics, forecasts, causal guarantees or duplicate services.

## Planning References

- [Project backlog](../../docs/PROJECT_BACKLOG.md)

- [Constitution](../../.specify/memory/constitution.md)
