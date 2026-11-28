"""Verify serving contracts with a tiny, locally trained synthetic bundle."""

import csv
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import joblib
import numpy as np
import pandas as pd
import yaml

from ml.src.models.reference import (
    MODEL_A_CATEGORICAL, MODEL_A_NUMERIC, _build_estimator, _prepare_features,
)
from ml.src.serving.assets import CORPUS_COLUMNS, digest, pack, unpack
from ml.src.serving.inference import SCHEMA_VERSION


def make_fixture(directory: Path, with_out_of_fold: bool = False) -> Path:
    taxonomy_version = yaml.safe_load(
        Path("ml/config/taxonomy_v2.yml").read_text(encoding="utf-8")
    )["taxonomy_version"]
    rows = [{
        "product_id": str(position + 1000), "seller_id": str(position),
        "product_name": "Giày lười nam da mềm", "description": "Giày lười nam đế êm dễ mang",
        "product_type": "giày lười nam", "taxonomy_version": taxonomy_version,
        "valid_for_model": True, "quantity_sold": position % 10,
        "price": 220000 + position * 1000, "discount_rate": 0.2, "image_count": 6,
        "rating_average": 4.4, "review_count": 30, "description_length": 27, "has_video": True,
    } for position in range(60)]
    frame = pd.DataFrame(rows).assign(name_length=20, fulfillment_type="unknown")
    features = _prepare_features(frame, MODEL_A_NUMERIC, MODEL_A_CATEGORICAL)
    sold = frame.quantity_sold.gt(0)
    classifier = _build_estimator(MODEL_A_NUMERIC, MODEL_A_CATEGORICAL, "classification", 42)
    regressor = _build_estimator(MODEL_A_NUMERIC, MODEL_A_CATEGORICAL, "regression", 42)
    classifier.fit(features, sold.astype(int))
    regressor.fit(features.loc[sold], np.log1p(frame.loc[sold, "quantity_sold"]))
    joblib.dump({
        "model_version": "test-synthetic",
        "model_a": {"classifier": classifier, "regressor": regressor},
        "model_a_features": {"numeric": MODEL_A_NUMERIC, "categorical": MODEL_A_CATEGORICAL},
    }, directory / "reference_models.joblib")
    from ml.src.models.reference import BOOSTING_BACKEND

    (directory / "model_metrics.json").write_text(json.dumps({
        "model_version": "test-synthetic", "training_rows": len(rows),
        "model_a_actionable": {
            "estimator_backend": BOOSTING_BACKEND, "conformal_radius_log1p": 0.6,
        },
    }), encoding="utf-8")
    corpus = directory / "clean_products.csv"
    with corpus.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, CORPUS_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    archive = directory / "fixture.zip"
    predictions = None
    if with_out_of_fold:
        predictions = directory / "model_predictions.csv"
        pd.DataFrame({
            "product_id": [row["product_id"] for row in rows], "sale_probability": 0.9,
            "conditional_sales": 5.0, "reference_sales": 4.5, "prediction_lower": 1.0, "prediction_upper": 20.0,
            "model_version": "test-synthetic",
        }).to_csv(predictions, index=False)
    pack(directory, corpus, archive, predictions=predictions)
    with unittest.TestCase().assertRaisesRegex(ValueError, "SHA-256"):
        unpack(archive, directory / "wrong", "0" * 64)
    result = directory / "extracted"
    unpack(archive, result, digest(archive))
    return result


class CorpusRescoreTest(unittest.TestCase):
    """Corpus products are re-scored with their stored out-of-fold prediction while the listing is unchanged."""

    def setUp(self):
        from ml.src.serving.inference import AlreadyInCorpus, CorpusListingChanged, ServingModel

        self.errors = AlreadyInCorpus, CorpusListingChanged
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.model = ServingModel(make_fixture(Path(directory.name), with_out_of_fold=True))
        self.product = {
            "name": "Giày lười nam da mềm", "description": "Giày lười nam đế êm dễ mang",
            "category": "Giày nam khác", "source_product_id": "SP-1000", "price": 220000.0,
            "original_price": 275000.0, "quantity_sold": 0, "rating_average": 4.4, "review_count": 30,
            "number_of_images": 6, "has_video": True,
        }

    def test_unchanged_listing_uses_out_of_fold_reference_and_new_sales(self):
        result = self.model.infer(self.product)
        self.assertEqual(result["reference_sold"], 4.5)
        self.assertEqual((result["prediction_lower"], result["prediction_upper"]), (1.0, 20.0))
        self.assertEqual(result["product_type"], "giày lười nam")
        self.assertIn("out-of-fold", result["limitation_note"])
        self.assertEqual(result["comparison"]["peer_count"], 25)
        self.assertEqual(result["status"], "untapped_potential")  # zero sales, probability 0.9
        self.product["quantity_sold"] = 8
        self.assertEqual(self.model.infer(self.product)["status"], "performing_well")

    def test_never_its_own_peer(self):
        record, neighbors = self.model.peers(
            {"product_type": "giày lười nam", "valid_for_model": True,
             "product_name": "Giày lười nam da mềm", "description": "Giày lười nam đế êm dễ mang"},
            exclude_id="1000", exclude_seller="1",
        )
        ids = {neighbor["product_id"] for neighbor in neighbors}
        self.assertNotIn("1000", ids)
        self.assertNotIn("1001", ids)  # seller "1" owns product 1001

    def test_changed_listing_waits_for_retraining(self):
        self.product["price"] = 199000.0
        with self.assertRaises(self.errors[1]) as raised:
            self.model.infer(self.product)
        self.assertIn("price", raised.exception.fields)


try:
    from fastapi.testclient import TestClient
    from ml.src.serving.app import app
except ModuleNotFoundError as error:
    if error.name != "fastapi":
        raise
    TestClient = None


@unittest.skipUnless(TestClient is not None, "Install ml/requirements-serve.txt to test HTTP serving")
class LiveServingTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        assets = make_fixture(Path(directory.name))
        token = "test-" + "t" * 48
        settings = patch.dict(os.environ, ML_ASSET_DIR=str(assets), ML_SERVICE_TOKEN=token)
        settings.start()
        self.addCleanup(settings.stop)
        self.client = self.enterContext(TestClient(app))
        self.headers = {"Authorization": f"Bearer {token}"}
        self.payload = {
            "schema_version": SCHEMA_VERSION,
            "product": {
                "name": "Giày lười nam da mềm",
                "description": "Giày lười nam đế êm dễ mang",
                "category": "Giày lười nam", "source_product_id": "test-new",
                "price": 250000, "original_price": 300000,
                "quantity_sold": 0, "rating_average": None, "review_count": 0,
                "number_of_images": 1, "has_video": False,
            },
        }

    def test_authenticated_model_prediction_and_rule_evidence(self):
        self.assertEqual(self.client.get("/health/ready").json()["model_version"], "test-synthetic")
        self.assertEqual(self.client.post("/v1/infer", json=self.payload).status_code, 401)
        result = self.client.post("/v1/infer", json=self.payload, headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        data = result.json()
        self.assertEqual(data["status"], "untapped_potential")
        self.assertGreater(data["reference_sold"], 0)
        self.assertEqual(data["comparison"]["peer_count"], 25)
        self.assertNotIn("peer_ids", result.text)
        self.assertIn("add_product_images", [item["rule_id"] for item in data["recommendations"]])

    def test_unknown_sales_and_in_corpus_ids(self):
        self.payload["product"]["quantity_sold"] = None
        result = self.client.post("/v1/infer", json=self.payload, headers=self.headers).json()
        self.assertEqual(result["status_reason"], "missing_observed_sales")
        self.assertIsNone(result["reference_sold"])
        self.assertEqual(result["recommendations"], [])
        self.payload["product"]["source_product_id"] = "SP-1000"
        result = self.client.post("/v1/infer", json=self.payload, headers=self.headers)
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()["detail"], "PRODUCT_IN_MODEL_CORPUS")  # bundle without out-of-fold file
        self.payload["schema_version"] = "wrong"
        result = self.client.post("/v1/infer", json=self.payload, headers=self.headers)
        self.assertEqual(result.status_code, 422)
