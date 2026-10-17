"""Verify the merged snapshot: every pre-existing field must be byte-identical
in meaning to the original, and the media fields must land only where intended."""
import json
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from merge_media import fingerprint, iter_products, locate  # noqa: E402

merged_path, fp_path, media_path = sys.argv[1:4]
expected = json.load(open(fp_path))
media = json.load(open(media_path, encoding="utf-8"))
sample_ids = {r["source_product_id"] for r in media["records"]}
resolved_ids = {r["source_product_id"] for r in media["records"] if r["found"]}

text = open(merged_path, encoding="utf-8").read()
metadata, at = locate(text)

failures = []
seen = set()
counts = {"total": 0, "media_keys": 0, "image_url": 0, "video_url": 0, "thumbnail": 0}
for p in iter_products(text, at):
    counts["total"] += 1
    pid = str(p.get("source_product_id") or p.get("product_id"))
    if pid in seen:
        failures.append(f"duplicate id {pid}")
    seen.add(pid)

    if fingerprint(p) != expected.get(pid):
        failures.append(f"pre-existing fields changed for {pid}")

    has_media = "media_source" in p
    if has_media:
        counts["media_keys"] += 1
        if pid not in sample_ids:
            failures.append(f"media added to non-sample product {pid}")
        if p.get("image_url"):
            counts["image_url"] += 1
        if p.get("video_url"):
            counts["video_url"] += 1
        if p.get("thumbnail_url"):
            counts["thumbnail"] += 1
        if pid in resolved_ids and not p.get("image_url"):
            failures.append(f"resolved product {pid} has no image_url")
        if pid not in resolved_ids and p.get("image_url"):
            failures.append(f"unresolved product {pid} has an image_url")
    else:
        if pid in sample_ids:
            failures.append(f"sample product {pid} missing media keys")
        if p.get("image_url") is not None:
            failures.append(f"non-sample product {pid} has non-null image_url")

print(json.dumps(counts, indent=2))
print("metadata product_count:", metadata["product_count"])
print("unique ids:", len(seen))
print("media_merge block present:", "media_merge" in metadata)
if counts["total"] != metadata["product_count"]:
    failures.append("product_count mismatch")
if len(seen) != counts["total"]:
    failures.append("ids not unique")
if failures:
    print(f"\nFAILED ({len(failures)}):")
    for f in failures[:20]:
        print(" -", f)
    sys.exit(1)
print("\nALL CHECKS PASSED")
