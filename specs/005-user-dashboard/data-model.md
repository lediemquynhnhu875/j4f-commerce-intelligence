# Data Model: User Dashboard and Analysis Presentation

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Dashboard snapshot: store scope, product counts, analysis-basis counts and provenance.
- Analysis presentation: frozen observed/reference/gap/peer evidence and limitations.
- Analysis history: immutable run summaries linked to authorized saved inputs/results.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Read models (no separate source-of-truth tables)

| DTO | Fields / source | Availability rules |
| --- | --- | --- |
| DashboardSummary | current store/snapshot; active product total; latest-run coverage; failure/insufficient counts and denominators | Scope before aggregation; zero-denominator ratios unavailable |
| ProductPriority | StoreProduct ID; selected latest completed run; supported status/priority/basis | Null priority does not become zero; deterministic ordering and honest tie policy |
| AnalysisDetail | F004 frozen observation/reference/interval/evidence/versions; gap; limitations | gap=reference-observed only when both valid; source time separate from scored_at |
| AnalysisHistoryPage | authorized run summaries; timestamp/id order; total,page,page_size | page>=1; page_size1..100 default20; original store scope |
| PeerEvidence | approved public Tiki source fields and aggregates | No other tenant's private app IDs, actions, ownership or account data |

Dashboard denominators count products within the current store/snapshot.
For coverage/failure/insufficient counts, select the latest run per product using
created_at/id order; do not count every historical run as another product.
History intentionally lists all authorized runs. Display capture time as unknown
when missing. Trend/revenue/profit/conversion data is not synthesized.
