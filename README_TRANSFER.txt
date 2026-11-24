SELLENS: transfer legacy source products to their source seller stores

Extract into project root. Keep the current files:
  tmp/seller-provision/store-mapping-all.json
  tmp/seller-provision/pending-transfers.json

From backend run preview:
  node --import tsx scripts/transfer-seller-products.mjs
Send terminal summary for review. It writes local snapshots, no DB writes.

Apply only the current reviewed fingerprint:
  node --import tsx scripts/transfer-seller-products.mjs --apply --confirm HASH
Close/stop concurrent test, import and editing activity during apply.

Apply uses one transaction and exclusive locks on affected domain tables.
Only the products ownership trigger is disabled inside this locked transaction;
it is restored and verified before commit. Any failed DB step rolls back both
row changes and trigger changes. The CLI DB user must own the products table.
No permanent trigger exception, HTTP bypass, or migration is installed.

Products keep their IDs and all fields except store_id. Analyses are unchanged.
Old action history is unchanged. Status, decision reasons and original ML
suggestions are preserved. Non-null assignees that do not own the target shop
are reassigned to its active owner with a new action-history event. Null
assignees stay null. The preview counts these reassignments explicitly.

The complete affected-row snapshot is saved before writes under:
  tmp/seller-transfer/snapshot-HASH.json
It contains business data and user IDs, no password/session columns. Keep it
locally as an audit backup. Existing full database backups remain useful.

A rerun recognizes products already at their target store and does not move
them again. Unexpected ownership, unknown sellers, duplicate identities,
inactive owners, missing triggers or stale fingerprints stop the operation.

Validation performed: syntax + 7 source/plan checks with the supplied 254
transfers and full source dataset. No live PostgreSQL execution was performed
when packaging. Run dry-run locally before any apply.

After a successful transfer, dry-run the existing ML importer:
  node --import tsx scripts/import-ml-full.ts --mapping ../tmp/seller-provision/store-mapping-all.json
Do not apply full import until its counts have been checked.
