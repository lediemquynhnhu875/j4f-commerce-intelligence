# Data Model: Final Integration, Evaluation, and Demo Readiness

**Status**: Proposed logical model; no schema is applied.

## Entities and responsibilities

- Release evidence: environment versions, run logs, acceptance results and unresolved blockers.
- Human evaluation record: actual participant consent/notes/tasks/results, anonymized for repository use.
- Demo package: approved anonymized mappings, evidence references, script, report and slides.

## Relationships, validation and state transitions

Use the constraints and transitions in [interface contracts](contracts/interfaces.md) as the authoritative feature design. Tenant-owned resources keep a persisted store relation; source seller_id does not establish account ownership. Frozen historical evidence is not rewritten by reassignment or current-data edits.

Each migration/validator task must carry these exact bounds and enums into its implementation. Validation results and errors remain auditable. This design extends, rather than renames, the [shared CSV contract](../../docs/rules/data-contracts.md).
## Detailed planning model

## Evidence records (not application database tables)

| Record | Required information | Verification |
| --- | --- | --- |
| ReleaseCaseResult | feature/task,operator,date,environment,input/artifact IDs,scenario/command,expected/actual,evidence/blocker | Actual runtime checks; distinct mocked transport evidence |
| HumanReviewRecord | real reviewer/date,queue provenance,blind/development split and output references | No generated labels or private holdout leakage |
| InterviewUsabilityRecord | protocol,real anonymized participant,date,observed outcomes and limitations | Genuine fieldwork; not invented quotes or sample counts |
| DemoManifest | explicit account/store/product mapping,source/bundle/config IDs,local secret instructions | Reproducible without committed raw data/credentials |
| ClaimLedger | report/slide claim,evidence link,limitations and reviewer | Every quality/product claim justified |

Keep these records under the task-specified docs paths. The report/runbook consumes
implemented feature contracts and verified results. Missing or failed evidence
blocks acceptance; task totals and figure existence do not imply release readiness.
