# Data Model: Model Serving and Application Integration

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Analysis run: store/product scope, immutable input/result snapshots and separate processing/analytic states.
- Model deployment: trusted bundle, peer corpus, config, taxonomy identity and readiness.
- Idempotent request: key bound to account/store/product and input identity.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Proposed records

| Record | Fields and relationships | Constraints / lifecycle |
| --- | --- | --- |
| AnalysisRun | id; store_id FK; store_product_id FK; requested_by FK; idempotency_key; input_digest; processing_status; created_at/started_at/completed_at | Original store/resource relation retained; key1..200; unique(store_id,store_product_id,idempotency_key) |
| FrozenInput | analysis_id FK; source_snapshot_id; input_schema_version; allowlisted feature values; separate observed sales; input_digest | Persist before call; immutable; no current-data lookup used to reconstruct historical input |
| FrozenResult | analysis_id FK; validated output/evidence/recommendations; source/peer snapshot; model/config/taxonomy/schema versions; scored_at; limitations | Present only on succeeded run; immutable; finite-or-null approved fields |
| ProcessingFailure | analysis_id FK; controlled code; safe reason; failed_at; correlation_id | No synthetic analytic result; secrets/internal artifact paths excluded |
| OriginalSuggestion | id; analysis_id FK; rule key; generated text/evidence/versions | Immutable; initialized atomically with successful result; F006 extends with User work |

pending->running->succeeded/failed; terminal records are not overwritten.
Retry creates a new run/key. Repeating the same key/input returns the saved record
without a second inference; a conflicting digest returns409. A pending/running
duplicate returns the existing run state, never starts concurrent duplicate work.
The service call is bounded; do not hold a database transaction open across it.
Recheck active account and original resource scope before storing a result.
Failed persistence/late replies cannot turn a terminated run back into success;
compare state/version and record controlled diagnostics. F007 reconciles abandoned
running records against the configured maximum processing duration.
