# 0011 Current store statistics

Date 2026-11-19 (Asia/Saigon).
Owner requesting contributor, Codex-assisted.
Status migration applied to configured Neon. Application changes pending deployment.

## Context

The User overview downloaded all store products, saved results and actions.
Admin ranking counted product rows on every sorted page.

## Decision

- Backfill one current statistics row per store. Maintain counts and distributions
  through database triggers in the same transaction as writes and imports.
- Overwrite the current analysis projection when a newer saved result arrives.
  Compare by analyzed timestamp then ID. Keep original results and actions
  in the existing tables.
- Read bounded evidence summaries for User overview and stored product counts
  for Admin ranking. Maintain one ordered index per ranking direction.

## Consequences

Overview request payloads are bounded by category and status counts and
the two preview limits. Admin sorted reads can use the count index. Writes
that change statistics serialize on the store's statistics row. Apply the
migration before rolling out the dependent backend. See
[the data contract](../rules/data-contracts.md#current-store-statistics).
