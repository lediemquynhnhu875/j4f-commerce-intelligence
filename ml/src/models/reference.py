from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    mean_absolute_error,
    roc_auc_score,
)
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml.src.config import PipelineConfig

try:
    from lightgbm import LGBMClassifier, LGBMRegressor

    BOOSTING_BACKEND = "lightgbm"
except ImportError:  # The pipeline remains runnable before optional boosting dependencies are installed.
    LGBMClassifier = None
    LGBMRegressor = None
    BOOSTING_BACKEND = "sklearn_hist_gradient_boosting"


MODEL_A_NUMERIC = [
    "price",
    "discount_rate",
    "description_length",
    "name_length",
    "image_count",
    "has_video",
]
MODEL_A_CATEGORICAL = ["fulfillment_type", "product_type"]
MODEL_B_NUMERIC = MODEL_A_NUMERIC + ["review_count", "rating_average"]
MODEL_B_CATEGORICAL = MODEL_A_CATEGORICAL


def _prepare_features(frame: pd.DataFrame, numeric: list[str], categorical: list[str]) -> pd.DataFrame:
    result = pd.DataFrame(index=frame.index)
    for column in numeric:
        if column == "has_video":
            values = frame.get(column, pd.Series(index=frame.index, dtype=object))
            if values.dtype == object:
                values = values.map(
                    lambda value: {
                        "true": 1.0,
                        "1": 1.0,
                        "yes": 1.0,
                        "false": 0.0,
                        "0": 0.0,
                        "no": 0.0,
                    }.get(str(value).strip().lower(), np.nan)
                )
            result[column] = pd.to_numeric(values, errors="coerce")
        else:
            result[column] = pd.to_numeric(frame.get(column), errors="coerce")
    for column in categorical:
        result[column] = frame.get(column, "unknown").fillna("unknown").astype(str)
    return result


def _build_estimator(
    numeric: list[str],
    categorical: list[str],
    task: str,
    random_state: int,
) -> Pipeline:
    preprocess = ColumnTransformer(
        [
            ("numeric", SimpleImputer(strategy="median", add_indicator=True), numeric),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                categorical,
            ),
        ],
        remainder="drop",
    )
    if task == "classification" and LGBMClassifier is not None:
        estimator = LGBMClassifier(
            n_estimators=350,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=random_state,
            verbosity=-1,
        )
    elif task == "regression" and LGBMRegressor is not None:
        estimator = LGBMRegressor(
            objective="regression_l1",
            n_estimators=350,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=random_state,
            verbosity=-1,
        )
    elif task == "classification":
        estimator = HistGradientBoostingClassifier(
            learning_rate=0.06,
            max_iter=250,
            max_leaf_nodes=31,
            l2_regularization=1.0,
            random_state=random_state,
        )
    else:
        estimator = HistGradientBoostingRegressor(
            loss="squared_error",
            learning_rate=0.06,
            max_iter=250,
            max_leaf_nodes=31,
            l2_regularization=1.0,
            random_state=random_state,
        )
    return Pipeline([("preprocess", preprocess), ("estimator", estimator)])


def _safe_metric(metric: Any, y_true: np.ndarray, y_score: np.ndarray) -> float | None:
    try:
        value = float(metric(y_true, y_score))
        return value if np.isfinite(value) else None
    except ValueError:
        return None


def _fit_oof_configuration(
    frame: pd.DataFrame,
    numeric: list[str],
    categorical: list[str],
    config: PipelineConfig,
) -> tuple[pd.DataFrame, dict[str, Any], dict[str, Pipeline]]:
    features = _prepare_features(frame, numeric, categorical)
    sales = pd.to_numeric(frame["quantity_sold"], errors="coerce").fillna(0).to_numpy(float)
    sold = (sales > 0).astype(int)
    groups = frame["seller_id"].fillna("unknown").astype(str)
    group_count = int(groups.nunique())
    if group_count < 2:
        raise ValueError("At least two distinct seller_id groups are required for grouped evaluation")
    folds = min(config.model_folds, group_count)
    splitter = GroupKFold(n_splits=folds)
    probability = np.full(len(frame), np.nan)
    conditional_log_sales = np.full(len(frame), np.nan)

    for train_index, validation_index in splitter.split(features, sold, groups):
        classifier = _build_estimator(numeric, categorical, "classification", config.random_state)
        if np.unique(sold[train_index]).size < 2:
            probability[validation_index] = float(sold[train_index].mean())
        else:
            classifier.fit(features.iloc[train_index], sold[train_index])
            probability[validation_index] = classifier.predict_proba(
                features.iloc[validation_index]
            )[:, 1]

        positive_train = train_index[sold[train_index] == 1]
        if len(positive_train) < 10:
            fallback = float(np.log1p(sales[positive_train]).mean()) if len(positive_train) else 0.0
            conditional_log_sales[validation_index] = fallback
        else:
            regressor = _build_estimator(numeric, categorical, "regression", config.random_state)
            regressor.fit(features.iloc[positive_train], np.log1p(sales[positive_train]))
            conditional_log_sales[validation_index] = regressor.predict(
                features.iloc[validation_index]
            )

    conditional_sales = np.maximum(0.0, np.expm1(conditional_log_sales))
    reference_sales = np.maximum(0.0, probability * conditional_sales)
    residual = np.abs(np.log1p(sales) - np.log1p(reference_sales))
    alpha = 1.0 - config.prediction_coverage
    calibration_split = GroupShuffleSplit(
        n_splits=1, test_size=0.5, random_state=config.random_state
    )
    calibration_index, evaluation_index = next(
        calibration_split.split(features, groups=groups)
    )
    conformal_radius = float(
        np.quantile(residual[calibration_index], 1.0 - alpha, method="higher")
    )
    prediction_lower = np.maximum(0.0, np.expm1(np.log1p(reference_sales) - conformal_radius))
    prediction_upper = np.maximum(0.0, np.expm1(np.log1p(reference_sales) + conformal_radius))

    positive_mask = sold == 1
    prediction = pd.DataFrame(
        {
            "sale_probability": probability,
            "conditional_sales": conditional_sales,
            "reference_sales": reference_sales,
            "prediction_lower": prediction_lower,
            "prediction_upper": prediction_upper,
        },
        index=frame.index,
    )
    metrics: dict[str, Any] = {
        "estimator_backend": BOOSTING_BACKEND,
        "folds": folds,
        "seller_groups": group_count,
        "roc_auc": _safe_metric(roc_auc_score, sold, probability),
        "pr_auc": _safe_metric(average_precision_score, sold, probability),
        "brier_score": _safe_metric(brier_score_loss, sold, probability),
        "conditional_mae_log1p": float(
            mean_absolute_error(
                np.log1p(sales[positive_mask]), conditional_log_sales[positive_mask]
            )
        ),
        "rmsle_all": float(
            np.sqrt(np.mean((np.log1p(sales) - np.log1p(reference_sales)) ** 2))
        ),
        "spearman_all": _finite_or_none(spearmanr(sales, reference_sales).statistic),
        "prediction_coverage_all": float(
            ((sales >= prediction_lower) & (sales <= prediction_upper)).mean()
        ),
        "prediction_coverage_evaluation": float(
            (
                (sales[evaluation_index] >= prediction_lower[evaluation_index])
                & (sales[evaluation_index] <= prediction_upper[evaluation_index])
            ).mean()
        ),
        "conformal_calibration_rows": int(len(calibration_index)),
        "conformal_evaluation_rows": int(len(evaluation_index)),
        "conformal_radius_log1p": conformal_radius,
    }

    final_classifier = _build_estimator(numeric, categorical, "classification", config.random_state)
    final_classifier.fit(features, sold)
    final_regressor = _build_estimator(numeric, categorical, "regression", config.random_state)
    final_regressor.fit(features.loc[positive_mask], np.log1p(sales[positive_mask]))
    return prediction, metrics, {
        "classifier": final_classifier,
        "regressor": final_regressor,
    }


def _finite_or_none(value: Any) -> float | None:
    number = float(value)
    return number if np.isfinite(number) else None


def train_reference_models(
    products: pd.DataFrame,
    artifact_dir: str | Path,
    config: PipelineConfig,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    artifacts = Path(artifact_dir)
    artifacts.mkdir(parents=True, exist_ok=True)
    eligibility = products.get("valid_for_model", pd.Series(True, index=products.index))
    if eligibility.dtype == object:
        eligibility = eligibility.astype(str).str.strip().str.lower().isin({"true", "1", "yes"})
    eligibility = eligibility.fillna(False).astype(bool)
    training_products = products.loc[eligibility].copy()
    if training_products["quantity_sold"].gt(0).sum() < 10:
        raise ValueError("At least 10 products with positive sales are required for regression")
    if training_products["quantity_sold"].eq(0).sum() < 2:
        raise ValueError("Both zero-sale and positive-sale products are required")

    prediction_a, metrics_a, models_a = _fit_oof_configuration(
        training_products, MODEL_A_NUMERIC, MODEL_A_CATEGORICAL, config
    )
    prediction_b, metrics_b, models_b = _fit_oof_configuration(
        training_products, MODEL_B_NUMERIC, MODEL_B_CATEGORICAL, config
    )
    prediction_b = prediction_b.add_suffix("_model_b")
    valid_predictions = pd.concat([prediction_a, prediction_b], axis=1)
    predictions = pd.DataFrame(index=products.index, columns=valid_predictions.columns, dtype=float)
    predictions.loc[training_products.index, valid_predictions.columns] = valid_predictions.to_numpy()
    predictions.insert(0, "product_id", products["product_id"].astype(str).to_numpy())
    model_version = datetime.now(timezone.utc).strftime("j4f-%Y%m%dT%H%M%SZ")
    predictions["model_version"] = model_version

    bundle = {
        "model_version": model_version,
        "model_a": models_a,
        "model_b": models_b,
        "model_a_features": {
            "numeric": MODEL_A_NUMERIC,
            "categorical": MODEL_A_CATEGORICAL,
        },
        "model_b_features": {
            "numeric": MODEL_B_NUMERIC,
            "categorical": MODEL_B_CATEGORICAL,
        },
        "guardrail": "Model A is the primary flagging model; Model B is comparison only.",
    }
    joblib.dump(bundle, artifacts / "reference_models.joblib")
    observed = pd.to_numeric(
        training_products["quantity_sold"], errors="coerce"
    ).fillna(0).to_numpy(float)
    observed_binary = (observed > 0).astype(int)
    baseline_probability = (
        pd.to_numeric(training_products["baseline_sold_rate"], errors="coerce")
        .fillna(float(observed_binary.mean()))
        .clip(0, 1)
        .to_numpy(float)
    )
    baseline_reference = (
        pd.to_numeric(training_products["baseline_median_sales"], errors="coerce")
        .fillna(float(np.median(observed)))
        .clip(lower=0)
        .to_numpy(float)
    )
    baseline_metrics = {
        "roc_auc": _safe_metric(roc_auc_score, observed_binary, baseline_probability),
        "pr_auc": _safe_metric(average_precision_score, observed_binary, baseline_probability),
        "brier_score": _safe_metric(brier_score_loss, observed_binary, baseline_probability),
        "rmsle_all": float(
            np.sqrt(np.mean((np.log1p(observed) - np.log1p(baseline_reference)) ** 2))
        ),
        "spearman_all": _finite_or_none(spearmanr(observed, baseline_reference).statistic),
    }
    metrics = {
        "model_version": model_version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "training_rows": int(eligibility.sum()),
        "excluded_invalid_rows": int((~eligibility).sum()),
        "peer_baseline": baseline_metrics,
        "model_a_actionable": metrics_a,
        "model_b_with_outcome_correlated_feedback": metrics_b,
        "model_b_minus_model_a": {
            key: (
                metrics_b[key] - metrics_a[key]
                if metrics_a.get(key) is not None and metrics_b.get(key) is not None
                else None
            )
            for key in ("roc_auc", "pr_auc", "brier_score", "rmsle_all", "spearman_all")
        },
        "interpretation": (
            "Model B may score better because review_count and rating_average accumulate after sales. "
            "It must not be used for the primary opportunity flag."
        ),
    }
    with (artifacts / "model_metrics.json").open("w", encoding="utf-8") as stream:
        json.dump(metrics, stream, ensure_ascii=False, indent=2)
    return predictions, metrics
