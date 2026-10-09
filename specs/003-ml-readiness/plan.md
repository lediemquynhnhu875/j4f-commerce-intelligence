# Implementation Plan: ML Analysis Readiness

**Branch**: Current checkout retained; proposed `feature/ml-readiness` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: `specs/003-ml-readiness/spec.md`

## Summary

Audit and verify existing ML work, fill documented inference gaps, and freeze a reproducible analysis contract.

Follow [research](research.md), [data model](data-model.md) and [interface contracts](contracts/interfaces.md). This is a documentation-only plan; package installation, runtime initialization and application changes are future tasks.

## Technical Context

**Language/Version**: TypeScript for web; Python >=3.11 for ML/service. Existing test attempt used Python3.12.4. Pin compatible Node LTS/library versions at setup.

**Primary Dependencies**: Next.js App Router; PostgreSQL/pg and Better Auth for web where relevant; existing sklearn/Pandas/NumPy/PyYAML and Python/FastAPI for ML serving. No dependency is added in this planning phase.

**Storage**: Neon PostgreSQL for application data; ignored local CSV/model artifacts for ML. Use immutable source/input/output versions and explicit store assignments.

**Testing**: Existing unittest suite; planned browser/route/transaction/contract checks and real human evaluation as applicable. Proposed web baseline: Vitest and Playwright; Python service baseline: unittest with FastAPI TestClient. No tests are created now.

**Target Platform**: Browser UI plus Node.js web server and Python service. Hosted deployment provider and durable queue are outside this MVP planning decision.

**Project Type**: Existing Python ML pipeline plus one full-stack Next.js app and model service.

**Performance Goals**: Prioritize measurable correctness and bounded handling; no unsupported latency/concurrency guarantee. F004 proposes configurable30s inference timeout, F002 bounds catalog pages at100; measure real workloads before setting SLOs.

**Constraints**: No application implementation in this request; preserve ML; server-side ownership; frozen evidence; no forecasts/causal guarantees or fabricated human results.

**Scale/Scope**: One Tiki source dataset; one store per User; 3 stories in F003; Admin scope is system-wide. Dependencies: none.

## Constitution Check

| Gate | Before research | After design |
| --- | --- | --- |
| Evidence and snapshot limitations | PASS: bounded requirements | PASS: nullable basis and honest claims |
| Agreed architecture and ML reuse | PASS: existing boundaries inspected | PASS: no duplicated pipeline/rule engine |
| Contracts and data protection | PASS: shared contract loaded | PASS: explicit scoped DTOs and server-only secrets |
| Verification before task completion | PASS: no completion assumed | PASS: acceptance/test evidence required |
| Shared ownership and English documentation | PASS: current user names prevail | PASS: proposed owners, not assignments |

PASS here means design compliance, not executed runtime or model-quality verification.

## Project Structure

### Documentation (this feature)

- [spec.md](spec.md)
- [research.md](research.md)
- [data-model.md](data-model.md)
- [contracts/interfaces.md](contracts/interfaces.md)
- [quickstart.md](quickstart.md)
- [tasks.md](tasks.md)

### Source Code (repository root)

- `ml/src/models/reference.py`
- `ml/src/peers/build.py`
- `ml/src/scoring/status.py`
- `ml/src/inference/`
- `ml/tests/`
- `docs/verification/`

**Structure Decision**: Use the existing frontend/ Next.js placement, backend/ Python service scaffold and reusable ml/src/ logic. These are proposed target paths; no source files are created by this plan. Existing deleted frontend .gitkeep files are preserved.

## Phase 0: Research Outcome

Decisions, rationale and source references are in [research.md](research.md); user-confirmed login/store scope is recorded in the planning ADR.

## Phase 1: Design Outcome

Logical entities, interfaces and [validation scenarios](quickstart.md) are defined. Early UI previews use current draft specs/contracts and labeled synthetic fixtures. Final contract review is required before real integration, and mock evidence remains separate from real database/model verification.

## Complexity Tracking

No constitution exception is requested. Specific missing evidence and implementation prerequisites are recorded in [tasks](tasks.md) and the [backlog](../../docs/PROJECT_BACKLOG.md).


## Revised Execution Order

Follow the [UI-first sequencing decision](../../docs/decisions/0003-ui-preview-first-task-order.md).
Task numbers follow the corrected local execution order; phase headings add no
implicit prerequisites. Framework setup and clearly labeled previews do not
wait for real auth/database/model readiness. Real integration checks remain required.
