# Research: ML Analysis Readiness

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Audit findings

**Decision**: Current unittest run failed before test collection because pandas is absent. No ML runtime is verified in this planning session.

**Rationale**: Code and historical README claims are not reproducible evaluation evidence.

**Alternatives considered**: Marking existing stages complete from filenames is excluded.

## Model reuse

**Decision**: Reuse sklearn fitted pipelines in reference.py and existing scoring rules; add a predict entry point and complete the saved bundle manifest only where gaps are demonstrated.

**Rationale**: Current bundle omits persisted calibration/config; batch score consumes CSV predictions.

**Alternatives considered**: Replacing the model architecture is outside this verification feature.

## Peer serving

**Decision**: Freeze a versioned global public Tiki peer corpus/retriever, with persisted taxonomy/config and target/same-seller exclusions.

**Rationale**: Existing per-type TF-IDF/nearest-neighbor fitting is batch-only and not exported for serving.

**Alternatives considered**: Per-request retraining and store-local-only peer fitting would change semantics or cost.

## Recommendation rules

**Decision**: Keep rules in ml/src/scoring/status.py and invoke them through reusable inference logic.

**Rationale**: There is already an evidence-linked recommendation implementation.

**Alternatives considered**: Duplicated Next.js or frontend rules are excluded.

## Missing basis

**Decision**: Reference fields become null when model/peer basis is absent; feedback-only insufficient_data may preserve independently valid references with explicit reason.

**Rationale**: Current scorer only reliably nulls opportunity_score and needs reason-specific audit.

**Alternatives considered**: Treating every insufficient_data case as identical loses valid evidence.

## Sources and existing evidence

- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/)
- [FastAPI validation](https://fastapi.tiangolo.com/tutorial/body/)
- [FastAPI response models](https://fastapi.tiangolo.com/tutorial/response-model/)
- [scikit-learn persistence](https://scikit-learn.org/stable/model_persistence.html)
- [Existing-code audit](../../docs/verification/planning-audit.md)
- [Confirmed architecture and ownership](../../docs/decisions/0002-planning-scope-and-ownership.md)

All technical unknowns are resolved to a concrete planning baseline or an explicitly scoped future verification task. No package is installed, service provisioned, or gate claimed passed by writing this document. Missing real data, artifacts, and human evidence are execution prerequisites.
