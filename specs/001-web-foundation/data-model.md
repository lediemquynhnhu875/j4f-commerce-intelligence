# Data Model: Web Foundation, Authentication, and Store Ownership

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Account: email identity, role, active/suspended state, and credential identity.
- Store: explicit application tenant, independent of source seller metadata.
- Store assignment: one active store per User; Admins do not acquire tenant access from source seller IDs.
- Session: revocable account session with expiry.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Proposed records

| Record | Fields and relationships | Constraints / lifecycle |
| --- | --- | --- |
| Auth identity/session | Library-managed user, credential and session tables; session references identity | Schema follows pinned auth version; credentials never exposed; expiry/revocation enforced |
| AccountProfile | account_id FK to identity; role; state; display_name; created_at/updated_at | role=user/admin; state=active/suspended; normalized email unique in identity; display_name nonblank<=200 |
| Store | id; name; archived_at; created_at | Name nonblank<=200; archive preserves history |
| CurrentStoreAssignment | account_id PK/FK; store_id FK; assigned_at; assigned_by FK | At most one current row per account; active User provisioning requires one; Admin has no required store |

Account and assignment changes are transactional. Deny store access to an invalid
or unassigned User even if malformed legacy data exists. Check current account
state and assignment in every protected read/mutation; an auth cookie alone does
not establish authorization. Suspended accounts lose sessions; reactivation does
not revive revoked sessions. Test fixtures/first Admin may be provisioned through
the operator bootstrap before F007's management UI exists.
