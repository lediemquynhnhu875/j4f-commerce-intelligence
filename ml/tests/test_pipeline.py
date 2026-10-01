from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

from ml.src.cli import peers, prepare, score, train
from ml.src.config import PipelineConfig
from ml.src.scoring.status import STATUS_LABELS_VI
from ml.src.taxonomy.rules import evaluate_review_sample, evaluate_taxonomy_predictions


class PipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.raw_dir = root / "raw"
        self.processed_dir = root / "processed"
        self.artifact_dir = root / "artifacts"
        self.raw_dir.mkdir()
        self.taxonomy_path = Path("ml/config/taxonomy.yml")
        self.config = PipelineConfig(
            peer_count=8,
            minimum_peer_count=3,
            taxonomy_review_size=20,
            model_folds=3,
            text_max_features=500,
            text_min_document_frequency=1,
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _write_source_data(self) -> None:
        rows: list[dict[str, object]] = []
        for index in range(72):
            is_bag = index % 2 == 0
            sales = 0 if index % 3 == 0 else (index % 12) + 1
            rows.append(
                {
                    "id": f"p{index:03d}",
                    "name": (
                        f"Balo thời trang chống nước mẫu {index}"
                        if is_bag
                        else f"Giày thể thao nữ nhẹ mẫu {index}"
                    ),
                    "description": (
                        "Balo nhiều ngăn chất liệu polyester phù hợp đi học và đi làm"
                        if is_bag
                        else "Giày thể thao nữ đế êm thoáng khí phù hợp đi bộ hằng ngày"
                    ),
                    "current_seller": json.dumps({"id": f"s{index % 12}"}),
                    "brand": "OEM" if index % 4 else " No Brand ",
                    "category": "Root" if index % 5 == 0 else ("Balo" if is_bag else "Giày nữ"),
                    "inventory_type": "dropship" if index % 10 else "tiki_delivery",
                    "price": f"{200_000 + index * 1_000:,}".replace(",", "."),
                    "original_price": 300_000 + index * 1_000,
                    "discount_rate": "20%",
                    "rating_average": 3.8 if index % 7 == 0 else 4.5,
                    "review_count": 12 if sales else 0,
                    "quantity_sold": sales,
                    "video_url": "https://video.test/item" if index % 2 else "",
                    "images": json.dumps(["a", "b", "c"][: (index % 3) + 1]),
                    "favourite_count": 0,
                    "date_created": 738076,
                }
            )
        first = pd.DataFrame(rows[:36])
        second = pd.DataFrame(rows[36:])
        second = pd.concat([second, first.iloc[[0]]], ignore_index=True)
        duplicate_id = first.iloc[[1]].copy()
        duplicate_id["name"] = "Giày thể thao nữ phiên bản trùng ID"
        second = pd.concat([second, duplicate_id], ignore_index=True)
        first.to_csv(self.raw_dir / "source_1.csv", index=False)
        second.to_csv(self.raw_dir / "source_2.csv", index=False)

    def test_end_to_end_pipeline(self) -> None:
        self._write_source_data()
        clean = prepare(self.raw_dir, self.processed_dir, self.taxonomy_path, self.config)
        self.assertEqual(len(clean), 72)
        self.assertEqual(clean["product_id"].nunique(), 72)
        self.assertNotIn("favourite_count", clean.columns)
        self.assertTrue((clean["product_type"] != "unknown").all())

        quality = json.loads((self.processed_dir / "data_quality_report.json").read_text())
        self.assertEqual(quality["exact_duplicates_removed"], 1)
        self.assertEqual(quality["duplicated_product_id_count"], 2)
        self.assertEqual(quality["non_identical_duplicated_product_id_count"], 1)

        review_path = self.processed_dir / "taxonomy_review_sample.csv"
        review = pd.read_csv(review_path)
        review["is_correct"] = "đúng"
        review.to_csv(review_path, index=False)
        evaluate_review_sample(review_path)

        peer_features = peers(self.processed_dir, self.config)
        self.assertTrue(peer_features["peer_count"].ge(3).all())
        self.assertTrue(peer_features["peer_ids"].map(lambda value: len(json.loads(value))).ge(3).all())

        predictions = train(self.processed_dir, self.artifact_dir, self.config)
        self.assertEqual(len(predictions), len(clean))
        self.assertTrue(predictions["sale_probability"].between(0, 1).all())
        self.assertTrue((self.artifact_dir / "reference_models.joblib").exists())

        scores = score(self.processed_dir, self.config)
        self.assertEqual(len(scores), len(clean))
        self.assertTrue(set(scores["status"]).issubset(STATUS_LABELS_VI))
        self.assertTrue(scores["recommendations"].map(lambda value: isinstance(json.loads(value), list)).all())

    def test_taxonomy_review_metrics(self) -> None:
        review_path = self.processed_dir / "taxonomy_review_sample.csv"
        self.processed_dir.mkdir()
        pd.DataFrame(
            {
                "product_type": ["balo", "giày nữ", "unknown"],
                "is_correct": ["đúng", "sai", "đúng"],
            }
        ).to_csv(review_path, index=False)
        metrics = evaluate_review_sample(review_path)
        self.assertAlmostEqual(metrics["coverage"], 2 / 3)
        self.assertAlmostEqual(metrics["accuracy"], 2 / 3)

    def test_taxonomy_prediction_evaluation_uses_corrected_labels(self) -> None:
        self.processed_dir.mkdir()
        review_path = self.processed_dir / "reviewed.csv"
        metrics_path = self.processed_dir / "metrics.json"
        pd.DataFrame(
            {
                "product_id": ["1", "2"],
                "product_type": ["balo", "ví khác"],
                "is_correct": ["đúng", "sai"],
                "corrected_product_type": ["", "ví nam"],
            }
        ).to_csv(review_path, index=False)
        products = pd.DataFrame(
            {
                "product_id": ["1", "2"],
                "product_type": ["balo", "ví nam"],
                "taxonomy_source": ["name_rule", "name_priority_rule"],
            }
        )

        metrics, comparison = evaluate_taxonomy_predictions(
            products, review_path, metrics_path
        )

        self.assertEqual(metrics["reviewed_rows"], 2)
        self.assertEqual(metrics["accuracy"], 1.0)
        self.assertEqual(comparison["expected_product_type"].tolist(), ["balo", "ví nam"])
        self.assertTrue(metrics_path.exists())


if __name__ == "__main__":
    unittest.main()
