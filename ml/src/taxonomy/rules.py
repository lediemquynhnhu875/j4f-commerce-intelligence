from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import pandas as pd
import yaml


def _search_text(value: Any) -> str:
    text = unicodedata.normalize("NFC", "" if pd.isna(value) else str(value)).lower()
    return re.sub(r"\s+", " ", text).strip()


def load_taxonomy_rules(path: str | Path) -> list[dict[str, Any]]:
    with Path(path).open(encoding="utf-8") as stream:
        payload = yaml.safe_load(stream) or {}
    rules = payload.get("product_types", [])
    if not rules:
        raise ValueError("Taxonomy configuration has no product_types rules")
    for rule in rules:
        if not rule.get("label") or not rule.get("keywords"):
            raise ValueError(f"Invalid taxonomy rule: {rule}")
    return rules


def _load_taxonomy_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as stream:
        return yaml.safe_load(stream) or {}


def assign_product_types(
    products: pd.DataFrame,
    rules_path: str | Path,
) -> pd.DataFrame:
    result = products.copy()
    category_search = result["category_raw"].fillna("").map(_search_text)
    name_search = result["product_name"].fillna("").map(_search_text)
    description_search = result["description"].fillna("").map(_search_text)
    result["product_type"] = "unknown"
    result["taxonomy_match"] = ""
    result["taxonomy_source"] = "unmatched"

    taxonomy_config = _load_taxonomy_config(rules_path)
    rules = load_taxonomy_rules(rules_path)
    generic_categories = {
        _search_text(category) for category in taxonomy_config.get("generic_categories", [])
    }
    category_search = category_search.mask(category_search.isin(generic_categories), "")

    # Reliable raw categories take precedence over product names. This prevents gift phrases
    # such as "tặng lót giày" from overriding a category like "Giày lười vải nam".
    for source_name, search_values in (("category_rule", category_search), ("name_rule", name_search)):
        for rule in rules:
            available = result["product_type"].eq("unknown")
            escaped = [re.escape(_search_text(keyword)) for keyword in rule["keywords"]]
            pattern = r"(?:^|\W)(?:" + "|".join(escaped) + r")(?:$|\W)"
            matched = available & search_values.str.contains(pattern, regex=True, na=False)
            if matched.any():
                result.loc[matched, "product_type"] = rule["label"]
                result.loc[matched, "taxonomy_match"] = search_values[matched].str.extract(
                    f"({pattern})", expand=False
                ).fillna("")
                result.loc[matched, "taxonomy_source"] = source_name

    for rule in rules:
        description_keywords = rule.get("description_keywords", [])
        if not description_keywords:
            continue
        available = result["product_type"].eq("unknown")
        description_pattern = r"(?:^|\W)(?:" + "|".join(
            re.escape(_search_text(keyword)) for keyword in description_keywords
        ) + r")(?:$|\W)"
        matched_description = available & description_search.str.contains(
            description_pattern, regex=True, na=False
        )
        result.loc[matched_description, "product_type"] = rule["label"]
        result.loc[matched_description, "taxonomy_match"] = description_search[
            matched_description
        ].str.extract(f"({description_pattern})", expand=False).fillna("")
        result.loc[matched_description, "taxonomy_source"] = "description_rule"

    source_key = (
        result["source_file"]
        .str.replace("vietnamese_tiki_products_", "", regex=False)
        .str.replace(".csv", "", regex=False)
    )
    for source_fragment, fallback_label in taxonomy_config.get("source_fallbacks", {}).items():
        available = result["product_type"].eq("unknown")
        matched_source = available & source_key.eq(source_fragment)
        result.loc[matched_source, "product_type"] = fallback_label
        result.loc[matched_source, "taxonomy_match"] = source_fragment
        result.loc[matched_source, "taxonomy_source"] = "source_fallback"
    return result


def create_review_sample(
    products: pd.DataFrame,
    output_path: str | Path,
    sample_size: int = 200,
    random_state: int = 42,
) -> pd.DataFrame:
    output = Path(output_path)
    existing: pd.DataFrame | None = None
    if output.exists():
        existing = pd.read_csv(output, dtype=str).fillna("")
    if products.empty:
        sample = products.copy()
    else:
        per_label = max(1, sample_size // max(1, products["product_type"].nunique()))
        sampled = pd.concat(
            [
                group.sample(min(len(group), per_label), random_state=random_state)
                for _, group in products.groupby("product_type", sort=False)
            ],
            ignore_index=True,
        )
        remaining = products.loc[~products["product_id"].isin(sampled["product_id"])]
        extra_count = min(max(0, sample_size - len(sampled)), len(remaining))
        extra = remaining.sample(extra_count, random_state=random_state) if extra_count else remaining.head(0)
        sample = pd.concat([sampled, extra], ignore_index=True).head(sample_size)

    columns = [
        "product_id", "product_name", "description", "category_raw", "product_type",
        "taxonomy_match", "taxonomy_source",
    ]
    sample = sample[[column for column in columns if column in sample.columns]].copy()
    sample["is_correct"] = ""
    sample["corrected_product_type"] = ""
    sample["review_note"] = ""
    if existing is not None and "product_id" in existing and "product_type" in existing:
        annotation_columns = ["product_id", "product_type", "is_correct", "corrected_product_type", "review_note"]
        previous = existing[[column for column in annotation_columns if column in existing]].copy()
        previous = previous.rename(columns={
            "product_type": "previous_product_type",
            "is_correct": "previous_is_correct",
            "corrected_product_type": "previous_corrected_product_type",
            "review_note": "previous_review_note",
        })
        sample = sample.merge(previous, on="product_id", how="left", validate="one_to_one")
        unchanged = sample["product_type"].eq(sample["previous_product_type"])
        for column in ("is_correct", "corrected_product_type", "review_note"):
            previous_column = f"previous_{column}"
            if previous_column in sample:
                sample.loc[unchanged, column] = sample.loc[unchanged, previous_column].fillna("")
        sample = sample.drop(
            columns=[column for column in sample.columns if column.startswith("previous_")]
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    sample.to_csv(output, index=False)
    return sample


def evaluate_review_sample(path: str | Path) -> dict[str, Any]:
    review = pd.read_csv(path, dtype=str).fillna("")
    normalized = review["is_correct"].str.strip().str.lower()
    reviewed_mask = normalized.isin({"true", "false", "1", "0", "yes", "no", "đúng", "sai"})
    correct_mask = normalized.isin({"true", "1", "yes", "đúng"})
    reviewed = int(reviewed_mask.sum())
    assigned = int(review["product_type"].ne("unknown").sum())
    metrics = {
        "sample_rows": int(len(review)),
        "reviewed_rows": reviewed,
        "assigned_rows": assigned,
        "coverage": float(assigned / len(review)) if len(review) else 0.0,
        "accuracy": float(correct_mask[reviewed_mask].mean()) if reviewed else 0.0,
    }
    if "taxonomy_source" in review:
        source_metrics: dict[str, dict[str, float | int]] = {}
        for source, source_index in review.groupby("taxonomy_source").groups.items():
            source_reviewed = reviewed_mask.loc[source_index]
            count = int(source_reviewed.sum())
            source_metrics[str(source)] = {
                "sample_rows": int(len(source_index)),
                "reviewed_rows": count,
                "accuracy": float(correct_mask.loc[source_index][source_reviewed].mean())
                if count
                else 0.0,
            }
        metrics["by_taxonomy_source"] = source_metrics
    metrics_path = Path(path).with_name("taxonomy_review_metrics.json")
    with metrics_path.open("w", encoding="utf-8") as stream:
        json.dump(metrics, stream, ensure_ascii=False, indent=2)
    return metrics
