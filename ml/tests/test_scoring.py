from __future__ import annotations

import json
import unittest

import numpy as np
import pandas as pd

from ml.src.config import PipelineConfig
from ml.src.scoring.status import score_products


class ScoringTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = PipelineConfig(minimum_mean_peer_similarity=0.10)
        self.product = {
            "product_id": "sample", "product_type": "balo", "quantity_sold": 2, "price": 120,
            "peer_median_price": 100, "image_count": 2,
            "peer_median_image_count": 4, "has_video": "False",
            "peer_video_share": 0.6, "description_length": 50,
            "good_peer_video_share": 0.6, "good_peer_count": 8,
            "good_peer_video_known_count": 8, "good_peer_sales_threshold": 20,
            "peer_median_description_length": 300, "rating_average": 4.5,
            "review_count": 10, "peer_count": 25, "mean_peer_similarity": 0.5,
            "insufficient_data": "False", "peer_quality_reason": "",
            "baseline_median_sales": 10, "baseline_sold_rate": 0.7,
        }
        self.prediction = {
            "product_id": "sample", "sale_probability": 0.7,
            "conditional_sales": 20, "reference_sales": 14,
            "prediction_lower": 5, "prediction_upper": 30,
            "model_version": "test-model-a",
        }

    def score(self, product=None, prediction=None):
        return score_products(
            pd.DataFrame([{**self.product, **(product or {})}]),
            pd.DataFrame([{**self.prediction, **(prediction or {})}]),
            self.config,
        ).iloc[0]

    def test_all_six_statuses_and_boundary(self) -> None:
        cases = [
            ({}, {}, "positive_feedback_low_sales"),
            ({"rating_average": 3.0}, {}, "low_rating_low_sales"),
            ({"quantity_sold": 5}, {}, "performing_well"),
            ({"quantity_sold": 0}, {"sale_probability": 0.5}, "untapped_potential"),
            ({"quantity_sold": 0}, {"sale_probability": 0.49}, "difficult_to_sell"),
            ({"review_count": 9}, {}, "insufficient_data"),
        ]
        for product, prediction, expected in cases:
            with self.subTest(expected=expected):
                row = self.score(product, prediction)
                self.assertEqual(row["status"], expected)
                self.assertTrue(row["analysis_is_hypothesis"])
                self.assertTrue(row["status_explanation_vi"])

    def test_missing_prediction_does_not_use_baseline(self) -> None:
        row = self.score(prediction={"reference_sales": np.nan})
        self.assertEqual(row["status_reason"], "missing_reference_prediction")
        self.assertTrue(pd.isna(row["reference_sales"]))
        self.assertEqual(json.loads(row["recommendations"]), [])

    def test_unmatched_prediction_returns_insufficient_data(self) -> None:
        row = self.score(prediction={"product_id": "different-product"})
        self.assertEqual(row["status"], "insufficient_data")
        self.assertTrue(pd.isna(row["prediction_lower"]))

    def test_missing_observed_sales_is_not_zero_sales(self) -> None:
        row = self.score(product={"quantity_sold": np.nan})
        self.assertEqual(row["status_reason"], "missing_observed_sales")

    def test_insufficient_peers_clear_reference_and_actions(self) -> None:
        for updates in [{"peer_count": 14}, {"mean_peer_similarity": 0.09},
                        {"insufficient_data": "True"}]:
            with self.subTest(updates=updates):
                row = self.score(product=updates)
                self.assertEqual(row["status"], "insufficient_data")
                self.assertTrue(pd.isna(row["reference_sales"]))
                self.assertTrue(pd.isna(row["opportunity_score"]))
                self.assertEqual(json.loads(row["recommendations"]), [])

    def test_sparse_feedback_preserves_valid_reference(self) -> None:
        row = self.score(product={"review_count": 0})
        self.assertEqual(row["status_reason"], "insufficient_feedback_for_low_sales_interpretation")
        self.assertEqual(row["reference_sales"], 14)
        self.assertTrue(json.loads(row["recommendations"]))

    def test_action_rules_have_evidence_and_validation(self) -> None:
        row = self.score(product={"rating_average": 3.0})
        actions = json.loads(row["recommendations"])
        self.assertEqual(len(actions), 5)
        for action in actions:
            self.assertEqual(set(action), {"rule_id", "evidence", "hypothesis", "action", "validation_needed"})
            self.assertTrue(all(action.values()))
        evidence = json.loads(row["evidence"])
        video = next(item for item in evidence if item["metric"] == "has_video")
        self.assertIs(video["observed"], False)

    def test_no_fabricated_video_or_nonfinite_evidence(self) -> None:
        row = self.score(product={"has_video": None, "peer_median_price": np.inf})
        actions = json.loads(row["recommendations"])
        self.assertFalse(any("video" in item["action"] for item in actions))
        self.assertNotIn("Infinity", row["evidence"])
        self.assertNotIn("NaN", row["evidence"])

    def test_performing_product_can_receive_quality_action(self) -> None:
        row = self.score(product={"quantity_sold": 20, "rating_average": 3.0})
        self.assertEqual(row["status"], "performing_well")
        self.assertTrue(any("Đọc đánh giá" in item["action"]
                            for item in json.loads(row["recommendations"])))

    def test_explicit_baseline_mode(self) -> None:
        row = score_products(pd.DataFrame([self.product]), None, self.config).iloc[0]
        self.assertEqual(row["model_version"], "peer-baseline-v1")
        self.assertEqual(row["reference_sales"], 10)

    def test_invalid_product_and_model_b_guardrail(self) -> None:
        row = self.score(product={"valid_for_model": "False"})
        self.assertEqual(row["status_reason"], "invalid_essential_data")
        row = self.score(prediction={"reference_sales_model_b": 1000,
                                     "prediction_lower_model_b": 900})
        self.assertEqual(row["reference_sales"], 14)
        self.assertEqual(row["status"], "positive_feedback_low_sales")

    def test_video_requires_good_peer_support_not_all_peer_share(self) -> None:
        for updates in [
            {"peer_video_share": 1.0, "good_peer_video_share": 0.1},
            {"good_peer_video_share": 1.0, "good_peer_video_known_count": 4},
            {"good_peer_video_share": np.nan},
        ]:
            with self.subTest(updates=updates):
                row = self.score(product=updates)
                actions = json.loads(row["recommendations"])
                self.assertFalse(any(item["rule_id"] == "consider_product_video" for item in actions))

    def test_out_of_scope_and_unresolved_have_no_sales_actions(self) -> None:
        for label in ["out_of_scope", "ambiguous", "unknown"]:
            with self.subTest(label=label):
                row = self.score(product={"product_type": label})
                self.assertEqual(row["status"], "insufficient_data")
                self.assertTrue(pd.isna(row["reference_sales"]))
                self.assertEqual(json.loads(row["recommendations"]), [])


if __name__ == "__main__":
    unittest.main()
