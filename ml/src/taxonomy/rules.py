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


def _rule_pattern(rule: dict[str, Any], source: str) -> str | None:
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
    return "(?:" + "|".join(patterns) + ")" if patterns else None


def _first_position(text: pd.Series, pattern: str) -> pd.Series:
    """Start offset of the first regex match per row, or -1 when absent."""
    compiled = re.compile(pattern)
    return text.map(lambda value: match.start() if (match := compiled.search(value)) else -1)


def _assign_head_noun(
    rules: list[dict[str, Any]],
    name: pd.Series,
    eligible: pd.Series,
    absolute: set[str],
) -> tuple[pd.Series, pd.Series]:
    """Pick the rule whose name match starts earliest.

    Vietnamese product titles are head-initial ("Móc khóa ... phụ kiện túi xách" is a key ring), so
    the earliest product phrase names the item. Labels in ``absolute`` win wherever they match.
    Ties keep the configured rule order.
    """
    rows = name.loc[eligible]
    best_label = pd.Series("unknown", index=rows.index, dtype=object)
    best_match = pd.Series("", index=rows.index, dtype=object)
    best_key = pd.Series([(float("inf"), float("inf"))] * len(rows), index=rows.index, dtype=object)
    for rank, rule in enumerate(rules):
        pattern = _rule_pattern(rule, "name_rule")
        if not pattern:
            continue
        compiled = re.compile(pattern)
        for index, value in rows.items():
            match = compiled.search(value)
            if not match:
                continue
            position = -1.0 if rule["label"] in absolute else float(match.start())
            key = (position, float(rank))
            if key < best_key[index]:
                best_key[index] = key
                best_label[index] = rule["label"]
                best_match[index] = match.group(0)
    return best_label, best_match


def _assign_v2(products: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    # Optional v3 behaviour lives under the `v3` key; without it this function is the v2 taxonomy.
    options = config.get("v3", {})
    result = products.copy()
    name = result.product_name.fillna("").map(_search_text).str.replace("giầy", "giày", regex=False)
    if options.get("underscore_as_space"):
        # "_Kẹp tóc ..." : an underscore is a word character for regex boundaries.
        name = name.str.replace("_", " ", regex=False).str.strip()
    if options.get("gift_parenthetical"):
        # "(Tặng khăn lau) Kính mát nữ": drop bracketed gift notes instead of cutting the title at them.
        name = name.str.replace(r"[\(\[][^\)\]]{0,60}\btặng\b[^\)\]]{0,60}[\)\]]", " ", regex=True).str.strip()
    name = name.str.split(r"\btặng(?:\s+kèm|\s+thêm)?\b|\bquà\s+tặng\b", n=1, regex=True).str[0]
    description = result.description.fillna("").map(_search_text).str[:900]
    description = description.str.split(
        r"shop chuyên|chuyên phân phối|sản phẩm liên quan|các sản phẩm khác", n=1, regex=True
    ).str[0]
    category = result.category_raw.fillna("").map(_search_text)
    if options.get("python_regex"):
        # pandas>=3 stores text as pyarrow strings whose RE2 engine treats \b as ASCII-only, so
        # patterns such as r"\bnữ\b" never match. Object dtype keeps Python `re` semantics.
        name, description, category = (series.astype(object) for series in (name, description, category))
    category_gender_text = category.copy()
    generic = {_search_text(value) for value in config.get("generic_categories", [])}
    category = category.mask(category.isin(generic), "")
    category_guard = pd.Series(False, index=result.index)
    if options.get("category_requires_name_noun"):
        # Main-item seller categories are trusted only when the title names some fashion item;
        # otherwise noisy categories turn sewing needles into ballet flats.
        category_guard = ~name.str.contains(options["category_requires_name_noun"], regex=True)
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
    specific_rules = [rule for rule in rules if rule["label"] not in broad or rule["label"] == "ambiguous"]
    if options.get("head_noun_priority"):
        eligible = labels.eq("unknown")
        head_labels, head_matches = _assign_head_noun(
            specific_rules, name, eligible, set(options.get("absolute_labels", []))
        )
        take = head_labels.ne("unknown")
        take_index = take[take].index
        labels.loc[take_index] = head_labels.loc[take_index]
        matches.loc[take_index] = head_matches.loc[take_index]
        sources.loc[take_index] = "name_rule"
    else:
        for rule in specific_rules:
            apply_rule(rule, name, "name_rule", labels.eq("unknown"))
    guarded = set(options.get("category_guard_labels", []))
    for rule in rules:
        eligible = labels.eq("unknown")
        if options.get("category_requires_name_noun") and (not guarded or rule["label"] in guarded):
            eligible &= ~category_guard
        apply_rule(rule, category, "category_rule", eligible)
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
    if options.get("shoe_family_patterns"):
        families = [(label, options["shoe_family_patterns"].get(label, pattern)) for label, pattern in families]
    if options.get("shoe_family_earliest"):
        # Among structural families the earliest word is the item ("dép xỏ ngón ... sandal" is a dép);
        # the generic word "giày" only applies when no structural family is named.
        best = pd.Series(float("inf"), index=result.index)
        for label, pattern in families[:-1]:
            position = _first_position(name, pattern).astype(float)
            take = position.ge(0) & position.lt(best)
            family.loc[take] = label
            best.loc[take] = position.loc[take]
        family.loc[family.eq("") & name.str.contains(families[-1][1], regex=True, na=False)] = families[-1][0]
    else:
        for label, pattern in families:
            selected = family.eq("") & name.str.contains(pattern, regex=True, na=False)
            family.loc[selected] = label
    if options.get("sandal_cue"):
        # Team convention: a dép with a heel strap ("dép ... quai hậu") is a sandal.
        family.loc[family.eq("dép") & name.str.contains(options["sandal_cue"], regex=True, na=False)] = "sandal"
    if options.get("shoe_accessory_head"):
        # "Cục gôm tẩy cho giày", "Miếng lót sau giày", "Ghế đi giày": the shoe word is not the item.
        family.loc[name.str.contains(options["shoe_accessory_head"], regex=True, na=False)] = ""
    gender_name = name
    if options.get("gender_noise"):
        # Place and brand names such as "Việt Nam" or "Hà Nam" are not gender statements.
        gender_name = name.str.replace(options["gender_noise"], " ", regex=True)
    gender_text = gender_name.copy()
    title_gender = gender_name.str.contains(r"\bunisex\b|\bnam\b|\bnữ\b|bé trai|bé gái", regex=True)
    compatible_description = name.ne("") & family.ne("") & ~title_gender
    for label, pattern in families:
        compatible = compatible_description & family.eq(label) & description.str.contains(pattern, regex=True, na=False)
        gender_text.loc[compatible] = gender_name.loc[compatible] + " " + description.loc[compatible]
    male_pattern = r"\bnam\b|bé trai" + (f"|{options['male_extra']}" if options.get("male_extra") else "")
    female_pattern = r"\bnữ\b|bé gái" + (f"|{options['female_extra']}" if options.get("female_extra") else "")
    unisex = gender_text.str.contains(r"\bunisex\b|nam\s*(?:và\s*|/\s*)?nữ|nam\s+cả\s+nữ", regex=True)
    male = gender_text.str.contains(male_pattern, regex=True) & ~unisex
    female = gender_text.str.contains(female_pattern, regex=True) & ~unisex
    category_male = pd.Series(False, index=result.index)
    category_female = pd.Series(False, index=result.index)
    if options.get("category_gender"):
        # Team convention (2026-11-25): with no gender in title or description, the seller category
        # may supply it ("Giày thể thao nam cổ cao"); the source file never does.
        category_male = category_gender_text.str.contains(r"\bnam\b|bé trai", regex=True)
        category_female = category_gender_text.str.contains(r"\bnữ\b|bé gái", regex=True)
        undecided = ~unisex & ~male & ~female
        male = male | (undecided & category_male & ~category_female)
        female = female | (undecided & category_female & ~category_male)
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
    title_unisex = gender_name.str.contains(r"\bunisex\b|nam\s*(?:và\s*|/\s*|,\s*|lẫn\s*)?nữ|nam\s+cả\s+nữ", regex=True)
    title_male = gender_name.str.contains(male_pattern, regex=True) & ~title_unisex
    title_female = gender_name.str.contains(female_pattern, regex=True) & ~title_unisex
    if options.get("category_gender"):
        no_title_gender = ~title_unisex & ~title_male & ~title_female
        title_male = title_male | (no_title_gender & category_male & ~category_female)
        title_female = title_female | (no_title_gender & category_female & ~category_male)
    if options.get("heel_pattern"):
        # Generic women's/unknown shoes whose title states a heel height or heel type are heels.
        heel_evidence = name.str.contains(options["heel_pattern"], regex=True, na=False)
        if options.get("heel_description_pattern"):
            heel_evidence |= description.str[:300].str.contains(
                options["heel_description_pattern"], regex=True, na=False
            )
        heel = labels.isin({"giày nữ", "giày khác", "giày dép nữ khác"}) & ~title_male & heel_evidence
        labels.loc[heel] = "giày cao gót"
        sources.loc[heel] = "name_gender_rule"
        matches.loc[heel] = "giày:cao gót"
    if options.get("wallet_head"):
        # Wallet titles ("Bóp ...", "Ví ... clutch nam") take their gender from the title only.
        head = _first_position(name, options["wallet_head"])
        bag = _first_position(name, options.get("bag_head", r"(?!x)x"))
        wallet = head.ge(0) & (bag.lt(0) | head.lt(bag))
        wallet &= labels.isin({"ví nam", "ví nữ", "ví khác", "túi xách nam", "túi xách nữ", "unknown"} | broad)
        # A specific wallet label from a priority phrase is kept when the title states no gender.
        wallet &= ~(labels.isin({"ví nam", "ví nữ"}) & ~title_male & ~title_female & ~title_unisex)
        for suffix, mask in [("nam", title_male), ("nữ", title_female), ("khác", ~title_male & ~title_female)]:
            take = wallet & mask
            labels.loc[take] = "ví " + suffix
            sources.loc[take] = "name_gender_rule"
            matches.loc[take] = "ví:" + suffix
    if options.get("bag_unisex"):
        bag_unisex = labels.isin({"túi xách nam", "túi xách nữ"}) & title_unisex
        labels.loc[bag_unisex] = "túi xách khác"
        sources.loc[bag_unisex] = "name_gender_rule"
    if options.get("bag_gender"):
        for suffix, mask in [("nam", title_male), ("nữ", title_female)]:
            take = labels.eq("túi xách khác") & mask
            labels.loc[take] = "túi xách " + suffix
            sources.loc[take] = "name_gender_rule"
    if options.get("unmatched_label"):
        # Titles, categories and descriptions that name no fashion item at all are mostly
        # non-fashion listings; the source file says nothing about what they are.
        take = labels.eq("unknown")
        labels.loc[take] = options["unmatched_label"]
        matches.loc[take] = ""
        sources.loc[take] = "unmatched_default"
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
    if taxonomy_config.get("taxonomy_version") in {"v2-unisex-description", "v3-head-noun"}:
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
