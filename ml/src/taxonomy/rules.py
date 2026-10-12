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
        if not rule.get("label") or not (rule.get("keywords") or rule.get("priority_keywords") or rule.get("name_patterns")):
            raise ValueError(f"Invalid taxonomy rule: {rule}")
    return rules


def _load_taxonomy_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as stream:
        return yaml.safe_load(stream) or {}


def _keyword_pattern(keywords: list[str]) -> str:
    return r"(?:^|\W)(?:" + "|".join(re.escape(_search_text(word)) for word in keywords) + r")(?:$|\W)"


def _assign_v2(products: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    result = products.copy()
    name = result.product_name.fillna("").map(_search_text).str.replace("giầy", "giày", regex=False)
    name = name.str.split(r"\btặng(?:\s+kèm|\s+thêm)?\b|\bquà\s+tặng\b", n=1, regex=True).str[0]
    description = result.description.fillna("").map(_search_text).str[:900]
    description = description.str.split(
        r"shop chuyên|chuyên phân phối|sản phẩm liên quan|các sản phẩm khác", n=1, regex=True
    ).str[0]
    category = result.category_raw.fillna("").map(_search_text)
    generic = {_search_text(value) for value in config.get("generic_categories", [])}
    category = category.mask(category.isin(generic), "")
    broad = set(config["broad_labels"])
    rules = config["product_types"]
    labels = pd.Series("unknown", index=result.index, dtype=object)
    matches = pd.Series("", index=result.index, dtype=object)
    sources = pd.Series("unmatched", index=result.index, dtype=object)

    def apply_rule(rule: dict[str, Any], text: pd.Series, source: str, eligible: pd.Series) -> None:
        patterns = []
        keywords = list(dict.fromkeys(rule.get("priority_keywords", []) + rule.get("keywords", [])))
        if source == "description_rule":
            keywords = rule.get("description_keywords", [])
        if keywords:
            patterns.append(_keyword_pattern(keywords))
        if source == "name_rule":
            patterns.extend(rule.get("name_patterns", []))
        elif source == "description_rule":
            patterns.extend(rule.get("description_patterns", []))
        if not patterns:
            return
        pattern = "(?:" + "|".join(patterns) + ")"
        selected = eligible & text.str.contains(pattern, regex=True, na=False)
        if source == "description_rule":
            context = rule.get("description_context")
            if context:
                selected &= name.str.contains(context, regex=True, na=False)
        if selected.any():
            labels.loc[selected] = rule["label"]
            matches.loc[selected] = text.loc[selected].str.extract(f"({pattern})", expand=False).fillna("")
            sources.loc[selected] = source

    for rule in config.get("special_name_rules", []):
        pattern = rule["pattern"]
        take = labels.eq("unknown") & name.str.contains(pattern, regex=True, na=False)
        labels.loc[take] = rule["label"]
        matches.loc[take] = name.loc[take].str.extract(f"({pattern})", expand=False).fillna("")
        sources.loc[take] = "name_context_rule"

    first = config.get("specific_type_order", [])
    rank = {label: index for index, label in enumerate(first)}
    rules = sorted(rules, key=lambda rule: rank.get(rule["label"], len(rank)))

    # Specific main-item titles win; broad words such as "tui" wait for category/description evidence.
    for rule in rules:
        if rule["label"] not in broad or rule["label"] == "ambiguous":
            apply_rule(rule, name, "name_rule", labels.eq("unknown"))
    for rule in rules:
        apply_rule(rule, category, "category_rule", labels.eq("unknown"))
    description_available = labels.eq("unknown") | labels.isin(broad) | sources.eq("category_rule")
    description_assigned = pd.Series(False, index=result.index)
    for rule in rules:
        before = sources.copy()
        apply_rule(rule, description, "description_rule", description_available & ~description_assigned)
        description_assigned |= sources.eq("description_rule") & ~before.eq("description_rule")
    for rule in rules:
        if rule["label"] in broad:
            apply_rule(rule, name, "name_rule", labels.eq("unknown"))

    # Preserve structural type while resolving gender only from the main title or compatible description.
    shoe = labels.str.startswith(("giày", "boots", "sandal", "dép"))
    family = pd.Series("", index=result.index, dtype=object)
    families = [
        ("sandal", r"sandal|sandals|sandan|xăng đan"),
        ("boots", r"\bboot(?:s)?\b|\bbốt\b"),
        ("giày thể thao", r"giày.{0,50}thể thao|sneaker|\bbata\b|giày chạy bộ"),
        ("giày lười", r"giày lười|giày mọi|moccasin|loafer|slip.?on"),
        ("dép", r"\bdép\b|\bguốc\b|\bsục\b"),
        ("giày", r"\bgiày\b"),
    ]
    for label, pattern in families:
        selected = family.eq("") & name.str.contains(pattern, regex=True, na=False)
        family.loc[selected] = label
    gender_text = name.copy()
    title_gender = name.str.contains(r"\bunisex\b|\bnam\b|\bnữ\b|bé trai|bé gái", regex=True)
    compatible_description = name.ne("") & family.ne("") & ~title_gender
    for label, pattern in families:
        compatible = compatible_description & family.eq(label) & description.str.contains(pattern, regex=True, na=False)
        gender_text.loc[compatible] = name.loc[compatible] + " " + description.loc[compatible]
    unisex = gender_text.str.contains(r"\bunisex\b|nam\s*(?:và\s*|/\s*)?nữ|nam\s+cả\s+nữ", regex=True)
    male = gender_text.str.contains(r"\bnam\b|bé trai", regex=True) & ~unisex
    female = gender_text.str.contains(r"\bnữ\b|bé gái", regex=True) & ~unisex
    protected = {"giày búp bê", "giày tây nam"}
    resolved_families = {"sandal", "boots", "giày lười"}
    for label in resolved_families:
        selected = (shoe | labels.isin(broad) | labels.eq("unknown")) & family.eq(label) & ~labels.isin(protected)
        for suffix, mask in [("unisex", unisex), ("nam", male), ("nữ", female), ("khác", ~unisex & ~male & ~female)]:
            take = selected & mask
            labels.loc[take] = label + " " + suffix
            sources.loc[take] = "name_gender_rule"
            matches.loc[take] = label + ":" + suffix
    for label in ["giày thể thao", "dép", "giày"]:
        allowed = {"giày", "giày nam", "giày nữ", "giày khác", "giày unisex", "unknown"}
        if label == "giày thể thao":
            allowed |= {"giày thể thao nam", "giày thể thao nữ", "giày thể thao khác"}
        elif label == "dép":
            allowed |= {"dép nam", "dép nữ", "dép unisex", "dép khác"}
        selected = labels.isin(allowed) & family.eq(label)
        unknown_suffix = "khác"
        for suffix, mask in [("unisex", unisex), ("nam", male), ("nữ", female), (unknown_suffix, ~unisex & ~male & ~female)]:
            take = selected & mask
            resolved = label + " " + suffix
            if label == "giày thể thao" and suffix == "unisex":
                resolved = "giày thể thao khác"
            labels.loc[take] = resolved
            sources.loc[take] = "name_gender_rule"
            matches.loc[take] = label + ":" + suffix
    wallet_unisex = labels.isin({"ví nam", "ví nữ", "ví khác"}) & unisex
    labels.loc[wallet_unisex] = "ví khác"
    sources.loc[wallet_unisex] = "name_gender_rule"
    source_key = result.source_file.str.replace("vietnamese_tiki_products_", "", regex=False).str.replace(".csv", "", regex=False)
    for key, label in config.get("source_fallbacks", {}).items():
        take = labels.eq("unknown") & source_key.eq(key)
        labels.loc[take] = label
        matches.loc[take] = key
        sources.loc[take] = "source_fallback"
    result["product_type"], result["taxonomy_match"], result["taxonomy_source"] = labels, matches, sources
    result["taxonomy_version"] = config["taxonomy_version"]
    return result


def assign_product_types(
    products: pd.DataFrame,
    rules_path: str | Path,
) -> pd.DataFrame:
    taxonomy_config = _load_taxonomy_config(rules_path)
    if taxonomy_config.get("taxonomy_version") == "v2-unisex-description":
        return _assign_v2(products, taxonomy_config)
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

    # Strong, product-specific phrases in a title can correct a broad or noisy raw category.
    # Keep this opt-in so incidental title phrases do not override reliable categories.
    for rule in rules:
        priority_keywords = rule.get("priority_keywords", [])
        if not priority_keywords:
            continue
        escaped = [re.escape(_search_text(keyword)) for keyword in priority_keywords]
        pattern = r"(?:^|\W)(?:" + "|".join(escaped) + r")(?:$|\W)"
        matched = result["product_type"].eq("unknown") & name_search.str.contains(
            pattern, regex=True, na=False
        )
        if matched.any():
            result.loc[matched, "product_type"] = rule["label"]
            result.loc[matched, "taxonomy_match"] = name_search[matched].str.extract(
                f"({pattern})", expand=False
            ).fillna("")
            result.loc[matched, "taxonomy_source"] = "name_priority_rule"

    # Reliable raw categories take precedence over product names. This prevents gift phrases
    # such as "tặng lót giày" from overriding a category like "Giày lười vải nam".
    for source_name, search_values in (("category_rule", category_search), ("name_rule", name_search)):
        for rule in rules:
            available = result["product_type"].eq("unknown")
            keywords = rule.get("keywords", [])
            if not keywords:
                continue
            escaped = [re.escape(_search_text(keyword)) for keyword in keywords]
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


def evaluate_taxonomy_predictions(
    products: pd.DataFrame,
    review_path: str | Path,
    metrics_path: str | Path,
) -> tuple[dict[str, Any], pd.DataFrame]:
    """Evaluate current taxonomy predictions against labels established by manual review."""
    review = pd.read_csv(review_path, dtype=str).fillna("")
    normalized = review["is_correct"].str.strip().str.lower()
    valid_values = {"true", "false", "1", "0", "yes", "no", "đúng", "sai"}
    correct_values = {"true", "1", "yes", "đúng"}
    reviewed_mask = normalized.isin(valid_values)
    expected = review["product_type"].where(
        normalized.isin(correct_values), review["corrected_product_type"]
    )
    missing_correction = reviewed_mask & ~normalized.isin(correct_values) & expected.eq("")
    if missing_correction.any():
        ids = review.loc[missing_correction, "product_id"].tolist()
        raise ValueError(f"Incorrect review rows are missing corrected_product_type: {ids}")

    current = products[["product_id", "product_type", "taxonomy_source"]].copy()
    current["product_id"] = current["product_id"].astype(str)
    comparison = review.assign(expected_product_type=expected).merge(
        current.rename(
            columns={
                "product_type": "predicted_product_type",
                "taxonomy_source": "predicted_taxonomy_source",
            }
        ),
        on="product_id",
        how="left",
        validate="many_to_one",
    )
    comparison["prediction_correct"] = (
        comparison["predicted_product_type"].fillna("")
        == comparison["expected_product_type"]
    ) & reviewed_mask
    reviewed = int(reviewed_mask.sum())
    matched_products = int(comparison["predicted_product_type"].notna().sum())
    accuracy = (
        float(comparison.loc[reviewed_mask, "prediction_correct"].mean()) if reviewed else 0.0
    )
    metrics = {
        "sample_rows": int(len(comparison)),
        "reviewed_rows": reviewed,
        "matched_product_rows": matched_products,
        "assigned_rows": int(
            comparison["predicted_product_type"].fillna("unknown").ne("unknown").sum()
        ),
        "coverage": float(matched_products / len(comparison)) if len(comparison) else 0.0,
        "accuracy": accuracy,
    }
    source_metrics: dict[str, dict[str, float | int]] = {}
    for source, source_rows in comparison.loc[reviewed_mask].groupby(
        "predicted_taxonomy_source", dropna=False
    ):
        source_metrics[str(source)] = {
            "sample_rows": int(len(source_rows)),
            "accuracy": float(source_rows["prediction_correct"].mean()),
        }
    metrics["by_taxonomy_source"] = source_metrics

    output = Path(metrics_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as stream:
        json.dump(metrics, stream, ensure_ascii=False, indent=2)
    comparison.to_csv(output.with_name("taxonomy_review_comparison.csv"), index=False)
    return metrics, comparison
