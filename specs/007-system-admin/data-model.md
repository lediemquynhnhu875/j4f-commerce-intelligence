# Data Model: System Administration

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Managed account/store: persistent role/state and explicit assignment.
- Managed category/product: version-aware catalog metadata and archive state.
- Operational view: counts and processing failures from recorded application data.
- Management event: administrator/time/change evidence.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Reused records and operational views

F007 reuses F001 identities/profiles/assignments, F002 snapshots/catalog/imports
and F004 processing records. It does not create a second auth or import engine.

| View / mutation | Source / fields | Constraints |
| --- | --- | --- |
| AccountManagement | account ID,email,role,state,current store and safe timestamps | Never return credentials/tokens; provision via auth library; active User store required |
| StoreCategoryManagement | reviewed names, taxonomy mapping, archived state and explicit assignments | Names nonblank<=200; last active Admin invariant checked transactionally |
| OperationalOverview | account/store/product/import totals; actual processing counts | Actual records only; missing basis marked unavailable |
| AnalysisMonitor | run ID, processing status, safe failure reason,timestamps,analytic status when succeeded | Process and analytic filters separate; stale-run reconciliation uses conditional terminal update |

Suspension revokes sessions and blocks already-authenticated requests. Reactivation
needs a fresh login. Role/store changes read fresh and preserve historical resource
ownership. Prevent concurrent suspension/demotion of all remaining active Admins
with a transaction/locking strategy; a UI-only check is insufficient. Archive
instead of cascading deletion of frozen analysis/action history.
