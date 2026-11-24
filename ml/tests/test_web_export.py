import csv
import json
from pathlib import Path
import tempfile
import unittest

from ml.src.export.web import export_web
from ml.src.scoring.status import STATUS_LABELS_VI


class WebExportTest(unittest.TestCase):
    def test_complete_snapshot_and_reject_partial_export(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = root / "raw"
            raw.mkdir()

            def write(path, rows):
                with path.open("w", newline="") as handle:
                    writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
                    writer.writeheader()
                    writer.writerows(rows)

            write(raw / "source.csv", [{"id": "001", "name": "Shoe", "pay_later": "True"}])
            clean = {"product_id": "001", "product_name": "Shoe", "source_file": "source.csv"}
            write(root / "clean.csv", [clean])
            row = {**clean, "status": "insufficient_data", "reference_sales": "",
                   "has_video": "False", "evidence": "[]", "recommendations": "[]",
                   "peer_ids": "[]", "peer_config": "{}"}
            write(root / "scores.csv", [row])
            counts = {status: int(status == "insufficient_data") for status in STATUS_LABELS_VI}
            summary = {"rows": 1, "quality_acceptance": False, "source_taxonomy_holdout_accuracy": .63,
                       "status_counts": counts, "recommendation_count": 0, "products_with_recommendations": 0}
            (root / "summary.json").write_text(json.dumps(summary))
            args = (root / "scores.csv", root / "clean.csv", raw, root / "summary.json")
            output = root / "full.json"
            export_web(*args, output)
            product = json.loads(output.read_text())["products"][0]
            self.assertEqual(product["product_id"], "001")
            self.assertIsNone(product["reference_sales"])
            self.assertIs(product["has_video"], False)
            self.assertEqual(product["raw_source_records"][0]["attributes"]["pay_later"], "True")
            self.assertEqual(product["product_recommendations"], [])
            with self.assertRaises(FileExistsError):
                export_web(*args, output)
            write(root / "scores.csv", [row, row])
            with self.assertRaises(ValueError):
                export_web(*args, root / "bad.json")
            self.assertFalse((root / "bad.json").exists())
            self.assertEqual(list(root.glob("*.tmp")), [])
