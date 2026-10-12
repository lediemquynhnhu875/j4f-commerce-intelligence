from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import pandas as pd
import yaml

from ml.src.cli import score
from ml.src.config import load_config
from ml.src.models.reference import train_reference_models
from ml.src.peers.build import build_peer_features
from ml.src.taxonomy.rules import assign_product_types, evaluate_taxonomy_predictions


SCHEMA_MIGRATION = {
    '60': 'giày lười khác', '65': 'giày khác', '80': 'giày khác', '102': 'giày khác',
    '127': 'giày khác', '148': 'sandal unisex', '168': 'giày khác', '180': 'giày unisex',
    '257': 'giày unisex', '293': 'boots khác', '298': 'sandal unisex', '301': 'giày lười unisex',
    '323': 'giày khác', '325': 'boots khác', '333': 'giày lười unisex', '335': 'boots khác',
    '341': 'giày khác', '346': 'giày unisex',
}


def main() -> None:
    parser = argparse.ArgumentParser(description='Explicit experimental taxonomy-v2 and reference-model rerun')
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, default=Path('data/processed/taxonomy_v2_run'))
    parser.add_argument('--artifact-dir', type=Path, default=Path('ml/artifacts/taxonomy_v2_run'))
    parser.add_argument('--review-dir', type=Path, default=Path('data/local_reviews/taxonomy_round_3'))
    args = parser.parse_args()
    if (args.output_dir / 'run_summary.json').exists():
        raise ValueError('Completed experiment exists; use a new output directory to preserve its results')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.artifact_dir.mkdir(parents=True, exist_ok=True)
    config = load_config()
    rules_path = Path('ml/config/taxonomy_v2.yml')
    holdout_path = args.source_dir / 'review_queues/taxonomy_holdout_review.csv'
    holdout_hash = hashlib.sha256(holdout_path.read_bytes()).hexdigest()
    original = pd.read_csv(args.source_dir / 'clean_products.csv', dtype={'product_id': str}, low_memory=False)
    print('Stage: taxonomy v2 on the full cleaned snapshot', flush=True)
    products = assign_product_types(original, rules_path)
    assert products.product_id.is_unique and len(products) == len(original)
    products.to_csv(args.output_dir / 'clean_products.csv', index=False)
    rules = yaml.safe_load(rules_path.read_text(encoding='utf-8'))
    guide = yaml.safe_load(Path('ml/config/taxonomy_label_guide_v2.yml').read_text(encoding='utf-8'))['labels']
    pd.DataFrame([{'product_type': label, **details} for label, details in sorted(guide.items())]).to_csv(
        args.output_dir / 'taxonomy_label_set_v2.csv', index=False, encoding='utf-8-sig'
    )

    review = pd.read_csv(args.review_dir / 'taxonomy_development_round_3.csv', dtype=str).fillna('')
    comparison = review[['review_order', 'product_id', 'human_product_type']].merge(
        products[['product_id', 'product_type', 'taxonomy_source']], on='product_id', how='left', validate='one_to_one'
    )
    comparison['schema_v2_label_proposal'] = comparison.review_order.map(SCHEMA_MIGRATION).fillna(comparison.human_product_type)
    comparison['schema_migration_origin'] = comparison.review_order.map(
        lambda order: 'AI schema migration, not new human adjudication' if order in SCHEMA_MIGRATION else 'original user-confirmed label'
    )
    comparison.to_csv(args.output_dir / 'development_comparison_v2.csv', index=False, encoding='utf-8-sig')
    old_review_metrics, _ = evaluate_taxonomy_predictions(
        products, args.source_dir / 'taxonomy_sample_reviewed.csv', args.output_dir / 'taxonomy_review_metrics.json'
    )
    holdout = pd.read_csv(holdout_path, dtype=str).fillna('')
    holdout_comparison = holdout[['product_id', 'human_product_type']].merge(
        products[['product_id', 'product_type']], on='product_id', how='left', validate='one_to_one'
    )
    assert holdout_comparison.product_type.notna().all()
    holdout_accuracy = float(holdout_comparison.product_type.eq(holdout_comparison.human_product_type).mean())
    summary = {
        'generated_at': datetime.now(timezone.utc).isoformat(), 'run_mode': 'experimental_user_requested_rerun',
        'taxonomy_version': rules['taxonomy_version'], 'taxonomy_label_count': len(guide),
        'source_products_sha256': hashlib.sha256((args.source_dir / 'clean_products.csv').read_bytes()).hexdigest(),
        'taxonomy_sha256': hashlib.sha256(rules_path.read_bytes()).hexdigest(), 'holdout_sha256': holdout_hash,
        'rows': len(products), 'rule_coverage': float((~products.taxonomy_source.isin({'source_fallback', 'unmatched'})).mean()),
        'fallback_rows': int(products.taxonomy_source.eq('source_fallback').sum()),
        'fallback_rate': float(products.taxonomy_source.eq('source_fallback').mean()),
        'source_counts': products.taxonomy_source.value_counts().to_dict(),
        'new_label_counts': {label: int(products.product_type.eq(label).sum()) for label in
                            ['sandal unisex', 'sandal khác', 'giày lười unisex', 'giày lười khác',
                             'boots unisex', 'boots khác', 'giày unisex', 'giày khác']},
        'development_round3_frozen_label_accuracy': float(comparison.product_type.eq(comparison.human_product_type).mean()),
        'development_round3_schema_migrated_accuracy': float(comparison.product_type.eq(comparison.schema_v2_label_proposal).mean()),
        'AI_schema_migrated_development_rows': len(SCHEMA_MIGRATION),
        'original_200_development_accuracy': old_review_metrics['accuracy'],
        'holdout_frozen_labels_accuracy': holdout_accuracy,
        'holdout_rows': len(holdout), 'holdout_gate_passed': holdout_accuracy >= config.taxonomy_min_accuracy,
        'schema_change_limitation': 'Eight new labels were introduced. Holdout labels remain frozen v1 labels; no automated holdout relabelling was performed. The schema-migrated development score uses explicit AI proposals, not independent truth.',
        'quality_acceptance': False,
        'rerun_authorization': 'User explicitly requested holdout and model rerun despite previous failing quality gates; downstream results remain experimental.',
    }
    (args.output_dir / 'taxonomy_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)

    print('Stage: recompute peer groups for changed taxonomy', flush=True)
    peers = build_peer_features(products, config)
    peers.to_csv(args.output_dir / 'peer_features.csv', index=False)
    summary['sufficient_peer_products'] = int((~peers.insufficient_data).sum())
    summary['peer_quality_reason_counts'] = peers.peer_quality_reason.replace('', 'passed').value_counts().to_dict()
    print('Stage: retrain reference Model A and Model B with seller-grouped evaluation', flush=True)
    predictions, model_metrics = train_reference_models(peers, args.artifact_dir, config)
    predictions.to_csv(args.output_dir / 'model_predictions.csv', index=False)
    summary['model_metrics'] = model_metrics
    print('Stage: product statuses and recommendations', flush=True)
    scores = score(args.output_dir, config)
    summary['scoring_summary'] = json.loads((args.output_dir / 'product_scores.summary.json').read_text(encoding='utf-8'))
    summary['output_dir'] = str(args.output_dir)
    summary['artifact_dir'] = str(args.artifact_dir)
    summary['peer_audit_limitation'] = 'Previous human peer relevance scores do not validate newly retrieved peer groups.'
    assert len(scores) == len(products) and scores.product_id.is_unique
    assert hashlib.sha256(holdout_path.read_bytes()).hexdigest() == holdout_hash
    for destination in [args.output_dir / 'run_summary.json', Path('ml/reports/metrics/taxonomy_v2_run.json')]:
        destination.write_text(json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    Path('ml/reports/metrics/model_metrics_v2.json').write_text(
        json.dumps(model_metrics, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8'
    )
    print('Completed experimental taxonomy/peer/reference-model/scoring rerun', flush=True)


if __name__ == '__main__':
    main()
