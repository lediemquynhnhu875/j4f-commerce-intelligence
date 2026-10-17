# 0007: Bounded real-ML sample in the shared catalog

Date: 2026-10-16 (Asia/Saigon). Owner: requesting contributor, Codex-assisted.
Status: directly authorized import; reviewers Mai/Huy/Nhung.

The user requests only 100 products, grouped by five product types with 20 each,
including saved analyses and recommendations. This supersedes deferred ML import
for this sample, not full-corpus import or pending multi-store ownership.

Use existing shared-catalog permissions. Groups: men's loafers, crossbody bags,
backpacks, men's wallets and hats. Select five products from each of four observed
statuses per type, ordered by numeric source ID, requiring positive price, valid
model input and unambiguous raw-row selection. This stratified UI test sample is
not a population estimate.

Migration 002 extends existing tables and adds analysis_runs. Explicit status
schema versions retain legacy statuses and permit six ML v2 statuses. Separate
image/video action types and immutable ML origin/rule IDs preserve recommendation
identity. Applied migration 001 and historical rows are unchanged. Store proposals
remain unapplied. Source IDs remain distinct from application IDs.

The importer validates selected rows and commits the run, categories, products,
analyses, suggestions and initial history in one transaction. An advisory lock
and run-key/checksum checks make exact reruns no-ops; changed input or inconsistent
previous counts stop without overwriting. Source files remain ignored.

Freeze original input, Model A results, peer statistics/IDs and recommendation
objects. Peer IDs refer to external source products; their full rows are not
imported. No model training, live inference or seller-derived ownership occurs.
Brand/source-category/product URL are not imported into product columns. Currency
is VND for this Tiki snapshot. Unknown source capture time/sales scope and absent
image URLs remain unknown/null. Results are experimental, needs_review=true and
is_eligible=false; import is not quality acceptance.

Live pages receive records through authenticated PostgreSQL APIs. The limited
sample retains current list loading; server-side UI pagination and larger-batch
performance work remain future work. Original feature acceptance remains pending.
