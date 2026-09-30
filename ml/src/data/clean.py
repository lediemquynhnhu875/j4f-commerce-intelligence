from __future__ import annotations

import ast
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd


COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "product_id": ("product_id", "id", "sku", "productid"),
    "product_name": ("product_name", "name", "title", "productname"),
    "description": ("description", "short_description", "product_description"),
    "seller_id": ("seller_id", "current_seller_id", "current_seller", "seller"),
    "brand": ("brand", "brand_name"),
    "category_raw": ("category_raw", "category", "category_name", "categories"),
    "fulfillment_type": ("fulfillment_type", "inventory_type", "fulfillment"),
    "price": ("price", "current_price", "selling_price"),
    "original_price": ("original_price", "list_price", "market_price"),
    "discount_rate": ("discount_rate", "discount", "discount_percent"),
    "rating_average": ("rating_average", "rating", "average_rating"),
    "review_count": ("review_count", "reviews", "number_of_reviews"),
    "quantity_sold": ("quantity_sold", "sold", "sold_count", "sales"),
    "has_video": ("has_video", "video", "video_url"),
    "image_count": ("image_count", "number_of_images", "images", "image_urls"),
    "date_created_raw": ("date_created", "created_at", "creation_date"),
}

REQUIRED_SOURCE_COLUMNS = ("product_id", "product_name", "price", "quantity_sold")


def normalize_text(value: Any) -> str:
    if pd.isna(value):
        return ""
    text = unicodedata.normalize("NFC", str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _canonical_column_name(name: Any) -> str:
    value = normalize_text(name).lower()
    return re.sub(r"[^a-z0-9]+", "_", value).strip("_")


def _read_csv(path: Path) -> pd.DataFrame:
    errors: list[str] = []
    for encoding in ("utf-8-sig", "utf-8", "cp1258", "latin1"):
        try:
            frame = pd.read_csv(path, encoding=encoding, low_memory=False)
            frame.columns = [_canonical_column_name(column) for column in frame.columns]
            frame = frame.loc[:, ~frame.columns.str.match(r"^unnamed(?:_|$)")]
            frame["source_file"] = path.name
            return frame
        except (UnicodeDecodeError, pd.errors.ParserError) as exc:
            errors.append(f"{encoding}: {exc}")
    raise ValueError(f"Cannot read {path}. Attempts: {' | '.join(errors)}")


def load_raw_csvs(input_dir: str | Path) -> tuple[pd.DataFrame, list[Path]]:
    directory = Path(input_dir)
    paths = sorted(directory.glob("*.csv"))
    if not paths:
        raise FileNotFoundError(
            f"No CSV files found in {directory}. Put the six source files there first."
        )
    frames = [_read_csv(path) for path in paths]
    return pd.concat(frames, ignore_index=True, sort=False), paths


def _find_column(columns: Iterable[str], aliases: Iterable[str]) -> str | None:
    available = set(columns)
    return next((alias for alias in aliases if alias in available), None)


def _extract_mapping_value(value: Any, keys: tuple[str, ...]) -> str:
    if isinstance(value, dict):
        mapping = value
    elif isinstance(value, str) and value.strip().startswith("{"):
        try:
            mapping = json.loads(value)
        except json.JSONDecodeError:
            try:
                mapping = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                mapping = {}
    else:
        mapping = {}
    for key in keys:
        if key in mapping and mapping[key] is not None:
            return normalize_text(mapping[key])
    return normalize_text(value) if not mapping else ""


def _parse_number(value: Any) -> float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, (int, float, np.number)):
        return float(value)
    text = normalize_text(value).lower().replace("đ", "").replace("₫", "")
    text = re.sub(r"[^0-9,.-]", "", text)
    if not text or text in {"-", ".", ","}:
        return np.nan
    if "," in text and "." in text:
        decimal = "," if text.rfind(",") > text.rfind(".") else "."
        thousands = "." if decimal == "," else ","
        text = text.replace(thousands, "").replace(decimal, ".")
    elif text.count(",") > 1 or text.count(".") > 1:
        text = text.replace(",", "").replace(".", "")
    elif "," in text:
        left, right = text.rsplit(",", 1)
        text = left + right if len(right) == 3 else left + "." + right
    elif "." in text:
        left, right = text.rsplit(".", 1)
        text = left + right if len(right) == 3 else text
    try:
        return float(text)
    except ValueError:
        return np.nan


def _parse_bool(value: Any) -> bool | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float, np.number)):
        return bool(value)
    text = normalize_text(value).lower()
    if text in {"true", "1", "yes", "y", "có", "co"}:
        return True
    if text in {"false", "0", "no", "n", "không", "khong", ""}:
        return False
    return True if text.startswith(("http://", "https://")) else None


def _count_images(value: Any) -> float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, (list, tuple, set, dict)):
        return float(len(value))
    if isinstance(value, (int, float, np.number)):
        return float(value)
    text = normalize_text(value)
    if not text:
        return np.nan
    if text.startswith(("[", "{")):
        for loader in (json.loads, ast.literal_eval):
            try:
                parsed = loader(text)
                return float(len(parsed)) if hasattr(parsed, "__len__") else np.nan
            except (json.JSONDecodeError, SyntaxError, ValueError, TypeError):
                continue
    if text.startswith(("http://", "https://")):
        return float(len([part for part in re.split(r"[,;|]", text) if part.strip()]))
    return _parse_number(text)


def _canonical_frame(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, str | None]]:
    selected: dict[str, str | None] = {
        target: _find_column(raw.columns, aliases) for target, aliases in COLUMN_ALIASES.items()
    }
    missing = [column for column in REQUIRED_SOURCE_COLUMNS if selected[column] is None]
    if missing:
        raise ValueError(
            f"Missing required source columns {missing}. Available columns: {sorted(raw.columns)}"
        )

    result = pd.DataFrame(index=raw.index)
    for target, source in selected.items():
        result[target] = raw[source] if source else np.nan
    result["source_file"] = raw["source_file"]
    return result, selected


def clean_products(
    input_dir: str | Path,
    output_dir: str | Path,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    raw, source_paths = load_raw_csvs(input_dir)

    comparison_columns = [column for column in raw.columns if column != "source_file"]
    id_source = _find_column(raw.columns, COLUMN_ALIASES["product_id"])
    raw_duplicated_ids = (
        raw[id_source].duplicated(keep=False) if id_source else pd.Series(False, index=raw.index)
    )
    raw_duplicate_report = raw.loc[raw_duplicated_ids].copy()
    raw_duplicate_report["exact_duplicate_group"] = raw.loc[raw_duplicated_ids].duplicated(
        subset=comparison_columns, keep=False
    ).to_numpy()
    exact_duplicate_mask = raw.duplicated(subset=comparison_columns, keep="first")
    exact_duplicates = raw.loc[exact_duplicate_mask].copy()
    deduplicated_raw = raw.loc[~exact_duplicate_mask].copy()
    canonical, selected_columns = _canonical_frame(deduplicated_raw)

    canonical["product_id"] = canonical["product_id"].map(
        lambda value: _extract_mapping_value(value, ("id", "product_id", "sku"))
    )
    canonical["seller_id"] = canonical["seller_id"].map(
        lambda value: _extract_mapping_value(value, ("id", "seller_id", "name"))
    )
    canonical["product_name"] = canonical["product_name"].map(normalize_text)
    canonical["description"] = canonical["description"].map(normalize_text)
    canonical["brand"] = canonical["brand"].map(normalize_text).str.lower()
    canonical["brand"] = canonical["brand"].replace(
        {"": "unknown", "no brand": "unknown", "không thương hiệu": "unknown"}
    )
    canonical["category_raw"] = canonical["category_raw"].map(normalize_text)
    canonical["category_raw"] = canonical["category_raw"].replace("", "unknown")
    canonical["fulfillment_type"] = (
        canonical["fulfillment_type"].map(normalize_text).str.lower().replace("", "unknown")
    )

    for column in ("price", "original_price", "discount_rate", "rating_average", "review_count", "quantity_sold"):
        canonical[column] = canonical[column].map(_parse_number)
    percentage_mask = canonical["discount_rate"] > 1
    canonical.loc[percentage_mask, "discount_rate"] /= 100
    inferred_discount = 1 - canonical["price"] / canonical["original_price"]
    canonical["discount_rate"] = canonical["discount_rate"].fillna(inferred_discount)
    canonical["discount_rate"] = canonical["discount_rate"].clip(0, 1)
    canonical["rating_average"] = canonical["rating_average"].clip(0, 5)
    canonical["review_count"] = canonical["review_count"].fillna(0).clip(lower=0).round().astype("Int64")
    canonical["quantity_sold"] = canonical["quantity_sold"].clip(lower=0).round().astype("Int64")
    canonical["has_video"] = canonical["has_video"].map(_parse_bool).astype("boolean")
    if selected_columns["has_video"] in {"video", "video_url"}:
        canonical["has_video"] = canonical["has_video"].fillna(False)
    canonical["image_count"] = canonical["image_count"].map(_count_images).clip(lower=0).round().astype("Int64")
    canonical["name_length"] = canonical["product_name"].str.len().astype("Int64")
    canonical["description_length"] = canonical["description"].str.len().astype("Int64")
    canonical["data_quality_issue"] = np.where(
        canonical["price"].le(0), "non_positive_price", "none"
    )
    canonical["valid_for_model"] = canonical["price"].gt(0)

    essential_missing = (
        canonical["product_id"].eq("")
        | canonical["product_name"].eq("")
        | canonical["price"].isna()
        | canonical["quantity_sold"].isna()
    )
    rejected = canonical.loc[essential_missing].copy()
    canonical = canonical.loc[~essential_missing].copy()

    duplicated_ids = canonical["product_id"].duplicated(keep=False)
    duplicate_report = canonical.loc[duplicated_ids].copy()
    if not duplicate_report.empty:
        duplicate_report["duplicate_group_size"] = duplicate_report.groupby("product_id")[
            "product_id"
        ].transform("size")
        comparison = [
            column
            for column in canonical.columns
            if column not in {"product_id", "source_file"}
        ]
        conflict_map: dict[str, str] = {}
        for product_id, group in duplicate_report.groupby("product_id", sort=False):
            conflicting = [
                column
                for column in comparison
                if group[column].astype("string").fillna("<NA>").nunique(dropna=False) > 1
            ]
            conflict_map[str(product_id)] = json.dumps(conflicting, ensure_ascii=False)
        duplicate_report["conflicting_columns"] = duplicate_report["product_id"].map(conflict_map)
        completeness_columns = [
            "product_name", "description", "seller_id", "brand", "category_raw", "price",
            "original_price", "rating_average", "review_count", "quantity_sold", "image_count",
        ]
        canonical["_completeness"] = canonical[completeness_columns].notna().sum(axis=1)
        canonical = canonical.sort_values(
            ["product_id", "_completeness", "source_file"],
            ascending=[True, False, True],
            kind="stable",
        ).drop_duplicates("product_id", keep="first")
        canonical = canonical.drop(columns="_completeness")

    canonical = canonical.sort_values("product_id", kind="stable").reset_index(drop=True)
    exact_duplicates.to_csv(output / "exact_duplicates_removed.csv", index=False)
    raw_duplicate_report.to_csv(output / "duplicate_product_ids_all.csv", index=False)
    duplicate_report.to_csv(output / "duplicate_product_ids.csv", index=False)
    rejected.to_csv(output / "rejected_rows.csv", index=False)

    profile_rows: list[dict[str, Any]] = []
    for column in canonical.columns:
        series = canonical[column]
        numeric = pd.to_numeric(series, errors="coerce")
        profile_rows.append(
            {
                "column": column,
                "dtype": str(series.dtype),
                "row_count": int(len(series)),
                "missing_count": int(series.isna().sum()),
                "missing_rate": float(series.isna().mean()),
                "unique_count": int(series.nunique(dropna=True)),
                "numeric_min": float(numeric.min()) if numeric.notna().any() else np.nan,
                "numeric_max": float(numeric.max()) if numeric.notna().any() else np.nan,
                "sample_values": json.dumps(
                    series.dropna().astype(str).drop_duplicates().head(3).tolist(),
                    ensure_ascii=False,
                ),
            }
        )
    pd.DataFrame(profile_rows).to_csv(output / "data_profile.csv", index=False)

    report: dict[str, Any] = {
        "source_files": [path.name for path in source_paths],
        "source_file_count": len(source_paths),
        "raw_rows": int(len(raw)),
        "exact_duplicates_removed": int(exact_duplicate_mask.sum()),
        "rows_with_duplicated_product_id": int(raw_duplicated_ids.sum()),
        "duplicated_product_id_count": int(raw.loc[raw_duplicated_ids, id_source].nunique())
        if id_source
        else 0,
        "non_identical_duplicate_rows_after_exact_removal": int(duplicated_ids.sum()),
        "non_identical_duplicated_product_id_count": int(
            duplicate_report["product_id"].nunique()
        ),
        "duplicate_product_id_resolution": "keep_most_complete_then_source_filename",
        "essential_rows_rejected": int(essential_missing.sum()),
        "clean_rows": int(len(canonical)),
        "selected_source_columns": selected_columns,
        "excluded_from_logic": ["favourite_count", "date_created_raw"],
        "null_counts": {key: int(value) for key, value in canonical.isna().sum().items()},
    }
    with (output / "data_quality_report.json").open("w", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
    return canonical, report
