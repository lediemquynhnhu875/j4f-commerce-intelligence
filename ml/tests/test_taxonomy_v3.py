from __future__ import annotations

import io
import tempfile
import unittest
from pathlib import Path

import pandas as pd
import yaml

from ml.src.taxonomy.build_v3 import build_v3
from ml.src.taxonomy.rules import assign_product_types

V3 = "ml/config/taxonomy_v3.yml"


class TaxonomyV3Test(unittest.TestCase):
    def predict(self, name, category="Root", description="", source="vietnamese_tiki_products_men_shoes.csv"):
        frame = pd.DataFrame([{"product_name": name, "category_raw": category,
                               "description": description, "source_file": source}])
        return assign_product_types(frame, V3).iloc[0]

    def assert_types(self, cases, **kwargs):
        for name, label in cases.items():
            with self.subTest(name=name):
                row = self.predict(name, **kwargs)
                self.assertEqual(row.product_type, label)
                self.assertEqual(row.taxonomy_version, "v3-head-noun")

    def test_title_head_noun_names_the_item(self):
        self.assert_types({
            "Mũ len nữ kèm găng tay lót nỉ": "mũ nón",
            "Nón chống nắng vành rộng có khẩu trang": "mũ nón",
            "Móc khoá gấu dễ thương phụ kiện túi xách": "phụ kiện thời trang khác",
            "Băng đô turban vải họa tiết": "phụ kiện tóc",
            "Giày búp bê nữ đế xuồng da bò": "giày đế xuồng",
        })

    def test_shoe_words_inside_accessory_titles_do_not_make_shoes(self):
        self.assert_types({
            "Cục gôm tẩy cho giày thông minh": "phụ kiện vệ sinh giày",
            "Bộ 2 miếng lót sau giày silicon": "phụ kiện vệ sinh giày",
            "Ghế đi giày kiêm ghế ngồi chờ": "out_of_scope",
        })

    def test_wallet_and_bag_gender_come_from_the_title(self):
        self.assert_types({
            "Bóp đựng tiền nam đẹp": "ví nam",
            "Ví cầm tay nữ nhiều ngăn": "ví nữ",
            "Ví da mini phù hợp với cả nam lẫn nữ": "ví khác",
            "Túi xách nam nữ phom hộp": "túi xách khác",
            "Túi da phái mạnh classic": "túi xách nam",
        }, source="vietnamese_tiki_products_men_bags.csv")

    def test_heel_cues_and_place_names(self):
        self.assert_types({
            "Giày nữ da bò 5 phân màu đen": "giày cao gót",
            "Giày nữ gót trụ da bóng - hàng Việt Nam": "giày cao gót",
            "Giày nữ búp bê da bò HÀ NAM": "giày búp bê",
            "Dép sandal nam nữ quai ngang": "sandal unisex",
            "Giày da bò Chelsea nam": "boots nam",
        }, source="vietnamese_tiki_products_women_shoes.csv")

    def test_noisy_category_and_unmatched_titles(self):
        self.assertEqual(self.predict("Kim khâu len 3 kích cỡ", "Giày búp bê mũi nhọn").product_type, "out_of_scope")
        self.assertEqual(self.predict("Đầu khóa da bò 3,5 phân", "Mặt thắt lưng").product_type, "thắt lưng")
        row = self.predict("Module đọc thẻ nhớ micro SD", source="vietnamese_tiki_products_backpacks_suitcases.csv")
        self.assertEqual((row.product_type, row.taxonomy_source), ("out_of_scope", "unmatched_default"))
        self.assertEqual(self.predict("(Tặng khăn lau) Kính mát nữ", "Kính mát nữ").product_type, "kính mắt")
        self.assertEqual(self.predict("_Kẹp tóc chữ nhật Hàn Quốc").product_type, "phụ kiện tóc")

    def test_agreed_gender_and_strap_conventions(self):
        # Title, then description, then seller category supply gender; the source file never does.
        self.assertEqual(self.predict("Dép bông đi trong nhà", "Dép - Guốc nữ").product_type, "dép nữ")
        self.assertEqual(self.predict("Giày Palladium Pampa Hi", "Giày thể thao nam cổ cao").product_type,
                         "giày thể thao nam")
        self.assertEqual(self.predict("Túi cói xách tay vintage", "Túi thời trang nữ").product_type, "túi xách nữ")
        self.assertEqual(self.predict("Dép bông đi trong nhà",
                                      source="vietnamese_tiki_products_women_shoes.csv").product_type, "dép khác")
        self.assertEqual(self.predict("Dép nam quai hậu da bò").product_type, "sandal nam")

    def test_vietnamese_word_boundaries_use_python_regex(self):
        # With pandas>=3, CSV text is a pyarrow string whose RE2 engine makes r"\bnữ\b" fail on the
        # category column; v3 must still read the category gender.
        frame = pd.read_csv(io.StringIO(
            "product_name,category_raw,description,source_file\n"
            "GIÀY BOOT CAO CỔ RO307,Giày boots nữ cổ ngắn,,vietnamese_tiki_products_women_shoes.csv\n"
        ), dtype=str).fillna("")
        self.assertEqual(assign_product_types(frame, V3).iloc[0].product_type, "boots nữ")

    def test_v2_config_keeps_v2_behaviour(self):
        frame = pd.DataFrame([{"product_name": "Mũ len nữ kèm găng tay", "category_raw": "Root",
                               "description": "", "source_file": "vietnamese_tiki_products_fashion_accessories.csv"}])
        row = assign_product_types(frame, "ml/config/taxonomy_v2.yml").iloc[0]
        self.assertEqual((row.product_type, row.taxonomy_version), ("găng tay", "v2-unisex-description"))

    def test_built_config_is_reproducible_and_uses_v2_labels(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("taxonomy_v2.yml", "taxonomy_v3_changes.yml"):
                (root / name).write_text(Path("ml/config", name).read_text(encoding="utf-8"), encoding="utf-8")
            build_v3(root)
            self.assertEqual((root / "taxonomy_v3.yml").read_text(encoding="utf-8"),
                             Path(V3).read_text(encoding="utf-8"))
        with open(V3, encoding="utf-8") as handle:
            config = yaml.safe_load(handle)
        with open("ml/config/taxonomy_label_guide_v2.yml", encoding="utf-8") as handle:
            guide = set(yaml.safe_load(handle)["labels"])
        labels = {rule["label"] for rule in config["product_types"]} | {config["v3"]["unmatched_label"]}
        labels |= {rule["label"] for rule in config["special_name_rules"]}
        self.assertTrue(labels <= guide)


if __name__ == "__main__":
    unittest.main()
