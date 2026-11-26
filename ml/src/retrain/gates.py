"""The four acceptance gates for a retrained candidate. Each gate returns a JSON-safe dict."""
from __future__ import annotations

from typing import Any

import pandas as pd

from ml.src.retrain.training_set import RetrainConfig

REQUIRED_TRAINING_COLUMNS = ("product_id", "seller_id", "product_name", "price", "quantity_sold", "product_type")


def data_gate(training: pd.DataFrame, base_rows: int, protected_ids: set[str]) -> dict[str, Any]:
    missing = sorted(set(REQUIRED_TRAINING_COLUMNS) - set(training.columns))
    ids = training["product_id"].astype(str) if "product_id" in training else pd.Series(dtype=str)
    from_store = training.get("training_source", pd.Series("corpus", index=training.index)).eq("store_observation")
    leaked = int(ids[from_store].isin(protected_ids).sum())
    checks = {
        "required_columns_present": not missing,
        "product_ids_unique": bool(ids.is_unique),
        "rows_not_below_base": len(training) >= base_rows,
        "no_protected_ids_from_store_data": leaked == 0,
    }
    return {"passed": all(checks.values()), "checks": checks, "missing_columns": missing,
            "rows": int(len(training)), "base_rows": base_rows}


def taxonomy_gate(
    challenger_sha: str, champion_sha: str, report: dict[str, Any] | None, config: RetrainConfig,
) -> dict[str, Any]:
    """Rules are fixed and change only through code review; changed rules need a scored random sample."""
    if challenger_sha == champion_sha:
        return {"passed": True, "rules_changed": False}
    accuracy = None if report is None else report.get("accuracy")
    passed = accuracy is not None and accuracy >= config.taxonomy_min_accuracy
    return {"passed": bool(passed), "rules_changed": True, "random_sample_accuracy": accuracy,
            "minimum": config.taxonomy_min_accuracy,
            "note": None if report else "Taxonomy rules changed but no random-sample report was supplied"}


def model_gate(
    challenger: dict[str, Any], champion: dict[str, Any], config: RetrainConfig, running_backend: str | None = None,
) -> dict[str, Any]:
    new, old = challenger["model_a_actionable"], champion["model_a_actionable"]
    baseline = challenger["peer_baseline"]
    running_backend = running_backend or old.get("estimator_backend")
    checks = {
        # A different boosting library changes the metrics by itself (seen with LightGBM vs scikit-learn).
        "same_estimator_backend_as_running_model": new.get("estimator_backend") == running_backend,
        "roc_auc_within_tolerance": new["roc_auc"] >= old["roc_auc"] - config.roc_auc_tolerance,
        "rmsle_within_tolerance": new["rmsle_all"] <= old["rmsle_all"] + config.rmsle_tolerance,
        "roc_auc_beats_peer_baseline": new["roc_auc"] > baseline["roc_auc"],
        "rmsle_beats_peer_baseline": new["rmsle_all"] < baseline["rmsle_all"],
    }
    return {
        "passed": all(checks.values()), "checks": checks,
        "challenger": {"roc_auc": new["roc_auc"], "rmsle_all": new["rmsle_all"]},
        "champion": {"roc_auc": old["roc_auc"], "rmsle_all": old["rmsle_all"]},
        "peer_baseline": {"roc_auc": baseline["roc_auc"], "rmsle_all": baseline["rmsle_all"]},
        "tolerances": {"roc_auc": config.roc_auc_tolerance, "rmsle": config.rmsle_tolerance},
        "estimator_backend": {"challenger": new.get("estimator_backend"), "running": running_backend},
    }


def _shares(summary: dict[str, Any]) -> dict[str, float]:
    counts = summary["status_counts"]
    total = sum(counts.values())
    return {status: count / total for status, count in counts.items()} if total else {}


def output_gate(
    challenger_summary: dict[str, Any], previous_summary: dict[str, Any], package_loaded: bool,
    config: RetrainConfig,
) -> dict[str, Any]:
    new, old = _shares(challenger_summary), _shares(previous_summary)
    shift = {status: round(new.get(status, 0.0) - old.get(status, 0.0), 6) for status in sorted(set(new) | set(old))}
    largest = max((abs(value) for value in shift.values()), default=0.0)
    checks = {
        "status_shares_within_tolerance": largest <= config.status_share_tolerance,
        "package_loads_and_predicts": package_loaded,
    }
    return {"passed": all(checks.values()), "checks": checks, "status_share_change": shift,
            "largest_change": round(largest, 6), "tolerance": config.status_share_tolerance}
