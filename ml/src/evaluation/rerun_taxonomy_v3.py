"""Experimental rerun of peers, reference models and scoring on taxonomy v3.

    python3 -m ml.src.evaluation.rerun_taxonomy_v3

Writes to new directories only; v2 outputs, the web snapshot and the serving bundle are untouched.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from ml.src.cli import score
from ml.src.config import load_config
from ml.src.models.reference import train_reference_models
from ml.src.peers.build import build_peer_features
from ml.src.taxonomy.rules import assign_product_types

RULES = Path("ml/config/taxonomy_v3.yml")


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=Path("data/processed/clean_products.csv"))
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed/taxonomy_v3_run"))
    parser.add_argument("--artifact-dir", type=Path, default=Path("ml/artifacts/taxonomy_v3_run"))
    parser.add_argument("--report", type=Path, default=Path("ml/reports/metrics/taxonomy_v3_run.json"))
    args = parser.parse_args()
    if (args.output_dir / "run_summary.json").exists():
        raise ValueError("Completed experiment exists; use a new output directory to preserve its results")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.artifact_dir.mkdir(parents=True, exist_ok=True)
    config = load_config()

    print("Stage: taxonomy v3", flush=True)
    original = pd.read_csv(args.source, dtype={"product_id": str}, low_memory=False)
    products = assign_product_types(original, RULES)
    assert products.product_id.is_unique and len(products) == len(original)
    products.to_csv(args.output_dir / "clean_products.csv", index=False)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "run_mode": "experimental_user_requested_rerun",
        "taxonomy_version": "v3-head-noun",
        "source_products_sha256": _sha(args.source),
        "taxonomy_sha256": _sha(RULES),
        "rows": len(products),
        "source_counts": products.taxonomy_source.value_counts().to_dict(),
        "out_of_scope_rows": int(products.product_type.eq("out_of_scope").sum()),
        "quality_acceptance": False,
    }

    print("Stage: peer groups", flush=True)
    peers = build_peer_features(products, config)
    peers.to_csv(args.output_dir / "peer_features.csv", index=False)
    summary["sufficient_peer_products"] = int((~peers.insufficient_data).sum())
    summary["peer_quality_reason_counts"] = peers.peer_quality_reason.replace("", "passed").value_counts().to_dict()

    print("Stage: reference models (seller-grouped evaluation)", flush=True)
    predictions, model_metrics = train_reference_models(peers, args.artifact_dir, config)
    predictions.to_csv(args.output_dir / "model_predictions.csv", index=False)
    summary["model_metrics"] = model_metrics

    print("Stage: statuses and recommendations", flush=True)
    scores = score(args.output_dir, config)
    assert len(scores) == len(products) and scores.product_id.is_unique
    summary["scoring_summary"] = json.loads((args.output_dir / "product_scores.summary.json").read_text(encoding="utf-8"))
    summary["output_dir"], summary["artifact_dir"] = str(args.output_dir), str(args.artifact_dir)
    text = json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False, default=str)
    (args.output_dir / "run_summary.json").write_text(text, encoding="utf-8")
    args.report.write_text(text, encoding="utf-8")
    print("Completed experimental taxonomy-v3 rerun", flush=True)


if __name__ == "__main__":
    main()
