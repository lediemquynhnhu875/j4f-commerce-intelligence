from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd


TAXONOMY_REVIEW_COLUMNS = ("human_product_type", "review_note")
FALLBACK_REVIEW_COLUMNS = (
    "proposed_product_type",
    "rule_keyword_suggestion",
    "review_note",
)
PEER_REVIEW_COLUMNS = ("is_relevant", "review_note")
VALID_RELEVANCE_VALUES = {"đúng", "sai", "true", "false", "yes", "no", "1", "0"}
POSITIVE_RELEVANCE_VALUES = {"đúng", "true", "yes", "1"}


def _balanced_sample(
    frame: pd.DataFrame,
    size: int,
    strata: list[str],
    random_state: int,
) -> pd.DataFrame:
    if frame.empty or size <= 0:
        return frame.head(0).copy()
    sample_size = min(size, len(frame))
    shuffled = frame.sample(frac=1, random_state=random_state).copy()
    shuffled["_stratum_rank"] = shuffled.groupby(strata, dropna=False).cumcount()
    shuffled["_random_order"] = np.random.default_rng(random_state).random(len(shuffled))
    selected = shuffled.sort_values(["_stratum_rank", "_random_order"]).head(sample_size)
    return selected.drop(columns=["_stratum_rank", "_random_order"])


def _reviewed_ids(paths: Iterable[str | Path]) -> set[str]:
    reviewed: set[str] = set()
    for raw_path in paths:
        path = Path(raw_path)
        if not path.exists():
            continue
        frame = pd.read_csv(path, dtype=str, usecols=lambda column: column == "product_id")
        if "product_id" in frame:
            reviewed.update(frame["product_id"].dropna().astype(str))
    return reviewed


def _preserve_annotations(
    new_frame: pd.DataFrame,
    output_path: Path,
    keys: list[str],
    annotation_columns: tuple[str, ...],
) -> pd.DataFrame:
    result = new_frame.copy()
    for key in keys:
        result[key] = result[key].astype(str)
    for column in annotation_columns:
        result[column] = ""
    if not output_path.exists():
        return result
    previous = pd.read_csv(output_path, dtype=str).fillna("")
    available = [column for column in annotation_columns if column in previous]
    if not available or any(key not in previous for key in keys):
        return result
    for key in keys:
        previous[key] = previous[key].astype(str)
    annotations = previous[keys + available].drop_duplicates(keys, keep="last")
    annotations = annotations.rename(
        columns={column: f"_previous_{column}" for column in available}
    )
    result = result.merge(annotations, on=keys, how="left", validate="one_to_one")
    for column in available:
        result[column] = result[f"_previous_{column}"].fillna("")
        result = result.drop(columns=f"_previous_{column}")
    return result


def create_taxonomy_holdout(
    products: pd.DataFrame,
    output_dir: str | Path,
    reviewed_paths: Iterable[str | Path],
    sample_size: int = 300,
    random_state: int = 2026,
) -> pd.DataFrame:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    candidates = products.copy()
    candidates["product_id"] = candidates["product_id"].astype(str)
    candidates = candidates.loc[~candidates["product_id"].isin(_reviewed_ids(reviewed_paths))]

    fallback_target = min(len(candidates), max(1, sample_size // 3))
    fallback = _balanced_sample(
        candidates.loc[candidates["taxonomy_source"].eq("source_fallback")],
        fallback_target,
        ["product_type", "source_file"],
        random_state,
    )
    rule_target = min(sample_size - len(fallback), len(candidates) - len(fallback))
    rules = _balanced_sample(
        candidates.loc[
            ~candidates["taxonomy_source"].eq("source_fallback")
            & ~candidates["product_id"].isin(fallback["product_id"])
        ],
        rule_target,
        ["product_type", "taxonomy_source"],
        random_state + 1,
    )
    selected = pd.concat([fallback, rules], ignore_index=True).sample(
        frac=1, random_state=random_state
    )
    public_columns = [
        "product_id",
        "product_name",
        "description",
        "category_raw",
        "source_file",
    ]
    review_path = output / "taxonomy_holdout_review.csv"
    review = _preserve_annotations(
        selected[public_columns], review_path, ["product_id"], TAXONOMY_REVIEW_COLUMNS
    )
    review.to_csv(review_path, index=False)
    selected[
        ["product_id", "product_type", "taxonomy_source", "taxonomy_match"]
    ].rename(columns={"product_type": "predicted_product_type"}).to_csv(
        output / "taxonomy_holdout_predictions_private.csv", index=False
    )
    return review


def create_fallback_review(
    products: pd.DataFrame,
    output_dir: str | Path,
    sample_size: int = 150,
    random_state: int = 2026,
) -> pd.DataFrame:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    fallback = products.loc[products["taxonomy_source"].eq("source_fallback")].copy()
    selected = _balanced_sample(
        fallback, sample_size, ["product_type", "source_file"], random_state
    )
    columns = [
        "product_id",
        "product_name",
        "description",
        "category_raw",
        "product_type",
        "source_file",
    ]
    review_path = output / "taxonomy_fallback_review.csv"
    review = _preserve_annotations(
        selected[columns].rename(columns={"product_type": "current_fallback_label"}),
        review_path,
        ["product_id"],
        FALLBACK_REVIEW_COLUMNS,
    )
    review.to_csv(review_path, index=False)
    return review


def create_peer_review(
    peer_features: pd.DataFrame,
    output_dir: str | Path,
    target_count: int = 50,
    peers_per_target: int = 5,
    random_state: int = 2026,
) -> pd.DataFrame:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    products = peer_features.copy()
    products["product_id"] = products["product_id"].astype(str)
    eligible = products.loc[products["peer_count"].ge(peers_per_target)].copy()
    eligible["similarity_band"] = pd.qcut(
        eligible["mean_peer_similarity"].rank(method="first"),
        q=3,
        labels=["low", "medium", "high"],
    ).astype(str)
    targets = _balanced_sample(
        eligible, target_count, ["product_type", "similarity_band"], random_state
    )
    lookup = products.set_index("product_id", drop=False)
    rows: list[dict[str, Any]] = []
    for target in targets.itertuples(index=False):
        peer_ids = json.loads(target.peer_ids)[:peers_per_target]
        for rank, peer_id in enumerate(peer_ids, start=1):
            peer = lookup.loc[str(peer_id)]
            rows.append(
                {
                    "target_product_id": str(target.product_id),
                    "target_product_name": target.product_name,
                    "target_description": target.description,
                    "target_product_type": target.product_type,
                    "target_price": target.price,
                    "target_mean_peer_similarity": target.mean_peer_similarity,
                    "similarity_band": target.similarity_band,
                    "peer_rank": rank,
                    "peer_product_id": str(peer.product_id),
                    "peer_product_name": peer.product_name,
                    "peer_description": peer.description,
                    "peer_product_type": peer.product_type,
                    "peer_price": peer.price,
                }
            )
    review_path = output / "peer_pairs_review.csv"
    pairs = pd.DataFrame(rows)
    pairs = _preserve_annotations(
        pairs,
        review_path,
        ["target_product_id", "peer_product_id"],
        PEER_REVIEW_COLUMNS,
    )
    pairs.to_csv(review_path, index=False)
    return pairs


def create_review_queues(
    products: pd.DataFrame,
    peer_features: pd.DataFrame,
    output_dir: str | Path,
    reviewed_paths: Iterable[str | Path],
    random_state: int = 2026,
) -> dict[str, int]:
    holdout = create_taxonomy_holdout(
        products, output_dir, reviewed_paths, random_state=random_state
    )
    fallback = create_fallback_review(products, output_dir, random_state=random_state)
    peers = create_peer_review(peer_features, output_dir, random_state=random_state)
    label_set = sorted(
        set(
            products.loc[
                ~products["taxonomy_source"].eq("source_fallback"), "product_type"
            ].dropna()
        )
        | {"ambiguous", "out_of_scope"}
    )
    pd.DataFrame(
        {
            "product_type": label_set,
            "usage": [
                "Chỉ dùng khi không thể xác định một loại sản phẩm duy nhất."
                if label == "ambiguous"
                else "Sản phẩm nằm ngoài phạm vi thời trang của dự án."
                if label == "out_of_scope"
                else "Nhãn product type chuẩn."
                for label in label_set
            ],
        }
    ).to_csv(Path(output_dir) / "taxonomy_label_set.csv", index=False)
    return {
        "taxonomy_holdout_rows": len(holdout),
        "taxonomy_fallback_rows": len(fallback),
        "peer_pair_rows": len(peers),
        "peer_target_rows": int(peers["target_product_id"].nunique()),
    }


def evaluate_review_queues(output_dir: str | Path) -> dict[str, Any]:
    output = Path(output_dir)
    valid_labels = set(
        pd.read_csv(output / "taxonomy_label_set.csv", dtype=str)["product_type"]
        .dropna()
        .str.strip()
    )
    holdout = pd.read_csv(output / "taxonomy_holdout_review.csv", dtype=str).fillna("")
    predictions = pd.read_csv(
        output / "taxonomy_holdout_predictions_private.csv", dtype=str
    ).fillna("")
    holdout = holdout.merge(predictions, on="product_id", how="left", validate="one_to_one")
    holdout_complete = holdout["human_product_type"].str.strip().ne("")
    holdout_valid = holdout["human_product_type"].isin(valid_labels)
    holdout_correct = holdout["human_product_type"].eq(holdout["predicted_product_type"])

    fallback = pd.read_csv(output / "taxonomy_fallback_review.csv", dtype=str).fillna("")
    fallback_complete = fallback["proposed_product_type"].str.strip().ne("")
    fallback_valid = fallback["proposed_product_type"].isin(valid_labels)
    fallback_changed = fallback["proposed_product_type"].ne(fallback["current_fallback_label"])

    peers = pd.read_csv(output / "peer_pairs_review.csv", dtype=str).fillna("")
    relevance = peers["is_relevant"].str.strip().str.lower()
    peer_complete = relevance.isin(VALID_RELEVANCE_VALUES)
    peer_positive = relevance.isin(POSITIVE_RELEVANCE_VALUES)

    holdout_by_source: dict[str, dict[str, float | int | None]] = {}
    for source, rows in holdout.groupby("taxonomy_source", dropna=False):
        reviewed = rows["human_product_type"].str.strip().ne("")
        correct = rows["human_product_type"].eq(rows["predicted_product_type"])
        holdout_by_source[str(source)] = {
            "sample_rows": int(len(rows)),
            "reviewed_rows": int(reviewed.sum()),
            "accuracy_reviewed": float(correct[reviewed].mean()) if reviewed.any() else None,
        }

    peer_by_band: dict[str, dict[str, float | int | None]] = {}
    for band, rows in peers.groupby("similarity_band", dropna=False):
        values = rows["is_relevant"].str.strip().str.lower()
        reviewed = values.isin(VALID_RELEVANCE_VALUES)
        positive = values.isin(POSITIVE_RELEVANCE_VALUES)
        peer_by_band[str(band)] = {
            "pair_rows": int(len(rows)),
            "reviewed_pairs": int(reviewed.sum()),
            "relevance_rate_reviewed": float(positive[reviewed].mean())
            if reviewed.any()
            else None,
        }
    metrics = {
        "taxonomy_holdout": {
            "sample_rows": int(len(holdout)),
            "reviewed_rows": int(holdout_complete.sum()),
            "invalid_label_rows": int((holdout_complete & ~holdout_valid).sum()),
            "accuracy_reviewed": float(holdout_correct[holdout_complete].mean())
            if holdout_complete.any()
            else None,
            "by_taxonomy_source": holdout_by_source,
        },
        "taxonomy_fallback": {
            "sample_rows": int(len(fallback)),
            "reviewed_rows": int(fallback_complete.sum()),
            "invalid_label_rows": int((fallback_complete & ~fallback_valid).sum()),
            "changed_label_rows": int((fallback_complete & fallback_changed).sum()),
            "keyword_suggestion_rows": int(
                fallback["rule_keyword_suggestion"].str.strip().ne("").sum()
            ),
        },
        "peer_review": {
            "pair_rows": int(len(peers)),
            "target_rows": int(peers["target_product_id"].nunique()),
            "reviewed_pairs": int(peer_complete.sum()),
            "relevance_rate_reviewed": float(peer_positive[peer_complete].mean())
            if peer_complete.any()
            else None,
            "by_similarity_band": peer_by_band,
        },
    }
    with (output / "review_queue_metrics.json").open("w", encoding="utf-8") as stream:
        json.dump(metrics, stream, ensure_ascii=False, indent=2)
    return metrics
