# Data Model: Product Data, Imports, and Catalog

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Dataset snapshot and import batch: provenance, checksum, validation errors and publication state.
- Source product: source identifier and snapshot fields, separate from application tenant ownership.
- Store product: explicit store-owned catalog entry linked to a source product/snapshot.
- Category: managed application label with traceable taxonomy relationship.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Proposed records

| Record | Fields and relationships | Constraints / lifecycle |
| --- | --- | --- |
| SourceSnapshot | id; source_name; checksum; captured_at nullable; observation_scope; imported_at | Immutable published provenance; unknown timing remains unknown |
| SourceProduct | snapshot_id FK; source_product_id; clean-product fields from shared contract | Unique(snapshot_id,source_product_id); names/IDs nonblank; preserve source seller metadata |
| Category | id; name; taxonomy_mapping; archived_at | Unique nonblank name<=200; mapping reviewed with Nhung |
| StoreProduct | id; store_id FK; snapshot_id/source_product_id FK; category_id FK; archived_at; assigned_by | Unique(store_id,snapshot_id,source_product_id); app ID differs from source ID |
| ImportBatch | id; checksum; source metadata; created_by Admin FK; state; created_at/published_at; snapshot_id nullable | staged->validated->published or rejected; checksum reuse is idempotent |
| ImportRowError | import_id FK; row_number; field; reason | row_number>=1; auditable validation failures |

StoreProduct is the tenant resource; the same public SourceProduct can be explicitly
mapped into different demo stores without sharing private application state.
Publishing snapshot/products/mappings is atomic. Reassignment archives the old
entry and creates/reuses a new tenant entry; historical analysis stays with the
old entry and original store. Source snapshots are never edited in place.

Upload the existing Python CLI's cleaned CSV, not a new TypeScript cleaner.
Conflicting duplicate source IDs reject publication; exact repeat checksums reuse
the batch. Optional values stay null. Invalid essential fields are rejected/audited;
zero-price audit rows retain valid_for_model=false. Source field bounds and
pagination limits are in the interface contract.
