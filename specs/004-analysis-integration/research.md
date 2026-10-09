# Research: Model Serving and Application Integration

**Date**: 2026-10-09

Research supports a proposed implementation design, not runtime verification. Defaults below are explicit planning choices and remain subject to team review.

## Serving adapter

**Decision**: FastAPI lifespan loads a trusted configured bundle/corpus once per worker; validates compatibility and exposes readiness.

**Rationale**: Existing Python routes are empty and saved-model inference is a separate gap from batch CSV scoring.

**Alternatives considered**: Request-time training and uploaded pickle/joblib execution are excluded.

## Execution

**Decision**: MVP uses a bounded synchronous server-to-server call after persisting a running analysis; no durable async queue is introduced.

**Rationale**: Supports observable requests with limited deployment assumptions; failures are persisted.

**Alternatives considered**: A job queue is deferred until capacity/durable processing requires it.

## States

**Decision**: processing_status: pending/running/succeeded/failed; analytic status remains the existing six values. succeeded may contain insufficient_data.

**Rationale**: Prevents technical failure from being misrepresented as an analytical result.

**Alternatives considered**: A single overloaded status field is excluded.

## Snapshots

**Decision**: Freeze StoreProduct data, source_snapshot_id, model/config/peer/taxonomy versions and output JSON; input digest binds idempotency.

**Rationale**: Results/history must not change when products, mappings or model versions change.

**Alternatives considered**: Recomputing old results from current rows loses evidence.

## Rule placement

**Decision**: Recommendation rules remain in ml/src/scoring/status.py; FastAPI calls shared inference/scoring, Next.js persists/exposes returned originals.

**Rationale**: User explicitly requires one rule implementation and current ML already owns it.

**Alternatives considered**: Duplicating recommendation rules in TypeScript is excluded.

## Failure policy

**Decision**: Service token stays server-only; 30-second configurable timeout; record failed processing on error; stale running jobs reconciled as failed in F007.

**Rationale**: Keeps MVP behavior explicit. No request silently substitutes mocks or a baseline.

**Alternatives considered**: Unlimited waits and hidden fallbacks are excluded.

## Sources and existing evidence

- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication)
- [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/)
- [FastAPI validation](https://fastapi.tiangolo.com/tutorial/body/)
- [FastAPI response models](https://fastapi.tiangolo.com/tutorial/response-model/)
- [scikit-learn persistence](https://scikit-learn.org/stable/model_persistence.html)
- [Existing-code audit](../../docs/verification/planning-audit.md)
- [Confirmed architecture and ownership](../../docs/decisions/0002-planning-scope-and-ownership.md)

All technical unknowns are resolved to a concrete planning baseline or an explicitly scoped future verification task. No package is installed, service provisioned, or gate claimed passed by writing this document. Missing real data, artifacts, and human evidence are execution prerequisites.
