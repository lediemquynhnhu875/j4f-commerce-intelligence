from __future__ import annotations

import argparse
import json
from pathlib import Path
import re

import pandas as pd


DESCRIPTION_CUES = {
    "balo": ["balo", "ba lô"], "túi laptop công sở": ["laptop", "cặp sách", "cặp xách", "cặp tài liệu"],
    "túi đeo chéo": ["đeo chéo"], "túi bao tử": ["đeo bụng", "đeo hông", "bao tử"],
    "phụ kiện vali du lịch": ["túi mỹ phẩm", "túi đựng giày", "passport", "hộ chiếu"],
    "giày búp bê": ["giày búp bê"], "giày lười nữ": ["loafer", "giày mọi", "moccasin"],
    "giày lười nam": ["giày lười nam", "giày sục nam"], "boots nữ": ["ủng", "boots nữ", "bốt nữ"],
    "phụ kiện túi": ["dây khóa", "dây kéo", "làm túi", "nắp túi"],
}


def ambiguity_diagnosis(row: pd.Series) -> tuple[str, str]:
    text = (str(row.get("product_name", "")) + " " + str(row.get("description", ""))).lower()
    unisex = bool(re.search(r"unisex|nam\s*(?:và\s*)?nữ|nam/nữ", text))
    if unisex and re.search(r"sandal|sandals|quai hậu", text):
        return "missing_unisex_sandal_label", "Đề nghị thảo luận nhãn sandal unisex; chưa tự đổi taxonomy."
    if unisex and re.search(r"giày lười|slip.?on", text):
        return "missing_unisex_loafer_label", "Đề nghị thảo luận nhãn giày lười unisex."
    if unisex and "giày" in text and not re.search(r"thể thao|sneaker", text):
        return "missing_generic_unisex_shoe_label", "Đề nghị thảo luận nhãn giày khác/không giới tính."
    if "combo" in text or re.search(r"túi cơm|balo\s*,\s*cặp", text):
        return "multiple_main_items_or_conflicting_structure", "Xác nhận món chính hoặc quy ước cho combo; có thể cần ảnh."
    if re.search(r"boot|bốt", text) and not re.search(r"\bnam\b|\bnữ\b", text):
        return "missing_gender_neutral_boot_label", "Đề nghị thảo luận nhãn boots khác; không đoán giới tính từ size."
    if "kính" in text:
        return "frame_vs_complete_glasses_unclear", "Xác nhận có tròng kính đi kèm hay chỉ bán gọng."
    return "insufficient_type_or_gender_evidence", "Bổ sung ảnh/mô tả hoặc thống nhất nhãn không giới tính."


def error_diagnosis(row: pd.Series) -> tuple[str, str]:
    expected = str(row.human_product_type)
    name = str(row.product_name).lower()
    description = str(row.description).lower()
    if expected == "ambiguous":
        reason, action = ambiguity_diagnosis(row)
        return "taxonomy_gap_or_insufficient_information", f"{reason}: {action}"
    if expected == "out_of_scope":
        return "scope_filter_gap", "Bổ sung nhận diện nhóm ngoài phạm vi; ưu tiên cụm loại hàng, không dùng mã sản phẩm."
    if row.get("name_only_product_type") == expected:
        return "rule_precedence_conflict", "Tên đã có bằng chứng đúng; kiểm tra thứ tự ưu tiên category/từ khóa/quà tặng."
    if any(cue in description and cue not in name for cue in DESCRIPTION_CUES.get(expected, [])):
        return "description_evidence_missed", "Mô tả có gợi ý loại sản phẩm; kiểm tra đây là món chính trước khi dùng description rule."
    if row.get("candidate_taxonomy_source") == "category_rule":
        return "category_overrides_main_item", "Category và nhãn xác nhận không khớp; cần kiểm tra cấu trúc/công dụng của món chính."
    if len(name.strip()) < 20 and not any(cue in description for cue in DESCRIPTION_CUES.get(expected, [])):
        return "sparse_or_code_only_title", "Tên quá ngắn/mã hóa; cần mô tả/ảnh, tránh học thuộc mã hoặc thương hiệu."
    return "compositional_keyword_or_semantic_gap", "Thử nhận diện cụm từ/đặc tính kết hợp hoặc mô hình text; không thêm từ khóa riêng cho một ID."


def analyze_errors(review_dir: Path) -> dict:
    errors = pd.read_csv(review_dir / "candidate_errors_to_review.csv", dtype=str).fillna("")
    diagnoses = errors.apply(error_diagnosis, axis=1)
    errors["ai_error_group"] = diagnoses.map(lambda item: item[0])
    errors["ai_suggested_next_step"] = diagnoses.map(lambda item: item[1])
    errors["diagnosis_source"] = "AI heuristic diagnosis; not independently confirmed root cause"
    errors.to_csv(review_dir / "candidate_errors_diagnosed.csv", index=False, encoding="utf-8-sig")
    review = pd.read_csv(review_dir / "taxonomy_development_round_3.csv", dtype=str).fillna("")
    ambiguous = review.loc[review.human_product_type.eq("ambiguous")].copy()
    details = ambiguous.apply(ambiguity_diagnosis, axis=1)
    ambiguous["ai_gap_hypothesis"] = details.map(lambda item: item[0])
    ambiguous["ai_suggested_taxonomy_change"] = details.map(lambda item: item[1])
    ambiguous["needs_independent_second_review"] = True
    ambiguous.to_csv(review_dir / "ambiguous_cases_analysis.csv", index=False, encoding="utf-8-sig")
    summary = {
        "error_rows": len(errors), "error_group_counts": errors.ai_error_group.value_counts().to_dict(),
        "ambiguous_rows": len(ambiguous), "ambiguity_reason_counts": ambiguous.ai_gap_hypothesis.value_counts().to_dict(),
        "human_labels_changed": False, "taxonomy_labels_added": False,
        "interpretation": "AI diagnosis to organize development work. It does not establish root causes, human second review or independent accuracy.",
    }
    (review_dir / "error_analysis_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--review-dir", type=Path, default=Path("data/local_reviews/taxonomy_round_3"))
    args = parser.parse_args()
    print(json.dumps(analyze_errors(args.review_dir), ensure_ascii=False, indent=2))
