"""Merge fetched Tiki media URLs into products_full.json.

Streams the 252 MB snapshot product-by-product so memory stays bounded, adds
media fields only to products present in the media file, and leaves every
existing field untouched.
"""
import hashlib
import json
import sys
from datetime import datetime, timezone

MEDIA_KEYS = ("thumbnail_url", "image_urls", "video_url", "media_source")
NEW_KEYS = MEDIA_KEYS + ("image_url",)


def iter_products(text, start):
    """Yield (product, next_index) from a JSON array starting at `start`."""
    dec = json.JSONDecoder()
    i = start
    while text[i] in " \t\r\n":
        i += 1
    assert text[i] == "[", f"expected array at {i}, found {text[i]!r}"
    i += 1
    while True:
        while text[i] in " \t\r\n":
            i += 1
        if text[i] == "]":
            return
        obj, i = dec.raw_decode(text, i)
        yield obj
        while text[i] in " \t\r\n":
            i += 1
        if text[i] == ",":
            i += 1


def locate(text):
    dec = json.JSONDecoder()
    mi = text.index('"metadata":') + len('"metadata":')
    metadata, end = dec.raw_decode(text, mi)
    pi = text.index('"products":', end) + len('"products":')
    return metadata, pi


def fingerprint(product):
    """Stable hash of a product with the new media keys removed."""
    core = {k: v for k, v in product.items() if k not in NEW_KEYS}
    core["image_url"] = None  # original value for every product
    blob = json.dumps(core, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def main(snapshot_path, media_path, out_path):
    media = json.load(open(media_path, encoding="utf-8"))
    by_id = {r["source_product_id"]: r for r in media["records"]}
    print(f"media records: {len(by_id)}")

    print("reading snapshot ...")
    text = open(snapshot_path, encoding="utf-8").read()
    metadata, products_at = locate(text)
    print(f"snapshot metadata product_count: {metadata.get('product_count')}")

    now = datetime.now(timezone.utc).isoformat()
    metadata["media_merge"] = {
        "merged_at": now,
        "media_schema_version": media["metadata"]["schema_version"],
        "media_source": media["metadata"]["source"],
        "media_fetched_at": media["metadata"]["fetched_at"],
        "scope": "the 100 imported sample products only; all other products are unchanged and carry no media keys",
        "requested": media["metadata"]["requested"],
        "resolved": media["metadata"]["resolved"],
        "not_found": media["metadata"]["not_found"],
        "added_fields": {
            "image_url": "primary image URL, verified HTTP 200 at merge time; null when unresolved",
            "thumbnail_url": "Tiki CDN thumbnail URL",
            "image_urls": "ordered list of gallery image URL variants",
            "video_url": "product video URL; null when the product has none",
            "media_source": "provenance: live Tiki API response status and fetch time",
        },
        "limitations": [
            "The 2023 source CSVs contain no media URLs; these URLs come from the live Tiki API on 2026-10-17 and describe the listing as it exists today, not at snapshot time.",
            "Canonical snapshot fields has_video and image_count are unchanged; live image counts differ for 33 of 92 resolved products.",
            "8 of 100 sample products returned HTTP 404 and have no media.",
            "URLs point at an external CDN and are not archived locally; they may break at any time.",
            "8 of 92 resolved products expose Tiki's no-image placeholder as their gallery entry; their image_url falls back to the verified w1200 thumbnail variant and image_urls still holds the raw gallery response.",
        ],
    }

    stats = {"total": 0, "matched": 0, "with_image": 0, "with_video": 0, "not_found": 0}
    fingerprints = {}

    with open(out_path, "w", encoding="utf-8") as out:
        out.write('{"metadata":')
        json.dump(metadata, out, ensure_ascii=False, separators=(",", ":"))
        out.write(',"products":[')
        first = True
        for product in iter_products(text, products_at):
            stats["total"] += 1
            pid = str(product.get("source_product_id") or product.get("product_id"))
            fingerprints[pid] = fingerprint(product)
            rec = by_id.get(pid)
            if rec is not None:
                stats["matched"] += 1
                if rec.get("found"):
                    images = rec.get("images") or []
                    product["image_url"] = rec.get("primary_image_url")
                    product["thumbnail_url"] = rec.get("thumbnail_url")
                    product["image_urls"] = images
                    product["video_url"] = rec.get("video_url")
                    if product["image_url"]:
                        stats["with_image"] += 1
                    if product["video_url"]:
                        stats["with_video"] += 1
                else:
                    stats["not_found"] += 1
                    product["thumbnail_url"] = None
                    product["image_urls"] = []
                    product["video_url"] = None
                product["media_source"] = {
                    "source": "tiki_api_v2",
                    "fetched_at": rec.get("fetched_at"),
                    "http_status": rec.get("http_status"),
                    "resolved": bool(rec.get("found")),
                    "api_image_count": rec.get("image_url_count"),
                    "product_url": rec.get("product_url"),
                    "primary_image_http_status": rec.get("primary_image_http_status"),
                    "gallery_is_placeholder": rec.get("gallery_is_placeholder"),
                }
            if not first:
                out.write(",")
            first = False
            json.dump(product, out, ensure_ascii=False, separators=(",", ":"))
            if stats["total"] % 10000 == 0:
                print(f"  {stats['total']} products ...")
        out.write("]}")

    print(json.dumps(stats, indent=2))
    json.dump(fingerprints, open(out_path + ".fingerprints.json", "w"), separators=(",", ":"))
    return stats


if __name__ == "__main__":
    main(*sys.argv[1:4])
