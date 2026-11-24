Extract into project root. From backend:

1. Preview source-based category fill (no DB writes):
node --import tsx scripts/fill-demo-categories.mjs
Apply only the current preview fingerprint:
node --import tsx scripts/fill-demo-categories.mjs --apply --confirm HASH

Only null category_id in stores 2,9,2393 is filled. Source file SHA is checked.
Raw category labels are used as display categories. Root/blank labels remain
unresolved. Existing product categories and all ML analyses/history stay intact.
Original category groups such as Thoi Trang remain broad source labels.
The source seller named KHO GIA DUNG... also sells fashion/accessory products;
its shop name must not be used to invent homeware categories.
Local plans are saved under tmp/demo-categories.

2. Preview media retrieval for at most 30 demo products:
node --import tsx scripts/fetch-demo-thumbnails.ts
This makes network requests but does not change the database.
Optional all demo candidates (not the entire source catalog):
node --import tsx scripts/fetch-demo-thumbnails.ts --all-demo
Use --apply to retrieve again and fill missing URLs. Website listings can
change between preview and apply. Existing non-null URLs are never replaced.
Deleted listings and unsuccessful requests stay unresolved; no fake product
images are substituted. Live assets describe today's listing, not the snapshot.
Snapshot has_video/number_of_images features are not changed.
This step stores URLs only; downloading local image copies is a later step.

Validation during preparation: source structure and category/image availability
checked against the supplied source; category script passed node syntax check.
Network fetch and live PostgreSQL execution require the user's environment.
