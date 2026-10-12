from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import pandas as pd

from ml.src.evaluation.development import (
    create_development_queue, merge_development_annotations, validate_development_review,
)


class DevelopmentReviewTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.processed = Path(self.temp.name) / "processed"
        self.output = Path(self.temp.name) / "round3"
        (self.processed / "review_queues").mkdir(parents=True)
        rows = []
        for index in range(8):
            for prefix, name, category, label, source in [
                ("fallback", "Mẫu sản phẩm tổng hợp", "Root", "túi ví nam khác", "source_fallback"),
                ("category", "Mẫu kiểu mới", "Giày tây nam", "giày tây nam", "category_rule"),
                ("conflict", "Ví da nam", "Balo", "balo", "category_rule"),
            ]:
                rows.append({
                    "product_id": f"{prefix}{index}", "product_name": name,
                    "description": "Synthetic review fixture", "category_raw": category,
                    "product_type": label, "taxonomy_source": source, "taxonomy_match": "",
                    "source_file": "vietnamese_tiki_products_men_bags.csv", "valid_for_model": True,
                })
        pd.DataFrame(rows).to_csv(self.processed / "clean_products.csv", index=False)
        pd.DataFrame({"product_id": ["fallback0"]}).to_csv(
            self.processed / "review_queues/taxonomy_holdout_review.csv", index=False
        )
        pd.DataFrame({"target_product_id": ["category0"], "peer_product_id": ["conflict0"]}).to_csv(
            self.processed / "review_queues/peer_pairs_review.csv", index=False
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def create(self):
        return create_development_queue(
            self.processed, self.output, Path("ml/config/taxonomy.yml"),
            Path("ml/config/taxonomy_label_guide.yml"),
            fallback_size=2, category_size=2, conflict_size=2,
        )

    def read(self):
        return pd.read_csv(self.output / "taxonomy_development_round_3.csv", dtype=str).fillna("")

    def write(self, review):
        review.to_csv(self.output / "taxonomy_development_round_3.csv", index=False)

    def test_balanced_disjoint_queue_and_no_overwrite(self) -> None:
        metrics = self.create()
        review = self.read()
        self.assertEqual(metrics["selected_counts"], {
            "fallback": 2, "category_rule": 2, "name_category_conflict": 2
        })
        self.assertTrue(review.product_id.is_unique)
        self.assertFalse(set(review.product_id) & {"fallback0", "category0", "conflict0"})
        self.assertTrue(review.human_product_type.eq("").all())
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.create()

    def test_blank_review_is_incomplete(self) -> None:
        self.create()
        metrics = validate_development_review(self.output)
        self.assertEqual(metrics["accepted_rows"], 0)
        self.assertFalse(metrics["complete"])

    def test_annotation_validation_and_development_identity(self) -> None:
        self.create()
        review = self.read()
        review["human_product_type"] = review.product_type
        review["review_confidence"] = "cao"
        review["reviewer"] = "Synthetic reviewer"
        self.write(review)
        metrics = validate_development_review(self.output)
        self.assertTrue(metrics["complete"])
        self.assertEqual(metrics["purpose"], "development_only")
        review.loc[0, "human_product_type"] = "not-a-taxonomy-label"
        self.write(review)
        metrics = validate_development_review(self.output)
        self.assertEqual(metrics["invalid_label_rows"], 1)
        self.assertFalse(metrics["complete"])

    def test_low_confidence_and_disagreement_need_resolution(self) -> None:
        self.create()
        review = self.read()
        review["human_product_type"] = review.product_type
        review["review_confidence"] = "cao"
        review["reviewer"] = "Synthetic reviewer"
        review.loc[0, "review_confidence"] = "thap"
        self.write(review)
        self.assertEqual(validate_development_review(self.output)["unresolved_rows"], 1)
        review.loc[0, "second_product_type"] = "ambiguous"
        review.loc[0, "second_reviewer"] = "Synthetic second reviewer"
        self.write(review)
        self.assertEqual(validate_development_review(self.output)["unresolved_rows"], 1)
        review.loc[0, "final_product_type"] = "ambiguous"
        self.write(review)
        self.assertTrue(validate_development_review(self.output)["complete"])

    def test_frozen_product_fields_cannot_change(self) -> None:
        self.create()
        review = self.read()
        review.loc[0, "product_name"] = "Edited snapshot name"
        self.write(review)
        with self.assertRaisesRegex(ValueError, "identity changed"):
            validate_development_review(self.output)

    def test_holdout_exclusion_requires_file(self) -> None:
        (self.processed / "review_queues/taxonomy_holdout_review.csv").unlink()
        with self.assertRaisesRegex(FileNotFoundError, "holdout IDs"):
            self.create()

    def test_merge_subset_preserves_queue_and_detects_conflicts(self) -> None:
        self.create()
        subset = self.read().head(2).copy()
        subset["human_product_type"] = "balo"
        path = self.output / "subset.csv"
        subset.to_csv(path, index=False)
        summary = merge_development_annotations(self.output, path)
        self.assertEqual(summary["human_labelled_rows"], 2)
        self.assertEqual(summary["pending_label_rows"], 4)
        self.assertTrue(self.read().reviewer.eq("").all())
        self.assertEqual(merge_development_annotations(self.output, path)["updated_annotation_cells"], 0)
        subset.loc[subset.index[0], "human_product_type"] = "vali"
        subset.to_csv(path, index=False)
        with self.assertRaisesRegex(ValueError, "Conflicting annotations"):
            merge_development_annotations(self.output, path)
        self.assertEqual(self.read().human_product_type.eq("balo").sum(), 2)


if __name__ == "__main__":
    unittest.main()
