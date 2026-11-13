# Feature Specification: System Administration

> 2026-11-13 amendment: automatic import/preview, popup feedback, per-account suspension state and aggregate-only Admin access are implemented. See the latest plan/tasks amendment and CURRENT_STATE verification. General user query optimization and live ML jobs remain deferred.
> Current ownership: [one User / one store](../store-ownership.md), implemented and verified on configured Neon. Earlier multi-store/shared-catalog assumptions are superseded.

> Current release amendment: [connected workspace scope](../release-scope.md). Demo routes are removed. Admin product/category screens are retired; User catalog write/import and ownership work remain pending. Older preview/catalog milestones below are historical and do not define the current navigation.

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

### User Story 2 - Historical catalog management (retired)

The Admin product/category and assignment screens are excluded from the current
UI release at the user's request. They have no active UI acceptance scenarios.
F007/T009 retains its historical identity but is retired, not completed.
Owner-scoped User imports/writes and catalog API authorization are separate,
unimplemented work. See [release scope](../release-scope.md).

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

- **FR-001**: The system MUST satisfy this outcome: Only active Admins access account administration and system monitoring. Product/category management screens are excluded from the current Admin workspace; catalog API authorization changes remain pending.
- **FR-002**: The system MUST satisfy this outcome: Admins provision email/password accounts without public registration. The current runtime uses a shared catalog; the proposed one-User/multiple-store ownership model remains pending.
- **FR-003**: The system MUST satisfy this outcome: Account suspension blocks active sessions immediately; reactivation requires new login.
- **FR-004**: The system MUST satisfy this outcome: Admin store management remains unavailable until a reviewed ownership implementation exists; source seller metadata must not grant ownership. Admin catalog editing pages are excluded.
- **FR-005**: The system MUST satisfy this outcome: The current release MUST NOT expose Admin product/category management pages or navigation links; direct URLs return 404. Catalog ownership/import changes are separate future work and preserve frozen history.
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
