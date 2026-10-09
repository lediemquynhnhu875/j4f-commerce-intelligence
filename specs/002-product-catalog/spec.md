# Feature Specification: Product Data, Imports, and Catalog

**Feature Branch**: Not created; proposed implementation branch `feature/product-catalog`

**Feature ID**: F002 | **Created**: 2026-10-09 | **Status**: Draft for team review

**Input**: Confirmed Sellens / J4F Commerce Intelligence planning request: Reuse verified cleaning work and provide explicit store assignments, validated imports, and scoped catalog views.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import and explicitly assign demo products (Priority: P1)

An administrator needs to publish a validated dataset with explicit application ownership.

**Why this priority**: This delivers publish a validated dataset with explicit application ownership within the feature's bounded scope.

**Independent Test**: Validate/import a small approved fixture and a malformed fixture, then inspect both stores.

**Acceptance Scenarios**:

1. **Given** a valid file with explicit store mappings, **When** import is validated and published, **Then** assigned products appear only in the selected stores.
2. **Given** a file with malformed or conflicting rows, **When** validation runs, **Then** row errors are visible and no active partial snapshot appears.
3. **Given** a published checksum, **When** the same upload is submitted again, **Then** no duplicate active catalog entries are created.

### User Story 2 - Find store-owned products (Priority: P1)

A store owner needs to search and browse the current catalog.

**Why this priority**: This delivers search and browse the current catalog within the feature's bounded scope.

**Independent Test**: Use a fixed fixture with two stores to verify list counts, search, filters and pagination.

**Acceptance Scenarios**:

1. **Given** two stores with assigned products, **When** a User lists or searches products, **Then** only that User's store entries and counts appear.
2. **Given** filters with no matching products, **When** the page is opened, **Then** an empty state explains the result.
3. **Given** a filter is changed on a later page, **When** results reload, **Then** pagination returns to the first page.

### User Story 3 - Inspect product provenance and missing values (Priority: P2)

A store owner needs to understand a product's data before requesting analysis.

**Why this priority**: This delivers understand a product's data before requesting analysis within the feature's bounded scope.

**Independent Test**: Open one complete, one sparse and one unauthorized product through direct URLs.

**Acceptance Scenarios**:

1. **Given** an owned product with absent optional fields, **When** details are viewed, **Then** unavailable values are distinct from zero.
2. **Given** a foreign or archived product ID, **When** details are requested, **Then** no unauthorized content is returned.
3. **Given** unknown source capture time, **When** provenance is displayed, **Then** unknown time is stated rather than replaced by scoring time.

### Edge Cases

- Malformed file, missing columns, encoding mismatch, duplicate rows/IDs, invalid numeric values.
- Unknown capture date, rejected cleaning rows, invalid store assignment, repeated import.
- No products/search matches; product archived or reassigned while viewing; foreign store product ID.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST satisfy this outcome: Admins import the single Tiki dataset and receive validation results for individual rejected rows.
- **FR-002**: The system MUST satisfy this outcome: Valid imports produce versioned snapshots; invalid uploads do not partially publish active product data.
- **FR-003**: The system MUST satisfy this outcome: Each application product belongs to an explicit store assignment made by an Admin.
- **FR-004**: The system MUST satisfy this outcome: Source seller metadata never automatically creates an account or store owner.
- **FR-005**: The system MUST satisfy this outcome: Users can search, filter, paginate, and view only products assigned to their store.
- **FR-006**: The system MUST satisfy this outcome: Product details distinguish missing values from zero and show source/snapshot provenance when known.
- **FR-007**: The system MUST satisfy this outcome: Imports identify duplicate source IDs and repeated uploads, with a documented deterministic policy.
- **FR-008**: The system MUST satisfy this outcome: Analysis-related product fields preserve the shared clean-product contract.
- **FR-009**: The system MUST satisfy this outcome: Admin management after initial import reuses this catalog service; management screens are in F007.

### Key Entities *(include if feature involves data)*

- Dataset snapshot and import batch: provenance, checksum, validation errors and publication state.
- Source product: source identifier and snapshot fields, separate from application tenant ownership.
- Store product: explicit store-owned catalog entry linked to a source product/snapshot.
- Category: managed application label with traceable taxonomy relationship.

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

- Feature dependencies: F001.

- Automated verification is explicitly requested alongside the acceptance scenarios.

- Product decisions not included in the confirmed MVP require an explicit scope amendment.

## Scope Boundaries

- This planning request creates documentation only. It does not create application code, migrations or tests.

- Preserve existing data/model behavior except for specifically verified gaps described in the implementation plan.

- Do not introduce unsupported financial/trend metrics, forecasts, causal guarantees or duplicate services.

## Planning References

- [Project backlog](../../docs/PROJECT_BACKLOG.md)

- [Constitution](../../.specify/memory/constitution.md)
