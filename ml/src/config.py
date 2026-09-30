from __future__ import annotations

from dataclasses import dataclass, fields
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class PipelineConfig:
    random_state: int = 42
    peer_count: int = 25
    minimum_peer_count: int = 15
    minimum_mean_peer_similarity: float = 0.05
    taxonomy_review_size: int = 200
    taxonomy_min_coverage: float = 0.90
    taxonomy_min_accuracy: float = 0.85
    positive_rating_threshold: float = 4.0
    minimum_review_evidence: int = 10
    high_sale_probability_threshold: float = 0.50
    prediction_coverage: float = 0.90
    model_folds: int = 5
    text_max_features: int = 50_000
    text_min_document_frequency: int = 2
    exclude_same_seller_from_peers: bool = True
    price_gap_ratio: float = 0.15
    description_gap_ratio: float = 0.30
    video_peer_share_threshold: float = 0.40


def load_config(path: str | Path | None = None) -> PipelineConfig:
    config_path = Path(path or "ml/config/pipeline.yml")
    if not config_path.exists():
        return PipelineConfig()

    with config_path.open(encoding="utf-8") as stream:
        raw: dict[str, Any] = yaml.safe_load(stream) or {}

    allowed = {field.name for field in fields(PipelineConfig)}
    unknown = sorted(set(raw) - allowed)
    if unknown:
        raise ValueError(f"Unknown configuration keys: {unknown}")
    return PipelineConfig(**raw)
