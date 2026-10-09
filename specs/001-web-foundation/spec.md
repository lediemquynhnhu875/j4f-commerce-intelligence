# Feature Specification: Web Foundation, Authentication, and Store Ownership

**Feature Branch**: Not created; proposed implementation branch `feature/web-foundation`

**Feature ID**: F001 | **Created**: 2026-10-09 | **Status**: Draft for team review

**Input**: Confirmed Sellens / J4F Commerce Intelligence planning request: Establish the web application, admin-provisioned login, sessions, and one-store-per-User access.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and sign out (Priority: P1)

A provisioned store owner needs to enter and leave a valid authenticated session.

**Why this priority**: This delivers enter and leave a valid authenticated session within the feature's bounded scope.

**Independent Test**: Use provisioned demo accounts to verify successful and failed login, logout, and expiry.

**Acceptance Scenarios**:

1. **Given** a provisioned active User with a store, **When** valid credentials are submitted, **Then** a session is created and owner navigation is shown.
2. **Given** an invalid, suspended, or unknown account, **When** login is attempted, **Then** access is denied without account-enumeration details.
3. **Given** an authenticated account, **When** logout occurs, **Then** the old session cannot access protected content.

### User Story 2 - Enforce role and store boundaries (Priority: P1)

A store owner or administrator needs to access only permitted operations and resource IDs.

**Why this priority**: This delivers access only permitted operations and resource IDs within the feature's bounded scope.

**Independent Test**: Exercise the authorization matrix with two stores and one Admin, including direct requests.

**Acceptance Scenarios**:

1. **Given** two Users with different stores, **When** one submits the other's resource identifier, **Then** the protected operation denies access.
2. **Given** a User, **When** an Admin-only operation is requested directly, **Then** access is denied.
3. **Given** a suspended account with an old session, **When** a protected operation is attempted, **Then** access is denied and reactivation requires new login.

### User Story 3 - Use role-specific navigation (Priority: P2)

A signed-in person needs to reach the correct workspace and understand denied access.

**Why this priority**: This delivers reach the correct workspace and understand denied access within the feature's bounded scope.

**Independent Test**: Walk through both role layouts without requiring catalog or model features.

**Acceptance Scenarios**:

1. **Given** an active User, **When** login finishes, **Then** owner navigation is shown.
2. **Given** an active Admin, **When** login finishes, **Then** admin navigation is shown.
3. **Given** an expired session, **When** a protected screen is opened, **Then** login is requested without exposing protected content.

### Edge Cases

- Invalid credentials; expired/revoked session; suspended account; no store assignment.
- Forged role/store; cross-store nested resource ID; public sign-up attempted.
- Store reassignment during a request; logout repeated; admin without a store.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST satisfy this outcome: Admins provision accounts; Users sign in with email and password. Public self-registration is excluded.
- **FR-002**: The system MUST satisfy this outcome: Each active User has exactly one explicit store assignment. An unassigned User cannot access store data.
- **FR-003**: The system MUST satisfy this outcome: An active Admin can access system management; a User cannot access admin operations.
- **FR-004**: The system MUST satisfy this outcome: Login establishes a revocable session; logout and expiry end access. Suspension blocks existing sessions.
- **FR-005**: The system MUST satisfy this outcome: Every protected operation validates the current account, role, and persisted resource ownership.
- **FR-006**: The system MUST satisfy this outcome: Browser-supplied roles, store IDs, and resource IDs do not grant permissions.
- **FR-007**: The system MUST satisfy this outcome: Role-specific navigation is available after login, and failed login does not reveal account existence.
- **FR-008**: The system MUST satisfy this outcome: Reactivate an account without reviving old sessions. A new login is required.
- **FR-009**: The system MUST satisfy this outcome: Preserve the existing data/model pipeline while establishing the application.

### Key Entities *(include if feature involves data)*

- Account: email identity, role, active/suspended state, and credential identity.
- Store: explicit application tenant, independent of source seller metadata.
- Store assignment: one active store per User; Admins do not acquire tenant access from source seller IDs.
- Session: revocable account session with expiry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All stated acceptance scenarios have recorded expected/actual results before feature acceptance.

- **SC-002**: Every applicable role/ownership denial case exposes no protected content or mutation.

- **SC-003**: Every identified missing/error case is presented without invented successful results.

- **SC-004**: The primary journey can be demonstrated using approved inputs with traceable outcomes.

## Assumptions

- Early synthetic previews can precede final auth/permission review. Completing
  a preview does not satisfy the real authenticated user stories. The plan and
  task list define separate preview and integration increments.

- These specifications describe planned work; no implementation task is claimed or started.

- Account provisioning by Admin, email/password login, and one store per User were confirmed by the user.

- Domain roles and exact team names are supplied by the current user request.

- Source capture time, sales observation window and review evidence must not be invented.

- Feature dependencies: none; ML verification can start independently.

- Automated verification is explicitly requested alongside the acceptance scenarios.

- Product decisions not included in the confirmed MVP require an explicit scope amendment.

## Scope Boundaries

- This planning request creates documentation only. It does not create application code, migrations or tests.

- Preserve existing data/model behavior except for specifically verified gaps described in the implementation plan.

- Excludes self-registration, OAuth, multi-store User accounts, password recovery and live model integration.

## Planning References

- [Project backlog](../../docs/PROJECT_BACKLOG.md)

- [Constitution](../../.specify/memory/constitution.md)
