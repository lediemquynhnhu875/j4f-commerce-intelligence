SELLENS - Seller account/store provisioning

Extract into the project root. From backend run:
  node --import tsx scripts/provision-seller-stores.mjs

Default is read-only DB dry-run. Send the terminal summary and
  tmp/seller-provision/plan.json
for review. Do not send credentials.

Expected with the audited database: 3,807 sellers; 2 stores reused;
3,805 accounts/stores to create; 254 existing source products pending transfer.

Apply syntax, only after reviewing the current dry-run:
  node --import tsx scripts/provision-seller-stores.mjs --apply --confirm HASH

Apply creates accounts and stores only. Each account uses a deterministic
internal email and a random password. Existing passwords are preserved.
The credential file backend/.env.seller-accounts.json is written before DB
inserts, contains secrets, and must stay local. Ensure .env* is ignored by Git.
Do not upload it. Keep a secure backup; it is not recreated for reused accounts.
Account creation is transactional; preparation may take several minutes.

Outputs: tmp/seller-provision/store-mapping-all.json and pending-transfers.json.
Do not run the full ML import yet: pending legacy ownership transfers must be
resolved first. No triggers are disabled and no products/history are changed.
Existing stores/account display names are not renamed in this step.
If DB commit succeeds but saving output fails, rerun dry-run and apply with
its new fingerprint to regenerate mappings without resetting passwords.

Local validation: syntax check + five planning tests, including full source
bundle and duplicate/collision checks. Live Neon execution requires your
local .env. No live database execution was performed when packaging.
