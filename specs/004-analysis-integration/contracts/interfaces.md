# Interface Contracts: Model Serving and Application Integration

**Feature ID**: F004

**Status**: Planning baseline for team review; endpoints and schemas are not implemented.

## Web and model-service contract

| Interface | Access / input | Result |
| --- | --- | --- |
| POST /api/v1/products/{productId}/analyses | Active owned product; Idempotency-Key | Saved analysis ID, processing state and result when completed |
| GET /api/v1/analyses/{analysisId} | Active owner of persisted analysis.store_id | Frozen inputs, approved output, evidence, versions, limitations |
| POST model-service /v1/infer | Server service token; schema_version and approved feature/observation snapshot | F003 validated analytic result and bundle/config/corpus versions |
| GET model-service /health/ready | Internal readiness probe | Ready only after artifact/corpus compatibility validation |

Idempotency keys are 1..200 characters, bound to store/product/input digest.

The service request envelope contains schema_version, source_product_id,
source_snapshot_id, source_seller_id, allowlisted Model A features, separate
observed_sales/feedback observations, and the expected peer/bundle/config
identities. Source IDs enable retrieval exclusions and traceability; they do not
grant app permissions or enter the target estimator. The Next.js server builds
this envelope from persisted data, not browser-supplied ownership or model fields.
Field types/bounds follow F003 and the shared CSV contract. Unknown input schema
versions are rejected; no training configuration or artifact path is accepted
from a request.

HTTP response envelopes carry analysis_id, processing_status and either the
validated result or a controlled safe error. Public errors use code,message,
correlation_id and analysis_id when a run was created, allowing clients to inspect
failed processing. Pending/running duplicate requests return202 with the existing
run ID; completed idempotent reads return200. New synchronous success returns201.
GET uses200; failures use the codes below. The response contract is frozen in
F003/T015 and implemented/checked by F004.

Same key with a different input returns 409. Unauthenticated requests return 401;
role failures 403; foreign/missing nested IDs 404. Invalid input returns 422.
Service unavailable, malformed result or timeout returns controlled 502/503/504
and stores failed processing evidence. No success result is fabricated.
processing_status is pending, running, succeeded or failed. Only succeeded records
contain analytic status; insufficient_data is successful analysis with explicit basis.

analysis inputs, original result/evidence/recommendations and version identities are
immutable. Product reassignment creates a new tenant entry; historical runs remain
scoped to their original store. Authorization is checked before and at result persistence.
All model outputs follow F003; missing/unavailable values are JSON null. A service
response containing NaN/Infinity violates the contract and is rejected as a
controlled failure. The Python adapter normalizes unavailable values before
serialization; it does not convert a broken successful result into a valid one. gap is
reference_sales - observed_sales only when both are valid, with sign documented.
Peer evidence may disclose approved public Tiki fields/aggregates only, not other
stores' private application records or assignments.

## Shared guard and disclosure rules

All application mutations revalidate active session, role and persisted ownership on the server. Read DTOs contain only approved fields. Credentials remain server-side. Human/generated evidence is identified honestly. Reference sales are snapshot-based decision support, not a forecast.

See [spec](../spec.md), [logical model](../data-model.md), [project architecture](../../../docs/decisions/0001-web-database-model-stack.md) and [planning decisions](../../../docs/decisions/0002-planning-scope-and-ownership.md).
