from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil

import pandas as pd

from ml.src.cli import score
from ml.src.config import load_config
from ml.src.peers.build import add_peer_action_features


def main() -> None:
    parser = argparse.ArgumentParser(description="Score six MVP states and evidence-backed rule actions")
    parser.add_argument("--input-dir", type=Path, default=Path("data/processed/taxonomy_v2_run"))
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed/scoring_mvp_v2"))
    args = parser.parse_args()
    if args.input_dir.resolve() == args.output_dir.resolve():
        raise ValueError("Use a separate output directory to preserve previous scores")
    if (args.output_dir / "product_scores.csv").exists():
        raise ValueError("Completed scores already exist; use a new output directory")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    config = load_config()
    source_peers = args.input_dir / "peer_features.csv"
    source_predictions = args.input_dir / "model_predictions.csv"
    peers = pd.read_csv(source_peers, dtype={"product_id": str}, low_memory=False)
    enriched = add_peer_action_features(peers)
    enriched.to_csv(args.output_dir / "peer_features.csv", index=False)
    shutil.copy2(source_predictions, args.output_dir / "model_predictions.csv")
    scores = score(args.output_dir, config)
    status_columns = ["product_id", "product_name", "product_type", "observed_sales", "reference_sales",
                      "sale_probability", "prediction_lower", "prediction_upper", "status", "status_label_vi",
                      "status_reason", "status_explanation_vi", "opportunity_score", "analysis_is_hypothesis",
                      "analysis_limitations_vi", "scoring_rules_version", "model_version", "scored_at"]
    scores[status_columns].to_csv(args.output_dir / "product_statuses.csv", index=False, encoding="utf-8-sig")
    actions = []
    for row in scores.itertuples(index=False):
        for item in json.loads(row.recommendations):
            actions.append({"product_id": row.product_id, **item, "scoring_rules_version": row.scoring_rules_version,
                            "model_version": row.model_version, "scored_at": row.scored_at})
    pd.DataFrame(actions, columns=["product_id", "rule_id", "evidence", "hypothesis", "action", "validation_needed",
                                  "scoring_rules_version", "model_version", "scored_at"]).to_csv(
        args.output_dir / "product_recommendations.csv", index=False, encoding="utf-8-sig"
    )
    summary = json.loads((args.output_dir / "product_scores.summary.json").read_text(encoding="utf-8"))
    summary.update({
        "input_peer_features": str(source_peers), "input_model_predictions": str(source_predictions),
        "input_peer_sha256": hashlib.sha256(source_peers.read_bytes()).hexdigest(),
        "input_prediction_sha256": hashlib.sha256(source_predictions.read_bytes()).hexdigest(),
        "model_retrained": False,
        "good_peer_definition": "Positive observed peer sales at or above the selected peer sales 75th percentile; minimum threshold 1",
        "minimum_good_peer_video_count": config.minimum_good_peer_video_count,
        "video_share_threshold": config.video_peer_share_threshold,
        "quality_acceptance": False,
        "output_directory": str(args.output_dir),
    })
    source_summary = args.input_dir / "run_summary.json"
    if source_summary.exists():
        summary["source_taxonomy_holdout_accuracy"] = json.loads(source_summary.read_text()).get("holdout_frozen_labels_accuracy")
    (args.output_dir / "scoring_run_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8"
    )
    Path("ml/reports/metrics/scoring_mvp_v2.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8"
    )
    print("Completed six-state scoring and flat action exports; model predictions reused", flush=True)


if __name__ == "__main__":
    main()
