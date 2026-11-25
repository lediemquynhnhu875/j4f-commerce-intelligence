Extract into project root. Commands run from backend.

CATEGORY: all source products/all mapped shops
node --import tsx scripts/fill-all-categories.mjs
Review the dry-run then apply with its exact fingerprint:
node --import tsx scripts/fill-all-categories.mjs --apply --confirm HASH
Rerun without options to verify fill_missing_categories is zero.
Only null category_id is filled. Existing categories are preserved. Exact
source seller/store ownership and raw source file checksum are verified.
Categories are display metadata; historical ML analyses are not changed.
The source contains 16,595 Root/blank labels; unresolved products remain
unclassified until a separately reviewed taxonomy mapping is available.
Existing non-null categories can reduce the remaining unresolved DB count.
Plans are saved under tmp/all-categories. DB writes commit in one transaction.

MEDIA: missing image URLs across all mapped shops
Preview a small sample, no DB writes:
node --import tsx scripts/fetch-all-thumbnails.mjs --limit 30
Apply the first bounded batch:
node --import tsx scripts/fetch-all-thumbnails.mjs --limit 200 --apply
Repeat that command for additional batches. Maximum limit is 1000 per run.

Rows commit independently: an interrupted run keeps earlier saved URLs.
Checkpoint: tmp/all-media/checkpoint.json (retain for resumability).
404 entries are skipped on future batches. Temporary failures cool down
for 24 hours. Non-null URLs are never replaced. Dry-run does not update
checkpoint state. Preview/apply can see different live listing results.
The runner stops on HTTP 403/429; retry later rather than repeatedly calling.
Only HTTPS images on tikicdn.com or its subdomains are accepted. HTTP product
identity is checked against source ID. No fake images are generated.
Existing image URLs are not revalidated. This stores remote URLs only;
downloading durable copies remains a separate deliverable.
Live listing images are display media, not snapshot ML features.

Run one media runner at a time. A local runner.lock prevents concurrency.
After a hard kill, verify no media runner is active before deleting only
  tmp/all-media/runner.lock
Do not delete checkpoint.json just to retry transient failures.
No retry limit override or anti-bot bypass is included.

Validation performed: syntax checks for both scripts; seven CDN URL safety
cases; all 41,576 source records inspected for category availability.
Live database and network execution require the user's local environment.
