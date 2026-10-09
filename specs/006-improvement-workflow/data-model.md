# Data Model: Suggestions and Improvement Workflow

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Suggestion: immutable original from an analysis, evidence, versions and editable user copy.
- Improvement action: store scope, decision, progress, rejection/completion notes and optimistic version.
- Action event: append-only actor/time/before/after record committed atomically with mutation.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Proposed records

| Record | Fields and relationships | Constraints / lifecycle |
| --- | --- | --- |
| OriginalSuggestion | F004 id/analysis FK; immutable generated text, evidence, rule/version identity | Owner derived from frozen analysis store; never overwritten by edited text |
| ImprovementAction | id; suggestion_id FK; store_id FK; decision; edited_text; rejection_reason; progress; completion_notes; version; actor/time | Unique(suggestion_id) for this MVP; expected_version>=1; editable text/reason/notes nonblank where required and <=2000 |
| ActionHistoryEvent | id; action_id FK; actor_id FK; occurred_at; event_type; before/after; action_version | Append-only; same transaction as state update; unique(action_id,action_version) |

An undecided suggestion is presented as decision=pending with expected_version=1.
The first accept/reject request atomically creates the action and event; a competing
first decision returns409. Accepted/rejected are terminal decisions for this MVP.
Accepted work progresses not_started->in_progress->completed; direct completion
requires notes. completed is terminal. Text edits preserve the generated original.
Completion records work, not observed uplift. Deadlines are excluded.

Action and event writes validate active ownership inside one transaction and use
optimistic version checks. State/version advances only with its event. History
reads preserve original tenant scope; no edit/delete history route exists.
