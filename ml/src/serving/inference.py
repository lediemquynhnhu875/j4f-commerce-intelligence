"""Load a fixed snapshot once and score new products using the existing Model A."""

import json
import math
import sys
import warnings
from importlib.metadata import version
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import yaml
from sklearn.exceptions import InconsistentVersionWarning
from sklearn.feature_extraction.text import TfidfVectorizer

from ml.src.config import load_config
from ml.src.data.clean import normalize_text
from ml.src.models.reference import MODEL_A_CATEGORICAL, MODEL_A_NUMERIC, _prepare_features
from ml.src.peers.build import PEER_MEDIAN_COLUMNS, _peer_record, add_peer_action_features
from ml.src.scoring.status import _number, score_products
from ml.src.taxonomy.rules import assign_product_types
from ml.src.serving.assets import CORPUS_COLUMNS, OOF_COLUMNS, digest

SCHEMA_VERSION = "sellens-inference-v1"
UNSUPPORTED_TYPES = {"unknown", "ambiguous", "unmatched", "out_of_scope"}


class AlreadyInCorpus(ValueError):
    """Products in the training snapshot require their offline evaluation output."""


class CorpusListingChanged(AlreadyInCorpus):
    """A corpus product whose model inputs changed; its out-of-fold prediction no longer applies."""

    def __init__(self, fields):
        super().__init__(", ".join(fields))
        self.fields = fields


# Model A inputs a store can change. Its out-of-fold prediction stays valid while these match.
LISTING_FIELDS = ("price", "discount_rate", "name_length", "description_length", "image_count", "has_video")
OOF_NOTE = (
    " Sản phẩm thuộc dữ liệu huấn luyện: mức tham chiếu lấy từ lần chấm khi model chưa thấy sản phẩm "
    "này (out-of-fold); chỉ số bán, đánh giá và nhóm so sánh được cập nhật."
)


def _video(value):
    return {"yes": 1.0, "true": 1.0, "1": 1.0, "1.0": 1.0,
            "no": 0.0, "false": 0.0, "0": 0.0, "0.0": 0.0}.get(str(value).strip().lower())


def _listing_value(name, value):
    if name == "has_video":
        return _video(value)
    number = pd.to_numeric(value, errors="coerce")
    return None if pd.isna(number) else float(number)


def _changed_fields(corpus, row):
    changed = []
    for name in LISTING_FIELDS:
        old, new = corpus[name], _listing_value(name, row.get(name))
        tolerance = 0.005 if name == "discount_rate" else 0.5
        if (old is None) != (new is None) or (old is not None and abs(old - new) > tolerance):
            changed.append(name)
    return changed


class ServingModel:
    def __init__(self, directory: Path):
        manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
        if tuple(map(int, manifest["python"].split(".")[:2])) != sys.version_info[:2]:
            raise ValueError("Python major/minor version does not match the training environment")
        for name, expected in manifest["packages"].items():
            if version(name) != expected:
                raise ValueError(f"Dependency version mismatch: {name}")

        model_path = directory / "reference_models.joblib"
        with warnings.catch_warnings():
            warnings.simplefilter("error", InconsistentVersionWarning)
            bundle = joblib.load(model_path)
        metrics = json.loads((directory / "model_metrics.json").read_text(encoding="utf-8"))
        self.model_version = bundle["model_version"]
        self.model_hash = digest(model_path)
        if self.model_version != metrics["model_version"] or self.model_version != manifest["model_version"]:
            raise ValueError("Model bundle and calibration report have different versions")
        if bundle["model_a_features"] != {
            "numeric": MODEL_A_NUMERIC, "categorical": MODEL_A_CATEGORICAL
        }:
            raise ValueError("Model A feature schema does not match the serving code")
        self.classifier = bundle["model_a"]["classifier"]
        self.regressor = bundle["model_a"]["regressor"]
        if list(self.classifier.classes_) != [0, 1]:
            raise ValueError("Model A classifier has unexpected class labels")
        self.radius = float(metrics["model_a_actionable"]["conformal_radius_log1p"])
        if not math.isfinite(self.radius) or self.radius < 0:
            raise ValueError("Invalid Model A calibration radius")
        self.config = load_config(directory / "pipeline.yml")
        self.taxonomy_path = directory / "taxonomy.yml"
        self.taxonomy_hash = digest(self.taxonomy_path)
        self.config_hash = digest(directory / "pipeline.yml")
        self.taxonomy_version = yaml.safe_load(
            self.taxonomy_path.read_text(encoding="utf-8")
        )["taxonomy_version"]

        corpus_path = directory / "corpus.csv"
        self.corpus_hash = digest(corpus_path)
        frame = pd.read_csv(corpus_path, usecols=list(CORPUS_COLUMNS), dtype={
            "product_id": str, "seller_id": str,
        }, keep_default_na=False, low_memory=False)
        if (frame.empty or frame.product_id.eq("").any() or not frame.product_id.is_unique
                or not frame.taxonomy_version.eq(self.taxonomy_version).all()):
            raise ValueError("Reference corpus is empty, has invalid IDs or uses another taxonomy")
        self.product_ids = set(frame.product_id)
        self.listings = {
            row.product_id: {
                "product_type": row.product_type, "seller_id": row.seller_id,
                **{name: _listing_value(name, value) for name, value in (
                    ("price", row.price), ("discount_rate", row.discount_rate),
                    ("name_length", len(row.product_name)), ("description_length", row.description_length),
                    ("image_count", row.image_count), ("has_video", row.has_video),
                )},
            } for row in frame.itertuples(index=False)
        }
        self.out_of_fold = {}
        oof_path = directory / "oof_predictions.csv"
        if oof_path.exists():
            oof = pd.read_csv(oof_path, dtype={"product_id": str})
            if list(oof.columns) != list(OOF_COLUMNS) or not set(oof.product_id) <= self.product_ids:
                raise ValueError("Out-of-fold predictions do not match the reference corpus")
            self.out_of_fold = oof.set_index("product_id").to_dict("index")
        valid = frame.valid_for_model.astype(str).str.lower().isin({"true", "1", "yes"})
        if int(valid.sum()) != metrics["training_rows"]:
            raise ValueError("Reference corpus row count does not match the training report")
        frame = frame.loc[valid & ~frame.product_type.isin(UNSUPPORTED_TYPES)].copy()
        for name in PEER_MEDIAN_COLUMNS:
            frame[name] = pd.to_numeric(frame[name], errors="coerce").astype(float)
        frame["has_video"] = frame.has_video.astype(str).str.lower().map({
            "yes": 1.0, "true": 1.0, "1": 1.0, "1.0": 1.0,
            "no": 0.0, "false": 0.0, "0": 0.0, "0.0": 0.0,
        })
        self.groups = {}
        for product_type, group in frame.groupby("product_type", sort=False):
            if len(group) < 2:
                continue
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 2), sublinear_tf=True, dtype=np.float32,
                min_df=min(self.config.text_min_document_frequency, len(group)),
                max_features=self.config.text_max_features,
            )
            try:
                matrix = vectorizer.fit_transform(group.product_name + " " + group.description)
            except ValueError:
                continue
            self.groups[product_type] = (
                vectorizer, matrix, group[["product_id", "seller_id", "has_video", *PEER_MEDIAN_COLUMNS]],
            )
        if not self.groups:
            raise ValueError("Reference corpus produced no usable product groups")

        # Detect incompatible serialized estimators before reporting readiness.
        self.predict({
            "product_type": next(iter(self.groups)), "price": 100000,
            "discount_rate": 0, "description_length": 0, "name_length": 10,
            "image_count": 1, "has_video": False, "fulfillment_type": "unknown",
        })

    def predict(self, row):
        fields = _prepare_features(pd.DataFrame([row]), MODEL_A_NUMERIC, MODEL_A_CATEGORICAL)
        probability = float(self.classifier.predict_proba(fields)[0, 1])
        log_sales = float(self.regressor.predict(fields)[0])
        if not math.isfinite(log_sales):
            raise ValueError("Model A produced invalid conditional sales")
        conditional = max(0.0, math.expm1(log_sales))
        reference = probability * conditional
        lower = max(0.0, math.expm1(math.log1p(reference) - self.radius))
        upper = math.expm1(math.log1p(reference) + self.radius)
        if (not all(math.isfinite(value) for value in (probability, reference, lower, upper))
                or not 0 <= probability <= 1 or not 0 <= lower <= reference <= upper):
            raise ValueError("Model A produced an invalid reference")
        return {
            "sale_probability": probability, "conditional_sales": conditional,
            "reference_sales": reference, "prediction_lower": lower, "prediction_upper": upper,
        }

    def peers(self, row, exclude_id=None, exclude_seller=None):
        """Exclusions mirror the offline peers for corpus products: never itself, optionally not its seller."""
        peer_group = self.groups.get(row["product_type"])
        if not row["valid_for_model"] or peer_group is None:
            return _peer_record(np.array([]), np.array([]), np.array([]), [], []), []
        vectorizer, matrix, group = peer_group
        vector = vectorizer.transform([row["product_name"] + " " + row["description"]])
        similarity = np.clip((matrix @ vector.T).toarray().ravel(), 0.0, 1.0)
        allowed = similarity > 0
        if exclude_id is not None:
            allowed &= group.product_id.to_numpy() != exclude_id
        if exclude_seller:
            allowed &= group.seller_id.to_numpy() != exclude_seller
        order = np.argsort(-similarity, kind="stable")
        selected = order[allowed[order]][:self.config.peer_count].tolist()
        record = _peer_record(
            group.product_id.to_numpy(), group[list(PEER_MEDIAN_COLUMNS)].to_numpy(float),
            group.has_video.to_numpy(float), selected, similarity[selected].tolist(),
        )
        return record, group.iloc[selected][["product_id", "quantity_sold", "has_video"]].to_dict("records")

    def infer(self, product):
        source_id = product.get("source_product_id") or ""
        corpus_id = next((key for key in (source_id, source_id.removeprefix("SP-")) if key in self.product_ids), None)
        if corpus_id is not None and corpus_id not in self.out_of_fold:
            raise AlreadyInCorpus()
        name = normalize_text(product["name"])
        description = normalize_text(product["description"])
        price, list_price = product["price"], product["original_price"]
        row = {
            "product_id": "", "product_name": name, "description": description,
            "category_raw": normalize_text(product["category"]), "source_file": "",
            "name_length": len(name), "description_length": len(description),
            "price": price, "quantity_sold": product["quantity_sold"],
            "rating_average": product["rating_average"], "review_count": product["review_count"],
            "discount_rate": max(0.0, min(1.0, 1 - price / list_price))
            if price is not None and list_price else None,
            "image_count": product["number_of_images"], "has_video": product["has_video"],
            "fulfillment_type": "unknown",
            "valid_for_model": bool(name and price is not None and price > 0),
        }
        row = assign_product_types(pd.DataFrame([row]), self.taxonomy_path).iloc[0].to_dict()
        corpus = self.listings.get(corpus_id)
        if corpus is not None:
            changed = _changed_fields(corpus, row)
            if changed:
                raise CorpusListingChanged(changed)
            # The prediction belongs to the corpus product type; the app's category label may differ.
            row["product_type"] = corpus["product_type"]
        exclude_seller = (corpus["seller_id"] if corpus and self.config.exclude_same_seller_from_peers
                          and corpus["seller_id"] not in {"", "unknown"} else None)
        peer_record, neighbors = self.peers(row, corpus_id, exclude_seller)
        row.update(peer_record)
        row["insufficient_data"] = (
            row["peer_count"] < self.config.minimum_peer_count
            or row["mean_peer_similarity"] < self.config.minimum_mean_peer_similarity
        )
        # Reuse the same upper-quartile video calculation as the offline scorer.
        peer_input = pd.DataFrame([
            {**row}, *[{**neighbor, "peer_ids": "[]"} for neighbor in neighbors],
        ])
        with_video = add_peer_action_features(peer_input).iloc[[0]]
        predictions = {"product_id": ""}
        if row["valid_for_model"] and not row["insufficient_data"] and product["quantity_sold"] is not None:
            predictions.update(self.out_of_fold[corpus_id] if corpus is not None else self.predict(row))
        result = score_products(with_video, pd.DataFrame([predictions]), self.config).iloc[0]
        compare = {
            name: _number(value) for name, value in result.items()
            if name.startswith(("peer_median_", "good_peer_"))
            or name in {"peer_count", "mean_peer_similarity", "peer_video_share"}
        }
        return {
            "schema_version": SCHEMA_VERSION, "status": result.status,
            "status_reason": result.status_reason, "explanation": result.status_explanation_vi,
            "product_type": result.product_type, "taxonomy_version": self.taxonomy_version,
            "model_version": self.model_version, "pipeline_version": result.scoring_rules_version,
            "reference_sold": _number(result.reference_sales),
            "probability_positive_sales": _number(result.sale_probability),
            "prediction_lower": _number(result.prediction_lower),
            "prediction_upper": _number(result.prediction_upper),
            "priority_score": _number(result.opportunity_score),
            "comparison": compare, "evidence": json.loads(result.evidence),
            "recommendations": json.loads(result.recommendations),
            "limitation_note": result.analysis_limitations_vi + (OOF_NOTE if corpus is not None else ""),
            "bundle_sha256": self.model_hash, "corpus_sha256": self.corpus_hash,
            "config_sha256": self.config_hash, "taxonomy_sha256": self.taxonomy_hash,
        }
