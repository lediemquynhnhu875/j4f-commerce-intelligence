"""Score a taxonomy config against the blind v2-schema relabel of the locked holdout.

    python3 -m ml.src.evaluation.holdout_relabel --taxonomy ml/config/taxonomy_v3.yml

Labels come from the `Gan nhan` sheet of the relabel workbook. Only aggregate metrics are written;
do not tune rules from row-level holdout errors.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import pandas as pd
import yaml

from ml.src.taxonomy.rules import assign_product_types

WORKBOOK = Path("data/local_reviews/taxonomy_holdout_v2_relabel/taxonomy_holdout_relabel_v2.xlsx")


def score(taxonomy: Path, workbook: Path, products: Path, guide: Path) -> dict:
    labels = pd.read_excel(workbook, sheet_name="Gan nhan", dtype=str).fillna("")
    valid = set(yaml.safe_load(guide.read_text(encoding="utf-8"))["labels"])
    labels["human"] = labels["human_product_type_v2"].str.strip()
    missing = int(labels["human"].eq("").sum())
    invalid = sorted(set(labels.loc[labels["human"].ne("") & ~labels["human"].isin(valid), "human"]))
    if missing or invalid:
        raise ValueError(f"{missing} rows unlabelled; invalid labels: {invalid}")
    catalog = pd.read_csv(products, dtype=str)
    rows = catalog[catalog["product_id"].isin(labels["product_id"])]
    rows = rows[["product_id", "product_name", "description", "category_raw", "source_file"]]
    predicted = assign_product_types(rows, taxonomy)[["product_id", "product_type", "taxonomy_source"]]
    merged = labels.merge(predicted, on="product_id", how="left", validate="one_to_one")
    correct = merged["product_type"].eq(merged["human"])
    return {
        "taxonomy": str(taxonomy),
        "taxonomy_sha256": hashlib.sha256(taxonomy.read_bytes()).hexdigest(),
        "workbook_sha256": hashlib.sha256(workbook.read_bytes()).hexdigest(),
        "rows": int(len(merged)),
        "accuracy": round(float(correct.mean()), 4),
        "correct": int(correct.sum()),
        "gate": 0.85,
        "gate_passed": bool(correct.mean() >= 0.85),
        "by_source": {
            str(source): {"rows": int(len(group)), "accuracy": round(float(group.eq(True).mean()), 3)}
            for source, group in correct.groupby(merged["taxonomy_source"])
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--taxonomy", type=Path, default=Path("ml/config/taxonomy_v3.yml"))
    parser.add_argument("--workbook", type=Path, default=WORKBOOK)
    parser.add_argument("--products", type=Path, default=Path("data/processed/taxonomy_v2_run/clean_products.csv"))
    parser.add_argument("--guide", type=Path, default=Path("ml/config/taxonomy_label_guide_v3.yml"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = score(args.taxonomy, args.workbook, args.products, args.guide)
    text = json.dumps(result, ensure_ascii=False, indent=2)
    print(text)
    if args.output:
        args.output.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
