# Feature Specification: ML Analysis Readiness

**Feature Branch**: Not created; proposed implementation branch `feature/ml-readiness`

**Feature ID**: F003 | **Created**: 2026-10-09 | **Status**: Draft for team review

**Input**: Confirmed Sellens / J4F Commerce Intelligence planning request: Audit and verify existing ML work, fill documented inference gaps, and freeze a reproducible analysis contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify taxonomy and comparable evidence (Priority: P1)

An ML analyst and independent reviewer needs to establish trustworthy product groups without contaminating evaluation.

**Why this priority**: This delivers establish trustworthy product groups without contaminating evaluation within the feature's bounded scope.

**Independent Test**: Review queue separation plus taxonomy and peer metrics can be audited without any web application.

**Acceptance Scenarios**:

1. **Given** unreviewed holdout rows, **When** independent annotation occurs, **Then** reviewers do not see private predictions and evidence records identify human work.
2. **Given** fallback rules need improvement, **When** development labels are used, **Then** the independent holdout remains untouched.
3. **Given** a target product, **When** peers are selected, **Then** target/self and configured same-seller exclusion are respected.

### User Story 2 - Verify reference modeling and a deployable bundle (Priority: P1)

An ML analyst needs to produce reproducible estimates with fitted preprocessing and honest evaluation.

**Why this priority**: This delivers produce reproducible estimates with fitted preprocessing and honest evaluation within the feature's bounded scope.

**Independent Test**: Use controlled synthetic and approved out-of-sample fixtures before exposing a serving API.

**Acceptance Scenarios**:

1. **Given** seller-grouped held-out data, **When** baseline and model are evaluated, **Then** reported metrics identify split and source.
2. **Given** observed target sales changes, **When** estimator feature construction is inspected, **Then** the target value is not an estimator feature.
3. **Given** a saved bundle, **When** it is loaded in a clean compatible environment, **Then** fitted feature transforms, predictions and intervals are reproducible.

### User Story 3 - Freeze eligibility, null semantics and limitations (Priority: P1)

A product reviewer needs to understand when analysis is valid and when evidence is insufficient.

**Why this priority**: This delivers understand when analysis is valid and when evidence is insufficient within the feature's bounded scope.

**Independent Test**: Run eligibility cases with missing peers, missing model, sparse feedback and complete evidence.

**Acceptance Scenarios**:

1. **Given** missing model or peer basis, **When** analysis is produced, **Then** unsupported reference numbers are absent with a reason.
2. **Given** valid reference but sparse feedback, **When** status interpretation is produced, **Then** valid reference may remain with feedback limitation.
3. **Given** an evidence-backed suggestion, **When** it is reviewed, **Then** it is presented as a hypothesis, not guaranteed uplift.

### Edge Cases

- Missing Python dependencies/raw snapshot/human labels; inconsistent source sales semantics.
- Too few sellers/positive observations; unknown categories; sparse inputs; insufficient peers.
- Missing calibration/config; mismatched preprocessing versions; feedback-only insufficiency versus missing reference basis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST satisfy this outcome: Analysts verify the meaning, unit, observation scope and missing-value treatment of observed sales.
- **FR-002**: The system MUST satisfy this outcome: Existing cleaning, EDA, taxonomy, peers, model and scoring are reused and audited before changes.
- **FR-003**: The system MUST satisfy this outcome: Observed target sales must never be an estimator input for predicting that same target.
- **FR-004**: The system MUST satisfy this outcome: The primary actionable reference model excludes ratings/review counts; comparison outputs are identified separately.
- **FR-005**: The system MUST satisfy this outcome: Independent taxonomy holdout labels remain blind and are never used for rule tuning.
- **FR-006**: The system MUST satisfy this outcome: Human labels and peer relevance reviews require actual human evidence, not AI-generated completion.
- **FR-007**: The system MUST satisfy this outcome: Baseline/model evaluation uses appropriate out-of-sample evidence and distinguishes full-fit serving from evaluation predictions.
- **FR-008**: The system MUST satisfy this outcome: The analysis bundle includes fitted preprocessing, models, calibration, configuration and versioned provenance.
- **FR-009**: The system MUST satisfy this outcome: Comparable-product evidence excludes the target and same seller as configured and preserves snapshot identity.
- **FR-010**: The system MUST satisfy this outcome: Eligibility and insufficient-basis behavior identify the specific unavailable evidence; unsupported numeric outputs remain absent.
- **FR-011**: The system MUST satisfy this outcome: A stable inference input/output contract and limitations are reviewed before real service integration.

### Key Entities *(include if feature involves data)*

- Source provenance: sales meaning/unit/capture scope and explicitly unknown metadata.
- Review evidence: blind holdout/fallback/peer annotations and independently recorded results.
- Analysis bundle: fitted models/preprocessors, feature schema, calibration and artifact/config versions.
- Peer snapshot: approved global reference corpus with immutable taxonomy and retrieval identity.
- Analysis result: eligibility, nullable reference quantities, status reason, evidence and limitations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All stated acceptance scenarios have recorded expected/actual results before feature acceptance.

- **SC-002**: Every applicable role/ownership denial case exposes no protected content or mutation.

- **SC-003**: Every identified missing/error case is presented without invented successful results.

- **SC-004**: Human review and evaluation work has actual reviewer/participant evidence; otherwise it remains incomplete.

## Assumptions

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

- Do not introduce unsupported financial/trend metrics, forecasts, causal guarantees or duplicate services.

## Planning References

- [Project backlog](../../docs/PROJECT_BACKLOG.md)

- [Constitution](../../.specify/memory/constitution.md)
