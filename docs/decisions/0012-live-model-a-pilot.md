# 0012 Live Model A pilot

Date 2026-11-24 (Asia/Saigon).
Owner requesting contributor, Codex-assisted.
Status implemented for deployment testing. Live cloud verification pending.

## Context

Sellens imports raw product data and previously saved offline ML results.
The web applications already run independently on Vercel and Render.
The fitted estimator and matching corpus are stored outside the Git checkout.

## Decision

- Run the existing fitted Model A on a separate CPU FastAPI service. The
  operator provides a trusted bundle, matched calibration report and taxonomy
  v2 corpus. Private object storage holds the archive. Render verifies its
  SHA-256 at build time and the app checks dependency and artifact compatibility
  at startup.
- Keep import atomic and independent of inference. The store owner explicitly
  analyzes a single saved product. The backend sends only the allowlisted fields
  required for inference. The service computes comparable products from its
  fixed corpus and returns aggregate evidence. Model B is excluded from scoring.
- Reuse the existing analysis and action history tables. Verify the current
  session, store and product snapshot again before writing. Repeated request
  keys refer to the same successful result. Save the run, snapshot, output,
  original recommendations and creation history in one transaction.

## Consequences

The pilot is synchronous and records successful runs only. A failed ML call
returns a controlled error and leaves the previously saved result intact.
Jobs, persisted processing states, concurrency/load targets and cloud acceptance
with the team's artifact remain separate from this pilot. The existing taxonomy
quality gate remains unmet. The new results are experimental and require review.

See the [deployment guide](../ml/trien-khai-ml-render.md) and
[serving contract](../rules/data-contracts.md#live-model-a-pilot).
