# Interface Contracts: Web Foundation, Authentication, and Store Ownership

**Feature ID**: F001

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Preview Boundary

Synthetic shell/navigation/login previews can be implemented from this draft
before final auth/permission review. Preview routes and fixture roles are
explicitly labeled; they perform no real login, database/API/model request or
tenant lookup. They never establish permissions. Real protected routes continue
to require the identity and access contract below.

## Identity and access contract

User role values are user and admin. Account states are active and suspended.
An active User must have exactly one store assignment; Admin has no required store.
Auth-library identity/session tables coexist with application profiles and assignments.
Normalized account email is unique. Password input uses the library's reviewed policy
(planning baseline 8 to 128 characters); plaintext credentials are never stored or returned.
Store/display names must be nonblank and at most 200 characters.

| Interface | Inputs / access | Result |
| --- | --- | --- |
| POST /api/auth/sign-in/email | Email/password; library handler | Session cookie or generic authentication failure |
| POST /api/auth/sign-out | Current session; library handler | Session revoked; cookie cleared |
| GET /api/v1/session | Active session | Account ID, role, current store ID or null; no credentials |

The auth library is mounted under /api/auth; application APIs use /api/v1.
Public sign-up is disabled server-side; admin provisioning is designed in F007.
Every resource lookup derives store access from the database, never from the client.
No session returns 401; a wrong role returns 403; absent or unauthorized tenant
resource returns the same 404 response. Mutations require origin/CSRF protection.
Account suspension revokes sessions; role/assignment changes are read fresh.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
