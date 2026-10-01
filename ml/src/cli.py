from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from ml.src.config import PipelineConfig, load_config
from ml.src.data.clean import clean_products
from ml.src.evaluation.review_queues import create_review_queues, evaluate_review_queues
from ml.src.models.reference import train_reference_models
from ml.src.peers.build import build_peer_features
from ml.src.scoring.status import score_products
from ml.src.taxonomy.rules import (
    assign_product_types,
    create_review_sample,
    evaluate_review_sample,
    evaluate_taxonomy_predictions,
)


DEFAULT_RAW_DIR = Path("data/raw")
DEFAULT_PROCESSED_DIR = Path("data/processed")
DEFAULT_ARTIFACT_DIR = Path("ml/artifacts")
DEFAULT_CONFIG = Path("ml/config/pipeline.yml")
DEFAULT_TAXONOMY = Path("ml/config/taxonomy.yml")


def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Required input does not exist: {path}")
    return pd.read_csv(path, low_memory=False)


def prepare(
    raw_dir: Path,
    processed_dir: Path,
    taxonomy_path: Path,
    config: PipelineConfig,
) -> pd.DataFrame:
    products, report = clean_products(raw_dir, processed_dir)
    products = assign_product_types(products, taxonomy_path)
    products.to_csv(processed_dir / "clean_products.csv", index=False)
    review_path = processed_dir / "taxonomy_review_sample.csv"
    review_sample = create_review_sample(
        products,
        review_path,
        config.taxonomy_review_size,
        config.random_state,
    )
    review_metrics_path = processed_dir / "taxonomy_review_metrics.json"
    valid_review_values = {"true", "false", "1", "0", "yes", "no", "đúng", "sai"}
    review_complete = review_sample["is_correct"].astype(str).str.lower().isin(valid_review_values).all()
    if review_complete and len(review_sample):
        evaluate_review_sample(review_path)
    elif review_metrics_path.exists():
        review_metrics_path.unlink()
    coverage = float(products["product_type"].ne("unknown").mean())
    fallback_rate = float(products["taxonomy_source"].eq("source_fallback").mean())
    taxonomy_summary = {
        "rows": int(len(products)),
        "assigned_rows": int(products["product_type"].ne("unknown").sum()),
        "coverage": coverage,
        "rule_coverage": float(products["taxonomy_source"].ne("source_fallback").mean()),
        "fallback_rate": fallback_rate,
        "source_counts": {
            str(key): int(value)
            for key, value in products["taxonomy_source"].value_counts().items()
        },
        "product_type_counts": {
            str(key): int(value) for key, value in products["product_type"].value_counts().items()
        },
    }
    with (processed_dir / "taxonomy_summary.json").open("w", encoding="utf-8") as stream:
        json.dump(taxonomy_summary, stream, ensure_ascii=False, indent=2)
    print(
        json.dumps(
            {
                "clean_rows": report["clean_rows"],
                "exact_duplicates_removed": report["exact_duplicates_removed"],
                "duplicated_product_id_count": report["duplicated_product_id_count"],
                "taxonomy_coverage": coverage,
                "taxonomy_rule_coverage": taxonomy_summary["rule_coverage"],
                "taxonomy_fallback_rate": fallback_rate,
                "taxonomy_target": config.taxonomy_min_coverage,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return products


def peers(processed_dir: Path, config: PipelineConfig) -> pd.DataFrame:
    products = _read_csv(processed_dir / "clean_products.csv")
    coverage = float(products["product_type"].ne("unknown").mean())
    if coverage < config.taxonomy_min_coverage:
        raise ValueError(
            f"Taxonomy coverage {coverage:.2%} is below the required "
            f"{config.taxonomy_min_coverage:.2%}. Improve taxonomy rules before building peers."
        )
    review_metrics_path = processed_dir / "taxonomy_review_metrics.json"
    if not review_metrics_path.exists():
        raise ValueError(
            "Taxonomy review is incomplete. Fill every is_correct cell in "
            "taxonomy_review_sample.csv and run validate-taxonomy before building peers."
        )
    review_metrics = json.loads(review_metrics_path.read_text(encoding="utf-8"))
    if review_metrics.get("reviewed_rows") != review_metrics.get("sample_rows"):
        raise ValueError("Taxonomy review metrics are incomplete; review all sampled rows.")
    if review_metrics.get("accuracy", 0.0) < config.taxonomy_min_accuracy:
        raise ValueError(
            f"Reviewed taxonomy accuracy {review_metrics.get('accuracy', 0.0):.2%} is below "
            f"the required {config.taxonomy_min_accuracy:.2%}."
        )
    peer_features = build_peer_features(products, config)
    peer_features.to_csv(processed_dir / "peer_features.csv", index=False)
    print(
        json.dumps(
            {
                "rows": len(peer_features),
                "sufficient_peer_groups": int((~peer_features["insufficient_data"]).sum()),
                "minimum_peer_count": config.minimum_peer_count,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return peer_features


def train(processed_dir: Path, artifact_dir: Path, config: PipelineConfig) -> pd.DataFrame:
    peer_features = _read_csv(processed_dir / "peer_features.csv")
    predictions, metrics = train_reference_models(peer_features, artifact_dir, config)
    predictions.to_csv(processed_dir / "model_predictions.csv", index=False)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    return predictions


def score(processed_dir: Path, config: PipelineConfig, baseline_only: bool = False) -> pd.DataFrame:
    peer_features = _read_csv(processed_dir / "peer_features.csv")
    prediction_path = processed_dir / "model_predictions.csv"
    predictions = None if baseline_only else _read_csv(prediction_path)
    scored = score_products(peer_features, predictions, config)
    scored.to_csv(processed_dir / "product_scores.csv", index=False)
    print(
        json.dumps(
            {
                "rows": len(scored),
                "status_counts": scored["status"].value_counts(dropna=False).to_dict(),
                "output": str(processed_dir / "product_scores.csv"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return scored


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="J4F data and reference-sales pipeline")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare_parser = subparsers.add_parser("prepare", help="Merge, clean, and assign taxonomy")
    prepare_parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR)
    prepare_parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    prepare_parser.add_argument("--taxonomy", type=Path, default=DEFAULT_TAXONOMY)

    peer_parser = subparsers.add_parser("peers", help="Build baseline and TF-IDF peer groups")
    peer_parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)

    train_parser = subparsers.add_parser("train", help="Train and evaluate Model A and Model B")
    train_parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    train_parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)

    score_parser = subparsers.add_parser("score", help="Assign status and recommendations")
    score_parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    score_parser.add_argument("--baseline-only", action="store_true")

    all_parser = subparsers.add_parser("run-all", help="Run the full data and model pipeline")
    all_parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR)
    all_parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    all_parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    all_parser.add_argument("--taxonomy", type=Path, default=DEFAULT_TAXONOMY)

    review_parser = subparsers.add_parser(
        "validate-taxonomy", help="Calculate coverage and accuracy from the reviewed sample"
    )
    review_parser.add_argument(
        "--review-file",
        type=Path,
        default=DEFAULT_PROCESSED_DIR / "taxonomy_review_sample.csv",
    )
    review_parser.add_argument(
        "--products-file",
        type=Path,
        default=DEFAULT_PROCESSED_DIR / "clean_products.csv",
        help="Current taxonomy predictions to compare with the reviewed gold labels",
    )
    review_parser.add_argument(
        "--metrics-file",
        type=Path,
        default=DEFAULT_PROCESSED_DIR / "taxonomy_review_metrics.json",
    )

    queue_parser = subparsers.add_parser(
        "create-review-queues",
        help="Create independent taxonomy, fallback, and peer manual-review queues",
    )
    queue_parser.add_argument(
        "--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR
    )
    queue_parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_PROCESSED_DIR / "review_queues",
    )
    queue_parser.add_argument(
        "--reviewed-file",
        type=Path,
        action="append",
        default=[],
        help="Previously reviewed taxonomy CSV; may be passed more than once",
    )

    queue_metrics_parser = subparsers.add_parser(
        "evaluate-review-queues", help="Summarize completed taxonomy and peer reviews"
    )
    queue_metrics_parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_PROCESSED_DIR / "review_queues",
    )
    return parser


def main() -> None:
    args = _parser().parse_args()
    config = load_config(args.config)
    if args.command == "prepare":
        prepare(args.raw_dir, args.processed_dir, args.taxonomy, config)
    elif args.command == "peers":
        peers(args.processed_dir, config)
    elif args.command == "train":
        train(args.processed_dir, args.artifact_dir, config)
    elif args.command == "score":
        score(args.processed_dir, config, args.baseline_only)
    elif args.command == "run-all":
        prepare(args.raw_dir, args.processed_dir, args.taxonomy, config)
        peers(args.processed_dir, config)
        train(args.processed_dir, args.artifact_dir, config)
        score(args.processed_dir, config)
    elif args.command == "validate-taxonomy":
        products = _read_csv(args.products_file)
        metrics, _ = evaluate_taxonomy_predictions(
            products, args.review_file, args.metrics_file
        )
        passed = (
            metrics["reviewed_rows"] == metrics["sample_rows"]
            and metrics["coverage"] >= config.taxonomy_min_coverage
            and metrics["accuracy"] >= config.taxonomy_min_accuracy
        )
        print(json.dumps({**metrics, "passed": passed}, ensure_ascii=False, indent=2))
        if not passed:
            raise SystemExit(2)
    elif args.command == "create-review-queues":
        reviewed_files = args.reviewed_file or [
            args.processed_dir / "taxonomy_sample_reviewed.csv",
            args.processed_dir / "taxonomy_review_sample.csv",
        ]
        metrics = create_review_queues(
            _read_csv(args.processed_dir / "clean_products.csv"),
            _read_csv(args.processed_dir / "peer_features.csv"),
            args.output_dir,
            reviewed_files,
        )
        print(json.dumps(metrics, ensure_ascii=False, indent=2))
    elif args.command == "evaluate-review-queues":
        print(json.dumps(evaluate_review_queues(args.output_dir), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
