from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

from ml.src.evaluation.taxonomy_errors import ambiguity_diagnosis, error_diagnosis
from ml.src.taxonomy.text_classifier import duplicate_groups, evaluate_text_classifier, model_text


class TaxonomyTextTest(unittest.TestCase):
    def test_near_duplicate_titles_are_grouped(self) -> None:
        names = pd.Series(["Balo laptop chống nước mẫu 123", "Balo laptop chống nước mẫu 456",
                           "Xi đánh giày màu đen"])
        groups = duplicate_groups(names)
        self.assertEqual(groups[0], groups[1])
        self.assertNotEqual(groups[0], groups[2])

    def test_classifier_uses_text_only_and_grouped_oof(self) -> None:
        rows = []
        for label, phrase in [("balo", "balo laptop"), ("ví nam", "ví nam da")]:
            for style in ["chống nước", "du lịch", "thời trang", "cổ điển", "thủ công"]:
                for version in [1, 2]:
                    rows.append({"product_id": f"{label}-{style}-{version}",
                                 "product_name": f"{phrase} {style} mẫu {version}",
                                 "description": f"Sản phẩm {phrase} {style}", "label": label,
                                 "label_source": "round3_user_confirmed_ai_assisted", "quantity_sold": version})
        frame = pd.DataFrame(rows)
        original_text = model_text(frame)
        frame["quantity_sold"] = 999999
        self.assertTrue(original_text.equals(model_text(frame)))
        with tempfile.TemporaryDirectory() as directory:
            metrics = evaluate_text_classifier(frame, Path(directory), folds=3)
            predictions = pd.read_csv(Path(directory) / "taxonomy_text_oof_predictions.csv")
            self.assertEqual(len(predictions), len(frame))
            self.assertTrue(predictions.oof_product_type.notna().all())
            self.assertTrue(np.isfinite(predictions.oof_margin).all())
            self.assertTrue(predictions.groupby("duplicate_group").validation_fold.nunique().eq(1).all())
            self.assertFalse(metrics["holdout_used_for_training_or_model_selection"])

    def test_ambiguity_does_not_invent_new_labels(self) -> None:
        reason, _ = ambiguity_diagnosis(pd.Series({"product_name": "Sandal quai hậu unisex", "description": ""}))
        self.assertEqual(reason, "missing_unisex_sandal_label")
        reason, _ = error_diagnosis(pd.Series({"product_name": "Sandal quai hậu unisex", "description": "",
                                             "human_product_type": "ambiguous"}))
        self.assertEqual(reason, "taxonomy_gap_or_insufficient_information")


if __name__ == "__main__":
    unittest.main()
