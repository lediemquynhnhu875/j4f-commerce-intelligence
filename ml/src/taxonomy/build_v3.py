from __future__ import annotations

from pathlib import Path

import yaml


def build_v3(root: Path = Path("ml/config")) -> dict:
    """Generate taxonomy_v3.yml from the tracked v2 config and the v3 change file."""
    config = yaml.safe_load((root / "taxonomy_v2.yml").read_text(encoding="utf-8"))
    changes = yaml.safe_load((root / "taxonomy_v3_changes.yml").read_text(encoding="utf-8"))
    by_label = {rule["label"]: rule for rule in config["product_types"]}
    for label, update in changes.get("updates", {}).items():
        rule = by_label[label]
        for key, value in update.items():
            rule[key] = list(dict.fromkeys(rule.get(key, []) + value)) if isinstance(value, list) else value
    config["special_name_rules"] = config.get("special_name_rules", []) + changes.get("special_name_rules", [])
    config["taxonomy_version"] = changes["taxonomy_version"]
    config["v3"] = changes["v3"]
    (root / "taxonomy_v3.yml").write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False), encoding="utf-8")
    guide_path = root / "taxonomy_label_guide_v2.yml"
    if guide_path.exists():
        guide = yaml.safe_load(guide_path.read_text(encoding="utf-8"))
        guide["conventions"] = changes.get("guide_conventions", [])
        (root / "taxonomy_label_guide_v3.yml").write_text(
            yaml.safe_dump(guide, allow_unicode=True, sort_keys=False), encoding="utf-8"
        )
    return config


if __name__ == "__main__":
    build_v3()
