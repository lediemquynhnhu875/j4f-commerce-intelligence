# Data Model: ML Analysis Readiness

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Source provenance: sales meaning/unit/capture scope and explicitly unknown metadata.
- Review evidence: blind holdout/fallback/peer annotations and independently recorded results.
- Analysis bundle: fitted models/preprocessors, feature schema, calibration and artifact/config versions.
- Peer snapshot: approved global reference corpus with immutable taxonomy and retrieval identity.
- Analysis result: eligibility, nullable reference quantities, status reason, evidence and limitations.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Bundle and analysis structures

These are ML artifacts and validated payloads, not additional application tables.

| Structure | Required fields / identity | Constraints |
| --- | --- | --- |
| FeatureSchema | schema_version; ordered feature allowlist; types; nullable policy; unknown-category handling | Matches fitted preprocessing; no observed/derived target sales; Model A excludes rating/review |
| AnalysisBundleManifest | model_version; checksum; dependency_versions; schema_version; config_version; taxonomy_version; peer_snapshot_id; source provenance; evaluation references | Trusted local artifact; all referenced artifacts compatible and present |
| FittedBundle | fitted preprocessing/model A and identified comparison B; calibration parameters; fitted peer index/corpus and config | No fit on request; calibration bounds/config documented and round-trip tested |
| Observation | observed_sales; source_snapshot_id; observation scope/time, nullable when unknown | Nonnegative integer sales when available; separate from estimator input |
| AnalyticResult | Existing score fields plus result_schema_version,basis_reason,limitations,config_version,peer_snapshot_id,source_snapshot_id | Six stable analytic statuses; finite-or-null numerics; no invented basis |
| EvaluationRecord | split/grouping; data hash; metric names/values; baseline/model identity; human-review references | Out-of-sample evidence; serving full-fit predictions distinct from OOF evaluation |

Reference/interval availability depends on the reason: missing model/peer basis
cannot produce unsupported references. Feedback-only insufficiency may retain
valid references. Unsupported priority/interval outputs remain null with reasons.
Baseline-only output has an explicit baseline identity. Calibration settings must
be finite and compatible with the evaluated interval method; intervals cannot
invert or imply an unverified predictive guarantee.
