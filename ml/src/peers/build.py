from __future__ import annotations

import json
from dataclasses import asdict
from typing import Any

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

from ml.src.config import PipelineConfig


PEER_MEDIAN_COLUMNS = (
    "quantity_sold",
    "price",
    "discount_rate",
    "image_count",
    "rating_average",
    "review_count",
    "description_length",
)


def _price_quartiles(products: pd.DataFrame) -> pd.Series:
    def assign(group: pd.Series) -> pd.Series:
        valid = group.notna()
        result = pd.Series(pd.NA, index=group.index, dtype="Int64")
        if valid.sum() < 4:
            result.loc[valid] = 0
            return result
        ranks = group.loc[valid].rank(method="first")
        result.loc[valid] = pd.qcut(ranks, q=4, labels=False, duplicates="drop").astype("Int64")
        return result

    return products.groupby("product_type", group_keys=False)["price"].apply(assign)


def _baseline_metrics(products: pd.DataFrame) -> pd.DataFrame:
    result = products.reset_index(drop=True).copy()
    result["price_quartile"] = _price_quartiles(result)
    keys = ["product_type", "price_quartile"]
    grouped = result.groupby(keys, dropna=False)
    result["baseline_peer_count"] = grouped["product_id"].transform("size") - 1
    baseline_median = np.full(len(result), np.nan)
    for group_index in grouped.groups.values():
        positions = np.asarray(list(group_index), dtype=int)
        values = pd.to_numeric(result.iloc[positions]["quantity_sold"], errors="coerce").to_numpy(float)
        valid = np.isfinite(values)
        if valid.sum() <= 1:
            continue
        valid_positions = positions[valid]
        valid_values = values[valid]
        order = np.argsort(valid_values, kind="stable")
        sorted_values = valid_values[order]
        ranks = np.empty(len(order), dtype=int)
        ranks[order] = np.arange(len(order))
        remaining_count = len(sorted_values) - 1

        def after_removal(rank: int, target_rank: int) -> float:
            return float(sorted_values[target_rank + int(rank <= target_rank)])

        for local_position, rank in enumerate(ranks):
            if remaining_count % 2:
                median = after_removal(int(rank), remaining_count // 2)
            else:
                upper = remaining_count // 2
                median = (
                    after_removal(int(rank), upper - 1)
                    + after_removal(int(rank), upper)
                ) / 2
            baseline_median[valid_positions[local_position]] = median
    result["baseline_median_sales"] = baseline_median
    sold = result["quantity_sold"].gt(0).astype(float)
    sold_sum = sold.groupby([result[key] for key in keys], dropna=False).transform("sum")
    denominator = result["baseline_peer_count"].replace(0, np.nan)
    result["baseline_sold_rate"] = (sold_sum - sold) / denominator
    result.loc[result["product_type"].eq("unknown"), "baseline_peer_count"] = 0
    return result


def _empty_peer_record() -> dict[str, Any]:
    record: dict[str, Any] = {
        "peer_ids": "[]",
        "peer_count": 0,
        "mean_peer_similarity": np.nan,
        "peer_video_share": np.nan,
    }
    for column in PEER_MEDIAN_COLUMNS:
        record[f"peer_median_{column}"] = np.nan
    return record


def _peer_record(
    product_ids: np.ndarray,
    peer_numeric: np.ndarray,
    peer_video: np.ndarray,
    peer_positions: list[int],
    similarities: list[float],
) -> dict[str, Any]:
    if not peer_positions:
        return _empty_peer_record()
    positions = np.asarray(peer_positions, dtype=int)
    video_values = peer_video[positions]
    video_share = np.nanmean(video_values) if np.isfinite(video_values).any() else np.nan
    record: dict[str, Any] = {
        "peer_ids": json.dumps(product_ids[positions].tolist(), ensure_ascii=False),
        "peer_count": len(positions),
        "mean_peer_similarity": float(np.mean(similarities)),
        "peer_video_share": float(video_share) if not pd.isna(video_share) else np.nan,
    }
    for column_index, column in enumerate(PEER_MEDIAN_COLUMNS):
        values = peer_numeric[positions, column_index]
        median = np.nanmedian(values) if np.isfinite(values).any() else np.nan
        record[f"peer_median_{column}"] = float(median) if not pd.isna(median) else np.nan
    return record


def build_peer_features(products: pd.DataFrame, config: PipelineConfig) -> pd.DataFrame:
    required = {"product_id", "product_type", "product_name", "description", "seller_id"}
    missing = sorted(required - set(products.columns))
    if missing:
        raise ValueError(f"Cannot build peers; missing columns: {missing}")

    result = _baseline_metrics(products).reset_index(drop=True)
    records = [_empty_peer_record() for _ in range(len(result))]
    product_ids = result["product_id"].astype(str).to_numpy()
    seller_ids = result["seller_id"].fillna("unknown").astype(str).to_numpy()
    peer_numeric = np.column_stack(
        [pd.to_numeric(result[column], errors="coerce").to_numpy(float) for column in PEER_MEDIAN_COLUMNS]
    )
    peer_video = (
        result["has_video"]
        .map({True: 1.0, False: 0.0, "True": 1.0, "False": 0.0, "true": 1.0, "false": 0.0})
        .to_numpy(float)
    )
    text = (
        result["product_name"].fillna("").astype(str)
        + " "
        + result["description"].fillna("").astype(str)
    ).str.strip()

    valid_for_model = result.get("valid_for_model", pd.Series(True, index=result.index))
    if valid_for_model.dtype == object:
        valid_for_model = valid_for_model.astype(str).str.strip().str.lower().isin(
            {"true", "1", "yes"}
        )
    valid_for_model = valid_for_model.fillna(False).astype(bool)
    for product_type, index in result.loc[valid_for_model].groupby(
        "product_type", sort=False
    ).groups.items():
        positions = np.asarray(list(index), dtype=int)
        if product_type == "unknown" or len(positions) < 2:
            continue
        group_text = text.iloc[positions]
        if not group_text.str.replace(r"\W+", "", regex=True).ne("").any():
            continue
        vectorizer = TfidfVectorizer(
            lowercase=True,
            strip_accents=None,
            ngram_range=(1, 2),
            min_df=min(config.text_min_document_frequency, len(positions)),
            max_features=config.text_max_features,
            sublinear_tf=True,
        )
        try:
            matrix = vectorizer.fit_transform(group_text)
        except ValueError:
            continue
        candidate_count = min(len(positions), max(config.peer_count + 1, config.peer_count * 4))
        neighbors = NearestNeighbors(metric="cosine", algorithm="brute", n_neighbors=candidate_count)
        neighbors.fit(matrix)
        distances, local_neighbors = neighbors.kneighbors(matrix, return_distance=True)

        for local_position, global_position in enumerate(positions):
            selected_positions: list[int] = []
            selected_similarities: list[float] = []
            seller_id = seller_ids[global_position]
            for distance, peer_local_position in zip(
                distances[local_position], local_neighbors[local_position]
            ):
                peer_global_position = int(positions[peer_local_position])
                if peer_global_position == global_position:
                    continue
                if config.exclude_same_seller_from_peers:
                    peer_seller = seller_ids[peer_global_position]
                    if seller_id and seller_id != "unknown" and peer_seller == seller_id:
                        continue
                selected_positions.append(peer_global_position)
                selected_similarities.append(max(0.0, 1.0 - float(distance)))
                if len(selected_positions) == config.peer_count:
                    break
            records[global_position] = _peer_record(
                product_ids,
                peer_numeric,
                peer_video,
                selected_positions,
                selected_similarities,
            )

    peer_frame = pd.DataFrame.from_records(records)
    result = pd.concat([result, peer_frame], axis=1)
    result["peer_quality_reason"] = ""
    result.loc[~valid_for_model, "peer_quality_reason"] = "invalid_essential_data"
    result.loc[
        valid_for_model & result["peer_count"].lt(config.minimum_peer_count),
        "peer_quality_reason",
    ] = "peer_count_below_minimum"
    result.loc[
        valid_for_model
        & result["peer_count"].ge(config.minimum_peer_count)
        & result["mean_peer_similarity"].lt(config.minimum_mean_peer_similarity),
        "peer_quality_reason",
    ] = "peer_similarity_below_minimum"
    result["insufficient_data"] = result["peer_quality_reason"].ne("")
    result["peer_config"] = json.dumps(
        {
            key: value
            for key, value in asdict(config).items()
            if key
            in {
                "peer_count",
                "minimum_peer_count",
                "minimum_mean_peer_similarity",
                "text_max_features",
                "text_min_document_frequency",
                "exclude_same_seller_from_peers",
            }
        },
        ensure_ascii=False,
    )
    return result
