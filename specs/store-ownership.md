# Current store ownership contract

Direct user instruction (2026-11-12): each regular User represents exactly one
store. This supersedes the earlier multi-store proposal and shared-catalog runtime.

## Data ownership

- stores.owner_user_id is unique; a database trigger provisions an empty store
  when a regular account is created or demoted to User. Inactive legacy regular
  accounts also retain their store, but cannot authenticate.
- products.store_id is required. Store owner/product-store transfers are blocked
  to preserve historical scope. Analyses, actions and history inherit ownership
  through products; existing immutable snapshots are not rewritten.
- Migration 004 resolves user1 only from the configured SEED_USER1_EMAIL and names
  its store exactly `J4F store`. All pre-existing products are assigned there.
  Other Users receive empty stores. No source seller/actor field grants ownership.
- One PostgreSQL database holds all stores. Backend SQL applies ownership filters;
  these are not separate Neon databases and PostgreSQL RLS is not configured here.

## API and permissions

- GET /api/v1/stores: paginated own store for User; all stores for Admin monitoring.
- GET /api/v1/stores/me: current regular User's active store; Admin receives 403.
- Product/category/analysis/action lists are scoped in SQL, including pagination
  counts and filters. User category lists contain only categories used by their
  products; global taxonomy remains shared metadata in the database.
- Direct foreign product/category/analysis/action IDs, nested analyses/actions,
  aliases and history return 404. POST/PATCH action guards verify the parent
  analysis, and assignees must be the active store owner.
- Product creation/import derives store_id server-side. Payload-supplied store_id,
  owner IDs and imported_by are rejected by validation; writes are User operations.
  Admin retains account/category administration and read-only cross-store monitoring;
  Admin product create/update/delete/import returns 403.
- User import validates each product and writes the whole batch transactionally.
- ML import tools target the explicitly configured user1 store. They run on
  explicit invocation. The synthetic development catalog generator has been removed.

## Release status and verification

- Applied to configured Neon: 227 products, 225 analyses, 255 work rows and 264
  history rows preserved. Fingerprints of existing domain rows are unchanged
  excluding the new products.store_id field. Migration rerun is a no-op.
- Real HTTP verification passed 55 requests before session cleanup: both User
  logins, Admin login, health/readiness, all scoped lists/pagination/search,
  detail/history/alias denial, foreign mutations, spoofed imports, invalid
  assignment and temporary User2 import/edit/delete. User2 ends empty again.
- New account auto-store provisioning was checked inside a rolled-back transaction.
- Actual browser login for both Users passed at local ports 3311/3312. Verified
  the store header, User1 catalog, User2 empty pages, analysis/suggestions and
  mobile menu. No mock API interception was used for these checks.
- Both production builds, typechecks, frontend lint and 15 backend unit tests
  passed. Migration 003_product_media exists on Neon but its source SQL was
  already absent locally; no applied migrations/checksums were edited.
- No commit, push or cloud deployment performed. Deployed old code still uses its
  previous shared queries until Render is updated. Deploy the backend changes
  first, verify scoped APIs, then deploy frontend. Existing remote imports/writes
  using old code may fail the new required store_id constraint until redeployed.

## Remaining scope

No store reassignment or multi-store switcher. No direct model serving added.
The database already contains import_batches/notifications; no HTTP routes expose
them in the current router. Any future routes must use persisted store ownership,
not importer/assignee metadata alone. Performance/large-import work remains separate.
