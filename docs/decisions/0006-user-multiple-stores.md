# 0006: One User owns multiple stores

Date: 2026-10-14 (Asia/Saigon). Owner: requesting contributor, Codex-assisted.
Status: direct user-confirmed relationship; SQL/schema proposal not applied.
Reviewers: Mai, Huy, Nhung.

## Context

The contributor now clarifies that User is a shop-owner account, with multiple
stores containing their products, and requests Mermaid/database code for manual
application. This supersedes both the original one-store-per-User plan and the
later shared-catalog-only deliverable. ML export integration remains deferred.

## Decision

Add stores(owner_user_id FK users) and products.store_id FK stores, preserving
the six original tables, fields/enums, history and separate actor references.
Each listing has one store; each owner can have multiple stores. Categories remain
shared. Retain database reviewer/API user naming for compatibility. Stage the
addition with nullable legacy membership, explicit assignment, then NOT NULL.
No automatic seed split, owner derivation, migration execution or data replacement.
Product moves and owner transfers are blocked after initial assignment so original
store ownership can continue to scope saved evidence and history.

## Consequences

The current runtime still uses shared-catalog queries. API/UI store support and
server-side nested ownership enforcement are pending; SQL alone does not implement
them. Existing one-store/shared-catalog acceptance checkboxes cannot be claimed
complete by this proposal. Deliverables are [schema/diagram](../architecture/sellens-multi-store.md),
complete DBML and two staged SQL proposals, leaving applied 001 unchanged.
