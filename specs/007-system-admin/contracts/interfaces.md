# Interface Contracts: System Administration

**Feature ID**: F007

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Administration contract

All interfaces below require an active Admin on the server, including direct requests.

| Interface | Purpose | Constraints |
| --- | --- | --- |
| GET/POST /api/v1/admin/accounts | List/provision accounts | Unique email, library password policy, User store assignment required |
| PATCH /api/v1/admin/accounts/{accountId} | Role/state or store assignment | Current role/status revalidated; suspension revokes sessions |
| GET/POST /api/v1/admin/stores; PATCH /api/v1/admin/stores/{storeId} | Store management | Nonblank name<=200; no destructive removal of frozen history |
| GET/POST /api/v1/admin/categories; PATCH /api/v1/admin/categories/{categoryId} | Category management | Unique nonblank name<=200; taxonomy mapping explicit |
| PATCH /api/v1/admin/products/{productId} | Metadata/archive or explicit reassignment | Reuses catalog service; frozen historical ownership retained |
| GET /api/v1/admin/overview | Operational totals | Counts from actual records; absent data marked unavailable |
| GET /api/v1/admin/analyses | Processing monitor | Filter processing status separately from analytic status |

Unlogged request401; User403; invalid input422; duplicate/conflicting edit409.
Auth provisioning uses reviewed library server API; public sign-up stays disabled.
Prevent suspension/demotion of the last active Admin. Never return passwords,
session tokens, database URLs or private model artifact paths in operational DTOs.
Imports remain F002 endpoints; management UI reuses them instead of duplicating.
No generic config-edit endpoint is planned.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
