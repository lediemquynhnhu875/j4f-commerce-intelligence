"""Build the retraining set A' from the base corpus and verified store sales observations.

A' = the base corpus, where a product with a newer verified observation is replaced by its latest
observation, plus products that only exist in store data. Every product appears exactly once.
Rows from store data carry a training weight min(1, C / n), where n is the number of rows that
store contributed and C is a high quantile of products per seller in the base corpus.
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yaml

from ml.src.data.clean import normalize_text

# Contract for the export of verified observations (one row per verified observation).
OBSERVATION_COLUMNS = (
    "store_id", "sku", "source_product_id", "observed_at", "verified_at", "quantity_sold",
    "currency", "product_name", "description", "category_raw", "brand", "fulfillment_type",
    "price", "original_price", "rating_average", "review_count", "image_count", "has_video",
    "import_batch_id",
)
BASE_COLUMNS = (
    "product_id", "product_name", "description", "seller_id", "brand", "category_raw",
    "fulfillment_type", "price", "original_price", "discount_rate", "rating_average",
    "review_count", "quantity_sold", "has_video", "image_count", "date_created_raw", "source_file",
    "name_length", "description_length", "data_quality_issue", "valid_for_model",
)
TAXONOMY_COLUMNS = ("product_type", "taxonomy_match", "taxonomy_source", "taxonomy_version")


@dataclass(frozen=True)
class RetrainConfig:
    min_new_observations: int = 100
    min_new_stores: int = 2
    weight_cap_quantile: float = 0.99
    roc_auc_tolerance: float = 0.01
    rmsle_tolerance: float = 0.02
    status_share_tolerance: float = 0.05
    taxonomy_min_accuracy: float = 0.85


def load_retrain_config(path: str | Path = "ml/config/retrain.yml") -> RetrainConfig:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    unknown = sorted(set(raw) - set(RetrainConfig.__dataclass_fields__))
    if unknown:
        raise ValueError(f"Unknown retrain configuration keys: {unknown}")
    return RetrainConfig(**raw)


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def _timestamps(values: pd.Series) -> pd.Series:
    return pd.to_datetime(values.replace("", None), utc=True, errors="coerce", format="ISO8601")


def _numbers(values: pd.Series) -> pd.Series:
    return pd.to_numeric(values.replace("", None), errors="coerce")


def _boolean(value: Any) -> Any:
    text = str(value).strip().lower()
    return {"true": True, "1": True, "yes": True, "false": False, "0": False, "no": False}.get(text, pd.NA)


def weight_cap(base: pd.DataFrame, quantile: float) -> int:
    sizes = base["seller_id"].fillna("unknown").astype(str).value_counts()
    return max(1, math.ceil(float(np.quantile(sizes.to_numpy(float), quantile))))


def select_observations(
    observations: pd.DataFrame, now: datetime | None = None, protected_ids: set[str] | None = None,
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Keep usable verified observations, latest per (store, SKU)."""
    missing = sorted(set(OBSERVATION_COLUMNS) - set(observations.columns))
    if missing:
        raise ValueError(f"Observation export is missing columns: {missing}")
    frame = observations.loc[:, list(OBSERVATION_COLUMNS)].copy()
    frame = frame.fillna("").astype(str).apply(lambda column: column.str.strip())
    frame["observed_ts"] = _timestamps(frame["observed_at"])
    frame["verified_ts"] = _timestamps(frame["verified_at"])
    frame["sales"] = _numbers(frame["quantity_sold"])
    frame["source_key"] = frame["source_product_id"].str.removeprefix("SP-")
    now = now or datetime.now(timezone.utc)
    reasons = {
        "missing_store_or_sku": frame["store_id"].eq("") | frame["sku"].eq(""),
        "missing_or_future_observed_at": frame["observed_ts"].isna() | frame["observed_ts"].gt(now),
        "not_verified": frame["verified_ts"].isna(),
        "invalid_quantity_sold": ~(frame["sales"].ge(0) & frame["sales"].eq(frame["sales"].round())),
        "not_vnd": ~frame["currency"].str.upper().isin({"VND", ""}),
        "missing_product_name": frame["product_name"].eq(""),
        "protected_evaluation_id": frame["source_key"].isin(protected_ids or set()),
    }
    dropped: dict[str, int] = {}
    keep = pd.Series(True, index=frame.index)
    for reason, mask in reasons.items():
        dropped[reason] = int((mask & keep).sum())
        keep &= ~mask
    frame = frame.loc[keep].sort_values(["observed_ts", "verified_ts"], kind="stable")
    latest = frame.drop_duplicates(["store_id", "sku"], keep="last")
    dropped["older_observation_of_same_product"] = int(len(frame) - len(latest))
    return latest.reset_index(drop=True), dropped


def _observation_rows(latest: pd.DataFrame, base: pd.DataFrame) -> pd.DataFrame:
    base_by_id = base.set_index("product_id")
    in_base = latest["source_key"].isin(base_by_id.index)
    rows = pd.DataFrame({
        "product_id": np.where(in_base, latest["source_key"], "store-" + latest["store_id"] + "-" + latest["sku"]),
        # Corpus products keep their seller so seller-grouped folds stay intact.
        "seller_id": np.where(
            in_base, latest["source_key"].map(base_by_id["seller_id"]).fillna(""), "store:" + latest["store_id"]
        ),
        "product_name": latest["product_name"].map(normalize_text),
        "description": latest["description"].map(normalize_text),
        "brand": latest["brand"].map(normalize_text).str.lower().replace("", "unknown"),
        "category_raw": latest["category_raw"].map(normalize_text).replace("", "unknown"),
        "fulfillment_type": latest["fulfillment_type"].str.lower().replace("", "unknown"),
        "price": _numbers(latest["price"]),
        "original_price": _numbers(latest["original_price"]),
        "rating_average": _numbers(latest["rating_average"]).clip(0, 5),
        "review_count": _numbers(latest["review_count"]).fillna(0).clip(lower=0).round(),
        "quantity_sold": latest["sales"].astype(int),
        "has_video": latest["has_video"].map(_boolean),
        "image_count": _numbers(latest["image_count"]).clip(lower=0).round(),
        "date_created_raw": "",
        "source_file": "store_observation:" + latest["import_batch_id"],
        "training_source": "store_observation",
        "store_id": latest["store_id"],
        "observed_at": latest["observed_ts"].map(lambda value: value.isoformat()),
        "verified_at": latest["verified_ts"].map(lambda value: value.isoformat()),
    })
    rows["discount_rate"] = (1 - rows["price"] / rows["original_price"]).clip(0, 1)
    rows["name_length"] = rows["product_name"].str.len()
    rows["description_length"] = rows["description"].str.len()
    rows["data_quality_issue"] = np.where(rows["price"].le(0) | rows["price"].isna(), "non_positive_price", "none")
    rows["valid_for_model"] = rows["price"].gt(0)
    return rows


def build_training_set(
    base: pd.DataFrame, observations: pd.DataFrame, config: RetrainConfig,
    since: datetime | None = None, now: datetime | None = None, protected_ids: set[str] | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Return A' (without taxonomy columns) and a JSON-safe summary including the readiness decision."""
    if not base["product_id"].astype(str).is_unique:
        raise ValueError("Base corpus product_id values must be unique")
    base = base.drop(columns=[name for name in TAXONOMY_COLUMNS if name in base]).copy()
    base["product_id"] = base["product_id"].astype(str)
    base["training_source"] = "corpus"
    latest, dropped = select_observations(observations, now, protected_ids)
    new = _observation_rows(latest, base)
    if new["product_id"].duplicated().any():
        # Two stores reporting the same corpus product: keep the most recent observation.
        new = new.sort_values("observed_at", kind="stable").drop_duplicates("product_id", keep="last")
        dropped["same_corpus_product_from_two_stores"] = int(len(latest) - len(new))
    replaced = base["product_id"].isin(new["product_id"])
    combined = pd.concat([base.loc[~replaced], new], ignore_index=True, sort=False)
    combined = combined.sort_values("product_id", kind="stable").reset_index(drop=True)

    cap = weight_cap(base, config.weight_cap_quantile)
    from_store = combined["training_source"].eq("store_observation")
    store_rows = combined.loc[from_store, "store_id"].value_counts()
    weights = (cap / combined.loc[from_store, "store_id"].map(store_rows)).clip(upper=1.0)
    combined["sample_weight"] = 1.0
    combined.loc[from_store, "sample_weight"] = weights.to_numpy(float)

    fresh = latest if since is None else latest.loc[latest["verified_ts"].gt(since)]
    fresh_rows, fresh_stores = int(len(fresh)), int(fresh["store_id"].nunique())
    reasons = []
    if fresh_rows < config.min_new_observations:
        reasons.append(f"{fresh_rows} new verified observations < {config.min_new_observations}")
    if fresh_stores < config.min_new_stores:
        reasons.append(f"{fresh_stores} stores with new observations < {config.min_new_stores}")
    summary = {
        "ready": not reasons,
        "skip_reasons": reasons,
        "since": since.isoformat() if since else None,
        "new_verified_observations": fresh_rows,
        "new_observation_stores": fresh_stores,
        "base_rows": int(len(base)),
        "rows": int(len(combined)),
        "corpus_rows_replaced": int(replaced.sum()),
        "store_only_products_added": int((~new["product_id"].isin(base["product_id"])).sum()),
        "observation_rows_used": int(from_store.sum()),
        "observation_share": round(float(from_store.mean()), 6),
        "observations_dropped": dropped,
        "weight_cap_C": cap,
        "weight_cap_quantile": config.weight_cap_quantile,
        "stores_down_weighted": int((store_rows > cap).sum()),
        "minimum_weight": float(combined["sample_weight"].min()),
    }
    return combined, summary
