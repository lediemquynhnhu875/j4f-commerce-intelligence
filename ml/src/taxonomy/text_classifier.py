from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import unicodedata

import joblib
import numpy as np
import pandas as pd
from scipy.sparse.csgraph import connected_components
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import GroupKFold
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC


def normalize_title(value: str) -> str:
    text = unicodedata.normalize("NFC", value).lower()
    text = re.sub(r"\d+", " ", text)
    return re.sub(r"[\W_]+", " ", text).strip()


def duplicate_groups(names: pd.Series, similarity: float = 0.90) -> np.ndarray:
    normalized = names.fillna("").map(normalize_title)
    if normalized.eq("").all():
        raise ValueError("Product titles cannot all be empty")
    matrix = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit_transform(normalized)
    graph = NearestNeighbors(metric="cosine", algorithm="brute").fit(matrix).radius_neighbors_graph(
        matrix, radius=1.0 - similarity, mode="connectivity"
    )
    _, groups = connected_components(graph.maximum(graph.T), directed=False)
    return groups


def model_text(frame: pd.DataFrame) -> pd.Series:
    title = frame.product_name.fillna("").astype(str)
    description = frame.description.fillna("").astype(str).str[:2000]
    return title + " " + title + " " + description


def load_development_labels(
    processed_dir: Path, review_dir: Path, migration_path: Path | None = None,
    label_guide: Path | None = None,
) -> tuple[pd.DataFrame, dict]:
    products = pd.read_csv(processed_dir / "clean_products.csv", dtype={"product_id": str}, low_memory=False)
    holdout_ids = set(pd.read_csv(
        processed_dir / "review_queues/taxonomy_holdout_review.csv", dtype=str, usecols=["product_id"]
    ).product_id)
    original = pd.read_csv(processed_dir / "taxonomy_sample_reviewed.csv", dtype=str).fillna("")
    correct = original.is_correct.str.strip().str.lower().isin({"đúng", "true", "1", "yes"})
    original["label"] = original.product_type.where(correct, original.corrected_product_type)
    fallback = pd.read_csv(processed_dir / "review_queues/taxonomy_fallback_review.csv", dtype=str).fillna("")
    fallback["label"] = fallback.proposed_product_type
    round3 = pd.read_csv(review_dir / "taxonomy_development_round_3.csv", dtype=str).fillna("")
    round3["label"] = round3.final_product_type.where(round3.final_product_type.ne(""), round3.human_product_type)
    confirmation_path = review_dir / "user_confirmation.json"
    confirmation = json.loads(confirmation_path.read_text(encoding="utf-8"))
    if confirmation.get("confirmed_rows") != len(round3):
        raise ValueError("Round-3 individual human confirmation is required")
    confirmed_hash = hashlib.sha256(
        round3[["product_id", "human_product_type"]].to_csv(index=False).encode("utf-8")
    ).hexdigest()
    if confirmation.get("confirmed_labels_sha256") != confirmed_hash:
        raise ValueError("Round-3 labels changed since user confirmation; reconfirm changed labels")
    migrated = pd.Series(False, index=round3.index)
    if migration_path is not None:
        migration = pd.read_csv(migration_path, dtype=str).fillna("")
        if migration.product_id.duplicated().any():
            raise ValueError("Schema migration contains duplicate product IDs")
        proposed = round3.product_id.map(migration.set_index("product_id").schema_v2_label_proposal)
        migrated = round3.label.eq("ambiguous") & proposed.notna() & proposed.ne("ambiguous")
        round3.loc[migrated, "label"] = proposed[migrated]
    frames = []
    for source_name, frame in [("original_review", original), ("fallback_review", fallback), ("round3_user_confirmed_ai_assisted", round3)]:
        frames.append(frame[["product_id", "label"]].assign(label_source=source_name))
    frames[-1].loc[migrated, "label_source"] = "round3_user_confirmed_ai_assisted_schema_migrated_AI"
    labels = pd.concat(frames, ignore_index=True)
    labels["label"] = labels.label.str.strip()
    counts = labels.groupby("product_id").label.nunique()
    conflict_ids = set(counts[counts > 1].index)
    holdout_overlap = labels.product_id.isin(holdout_ids)
    report = {"input_label_rows": len(labels), "conflicting_product_ids": sorted(conflict_ids),
              "excluded_holdout_overlap_rows": int(holdout_overlap.sum()),
              "excluded_ambiguous_rows": int(labels.label.eq("ambiguous").sum()),
              "AI_schema_migrated_rows": int(migrated.sum())}
    labels = labels.loc[~holdout_overlap & ~labels.product_id.isin(conflict_ids)
                        & labels.label.ne("") & labels.label.ne("ambiguous")].drop_duplicates("product_id", keep="last")
    merged = labels.merge(products, on="product_id", how="left", validate="one_to_one")
    if merged.product_name.isna().any():
        raise ValueError("Some reviewed product IDs are missing from the clean snapshot")
    if label_guide is not None:
        import yaml
        allowed = set(yaml.safe_load(label_guide.read_text(encoding="utf-8"))["labels"])
    else:
        allowed = set(pd.read_csv(review_dir / "taxonomy_label_set_round_3.csv", dtype=str).product_type)
    if not set(merged.label) <= allowed:
        raise ValueError(f"Unsupported labels: {set(merged.label) - allowed}")
    return merged, report


def _estimator() -> Pipeline:
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), max_features=40000, sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=80000, sublinear_tf=True)),
    ])
    return Pipeline([("text", features), ("classifier", LinearSVC(C=1.0, class_weight="balanced", random_state=42))])


def evaluate_text_classifier(frame: pd.DataFrame, output_dir: Path, folds: int = 5) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    frame = frame.reset_index(drop=True).copy()
    groups = duplicate_groups(frame.product_name)
    folds = min(folds, len(set(groups)))
    if folds < 2 or frame.label.nunique() < 2:
        raise ValueError("At least two duplicate groups and classes are required")
    text = model_text(frame)
    predicted = pd.Series("", index=frame.index, dtype=object)
    margins = np.full(len(frame), np.nan)
    fold_ids = np.full(len(frame), -1)
    for fold, (train, validation) in enumerate(GroupKFold(n_splits=folds).split(text, frame.label, groups)):
        assert not set(groups[train]) & set(groups[validation])
        model = _estimator()
        model.fit(text.iloc[train], frame.label.iloc[train])
        predicted.loc[validation] = model.predict(text.iloc[validation])
        scores = model.decision_function(text.iloc[validation])
        if scores.ndim == 1:
            scores = np.column_stack([-scores, scores])
        scores.sort(axis=1)
        margins[validation] = scores[:, -1] - scores[:, -2]
        fold_ids[validation] = fold
    assert predicted.ne("").all()
    confidence_mask = margins >= 0.8
    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "evaluation": "development_out_of_fold_near_duplicate_grouped",
        "estimator": "TF-IDF word(1,2) + char_wb(3,5) + LinearSVC(C=1, class_weight=balanced)",
        "rows": len(frame), "classes": int(frame.label.nunique()), "folds": folds,
        "duplicate_groups": len(set(groups)), "near_duplicate_similarity_threshold": 0.90,
        "accuracy": float(accuracy_score(frame.label, predicted)),
        "macro_f1": float(f1_score(frame.label, predicted, average="macro", zero_division=0)),
        "round3_accuracy": float(predicted[frame.label_source.str.startswith("round3_user_confirmed_ai_assisted")].eq(
            frame.loc[frame.label_source.str.startswith("round3_user_confirmed_ai_assisted"), "label"]).mean()),
        "margin_threshold": 0.8, "margin_selected_rows": int(confidence_mask.sum()),
        "margin_selected_coverage": float(confidence_mask.mean()),
        "margin_selected_accuracy": float(predicted[confidence_mask].eq(frame.loc[confidence_mask, "label"]).mean())
        if confidence_mask.any() else None,
        "classes_with_fewer_than_5_duplicate_groups": {
            label: int(n) for label, n in frame.assign(duplicate_group=groups).groupby("label").duplicate_group.nunique().items() if n < 5
        },
        "holdout_used_for_training_or_model_selection": False,
        "production_rules_modified": False,
        "limitations": "Development labels include user-confirmed AI-assisted annotations. Macro F1 and rare-class support matter; SVM margins are not probabilities. Grouping used unlabelled titles to prevent duplicate leakage; classifier TF-IDF is fitted inside each training fold. This is not blind holdout acceptance or product readiness.",
    }
    frame["duplicate_group"] = groups
    frame["validation_fold"] = fold_ids
    frame["oof_product_type"] = predicted
    frame["oof_margin"] = margins
    frame.to_csv(output_dir / "taxonomy_text_oof_predictions.csv", index=False, encoding="utf-8-sig")
    frame.loc[predicted.ne(frame.label)].to_csv(output_dir / "taxonomy_text_oof_errors.csv", index=False, encoding="utf-8-sig")
    confusion = pd.crosstab(frame.label, predicted)
    confusion.to_csv(output_dir / "taxonomy_text_confusion_matrix.csv", encoding="utf-8-sig")
    final_model = _estimator()
    final_model.fit(text, frame.label)
    joblib.dump({"pipeline": final_model, "metrics": metrics,
                 "usage": "Experimental taxonomy classifier, not reference-sales model or production serving"},
                output_dir / "taxonomy_text_candidate.joblib")
    (output_dir / "taxonomy_text_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Development-only taxonomy text experiment")
    parser.add_argument("--processed-dir", type=Path, required=True)
    parser.add_argument("--review-dir", type=Path, default=Path("data/local_reviews/taxonomy_round_3"))
    parser.add_argument("--migration-file", type=Path)
    parser.add_argument("--label-guide", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--report-file", type=Path, default=Path("ml/reports/metrics/taxonomy_text_experiment.json"))
    args = parser.parse_args()
    frame, report = load_development_labels(args.processed_dir, args.review_dir, args.migration_file, args.label_guide)
    output_dir = args.output_dir or args.review_dir / "text_model"
    metrics = evaluate_text_classifier(frame, output_dir)
    metrics["label_loading"] = report
    destination = output_dir / "taxonomy_text_metrics.json"
    destination.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    args.report_file.write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
