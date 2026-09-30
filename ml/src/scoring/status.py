from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from ml.src.config import PipelineConfig


STATUS_LABELS_VI = {
    "positive_feedback_low_sales": "Phản hồi tốt nhưng bán thấp",
    "low_rating_low_sales": "Đánh giá thấp và bán thấp",
    "performing_well": "Đang tốt",
    "untapped_potential": "Tiềm năng chưa khai thác",
    "difficult_to_sell": "Khó bán theo dữ liệu",
    "insufficient_data": "Chưa đủ dữ liệu",
}


def _number(value: Any) -> float | None:
    try:
        number = float(value)
        return number if np.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def _evidence(row: pd.Series) -> list[dict[str, Any]]:
    comparisons = [
        ("price", "peer_median_price"),
        ("discount_rate", "peer_median_discount_rate"),
        ("image_count", "peer_median_image_count"),
        ("rating_average", "peer_median_rating_average"),
        ("review_count", "peer_median_review_count"),
        ("description_length", "peer_median_description_length"),
    ]
    evidence: list[dict[str, Any]] = []
    for observed_column, peer_column in comparisons:
        observed = _number(row.get(observed_column))
        peer_median = _number(row.get(peer_column))
        evidence.append(
            {
                "metric": observed_column,
                "observed": observed,
                "peer_median": peer_median,
                "difference": observed - peer_median
                if observed is not None and peer_median is not None
                else None,
            }
        )
    evidence.append(
        {
            "metric": "has_video",
            "observed": None if pd.isna(row.get("has_video")) else bool(row.get("has_video")),
            "peer_share": _number(row.get("peer_video_share")),
        }
    )
    return evidence


def _recommendations(row: pd.Series, config: PipelineConfig) -> list[dict[str, str]]:
    if row.get("status") in {"performing_well", "difficult_to_sell", "insufficient_data"}:
        return []
    recommendations: list[dict[str, str]] = []
    if row.get("status") == "untapped_potential":
        recommendations.append(
            {
                "evidence": "Sản phẩm chưa phát sinh bán hàng nhưng có xác suất bán được tham chiếu cao.",
                "hypothesis": "Khả năng hiển thị hoặc cách diễn đạt tên sản phẩm có thể cần rà soát.",
                "action": "Kiểm tra từ khóa trong tên, khả năng xuất hiện khi tìm kiếm và trạng thái tồn kho.",
                "validation_needed": "Bổ sung dữ liệu lượt hiển thị, lượt nhấp và tồn kho để xác minh.",
            }
        )
    price = _number(row.get("price"))
    peer_price = _number(row.get("peer_median_price"))
    if price is not None and peer_price and price > peer_price * (1 + config.price_gap_ratio):
        recommendations.append(
            {
                "evidence": f"Giá cao hơn trung vị peer {((price / peer_price) - 1):.0%}.",
                "hypothesis": "Định vị giá có thể chưa phù hợp với nhóm sản phẩm tương đồng.",
                "action": "Rà soát định vị giá và giá trị khác biệt của sản phẩm.",
                "validation_needed": "Theo dõi thay đổi lượt xem, chuyển đổi và doanh số sau thử nghiệm giá.",
            }
        )
    images = _number(row.get("image_count"))
    peer_images = _number(row.get("peer_median_image_count"))
    if images is not None and peer_images is not None and images + 1 <= peer_images:
        recommendations.append(
            {
                "evidence": f"Sản phẩm có {images:.0f} ảnh; trung vị peer là {peer_images:.0f}.",
                "hypothesis": "Thông tin hình ảnh có thể chưa đủ để người mua đánh giá sản phẩm.",
                "action": "Bổ sung ảnh rõ chất liệu, kích thước và các góc sử dụng.",
                "validation_needed": "So sánh tương tác và chuyển đổi trước/sau khi bổ sung ảnh.",
            }
        )
    has_video = row.get("has_video")
    peer_video_share = _number(row.get("peer_video_share"))
    no_video = not pd.isna(has_video) and str(has_video).strip().lower() in {"false", "0", "no"}
    if no_video and peer_video_share is not None and peer_video_share >= config.video_peer_share_threshold:
        recommendations.append(
            {
                "evidence": f"Không có video; {peer_video_share:.0%} sản phẩm peer có video.",
                "hypothesis": "Video có thể giúp trình bày hình dáng hoặc cách sử dụng rõ hơn.",
                "action": "Kiểm tra khả năng bổ sung video sản phẩm ngắn.",
                "validation_needed": "Theo dõi thời gian xem và chuyển đổi sau khi bổ sung video.",
            }
        )
    description = _number(row.get("description_length"))
    peer_description = _number(row.get("peer_median_description_length"))
    description_threshold = max(100.0, (peer_description or 0) * (1 - config.description_gap_ratio))
    if description is not None and description < description_threshold:
        recommendations.append(
            {
                "evidence": f"Mô tả dài {description:.0f} ký tự; ngưỡng tham chiếu là {description_threshold:.0f}.",
                "hypothesis": "Mô tả có thể thiếu thông tin hỗ trợ quyết định mua.",
                "action": "Bổ sung chất liệu, kích thước, công dụng và hướng dẫn sử dụng.",
                "validation_needed": "Rà soát nội dung với câu hỏi thường gặp và theo dõi chuyển đổi.",
            }
        )
    rating = _number(row.get("rating_average"))
    reviews = _number(row.get("review_count")) or 0
    if rating is not None and rating < config.positive_rating_threshold and reviews >= config.minimum_review_evidence:
        recommendations.append(
            {
                "evidence": f"Rating {rating:.1f}/5 từ {reviews:.0f} đánh giá.",
                "hypothesis": "Có thể tồn tại vấn đề lặp lại về chất lượng hoặc trải nghiệm sau mua.",
                "action": "Đọc và phân nhóm nội dung đánh giá trước khi thay đổi sản phẩm.",
                "validation_needed": "Ghi nhận tần suất từng vấn đề và theo dõi rating sau cải thiện.",
            }
        )
    return recommendations


def _status(row: pd.Series, config: PipelineConfig) -> tuple[str, str]:
    if bool(row.get("insufficient_data", False)):
        return "insufficient_data", str(row.get("peer_quality_reason") or "peer_quality_failed")
    sales = _number(row.get("quantity_sold")) or 0.0
    probability = _number(row.get("sale_probability"))
    reference = _number(row.get("reference_sales"))
    lower = _number(row.get("prediction_lower"))
    if reference is None:
        reference = _number(row.get("baseline_median_sales")) or 0.0
    if probability is None:
        probability = _number(row.get("baseline_sold_rate")) or 0.0
    if lower is None:
        lower = reference

    if sales <= 0:
        if probability >= config.high_sale_probability_threshold:
            return "untapped_potential", "zero_sales_high_reference_probability"
        return "difficult_to_sell", "zero_sales_low_reference_probability"

    if sales >= lower:
        return "performing_well", "sales_not_below_prediction_interval"

    reviews = _number(row.get("review_count")) or 0.0
    rating = _number(row.get("rating_average"))
    if reviews < config.minimum_review_evidence or rating is None:
        return "insufficient_data", "insufficient_feedback_for_low_sales_interpretation"
    if rating >= config.positive_rating_threshold:
        return "positive_feedback_low_sales", "good_feedback_sales_below_lower_bound"
    return "low_rating_low_sales", "low_rating_sales_below_lower_bound"


def score_products(
    peer_features: pd.DataFrame,
    model_predictions: pd.DataFrame | None,
    config: PipelineConfig,
) -> pd.DataFrame:
    scored = peer_features.copy().reset_index(drop=True)
    if model_predictions is not None:
        predictions = model_predictions.reset_index(drop=True)
        if "product_id" not in predictions:
            raise ValueError("Model predictions must include product_id")
        if predictions["product_id"].duplicated().any():
            raise ValueError("Model predictions contain duplicated product_id values")
        scored["product_id"] = scored["product_id"].astype(str)
        predictions["product_id"] = predictions["product_id"].astype(str)
        scored = scored.merge(predictions, on="product_id", how="left", validate="one_to_one")
        if scored["model_version"].isna().any():
            raise ValueError("Some products do not have model predictions")
    else:
        scored["sale_probability"] = scored["baseline_sold_rate"]
        scored["reference_sales"] = scored["baseline_median_sales"]
        scored["prediction_lower"] = scored["baseline_median_sales"]
        scored["prediction_upper"] = scored["baseline_median_sales"]
        scored["model_version"] = "peer-baseline-v1"

    scored["peer_insufficient_data"] = scored["insufficient_data"].astype(bool)
    statuses = scored.apply(lambda row: _status(row, config), axis=1)
    scored["status"] = statuses.map(lambda value: value[0])
    scored["status_label_vi"] = scored["status"].map(STATUS_LABELS_VI)
    scored["status_reason"] = statuses.map(lambda value: value[1])
    scored["insufficient_data"] = scored["status"].eq("insufficient_data")
    scored["observed_sales"] = scored["quantity_sold"]
    gap = scored["reference_sales"].fillna(0) - scored["observed_sales"].fillna(0)
    scored["opportunity_score"] = (
        gap.clip(lower=0) / (scored["reference_sales"].fillna(0) + 1)
    ) * scored["sale_probability"].fillna(0)
    scored.loc[scored["insufficient_data"], "opportunity_score"] = np.nan
    scored["evidence"] = scored.apply(
        lambda row: json.dumps(_evidence(row), ensure_ascii=False), axis=1
    )
    scored["recommendations"] = scored.apply(
        lambda row: json.dumps(_recommendations(row, config), ensure_ascii=False), axis=1
    )
    scored["scored_at"] = datetime.now(timezone.utc).isoformat()

    preferred = [
        "product_id", "product_name", "seller_id", "brand", "category_raw", "product_type",
        "price", "quantity_sold", "observed_sales", "peer_ids", "peer_count",
        "mean_peer_similarity", "baseline_median_sales", "baseline_sold_rate",
        "peer_median_quantity_sold", "peer_median_price", "peer_median_discount_rate",
        "peer_median_image_count", "peer_video_share", "peer_median_rating_average",
        "peer_median_review_count", "peer_median_description_length", "sale_probability",
        "conditional_sales", "reference_sales", "prediction_lower", "prediction_upper",
        "opportunity_score", "status", "status_label_vi", "status_reason", "insufficient_data",
        "peer_insufficient_data",
        "evidence", "recommendations", "model_version", "scored_at",
    ]
    remaining = [column for column in scored.columns if column not in preferred]
    return scored[[column for column in preferred if column in scored.columns] + remaining]
