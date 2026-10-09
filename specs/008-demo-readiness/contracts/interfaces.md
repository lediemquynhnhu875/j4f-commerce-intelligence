# Interface Contracts: Final Integration, Evaluation, and Demo Readiness

**Feature ID**: F008

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Release validation and handoff contract

Validation consumes the F001-F007 contracts and never changes their security scope.
Required two-store/admin fixture identities map explicitly to stores and source products.
Protected-resource test matrix covers productId, analysisId, suggestionId, actionId
and history lookups. Include suspended/revoked sessions and unauthorized Admin calls.

Required paths: login -> catalog -> product -> real analysis -> evidence ->
accept/reject -> progress/completion -> append-only history. Separate cases cover
real insufficient-basis output, unavailable model service and transaction rollback.

Each acceptance record stores feature/task identity, operator, date, environment,
input/artifact version, command/scenario, expected/actual outcome, evidence path and blockers.
Human tasks require real reviewer/participant records; anonymized notes may be committed.
Report/slide claims link to verified evidence and documented limitations.
The missing full project/competition report remains missing until Như supplies it.
Do not claim it was reviewed from notebook figures or this planning request.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
