"""Export the complete scored snapshot as strict JSON, without rerunning ML."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import tempfile

from ml.src.scoring.status import STATUS_LABELS_VI

TEXT_FIELDS = set("""product_id product_name seller_id brand category_raw product_type
status status_label_vi status_reason status_explanation_vi analysis_limitations_vi
scoring_rules_version model_version scored_at description fulfillment_type
date_created_raw source_file data_quality_issue taxonomy_match taxonomy_source
taxonomy_version peer_quality_reason""".split())
BOOL_FIELDS = set("analysis_is_hypothesis insufficient_data peer_insufficient_data has_video valid_for_model".split())
JSON_FIELDS = {"peer_ids": list, "evidence": list, "recommendations": list, "peer_config": dict}
INT_FIELDS = set("""quantity_sold observed_sales peer_count review_count image_count
name_length description_length baseline_peer_count good_peer_count good_peer_video_known_count""".split())


def digest(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def read_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def convert(field: str, value: str):
    if value == "":
        return None
    if field in JSON_FIELDS:
        parsed = json.loads(value, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
        if not isinstance(parsed, JSON_FIELDS[field]):
            raise ValueError(f"Invalid JSON type for {field}")
        return [str(item) for item in parsed] if field == "peer_ids" else parsed
    if field in TEXT_FIELDS:
        return value
    if field in BOOL_FIELDS:
        if value.lower() not in {"true", "false"}:
            raise ValueError(f"Invalid boolean for {field}: {value}")
        return value.lower() == "true"
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"Nonfinite {field}")
    if field in INT_FIELDS:
        if not number.is_integer():
            raise ValueError(f"Noninteger {field}")
        return int(number)
    return number


def export_web(scores: Path, clean: Path, raw_dir: Path, summary_path: Path, output: Path) -> dict:
    if output.exists():
        raise FileExistsError(f"Preserve the completed export; choose a new path: {output}")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    clean_rows = read_rows(clean)
    clean_by_id = {row["product_id"]: row for row in clean_rows}
    if len(clean_by_id) != len(clean_rows) or "" in clean_by_id:
        raise ValueError("Clean product IDs must be unique and nonblank")
    raw_paths = sorted(raw_dir.glob("*.csv"))
    if not raw_paths:
        raise ValueError("Original source CSVs are required for complete attributes")
    raw_by_id = defaultdict(list)
    for path in raw_paths:
        for number, row in enumerate(read_rows(path), start=2):
            source_id = row.get("id", row.get("product_id"))
            if not source_id:
                raise ValueError(f"Missing source ID in {path}:{number}")
            raw_by_id[source_id].append({
                "source_file": path.name, "csv_record_number": number,
                "attributes": {key: value if value != "" else None for key, value in row.items()
                               if key and not key.lower().startswith("unnamed")},
            })
    inputs = [scores, clean, summary_path, *raw_paths]
    hashes = {str(path): digest(path) for path in inputs}
    metadata = {
        "schema_version": "j4f-web-snapshot-v1", "exported_at": datetime.now(timezone.utc).isoformat(),
        "product_count": len(clean_rows), "scoring_summary": summary,
        "source_sha256": hashes, "source_captured_at": None, "observed_sales_window": None,
        "quality_acceptance": summary["quality_acceptance"],
        "source_taxonomy_holdout_accuracy": summary["source_taxonomy_holdout_accuracy"],
        "status_labels_vi": STATUS_LABELS_VI,
        "field_notes": {
            "product_id": "Source identifier, not a persisted StoreProduct ID.",
            "store_id": "Unassigned; Admin must explicitly map stores before publication.",
            "raw_source_records": "All source variants, including duplicates; original nonblank cell values are strings.",
            "selected_raw_source_index": "Zero-based source-file match if variants are identical; null when original row selection is ambiguous. See candidate_raw_source_indices.",
            "image_url": "Unavailable in source; only image_count is supplied.",
            "product_status": "Alias of status; six stable analytics statuses, not processing state.",
            "product_recommendations": "Alias of recommendations; immutable hypotheses, not user action history.",
            "model_b": "Fields suffixed _model_b are comparison-only; guarded Model A fields remain authoritative.",
        },
    }
    seen = set()
    statuses = Counter({key: 0 for key in STATUS_LABELS_VI})
    action_count = 0
    products_with_actions = 0
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent,
                                         suffix=".tmp", delete=False) as target:
            temp_path = Path(target.name)
            target.write('{"metadata":')
            json.dump(metadata, target, ensure_ascii=False, allow_nan=False)
            target.write(',"products":[')
            with scores.open(encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    product = {key: convert(key, value) for key, value in row.items()}
                    pid = product["product_id"]
                    if not pid or pid in seen or pid not in clean_by_id or pid not in raw_by_id:
                        raise ValueError(f"Duplicate, blank or unmatched product: {pid}")
                    if product["status"] not in STATUS_LABELS_VI:
                        raise ValueError(f"Unknown status for {pid}")
                    for key, value in clean_by_id[pid].items():
                        if product.get(key) != convert(key, value):
                            raise ValueError(f"Clean/scoring mismatch: {pid}/{key}")
                    raw_records = raw_by_id[pid]
                    candidates = [i for i, record in enumerate(raw_records)
                                  if record["source_file"] == product["source_file"]]
                    if not candidates:
                        raise ValueError(f"Missing selected source file: {pid}")
                    selected = candidates[0] if len({json.dumps(raw_records[i]["attributes"], sort_keys=True)
                                                     for i in candidates}) == 1 else None
                    recs = product["recommendations"]
                    if not isinstance(recs, list) or not isinstance(product["evidence"], list):
                        raise ValueError(f"Missing analysis arrays for {pid}")
                    if any(not {"rule_id", "evidence", "hypothesis", "action", "validation_needed"} <= rec.keys()
                           for rec in recs):
                        raise ValueError(f"Incomplete recommendation for {pid}")
                    product.update({"source_product_id": pid, "store_id": None,
                                    "source_captured_at": None, "image_url": None,
                                    "product_status": product["status"], "product_recommendations": recs,
                                    "recommendation_count": len(recs), "raw_source_records": raw_records,
                                    "selected_raw_source_index": selected,
                                    "candidate_raw_source_indices": candidates})
                    if seen:
                        target.write(",\n")
                    json.dump(product, target, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
                    seen.add(pid)
                    statuses[product["status"]] += 1
                    action_count += len(recs)
                    products_with_actions += bool(recs)
            target.write("]}\n")
        if seen != set(clean_by_id) or len(seen) != summary["rows"]:
            raise ValueError("Export does not cover every clean/scored product")
        if dict(statuses) != summary["status_counts"] or action_count != summary["recommendation_count"]:
            raise ValueError("Export totals disagree with scoring report")
        if products_with_actions != summary["products_with_recommendations"]:
            raise ValueError("Recommendation product count mismatch")
        for path in inputs:
            if digest(path) != hashes[str(path)]:
                raise ValueError(f"Input changed during export: {path}")
        temp_path.rename(output)
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()
    return {"output": str(output), "products": len(seen), "recommendations": action_count,
            "status_counts": dict(statuses), "bytes": output.stat().st_size, "sha256": digest(output)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scores", type=Path, default=Path("data/processed/scoring_mvp_v2/product_scores.csv"))
    parser.add_argument("--clean", type=Path, default=Path("data/processed/taxonomy_v2_run/clean_products.csv"))
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--summary", type=Path, default=Path("ml/reports/metrics/scoring_mvp_v2.json"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/web_integration/products_full.json"))
    args = parser.parse_args()
    print(json.dumps(export_web(args.scores, args.clean, args.raw_dir, args.summary, args.output), indent=2))


if __name__ == "__main__":
    main()
