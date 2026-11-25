# Two-store demo planner — 2026-11-17

Mai, Codex-assisted; user-authorized WS1/F002 store/demo continuation. No new task
IDs, acceptance checkboxes, commit, push, live connection or database mutation.
Source ZIP has no Git metadata. Native user screenshots verified the new overview
with256 products, action278's preserved created/accepted audit and the bounded
profile picker (20/256 choices) with frozen sales/reference data. These user
observations do not constitute a comprehensive permission/performance acceptance.

Added backend/scripts/plan-demo-stores.ts. It validates bundle schema/hash/counts
and unique source identities, streams source seller/status/recommendation/quality
counts, checks persisted source product IDs and proposes two collision-free demo
sellers. Existing empty active stores/owners are proposed first; missing account
slots are explicitly flagged rather than automatically provisioned. Any seller
with a source ID already anywhere in the database is excluded, preserving the
legacy mixed catalog and avoiding silent source duplication or ownership transfer.
The CLI opens a read-only repeatable-read transaction and never writes to DB.

Executed full uploaded-bundle check using isolated PGlite real001/002/004 schema,
one existing source product in store1 and one empty store2. Two source candidates
were found, first using empty store2, second requiring a new account. Assertions
verified20–60 products, at least3 states, zero overlaps/invalid/ambiguous inputs,
matching bundle counts and unchanged database product count after planning.
Backend TypeScript passed. Synthetic store IDs/candidates are not a live Neon plan;
the user must run against their own current database before choosing ownership.

Candidates are selected for demonstration variety, not unbiased model evaluation;
source quality_acceptance remains false. Provisioning, actual mapping, revised
HTTP checks, import dry-run/apply/idempotency and media remain next steps. The old
store HTTP script assumes User2 is empty and all products belong to User1; adapt
it to per-owner SQL counts and symmetric read/write isolation before populating
multiple shops and claiming those tests passed. No reset or reassignment permitted.
