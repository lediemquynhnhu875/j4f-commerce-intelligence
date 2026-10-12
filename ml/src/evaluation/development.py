from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yaml

from ml.src.evaluation.review_queues import _balanced_sample
from ml.src.taxonomy.rules import assign_product_types


ANNOTATIONS = [
    "human_product_type", "review_confidence", "reviewer", "review_note",
    "rule_keyword_suggestion", "second_product_type", "second_reviewer",
    "final_product_type",
]


def merge_development_annotations(output_dir: Path, reviewed_path: Path) -> dict:
    destination = output_dir / "taxonomy_development_round_3.csv"
    if destination.resolve() == reviewed_path.resolve():
        raise ValueError("Reviewed subset must be a different file from the main queue")
    main = pd.read_csv(destination, dtype=str).fillna("")
    subset = pd.read_csv(reviewed_path, dtype=str).fillna("")
    if main.product_id.duplicated().any() or subset.product_id.duplicated().any():
        raise ValueError("Review files must have unique product IDs")
    main = main.set_index("product_id", drop=False)
    subset = subset.set_index("product_id", drop=False)
    if not set(subset.index) <= set(main.index):
        raise ValueError("Reviewed subset contains IDs outside the frozen queue")
    manifest = json.loads((output_dir / "queue_manifest.json").read_text(encoding="utf-8"))
    identity_columns = manifest["queue_identity_columns"]
    if not subset[identity_columns].equals(main.loc[subset.index, identity_columns]):
        raise ValueError("Product details in the reviewed subset differ from the frozen queue")
    labels = set(pd.read_csv(output_dir / "taxonomy_label_set_round_3.csv", dtype=str).product_type)
    changes = 0
    for column in ANNOTATIONS:
        if column not in subset:
            continue
        incoming = subset[column].str.strip()
        if column in {"human_product_type", "second_product_type", "final_product_type"}:
            invalid = incoming.ne("") & ~incoming.isin(labels)
            if invalid.any():
                raise ValueError(f"Invalid labels in {column}: {incoming[invalid].to_dict()}")
        current = main.loc[subset.index, column].str.strip()
        conflicts = incoming.ne("") & current.ne("") & incoming.ne(current)
        if conflicts.any():
            raise ValueError(f"Conflicting annotations in {column}: {incoming[conflicts].index.tolist()}")
        update = incoming.ne("") & current.eq("")
        main.loc[incoming[update].index, column] = incoming[update]
        changes += int(update.sum())
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    if changes:
        shutil.copy2(destination, output_dir / f"taxonomy_development_round_3.before_merge_{timestamp}.csv")
        main.reset_index(drop=True).to_csv(destination, index=False, encoding="utf-8-sig")
    pending = main.loc[main.human_product_type.str.strip().eq("")]
    pending.to_csv(output_dir / "taxonomy_pending_review.csv", index=False, encoding="utf-8-sig")
    supplied = main.loc[main.human_product_type.str.strip().ne("")]
    summary = {
        "merged_at": datetime.now(timezone.utc).isoformat(), "source_file": str(reviewed_path),
        "updated_annotation_cells": changes, "rows": len(main),
        "human_labelled_rows": len(supplied), "pending_label_rows": len(pending),
        "ambiguous_label_rows": int(supplied.human_product_type.eq("ambiguous").sum()),
        "frozen_prediction_matches_supplied_labels": int(supplied.product_type.eq(supplied.human_product_type).sum()),
        "interpretation": "Partial AI-assisted development annotation; label agreement is not independent accuracy or a completed human-review gate.",
    }
    (output_dir / "annotation_merge_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return summary


def create_development_queue(
    processed_dir: Path,
    output_dir: Path,
    taxonomy_path: Path,
    guide_path: Path,
    random_state: int = 20261011,
    fallback_size: int = 200,
    category_size: int = 150,
    conflict_size: int = 50,
) -> dict:
    review_path = output_dir / "taxonomy_development_round_3.csv"
    if review_path.exists():
        raise ValueError(f"Queue already exists; preserve annotations and use a new output directory: {review_path}")
    holdout_path = processed_dir / "review_queues/taxonomy_holdout_review.csv"
    if not holdout_path.exists():
        raise FileNotFoundError(f"Locked holdout IDs are required for exclusion: {holdout_path}")
    products_path = processed_dir / "clean_products.csv"
    products = pd.read_csv(products_path, dtype={"product_id": str}, low_memory=False)
    if products["product_id"].isna().any() or products["product_id"].duplicated().any():
        raise ValueError("Clean product IDs must be present and unique")
    config = yaml.safe_load(taxonomy_path.read_text(encoding="utf-8"))
    labels = {rule["label"] for rule in config["product_types"]}
    labels.update(config.get("source_fallbacks", {}).values())
    guide = yaml.safe_load(guide_path.read_text(encoding="utf-8"))["labels"]
    if set(guide) != labels:
        raise ValueError(f"Label guide and taxonomy differ: {set(guide) ^ labels}")

    excluded = set()
    exclusion_files = []
    prior_paths = [
        processed_dir / "taxonomy_review_sample.csv",
        processed_dir / "taxonomy_sample_reviewed.csv",
        processed_dir / "taxonomy_review_comparison.csv",
        holdout_path,
        processed_dir / "review_queues/taxonomy_fallback_review.csv",
        processed_dir / "review_queues/peer_pairs_review.csv",
    ]
    for path in prior_paths:
        if not path.exists():
            continue
        previous = pd.read_csv(path, dtype=str, usecols=lambda c: c in {
            "product_id", "target_product_id", "peer_product_id"
        })
        for column in previous:
            excluded.update(previous[column].dropna())
        exclusion_files.append(str(path))
    candidates = products.loc[~products["product_id"].isin(excluded)].copy()
    if "valid_for_model" in candidates:
        valid = candidates["valid_for_model"].astype(str).str.lower().isin({"true", "1"})
        candidates = candidates.loc[valid].copy()

    name_input = candidates.copy()
    name_input[["category_raw", "description", "source_file"]] = ""
    category_input = candidates.copy()
    category_input[["product_name", "description", "source_file"]] = ""
    name_labels = assign_product_types(name_input, taxonomy_path)["product_type"]
    category_labels = assign_product_types(category_input, taxonomy_path)["product_type"]
    candidates["name_only_product_type"] = name_labels
    candidates["category_only_product_type"] = category_labels
    conflict_mask = name_labels.ne("unknown") & category_labels.ne("unknown") & name_labels.ne(category_labels)

    # Reserve conflicting cases before sampling category-rule rows so quotas stay disjoint.
    conflict = _balanced_sample(candidates.loc[conflict_mask], conflict_size,
                                ["product_type", "source_file"], random_state)
    fallback = _balanced_sample(
        candidates.loc[candidates["taxonomy_source"].eq("source_fallback")
                       & ~candidates["product_id"].isin(conflict["product_id"])],
        fallback_size, ["product_type", "source_file"], random_state + 1,
    )
    category = _balanced_sample(
        candidates.loc[candidates["taxonomy_source"].eq("category_rule")
                       & ~candidates["product_id"].isin(conflict["product_id"])],
        category_size, ["product_type", "source_file"], random_state + 2,
    )
    pieces = []
    for frame, reason in [(fallback, "fallback"), (category, "category_rule"),
                          (conflict, "name_category_conflict")]:
        pieces.append(frame.assign(review_group=reason))
    selected = pd.concat(pieces, ignore_index=True).sample(frac=1, random_state=random_state)
    columns = ["product_id", "product_name", "description", "category_raw", "product_type",
               "taxonomy_source", "taxonomy_match", "source_file", "review_group",
               "name_only_product_type", "category_only_product_type"]
    review = selected[columns].reset_index(drop=True)
    review.insert(0, "review_order", range(1, len(review) + 1))
    for column in ANNOTATIONS:
        review[column] = ""
    if review["product_id"].duplicated().any() or set(review["product_id"]) & excluded:
        raise ValueError("Development queue overlaps excluded IDs or contains duplicates")
    output_dir.mkdir(parents=True, exist_ok=True)
    review.to_csv(review_path, index=False, encoding="utf-8-sig")
    pd.DataFrame([
        {"product_type": label, **guide[label]} for label in sorted(labels)
    ]).to_csv(output_dir / "taxonomy_label_set_round_3.csv", index=False, encoding="utf-8-sig")
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(), "purpose": "development_only",
        "random_state": random_state, "rows": len(review), "label_count": len(labels),
        "requested_counts": {"fallback": fallback_size, "category_rule": category_size,
                             "name_category_conflict": conflict_size},
        "selected_counts": review["review_group"].value_counts().to_dict(),
        "eligible_candidate_rows": len(candidates), "excluded_unique_ids": len(excluded),
        "exclusion_files": exclusion_files, "overlap_with_exclusions": 0,
        "products_file": str(products_path),
        "products_sha256": hashlib.sha256(products_path.read_bytes()).hexdigest(),
        "taxonomy_sha256": hashlib.sha256(taxonomy_path.read_bytes()).hexdigest(),
        "guide_sha256": hashlib.sha256(guide_path.read_bytes()).hexdigest(),
        "queue_sha256_at_creation": hashlib.sha256(review_path.read_bytes()).hexdigest(),
        "queue_identity_columns": [column for column in review if column not in ANNOTATIONS],
        "queue_identity_sha256": hashlib.sha256(
            review.drop(columns=ANNOTATIONS).to_csv(index=False).encode("utf-8")
        ).hexdigest(),
        "limitations": "Purposive balanced development sample; accuracy is not representative holdout accuracy. Conflicts are candidate disagreements, not confirmed errors.",
    }
    (output_dir / "queue_manifest.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return summary


def validate_development_review(output_dir: Path) -> dict:
    review = pd.read_csv(output_dir / "taxonomy_development_round_3.csv", dtype=str).fillna("")
    manifest = json.loads((output_dir / "queue_manifest.json").read_text(encoding="utf-8"))
    identity = review[manifest["queue_identity_columns"]].to_csv(index=False).encode("utf-8")
    if hashlib.sha256(identity).hexdigest() != manifest["queue_identity_sha256"]:
        raise ValueError("Queue identity changed: preserve row order, product details and frozen predictions; edit annotation columns only")
    if review["product_id"].duplicated().any():
        raise ValueError("Reviewed queue contains duplicated product IDs")
    labels = set(pd.read_csv(output_dir / "taxonomy_label_set_round_3.csv", dtype=str)["product_type"])
    for column in ANNOTATIONS:
        review[column] = review[column].str.strip()
    primary = review["human_product_type"]
    second = review["second_product_type"]
    final = review["final_product_type"]
    invalid = pd.Series(False, index=review.index)
    for column in ["human_product_type", "second_product_type", "final_product_type"]:
        invalid |= review[column].ne("") & ~review[column].isin(labels)
    invalid_confidence = review["review_confidence"].ne("") & ~review["review_confidence"].isin({"cao", "vua", "thap"})
    disagreement = primary.ne("") & second.ne("") & primary.ne(second)
    low_confidence = review["review_confidence"].eq("thap") | primary.eq("ambiguous")
    unresolved = (disagreement | (low_confidence & second.eq(""))) & final.eq("")
    expected = final.where(final.ne(""), primary)
    accepted = primary.isin(labels) & expected.isin(labels) & ~invalid & ~invalid_confidence & ~unresolved
    accepted &= review["review_confidence"].ne("") & review["reviewer"].ne("")
    accepted &= ~(second.ne("") & review["second_reviewer"].eq(""))
    accepted &= ~(final.ne("") & review["second_reviewer"].eq(""))
    correct = review["product_type"].eq(expected)
    metrics = {
        "purpose": "development_only", "rows": len(review),
        "labelled_rows": int(primary.ne("").sum()), "accepted_rows": int(accepted.sum()),
        "invalid_label_rows": int(invalid.sum()), "invalid_confidence_rows": int(invalid_confidence.sum()),
        "unresolved_rows": int(unresolved.sum()),
        "complete": bool(len(review) and accepted.all()),
        "frozen_prediction_accuracy_accepted": float(correct[accepted].mean()) if accepted.any() else None,
        "by_review_group": {
            str(group): {"rows": len(rows), "accepted_rows": int(accepted.loc[rows.index].sum())}
            for group, rows in review.groupby("review_group")
        },
        "interpretation": "Development review only; use labels to improve rules, not to claim holdout accuracy.",
    }
    errors = review.loc[accepted & ~correct].assign(expected_product_type=expected)
    errors.to_csv(output_dir / "taxonomy_development_errors.csv", index=False, encoding="utf-8-sig")
    (output_dir / "taxonomy_development_metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8"
    )
    return metrics
