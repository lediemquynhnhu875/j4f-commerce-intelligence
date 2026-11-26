from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from ml.src.config import PipelineConfig
from ml.src.models.reference import train_reference_models
from ml.src.retrain.gates import model_gate, output_gate, taxonomy_gate
from ml.src.retrain.training_set import OBSERVATION_COLUMNS, RetrainConfig, build_training_set, load_retrain_config

NOW = datetime(2026, 11, 26, tzinfo=timezone.utc)


def base_corpus() -> pd.DataFrame:
    # Seller sizes 1..10, so the 0.99 quantile cap C is 10.
    rows = []
    for seller in range(1, 11):
        for item in range(seller):
            rows.append({"product_id": f"{seller}{item:02d}", "seller_id": f"seller-{seller}",
                         "product_name": f"Túi xách {seller}-{item}", "description": "", "price": "100000",
                         "quantity_sold": "3", "product_type": "túi xách nữ"})
    return pd.DataFrame(rows)


def observation(store: str, sku: str, observed: str, sold: int, source: str = "", **extra) -> dict:
    row = {name: "" for name in OBSERVATION_COLUMNS}
    row.update({"store_id": store, "sku": sku, "source_product_id": source, "observed_at": observed,
                "verified_at": observed, "quantity_sold": str(sold), "currency": "VND",
                "product_name": f"Túi xách {sku}", "price": "120000", "original_price": "150000",
                "import_batch_id": "b1"})
    row.update(extra)
    return row


class TrainingSetTest(unittest.TestCase):
    def test_latest_observation_replaces_corpus_row_and_new_products_are_added(self):
        observations = pd.DataFrame([
            observation("s1", "a", "2026-10-01T00:00:00Z", 5, source="SP-100"),
            observation("s1", "a", "2026-11-01T00:00:00Z", 9, source="SP-100"),
            observation("s2", "b", "2026-11-02T00:00:00Z", 1),
        ])
        frame, summary = build_training_set(base_corpus(), observations, RetrainConfig(min_new_observations=1), now=NOW)
        replaced = frame.set_index("product_id").loc["100"]
        self.assertEqual((replaced.quantity_sold, replaced.seller_id, replaced.training_source),
                         (9, "seller-1", "store_observation"))
        self.assertIn("store-s2-b", set(frame.product_id))
        self.assertTrue(frame.product_id.is_unique)
        self.assertNotIn("product_type", frame)
        self.assertEqual(summary["rows"], len(base_corpus()) + 1)
        self.assertEqual((summary["corpus_rows_replaced"], summary["store_only_products_added"]), (1, 1))
        self.assertEqual(summary["observations_dropped"]["older_observation_of_same_product"], 1)
        self.assertAlmostEqual(replaced.discount_rate, 0.2)

    def test_unusable_observations_are_dropped_with_reasons(self):
        observations = pd.DataFrame([
            observation("s1", "a", "2027-01-01T00:00:00Z", 1),
            observation("s1", "b", "2026-11-01T00:00:00Z", 1, verified_at=""),
            observation("s1", "c", "2026-11-01T00:00:00Z", 1, currency="USD"),
            observation("s1", "d", "2026-11-01T00:00:00Z", 1, source="SP-100"),
        ])
        quantity = observation("s1", "e", "2026-11-01T00:00:00Z", 1)
        quantity["quantity_sold"] = "-2"
        observations = pd.concat([observations, pd.DataFrame([quantity])], ignore_index=True)
        frame, summary = build_training_set(base_corpus(), observations, RetrainConfig(), now=NOW,
                                            protected_ids={"100"})
        dropped = summary["observations_dropped"]
        self.assertEqual((dropped["missing_or_future_observed_at"], dropped["not_verified"], dropped["not_vnd"],
                          dropped["protected_evaluation_id"], dropped["invalid_quantity_sold"]), (1, 1, 1, 1, 1))
        self.assertEqual(summary["observation_rows_used"], 0)
        self.assertFalse(summary["ready"])

    def test_large_store_is_down_weighted_not_cut(self):
        observations = pd.DataFrame(
            [observation("big", f"x{i}", "2026-11-01T00:00:00Z", i % 4) for i in range(40)]
            + [observation("small", f"y{i}", "2026-11-01T00:00:00Z", 1) for i in range(5)]
        )
        frame, summary = build_training_set(base_corpus(), observations, RetrainConfig(min_new_observations=1), now=NOW)
        weights = frame.groupby(frame.store_id.fillna("corpus")).sample_weight.agg(["min", "max", "size"])
        self.assertEqual(summary["weight_cap_C"], 10)
        self.assertEqual(weights.loc["big", "size"], 40)
        self.assertAlmostEqual(weights.loc["big", "min"], 10 / 40)
        self.assertEqual((weights.loc["small", "min"], weights.loc["corpus", "min"]), (1.0, 1.0))
        self.assertEqual(summary["stores_down_weighted"], 1)

    def test_readiness_counts_only_observations_verified_after_the_last_run(self):
        observations = pd.DataFrame(
            [observation("s1", f"a{i}", "2026-10-01T00:00:00Z", 1) for i in range(150)]
            + [observation(f"s{2 + i % 2}", f"b{i}", "2026-11-20T00:00:00Z", 1) for i in range(99)]
        )
        since = datetime(2026, 11, 1, tzinfo=timezone.utc)
        _, summary = build_training_set(base_corpus(), observations, RetrainConfig(), since=since, now=NOW)
        self.assertEqual((summary["ready"], summary["new_verified_observations"]), (False, 99))
        more = pd.concat([observations, pd.DataFrame([observation("s2", "z", "2026-11-21T00:00:00Z", 1)])])
        _, summary = build_training_set(base_corpus(), more, RetrainConfig(), since=since, now=NOW)
        self.assertTrue(summary["ready"])

    def test_one_store_is_never_enough(self):
        observations = pd.DataFrame([observation("s1", f"a{i}", "2026-11-01T00:00:00Z", 1) for i in range(120)])
        _, summary = build_training_set(base_corpus(), observations, RetrainConfig(), now=NOW)
        self.assertFalse(summary["ready"])
        self.assertIn("stores", summary["skip_reasons"][0])

    def test_repository_thresholds_match_team_decisions(self):
        config = load_retrain_config()
        self.assertEqual((config.min_new_observations, config.min_new_stores, config.roc_auc_tolerance,
                          config.rmsle_tolerance, config.status_share_tolerance), (100, 2, 0.01, 0.02, 0.05))


class SampleWeightTrainingTest(unittest.TestCase):
    def frame(self) -> pd.DataFrame:
        generator = np.random.default_rng(0)
        size = 240
        price = generator.integers(50, 500, size) * 1000
        sales = np.where(generator.random(size) < 0.4, 0, generator.integers(1, 200, size))
        return pd.DataFrame({
            "product_id": [f"p{i}" for i in range(size)], "seller_id": [f"s{i % 12}" for i in range(size)],
            "price": price, "discount_rate": generator.random(size) * 0.3,
            "description_length": generator.integers(0, 800, size), "name_length": generator.integers(10, 80, size),
            "image_count": generator.integers(1, 9, size), "has_video": generator.random(size) < 0.3,
            "fulfillment_type": "dropship", "product_type": np.where(np.arange(size) % 2, "balo", "túi"),
            "review_count": generator.integers(0, 50, size), "rating_average": generator.random(size) * 5,
            "quantity_sold": sales, "baseline_sold_rate": 0.6, "baseline_median_sales": 10.0,
            "valid_for_model": True,
        })

    def train(self, frame: pd.DataFrame) -> dict:
        config = PipelineConfig(model_folds=3)
        with tempfile.TemporaryDirectory() as directory:
            return train_reference_models(frame, Path(directory), config)[1]

    def test_unit_weights_reproduce_the_unweighted_model(self):
        plain, ones = self.train(self.frame()), self.train(self.frame().assign(sample_weight=1.0))
        self.assertEqual(plain["model_a_actionable"]["roc_auc"], ones["model_a_actionable"]["roc_auc"])
        self.assertFalse(ones["sample_weight"]["applied"])

    def test_weights_change_learning_but_are_reported(self):
        frame = self.frame()
        weighted = frame.assign(sample_weight=np.where(frame.seller_id.eq("s0"), 0.1, 1.0))
        metrics = self.train(weighted)
        self.assertTrue(metrics["sample_weight"]["applied"])
        self.assertEqual(metrics["sample_weight"]["rows_below_one"], 20)
        self.assertNotEqual(metrics["model_a_actionable"]["rmsle_all"],
                            self.train(frame)["model_a_actionable"]["rmsle_all"])
        with self.assertRaises(ValueError):
            self.train(frame.assign(sample_weight=0.0))


class GateTest(unittest.TestCase):
    @staticmethod
    def metrics(roc: float, rmsle: float) -> dict:
        return {"model_a_actionable": {"roc_auc": roc, "rmsle_all": rmsle,
                                       "estimator_backend": "sklearn_hist_gradient_boosting"},
                "peer_baseline": {"roc_auc": 0.653, "rmsle_all": 1.513}}

    def test_model_gate_uses_tolerances_and_baseline(self):
        champion = self.metrics(0.695, 1.364)
        self.assertTrue(model_gate(self.metrics(0.686, 1.383), champion, RetrainConfig())["passed"])
        self.assertFalse(model_gate(self.metrics(0.684, 1.364), champion, RetrainConfig())["passed"])
        self.assertFalse(model_gate(self.metrics(0.695, 1.385), champion, RetrainConfig())["passed"])
        self.assertFalse(model_gate(self.metrics(0.70, 1.30), champion, RetrainConfig(), "lightgbm")["passed"])

    def test_output_gate_limits_status_share_change(self):
        old = {"status_counts": {"performing_well": 50, "difficult_to_sell": 50}}
        near = {"status_counts": {"performing_well": 54, "difficult_to_sell": 46}}
        far = {"status_counts": {"performing_well": 56, "difficult_to_sell": 44}}
        self.assertTrue(output_gate(near, old, True, RetrainConfig())["passed"])
        self.assertFalse(output_gate(far, old, True, RetrainConfig())["passed"])
        self.assertFalse(output_gate(near, old, False, RetrainConfig())["passed"])

    def test_changed_taxonomy_needs_a_passing_random_sample(self):
        config = RetrainConfig()
        self.assertTrue(taxonomy_gate("a", "a", None, config)["passed"])
        self.assertFalse(taxonomy_gate("a", "b", None, config)["passed"])
        self.assertTrue(taxonomy_gate("a", "b", {"accuracy": 0.86}, config)["passed"])


if __name__ == "__main__":
    unittest.main()
