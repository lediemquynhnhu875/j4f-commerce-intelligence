# Offline ML import preparation — 2026-11-17

Owner: Mai, Codex-assisted. Continues the F002/F004 offline-import amendments;
no new task IDs or acceptance checkboxes. Source is the user-provided current
ZIP, without Git metadata, remote synchronization, credentials or a live database.
No commit, push, migration or Neon write was performed.

## Deliverable

- `backend/scripts/prepare-ml-import.py`: standard-library validator/exporter.
  Snapshot supplies frozen product attributes, seller and peer context; CSVs
  supply validated scoring and recommendation output. Text, scores, timestamps,
  versions and identifiers must agree before any output is created.
- `backend/scripts/import-ml-full.ts`: standalone TypeScript CLI; default read-only
  dry-run; explicit seller-to-existing-store mapping, reviewed-plan fingerprint
  for apply, transactional batched inserts and an analysis_runs ledger.
- `backend/scripts/list-import-stores.ts`: read-only current ownership inventory.
- `backend/tests/test_prepare_ml_import.py`: six rejection/provenance tests.

No route, runtime DTO, frontend, dependencies or applied migration changed.
The established one-store-per-User schema remains intact. No new empty user/store
is fabricated. Same-source products in another store stop the import; there is no
implicit transfer or duplication. Mapping selects source sellers; all unselected
products remain outside this import and are explicitly counted in the plan.
Source seller labels do not confer authorization.

## Persistence and preservation

The existing products, product_analyses, improvement_actions, action_history and
analysis_runs tables are reused. There is no DROP, UPDATE, DELETE or trigger
bypass in the new import. New product categories are left null; product_type is
saved on analyses and source metadata. Category management is a separate step.
Peer source IDs/statistics stay in comparison_json, not a million new relation rows.
This CLI does not implement a peer-detail API or expose cross-store customer data.

Source identity is tiki + source product ID. Existing products in the mapped store
are reused without replacing current attributes or photos. Existing same-version,
same-scoring-time analyses are reused only when source JSON SHA-256, status and
reason agree, and their original ML suggestions exactly match. Divergent or
ambiguous identities stop. Existing action decisions and histories are untouched.
Manifest records reused analysis IDs because they retain their original run_id.
New analyses retain source scoring time and snapshot, independent of current
product edits. The new run records import time separately.

Eligibility stays false, needs_review true, quality acceptance false; prediction
origin remains unavailable rather than inferring it from a model name. The one
invalid model input and five ambiguous raw-source selections retain their flags.
Do not interpret this ingestion as independent validation of the ML pipeline.

## Executed evidence

- Full uploaded snapshot validated: 41,576 unique products, 42,652 unique actions,
  3,807 source seller values, 1,017,948 peer links, zero missing peer IDs.
- Snapshot and CSV ID sets, statuses, numerical scoring fields, timestamps,
  versions and original recommendation text agree. Prepared bundle SHA-256:
  bd9f9ec6ff0f4f0325ba25439e268fc9fcbaf742cbb073cd0a36b0195f483ac9.
- Full exporter completed; 1 invalid model input and 5 ambiguous raw selections
  retained, 0 assigned store IDs, 0 source image URLs.
- Six Python tests passed, backend TypeScript noEmit passed, all 18 existing
  backend tests passed with `node --import tsx --test`.
- npm test initially hit an environment restriction creating tsx's IPC socket;
  invoking the same tests through Node's tsx import hook succeeded.
- SQL-path checks used isolated PGlite PostgreSQL/WASM databases with the actual
  001, 002 and 004 SQL, a synthetic User/store and three source records/four
  suggestions. Only the CLI's database adapter was substituted for PGlite;
  input validation, planning and SQL were executed. Verified read-only dry-run,
  stale fingerprint rejection, apply, zero-insert reruns, preservation of a human
  accepted decision, cross-store conflict and altered-bundle rejection.
- Injected failure on analysis insertion after product insertion rolled back both
  products and run ledger; the plan after rollback matched the original plan.

These are not real Neon/pg-driver, concurrent-request or full-scale database load
checks. The importer remains pending live dry-run, mapping review, small-store
apply/idempotency checks and storage/throughput measurement. Source-derived JSON
bundle is about 221 MiB; preserving evidence and peer context still costs space.
The full-bundle checksum is verified before database access; file preparation and
bundle reading do not require DATABASE_URL. The SQL CLI does require it.

## Next steps

Read existing store IDs/counts locally; review seller mapping with Mai. Start with
one small seller, inspect a dry-run and API/UI results, then expand. Mapping all
3,807 sellers to application stores is a product decision, not inferred by this
script. Large-scale server pagination/UI optimization, Admin import monitoring,
media fetching, deployment and complete WS1 acceptance remain outstanding.
