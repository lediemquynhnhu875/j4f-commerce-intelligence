"""Validate offline ML exports and create a compact, checksummed import bundle.
Run from the repository root. Standard library only; never opens a database.
"""
import argparse
import collections
import csv
import hashlib
import json
import math
from pathlib import Path

RULES = {
    'review_price_positioning': 'review_price',
    'add_product_images': 'review_images',
    'consider_product_video': 'review_video',
    'improve_product_description': 'complete_description',
    'review_quality_feedback': 'inspect_reviews',
    'review_visibility_and_stock': 'verify_listing_and_stock',
}
STATUSES = {'positive_feedback_low_sales', 'low_rating_low_sales', 'performing_well',
            'untapped_potential', 'difficult_to_sell', 'insufficient_data'}
INPUT_FIELDS = '''product_id source_product_id product_name product_type seller_id brand price
original_price description quantity_sold observed_sales rating_average review_count image_count
has_video description_length discount_rate fulfillment_type taxonomy_version valid_for_model
data_quality_issue source_captured_at selected_raw_source_index'''.split()


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def read_csv(path, required):
    with Path(path).open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if not required.issubset(reader.fieldnames or []):
            raise ValueError('Missing required CSV columns: ' + str(sorted(required)))
        return list(reader)


def number(value, name, integer=False, upper=None):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('Invalid number: ' + name)
    if value < 0 or (integer and (int(value) != value or value > 9007199254740991)) or (upper is not None and value > upper):
        raise ValueError('Number outside range: ' + name)
    return value


def normalize(p, status, actions):
    pid = str(p['product_id'])
    if p.get('source_product_id') != pid or p.get('store_id') is not None:
        raise ValueError('Unexpected source/store identity: ' + pid)
    if not str(p.get('seller_id', '')).strip():
        raise ValueError('Missing source seller: ' + pid)
    if not p.get('product_name') or len(p['product_name']) > 500:
        raise ValueError('Invalid product name: ' + pid)
    for key in ['status', 'model_version', 'scoring_rules_version', 'scored_at', 'product_name', 'product_type', 'status_reason', 'status_explanation_vi', 'analysis_limitations_vi']:
        if str(p.get(key)) != status.get(key):
            raise ValueError('Snapshot/status CSV mismatch: ' + pid + '/' + key)
    for key in ['observed_sales', 'reference_sales', 'sale_probability', 'prediction_lower', 'prediction_upper', 'opportunity_score']:
        expected = None if status[key] == '' else float(status[key])
        actual = number(p.get(key), key, integer=key == 'observed_sales', upper=1 if key == 'sale_probability' else None)
        if actual != expected:
            raise ValueError('Snapshot/CSV numeric mismatch: ' + pid + '/' + key)
    if p['status'] not in STATUSES or p.get('analysis_is_hypothesis') is not True or status.get('analysis_is_hypothesis', '').lower() != 'true':
        raise ValueError('Invalid analysis guardrails: ' + pid)
    if p.get('quantity_sold') != p.get('observed_sales'):
        raise ValueError('Observation mismatch: ' + pid)
    for key in ['price', 'original_price', 'quantity_sold', 'rating_average', 'review_count', 'image_count']:
        number(p.get(key), key, integer=key in ['quantity_sold', 'review_count', 'image_count'], upper=5 if key == 'rating_average' else None)
    if p.get('has_video') is not None and not isinstance(p['has_video'], bool):
        raise ValueError('Invalid video flag: ' + pid)
    low, high = p.get('prediction_lower'), p.get('prediction_upper')
    if low is not None and high is not None and low > high:
        raise ValueError('Inverted interval: ' + pid)
    if p.get('peer_count') != len(p.get('peer_ids', [])):
        raise ValueError('Peer count mismatch: ' + pid)
    original = {a['rule_id']: a for a in p.get('recommendations', [])}
    if len(original) != len(p.get('recommendations', [])) or set(original) != {a['rule_id'] for a in actions}:
        raise ValueError('Recommendation identity mismatch: ' + pid)
    suggestions = []
    for a in actions:
        if a['rule_id'] not in RULES:
            raise ValueError('Unknown rule: ' + a['rule_id'])
        for key in ['model_version', 'scoring_rules_version', 'scored_at']:
            if a[key] != status[key]:
                raise ValueError('Mixed recommendation version/time: ' + pid)
        for key in ['evidence', 'hypothesis', 'action', 'validation_needed']:
            if not a[key].strip() or a[key] != original[a['rule_id']].get(key):
                raise ValueError('Recommendation text mismatch: ' + pid + '/' + key)
        if len(a['action']) > 255:
            raise ValueError('Recommendation title too long: ' + pid)
        suggestions.append({**{k: a[k] for k in ['rule_id', 'evidence', 'hypothesis', 'action', 'validation_needed']}, 'type': RULES[a['rule_id']]})
    return {
        'source_id': pid, 'seller_id': str(p['seller_id']),
        'product': {'name': p['product_name'], 'description': p.get('description'), 'brand': p.get('brand'),
                    'price': p.get('price'), 'original_price': p.get('original_price'), 'currency': 'VND',
                    'quantity_sold': p.get('quantity_sold'), 'rating_average': p.get('rating_average'),
                    'review_count': p.get('review_count'), 'number_of_images': p.get('image_count'),
                    'has_video': p.get('has_video'), 'thumbnail_url': p.get('image_url'),
                    'observed_at': p.get('source_captured_at'), 'sales_scope': 'unknown', 'sales_label_verified': False},
        'analysis': {'status': p['status'], 'status_schema_version': 'ml_v2', 'status_reason': p['status_reason'],
                     'product_type': p['product_type'], 'taxonomy_version': p.get('taxonomy_version'),
                     'reference_sold': p.get('reference_sales'), 'probability_positive_sales': p.get('sale_probability'),
                     'prediction_lower': low, 'prediction_upper': high, 'priority_score': p.get('opportunity_score'),
                     'sales_gap': None if p.get('reference_sales') is None or p.get('observed_sales') is None else p['observed_sales'] - p['reference_sales'],
                     'is_eligible': False, 'needs_review': True, 'model_version': p['model_version'],
                     'pipeline_version': p['scoring_rules_version'], 'scored_at': p['scored_at'], 'analyzed_at': p['scored_at'],
                     'input_snapshot_json': {k: p.get(k) for k in INPUT_FIELDS},
                     'comparison_json': {k: v for k, v in p.items() if k.startswith(('peer_', 'good_peer_')) or k == 'mean_peer_similarity'},
                     'evidence_json': {'items': p.get('evidence', []), 'status_reason': p['status_reason'], 'explanation': p['status_explanation_vi']},
                     'config_json': {'prediction_origin': 'unavailable', 'quality_acceptance': False,
                                     'analysis_is_hypothesis': True, 'valid_for_model': p.get('valid_for_model'),
                                     'selected_raw_source_index': p.get('selected_raw_source_index'),
                                     'scoring_rules_version': p['scoring_rules_version'], 'taxonomy_version': p.get('taxonomy_version'),
                                     'peer_config': p.get('peer_config')}, 'limitation_note': p.get('analysis_limitations_vi')},
        'recommendations': suggestions,
    }


def prepare(snapshot, statuses, recommendations, output):
    output = Path(output)
    if output.exists():
        raise ValueError('Output already exists; choose a new directory')
    raw = json.loads(Path(snapshot).read_text(encoding='utf-8-sig'))
    if raw.get('metadata', {}).get('schema_version') != 'j4f-web-snapshot-v1':
        raise ValueError('Unsupported snapshot version')
    products = raw['products']
    ids = [str(p['product_id']) for p in products]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('Empty or duplicate products')
    rows = read_csv(statuses, {'product_id', 'status', 'model_version', 'scored_at'})
    by_id = {r['product_id']: r for r in rows}
    if len(by_id) != len(rows) or set(by_id) != set(ids):
        raise ValueError('Status CSV identity mismatch')
    recs = read_csv(recommendations, {'product_id', 'rule_id', 'evidence', 'hypothesis', 'action', 'validation_needed'})
    action_ids = {(r['product_id'], r['rule_id']) for r in recs}
    if len(action_ids) != len(recs) or any(r['product_id'] not in by_id for r in recs):
        raise ValueError('Duplicate/orphan recommendations')
    grouped = collections.defaultdict(list)
    for r in recs:
        grouped[r['product_id']].append(r)
    known = set(ids)
    if any(str(peer) not in known for p in products for peer in p.get('peer_ids', [])):
        raise ValueError('Unknown peer ID')
    source_hash = digest(snapshot)
    # Validate everything before creating deliverable files.
    for p in products:
        normalize(p, by_id[str(p['product_id'])], grouped[str(p['product_id'])])
    output.mkdir(parents=True)
    target = output / 'records.ndjson'
    with target.open('w', encoding='utf-8', newline='\n') as f:
        for p in sorted(products, key=lambda p: str(p['product_id'])):
            item = normalize(p, by_id[str(p['product_id'])], grouped[str(p['product_id'])])
            item['analysis']['config_json']['source_sha256'] = source_hash
            f.write(json.dumps(item, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    sellers = collections.Counter(str(p['seller_id']) for p in products)
    with (output / 'sellers.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['seller_id', 'product_count'])
        w.writerows(sorted(sellers.items(), key=lambda x: (-x[1], x[0])))
    (output / 'store-mapping.example.json').write_text(json.dumps({'run_key': 'ml-v2-stores-REPLACE', 'seller_to_store': {}}, indent=2), encoding='utf-8')
    report = {'schema_version': 'sellens-ml-import-v1', 'products': len(products), 'recommendations': len(recs),
              'source_sha256': source_hash, 'statuses_sha256': digest(statuses), 'recommendations_sha256': digest(recommendations),
              'records_sha256': digest(target), 'status_counts': dict(collections.Counter(p['status'] for p in products)),
              'seller_count': len(sellers), 'invalid_for_model': sum(p.get('valid_for_model') is not True for p in products),
              'ambiguous_raw_source': sum(p.get('selected_raw_source_index') is None for p in products),
              'peer_links': sum(len(p.get('peer_ids', [])) for p in products), 'quality_acceptance': False}
    (output / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--snapshot', default='data/processed/products_full.json')
    ap.add_argument('--statuses', default='data/processed/product_statuses.csv')
    ap.add_argument('--recommendations', default='data/processed/product_recommendations.csv')
    ap.add_argument('--output', default='data/processed/ml-import-v1')
    a = ap.parse_args()
    try:
        print(json.dumps(prepare(a.snapshot, a.statuses, a.recommendations, a.output), ensure_ascii=False, indent=2))
    except (ValueError, KeyError, OSError) as e:
        raise SystemExit('Preparation stopped: ' + str(e))
