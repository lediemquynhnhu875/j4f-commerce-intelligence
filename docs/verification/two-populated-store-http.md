# Ownership checks with two populated stores — 2026-11-17

Mai, Codex-assisted; user-authorized WS1 permission-test continuation before the
Gentlemen import. Actual user Neon dry-run selected56 products and98 suggestions,
planned56 product/analysis and98 action inserts into store2, no reuse. Apply is
still pending the user-local command. Store3's256 products are preserved.

Updated scripts/test-store-http.ts removes the invalid global-count/User2-empty
assumptions. Each account's collections are checked against scoped SQL totals and
association ID sets. New catalog/overview/workspace totals are checked too. Reads
and guarded edits are probed symmetrically. Source shared categories are correctly
readable when both stores use them; search checks per-owner SQL results rather
than assuming similar names cannot appear in the other store.

Default mode does not create/change/delete business records. Login/limiter/session
operations and logout remain. Cross-store product PATCH uses empty data; action
PATCH uses a deliberately stale timestamp. Both require404 before later validation
or concurrency rejection; if authorization regresses the probes fail without an
editable business write. Foreign assignee rejection is checked via the actual
read-only SQL helper, not by risking a new append-only action/history row.

--with-fixtures retains successful product import/CRUD and cross-user read/PATCH/
DELETE coverage using only uniquely named test products, then cleans those records.
The automatic one-store creation/rename uniqueness check is retained within a rolled-
back account transaction. Existing domain rows are fingerprinted before and after
(users/stores/categories/products/analyses/actions/history); row MD5s are aggregated
in ID order to avoid materializing all large JSON rows in one string. Concurrent
human edits/imports can correctly cause a mismatch; run while business data is idle.
Sessions/login-limit rows and identity sequence advances are outside that comparison.

Executed evidence: TypeScript passed;23 existing backend tests passed. The revised
CLI was exercised against the real centralized API handler, authentication/session
logic and actual services through in-process native Request/Response dispatch,
with a PGlite PostgreSQL/WASM pool adapter. Synthetic fixture contains two populated
User stores plus an unrelated third store, shared categories and similarly named
products. Both modes passed:86 requests (default),100 requests (temporary CRUD),
symmetric product/analysis/action coverage,2 SQL assignee rejections and identical
business-row fingerprints. No native HTTP server/real pg driver/Neon or real account
credentials were used in these executions. They do not establish live test success.

Run the CLI locally after user-approved import and inspect both_stores_populated,
per-owner counts and cross_store_directions. Comprehensive valid action-create,
fresh-version write, race and deployment checks remain additional acceptance work;
this scoped test must not be reported as complete RBAC certification. No production
route, schema, ownership rule, data or importer code changed. No commit/push/deploy.
