# Interface Contracts: Suggestions and Improvement Workflow

**Feature ID**: F006

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Suggestion/action contract

| Interface | Access / input | Result |
| --- | --- | --- |
| GET /api/v1/products/{productId}/suggestions | Owned product | Saved original suggestions with evidence and analysis provenance |
| POST /api/v1/suggestions/{suggestionId}/actions | Owned original; accept/reject and expected_version | Action and initial decision event |
| PATCH /api/v1/actions/{actionId} | Owned action; expected_version, editable text/progress/notes | Updated action and atomic history event |
| GET /api/v1/actions/{actionId}/history | Original persisted store scope | Append-only ordered actor/time/before/after events |

Suggestion retrieval may select analysis_id to inspect a historical frozen result;
otherwise it selects the latest successful run using deterministic time/ID order.
The analysis must belong to the same owned product. DTOs include the original,
current action decision/progress/version when present, and provenance, enabling
history navigation without reconstructing originals from current product data.

decision: pending -> accepted or rejected; rejected is terminal.
Accepted progress: not_started -> in_progress -> completed; completion can occur
directly from not_started only with recorded completion notes. completed is terminal
for this MVP. Editing accepted text retains the immutable generated original.
Rejection reason and completion notes are nonblank and <=2000 characters.
Editable action text is nonblank and <=2000 characters; expected_version>=1.
Foreign/missing action/suggestion/history IDs return404; wrong role403;
invalid transition422; stale version409. Mutations validate current account/ownership
inside the transaction and write event plus state atomically. History update/delete
endpoints do not exist. Future deadlines require a confirmed scope amendment.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
