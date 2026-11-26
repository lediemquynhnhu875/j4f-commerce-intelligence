"""Run one retraining job: build A', retrain, apply the four gates and pack a candidate bundle.

    python -m ml.src.retrain.run --base <clean_products.csv> --observations <export.csv> \
        --champion-dir <unpacked running bundle> --previous-summary <product_scores.summary.json> \
        --output-dir <new directory>

The job never publishes or activates anything. It writes `gate_report.json` whose `status` is
`skipped`, `rejected` or `ready`; only `ready` comes with a packed ZIP for a new GitHub Release.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from ml.src.cli import score
from ml.src.config import load_config
from ml.src.models.reference import MODEL_A_CATEGORICAL, MODEL_A_NUMERIC, _prepare_features, train_reference_models
from ml.src.peers.build import build_peer_features
from ml.src.retrain.gates import data_gate, model_gate, output_gate, taxonomy_gate
from ml.src.retrain.training_set import build_training_set, load_retrain_config, sha256
from ml.src.serving import assets
from ml.src.taxonomy.rules import assign_product_types

PIPELINE = Path("ml/config/pipeline.yml")  # `assets.pack` always ships this file
DEFAULT_TAXONOMY = Path("ml/config/taxonomy_v3.yml")


def _write(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False, default=str), encoding="utf-8")


def _protected_ids(path: Path | None) -> set[str]:
    if path is None:
        return set()
    frame = pd.read_csv(path, dtype=str)
    return set(frame["product_id"].dropna().str.strip())


def _fit(products: pd.DataFrame, taxonomy: Path, config_path: Path, directory: Path) -> tuple[dict, Path]:
    """Taxonomy, peers, training and scoring for one configuration, all inside `directory`."""
    config = load_config(config_path)
    processed, artifacts = directory / "processed", directory / "artifacts"
    processed.mkdir(parents=True, exist_ok=True)
    typed = assign_product_types(products, taxonomy)
    typed.to_csv(processed / "clean_products.csv", index=False)
    peers = build_peer_features(typed, config)
    peers.to_csv(processed / "peer_features.csv", index=False)
    predictions, metrics = train_reference_models(peers, artifacts, config)
    predictions.to_csv(processed / "model_predictions.csv", index=False)
    score(processed, config)
    return metrics, processed


def _slice_metrics(sales: np.ndarray, reference: np.ndarray, probability: np.ndarray) -> dict[str, Any]:
    sold = (sales > 0).astype(int)
    roc = float(roc_auc_score(sold, probability)) if len(sold) >= 20 and np.unique(sold).size == 2 else None
    rmsle = float(np.sqrt(np.mean((np.log1p(sales) - np.log1p(reference)) ** 2))) if len(sales) else None
    return {"rows": int(len(sales)), "roc_auc": roc, "rmsle_all": rmsle}


def new_data_report(processed: Path, champion_dir: Path) -> dict[str, Any]:
    """Report-only: challenger out-of-fold versus the frozen running model on store-sourced rows."""
    scores = pd.read_csv(processed / "product_scores.csv", dtype={"product_id": str}, low_memory=False)
    rows = scores.loc[scores["training_source"].eq("store_observation")
                      & scores["valid_for_model"].astype(str).str.lower().eq("true")
                      & scores["sale_probability"].notna()]
    sales = pd.to_numeric(rows["quantity_sold"], errors="coerce").fillna(0).to_numpy(float)
    challenger = _slice_metrics(sales, rows["reference_sales"].to_numpy(float), rows["sale_probability"].to_numpy(float))
    champion = None
    if len(rows):
        bundle = joblib.load(champion_dir / "reference_models.joblib")
        features = _prepare_features(rows, MODEL_A_NUMERIC, MODEL_A_CATEGORICAL)
        probability = bundle["model_a"]["classifier"].predict_proba(features)[:, 1]
        conditional = np.maximum(0.0, np.expm1(bundle["model_a"]["regressor"].predict(features)))
        champion = _slice_metrics(sales, probability * conditional, probability)
    return {"challenger_out_of_fold": challenger, "running_model_frozen": champion,
            "note": ("Report only; not a gate. The running model was trained on the earlier snapshot of the "
                     "corpus products in this slice, so its numbers are optimistic for them.")}


def _package_loads(archive: Path) -> bool:
    from ml.src.serving.inference import ServingModel

    with TemporaryDirectory() as directory:
        assets.unpack(archive, Path(directory), assets.digest(archive))
        ServingModel(Path(directory))  # loading runs one prediction and validates every file
    return True


def run(args: argparse.Namespace) -> dict[str, Any]:
    output = args.output_dir
    if (output / "gate_report.json").exists():
        raise FileExistsError(f"A completed job exists in {output}; use a new output directory")
    output.mkdir(parents=True, exist_ok=True)
    retrain = load_retrain_config(args.retrain_config)
    protected = _protected_ids(args.protected_ids)
    since = datetime.fromisoformat(args.since) if args.since else None
    if since is not None and since.tzinfo is None:
        since = since.replace(tzinfo=timezone.utc)
    base = pd.read_csv(args.base, dtype=str, keep_default_na=False, low_memory=False)
    observations = pd.read_csv(args.observations, dtype=str, keep_default_na=False)
    training, data_summary = build_training_set(base, observations, retrain, since, protected_ids=protected)
    report: dict[str, Any] = {
        "job_id": args.job_id, "started_at": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "base_sha256": sha256(args.base), "observations_sha256": sha256(args.observations),
            "champion_model_version": json.loads((args.champion_dir / "manifest.json").read_text())["model_version"],
            "retrain_config_sha256": sha256(args.retrain_config),
        },
        "data": data_summary,
    }
    if not data_summary["ready"] and not args.allow_insufficient:
        report["status"] = "skipped"
        _write(output / "gate_report.json", report)
        return report

    training_path = output / "training_set.csv"
    training.to_csv(training_path, index=False)
    report["inputs"]["training_set_sha256"] = sha256(training_path)
    products = pd.read_csv(training_path, dtype={"product_id": str, "seller_id": str, "store_id": str},
                           low_memory=False)
    gates: dict[str, Any] = {
        "data": data_gate(assign_product_types(products, args.taxonomy), len(base), protected),
        "taxonomy": taxonomy_gate(sha256(args.taxonomy), sha256(args.champion_dir / "taxonomy.yml"),
                                  json.loads(args.taxonomy_report.read_text()) if args.taxonomy_report else None,
                                  retrain),
    }
    report["gates"] = gates
    if not (gates["data"]["passed"] and gates["taxonomy"]["passed"]):
        report["status"] = "rejected"
        _write(output / "gate_report.json", report)
        return report

    metrics, processed = _fit(products, args.taxonomy, PIPELINE, output / "challenger")
    same_configuration = (sha256(PIPELINE) == sha256(args.champion_dir / "pipeline.yml")
                          and sha256(args.taxonomy) == sha256(args.champion_dir / "taxonomy.yml"))
    if same_configuration:
        # Same code and configuration on the same data would reproduce the challenger exactly.
        champion_metrics = metrics
    else:
        champion_metrics, _ = _fit(products, args.champion_dir / "taxonomy.yml",
                                   args.champion_dir / "pipeline.yml", output / "champion")
    report["champion"] = {"retrained_on_new_data": not same_configuration,
                          "reason": "identical pipeline and taxonomy" if same_configuration else "configuration changed"}
    running = json.loads((args.champion_dir / "model_metrics.json").read_text(encoding="utf-8"))
    gates["model"] = model_gate(metrics, champion_metrics, retrain,
                                running["model_a_actionable"]["estimator_backend"])
    report["new_data_slice"] = new_data_report(processed, args.champion_dir)
    scoring = json.loads((processed / "product_scores.summary.json").read_text(encoding="utf-8"))
    report["scoring_summary"] = scoring
    report["model_metrics"] = metrics

    archive = output / f"sellens-ml-{metrics['model_version']}.zip"
    assets.pack(output / "challenger" / "artifacts", processed / "clean_products.csv", archive, args.taxonomy)
    try:
        loaded = _package_loads(archive)
    except Exception as error:  # Any load failure must block the release, with its reason recorded.
        loaded, report["package_error"] = False, f"{type(error).__name__}: {error}"
    previous = json.loads(args.previous_summary.read_text(encoding="utf-8"))
    gates["output"] = output_gate(scoring, previous, loaded, retrain)

    report["status"] = "ready" if all(gate["passed"] for gate in gates.values()) else "rejected"
    report["candidate"] = {"model_version": metrics["model_version"], "archive": archive.name,
                           "sha256": assets.digest(archive)}
    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    _write(output / "gate_report.json", report)
    return report


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    command.add_argument("--base", type=Path, required=True, help="Base corpus clean_products.csv")
    command.add_argument("--observations", type=Path, required=True, help="Verified observation export")
    command.add_argument("--champion-dir", type=Path, required=True, help="Unpacked bundle of the running model")
    command.add_argument("--previous-summary", type=Path, required=True,
                         help="product_scores.summary.json of the running model")
    command.add_argument("--output-dir", type=Path, required=True)
    command.add_argument("--since", help="ISO time of the last training run; counts newer verified observations")
    command.add_argument("--taxonomy", type=Path, default=DEFAULT_TAXONOMY)
    command.add_argument("--taxonomy-report", type=Path, help="Random-sample score, required if rules changed")
    command.add_argument("--protected-ids", type=Path, help="CSV with a product_id column never taken from store data")
    command.add_argument("--retrain-config", type=Path, default=Path("ml/config/retrain.yml"))
    command.add_argument("--job-id", default=None)
    command.add_argument("--allow-insufficient", action="store_true",
                         help="Manual runs only: train even below the minimum new-data threshold")
    return command


def main() -> None:
    report = run(parser().parse_args())
    print(json.dumps({"status": report["status"], "candidate": report.get("candidate"),
                      "skip_reasons": report["data"]["skip_reasons"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
