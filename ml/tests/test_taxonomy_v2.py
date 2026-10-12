from __future__ import annotations

import unittest

import pandas as pd
import yaml

from ml.src.taxonomy.rules import assign_product_types


class TaxonomyV2Test(unittest.TestCase):
    def predict(self, name, category="Root", description="", source="vietnamese_tiki_products_men_shoes.csv"):
        frame = pd.DataFrame([{"product_name": name, "category_raw": category,
                               "description": description, "source_file": source}])
        return assign_product_types(frame, "ml/config/taxonomy_v2.yml").iloc[0]

    def test_unisex_and_unknown_gender_are_distinct(self):
        cases = {
            "Sandal unisex quai hậu": "sandal unisex", "Sandal quai hậu": "sandal khác",
            "Giày lười nam nữ": "giày lười unisex", "Giày lười vải": "giày lười khác",
            "Boots unisex cổ cao": "boots unisex", "Giày bốt cổ lửng": "boots khác",
            "Giày nhựa nam nữ": "giày unisex", "Giày nhựa đi mưa": "giày khác",
        }
        for name, label in cases.items():
            with self.subTest(name=name):
                row = self.predict(name)
                self.assertEqual(row.product_type, label)
                self.assertEqual(row.taxonomy_version, "v2-unisex-description")

    def test_main_item_precedes_gift_and_incidental_accessory(self):
        self.assertEqual(self.predict("Túi tote tặng dây buộc tóc", "Cột tóc").product_type, "túi tote")
        self.assertEqual(self.predict("Chai xịt làm sạch giày kèm túi đựng giày", "Phụ kiện vali").product_type,
                         "phụ kiện vệ sinh giày")
        self.assertEqual(self.predict("Balo laptop đi học", "Cặp đựng laptop").product_type, "balo")

    def test_description_refines_category_but_not_unrelated_item(self):
        self.assertEqual(self.predict("Giày nữ cao cấp", "Giày búp bê", "Kiểu dáng: giày Loafer").product_type,
                         "giày lười nữ")
        self.assertEqual(self.predict("Cặp đi học nữ", "Cặp đựng laptop", "BALO TẶNG MÓC KHÓA").product_type,
                         "balo")
        self.assertEqual(self.predict("Túi tote", "Túi tote", "Shop chuyên bán giày lười nữ").product_type,
                         "túi tote")

    def test_shape_precedes_heel_and_gender_precedes_category(self):
        self.assertEqual(self.predict("Giày sandal cao gót nữ", "Giày cao gót").product_type, "sandal nữ")
        self.assertEqual(self.predict("Giày nữ đế xuồng", "Giày cao gót").product_type, "giày đế xuồng")
        self.assertEqual(self.predict("Ví da nam nữ", "Ví nam").product_type, "ví khác")
        self.assertEqual(self.predict("Giày lười Sketcher thể thao nam", "Giày lười nam").product_type,
                         "giày thể thao nam")

    def test_specific_accessory_and_schema_consistency(self):
        self.assertEqual(self.predict("Găng tay hình xăm tattoo", "Găng tay nam").product_type,
                         "phụ kiện thời trang khác")
        with open("ml/config/taxonomy_v2.yml", encoding="utf-8") as handle:
            config = yaml.safe_load(handle)
        with open("ml/config/taxonomy_label_guide_v2.yml", encoding="utf-8") as handle:
            guide = yaml.safe_load(handle)["labels"]
        labels = {rule["label"] for rule in config["product_types"]} | set(config["source_fallbacks"].values())
        self.assertEqual(labels, set(guide))
        self.assertEqual(len(labels), 67)


if __name__ == "__main__":
    unittest.main()
