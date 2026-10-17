# 0008: Retire the original development catalog through an explicit CLI

Date: 2026-10-17 (Asia/Saigon).
Owner: requesting contributor, Codex-assisted. Reviewers: Mai / Huy / Như.
Status: cleanup tooling and instructions prepared; live deletion not executed.

## Context

The contributor now wants to remove the ten original API-test products after
importing real ML data, and explicitly requests instructions rather than agent
execution. Read-only Neon inspection found ten registered synthetic products,
three related seed analyses, six seed/integration-test work records and 13 audit
events. History and analyses are protected by append-only triggers.

## Decision

- Provide a development-only CLI with a read-only default preview. Identify the
  sample by seed registry and synthetic provenance, never by ID range or name alone.
- Reject real-source products, real-run analyses, ML actions, unrecognized work,
  missing seed identities or changed history protections. Applying requires the
  exact preview fingerprint, including dependent records and their current values.
- Before deletion, save and sync a private, ignored local JSON backup of only the
  affected records and seed keys. Hold the existing seed/import advisory lock and
  table write locks while checking/applying the transaction.
- This narrow maintenance exception temporarily disables the two named history
  triggers inside the same transaction. Delete history, actions, analyses and
  products in dependency order, re-enable protections and verify counts before
  commit. A failure rolls back transactional DDL and row changes together.
- Preserve accounts, categories, real imports/runs and unrelated history. Remove
  obsolete seed keys and add a catalog-retirement marker. Full development seed
  now refuses to recreate the catalog when that marker exists, including when a
  seed command was waiting on the shared advisory lock.
- Do not change application API authorization, immutable history behavior, migrations
  or model code. The user executes the apply command after reviewing the preview.

## Consequences

This is an explicit maintenance exception to ADR 0004's blanket history retention,
restricted to the original development fixture set and recognized integration work.
It is not a general history-delete API. No store/model/human acceptance is claimed.
After cleanup, older tests requiring the original seed products must run against
a separate seeded development database; full db:seed is deliberately blocked in
the retired catalog. The backup contains application data and stays outside Git.
