Extract into project root, replacing backend/scripts/import-ml-full.ts.

Fix: analysis reuse identity now includes source_sha256 in addition to model,
pipeline and scoring time. An analysis from another source snapshot is kept
unchanged; a separate analysis and its own suggestions are inserted for the
current bundle. Human decisions and old action history remain on the old
analysis. No automatic decision/history copying between analysis versions.
Strict current-source status/reason and original suggestion checks remain.
No schema or HTTP behavior changes are included.

From backend:
node --import tsx scripts/import-ml-full.ts --mapping ../tmp/seller-provision/store-mapping-all.json

Dry-run default. Expected from the reported DB state:
selected_products 41576; insert.products 41209;
insert.analyses 41334; reused_analyses 242;
preserved_other_source_analyses 125.
Action insert count must be read from the new dry-run.
The database will have additional historical analysis versions; do not expect
one total historical analysis per source product.

Use only the new fingerprint for apply after reviewing the plan.
After apply, rerun dry-run: already-imported and all insert counts 0.

Validation: 7 identity-selection scenarios plus retained strict guard checks.
Live database and full TypeScript typechecking were not available during
packaging. The next dry-run verifies compatibility with the local database.
