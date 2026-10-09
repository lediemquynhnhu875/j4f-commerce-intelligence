# Interface Contracts: User Dashboard and Analysis Presentation

**Feature ID**: F005

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Dashboard and history contract

| Interface | Access | Result |
| --- | --- | --- |
| GET /api/v1/dashboard | Active User and current store assignment | Counts, denominators, snapshot identity, review priorities and availability |
| GET /api/v1/products/{productId}/analyses | Owned StoreProduct ID; page/page_size | Frozen authorized run summaries; processing and analytic state separate |
| GET /api/v1/analyses/{analysisId} | F004 ownership contract | Frozen inputs/result/evidence and versions |

Counts include total active store products, completed analysis coverage,
processing failures and insufficient-basis counts, each with explicit denominator.
No ratio is shown when its denominator is zero; display unavailable instead.
page>=1, page_size1..100 default20; history uses deterministic timestamp/ID ordering.
Reference/gap/interval fields are nullable; no unsupported value is rendered as zero.
Public peer presentation uses approved source fields, not other tenants' application IDs.
Use source_snapshot_id/capture_at when known and scored_at separately.
UI states include loading, empty, error, no-analysis, processing-failed and
insufficient-basis. No historical sales/revenue/profit/conversion endpoint is planned.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
