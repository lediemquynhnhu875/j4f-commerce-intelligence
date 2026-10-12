from __future__ import annotations

from pathlib import Path

import yaml


def build_v2() -> None:
    root = Path('ml/config')
    config = yaml.safe_load((root / 'taxonomy.yml').read_text(encoding='utf-8'))
    changes = yaml.safe_load((root / 'taxonomy_v2_changes.yml').read_text(encoding='utf-8'))
    additions = yaml.safe_load((root / 'taxonomy_v2_priority_additions.yml').read_text(encoding='utf-8'))
    for rule in config['product_types']:
        label = rule['label']
        rule['priority_keywords'] = list(dict.fromkeys(rule.get('priority_keywords', []) + additions.get(label, [])))
        for key, value in changes.get('updates', {}).get(label, {}).items():
            rule[key] = list(dict.fromkeys(rule.get(key, []) + value)) if isinstance(value, list) else value
        removals = changes.get('remove_priority_keywords', {}).get(label, [])
        rule['priority_keywords'] = [word for word in rule['priority_keywords'] if word not in removals]
    config['product_types'].extend(changes['new_labels'])
    config['taxonomy_version'] = changes['taxonomy_version']
    config['broad_labels'] = changes['broad_labels']
    config['special_name_rules'] = changes.get('special_name_rules', [])
    config['specific_type_order'] = changes.get('specific_type_order', [])
    (root / 'taxonomy_v2.yml').write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False), encoding='utf-8')
    guide = yaml.safe_load((root / 'taxonomy_label_guide.yml').read_text(encoding='utf-8'))
    guide['labels'].update(changes['guide_additions'])
    (root / 'taxonomy_label_guide_v2.yml').write_text(yaml.safe_dump(guide, allow_unicode=True, sort_keys=False), encoding='utf-8')


if __name__ == '__main__':
    build_v2()
