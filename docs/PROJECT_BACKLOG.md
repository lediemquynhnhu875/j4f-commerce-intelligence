# Sellens Implementation Backlog

Date: 2026-10-09 (Asia/Saigon).
Status: 110 implementation tasks; 3 checked, 107 unchecked. Real integration remains planned.

Task count is an inventory, not an effort estimate or completion percentage.
The initial planning session claimed no tasks. The user subsequently authorized
the Stitch-based frontend preview. See [UI verification](verification/sellens-ui-preview.md)
and [current handoff](CURRENT_STATE.md) for implementation evidence and remaining work.

## Confirmed scope and ownership

Admin creates email/password accounts; there is no self-registration. Each User
has one assigned store. Server checks enforce ownership for every nested resource.
Explicit demo-store assignment is independent of source `seller_id`.

Next.js App Router/TypeScript owns UI and web APIs; PostgreSQL on Neon stores
application state; Python/FastAPI reuses the existing ML pipeline. Results are
snapshot decision support, without future-sales or causal-improvement guarantees.

| Member | Primary responsibility | Collaboration |
| --- | --- | --- |
| Như | Product, QA, real interviews/usability, report, slides and demo | Review acceptance, coordinate all members |
| Nhung | EDA, taxonomy, peers, modeling, evaluation and interpretation | ML contracts and model integration with Mai |
| Mai | Cleaning, database, auth, web APIs, imports and FastAPI integration | ML with Nhung; web contracts with Huy |
| Huy | Frontend, UX, User/Admin screens and browser flows | API integration with Mai; usability with Như |

Each task has exactly one proposed primary owner, a separate reviewer and explicit
collaborators. Actual claims require team coordination and a handoff entry.

## Feature inventory

Each directory contains `spec.md`, `plan.md`, `tasks.md`, `research.md`,
`data-model.md`, `contracts/interfaces.md`, `quickstart.md` and a requirements
quality checklist.

| ID / priority | Feature / task file | Scope | Proposed contributors | Main dependencies | Current evidence | Tasks |
| --- | --- | --- | --- | --- | --- | ---: |
| F001 / P1 | [Web foundation](../specs/001-web-foundation/tasks.md) | Next.js, provisioned login, ownership and navigation | Mai, Huy, Như | Agreed stack; setup independent of auth review | Frontend runtime and synthetic shell verified; real auth pending | 16 |
| F002 / P1 | [Product catalog](../specs/002-product-catalog/tasks.md) | Cleaning reuse, staged imports, assignment, search/detail | Mai, Huy, Nhung, Như | F001; field/provenance review | Cleaning source exists; runtime/imports unverified | 15 |
| F003 / P1 | [ML readiness](../specs/003-ml-readiness/tasks.md) | EDA/taxonomy/peers/models; real bundle, calibration, eligibility | Nhung, Mai, Như | Actual data/dependencies/human labels | ML source exists; tests blocked by missing pandas | 16 |
| F004 / P1 | [Analysis integration](../specs/004-analysis-integration/tasks.md) | FastAPI inference, frozen results, idempotency and failures | Mai, Nhung, Huy, Như | F001, F002 and verified F003 | Planned; no real service | 13 |
| F005 / P1 | [User dashboard](../specs/005-user-dashboard/tasks.md) | Supported metrics, evidence and frozen history | Huy, Mai, Nhung, Như | F001, F002, F004 | Stitch-based synthetic overview/analysis built; contracts and real integration pending | 12 |
| F006 / P1 | [Improvement workflow](../specs/006-improvement-workflow/tasks.md) | Decisions, progress, immutable original and atomic history | Mai, Huy, Nhung, Như | F001, F004; recommendation contract | Mock review/accept/reject verified; real workflow and history pending | 12 |
| F007 / P1 | [System Admin](../specs/007-system-admin/tasks.md) | Accounts, stores/categories/imports and processing monitor | Mai, Huy, Như | F001, F002, F004 | Four synthetic Admin pages built; real management and review pending | 12 |
| F008 / P1 release gate | [Demo readiness](../specs/008-demo-readiness/tasks.md) | E2E/human QA, report/slides/demo/runbook | Như, Mai, Nhung, Huy | Verified F003–F007; preparation can start earlier | Instructions exist; no release/human evidence | 14 |

All features are required MVP/release work. Within each feature, story priorities
determine its first usable increment; P2 stories are still required for acceptance.

Task numbers now follow local execution order. The one-time [ID migration](decisions/0003-ui-preview-first-task-order.md) maps older references. Phase headings do not add hidden blockers; check only each task's prerequisites.

Detailed dependencies use `Fnnn/Tnnn` across features and `Tnnn` within a feature.
They take precedence over broad feature ordering.

## Recommended execution

1. Start F001/T001: initialize the runnable Next.js/TypeScript frontend. Nhung
   can start F003/T001's environment/code audit independently.
2. After setup, Huy starts F001/T002–T004: mock shell, navigation and login.
   Other early mock/wireframe tasks use that shared preview foundation without
   waiting for a real database, auth handler or model.
3. Như may review F001/T005–T006's real permission/login cases alongside mock
   work. Those reviews gate F001/T007–T009's database/auth integration, not setup.
4. Implement real catalog, serving and application APIs with explicit server
   guards. Connect each mock UI only after its real endpoints/contracts are ready.
   F003's actual model/human gates remain required before real F004 inference.
5. Verify connected F005/F006/F007 flows and F008 release/human/demo evidence.

The following graph describes real integration dependencies. It does not require
an entire predecessor feature to finish before an early preview starts.

~~~mermaid
flowchart LR
  F001 --> F002
  F001 --> F004
  F002 --> F004
  F003 --> F004
  F002 --> F005
  F004 --> F005
  F004 --> F006
  F001 --> F007
  F002 --> F007
  F004 --> F007
  F003 --> F008
  F005 --> F008
  F006 --> F008
  F007 --> F008
~~~

`[P]` permits conditional parallel work only after dependencies and shared
contracts are reviewed, with different edited files and confirmed owners.
Foundation work in shared files requires coordination.

## Suggested first tasks

| Member | First task | Prerequisite / evidence |
| --- | --- | --- |
| Như | F001/T005: review auth/ownership acceptance | Confirm cases and technical defaults with the team |
| Nhung | F003/T001: audit ML environment/code/readiness | Record missing dependencies/data/artifacts; do not assume readiness |
| Mai | F001/T001: initialize frontend dependencies | No auth-review prerequisite; verify dev/build/lint and versions |
| Huy | F001/T002: mock User/Admin shell | F001/T001 setup; then T003 navigation and T004 mock login |

These are recommendations, not assignments. Leave implementation tasks unchecked
until their completion criteria and verification are met.

## Evidence and resolved inconsistencies

- Corrected earlier swapped owners: Nhung is ML; Huy is frontend. Names are kept
  as Như, Nhung, Mai and Huy.
- Spec Kit is initialized and the constitution exists. Older notes saying
  initialization is pending are superseded.
- Existing ML code is reused, but runtime readiness is unverified.
  `python -m unittest discover -s ml/tests -v` fails at import because `pandas`
  is missing. Data/model/review artifacts and the full report are absent.
- Historic README counts and notebook figures are not current reproduced metrics.
- Existing scoring/recommendation rules remain centralized in Python. Analytic
  statuses differ from processing states; saved originals differ from editable
  action progress.

See the [audit](verification/planning-audit.md) and
[scope/ownership decision](decisions/0002-planning-scope-and-ownership.md).

## Outstanding inputs and decisions

| Item | Responsible reviewer | When needed |
| --- | --- | --- |
| Full report, if available; reconcile only evidenced additional requirements | Như | Before scope approval |
| Source access, capture/window semantics and `quantity_sold` interpretation | Mai + Nhung | F002/F003 provenance and leakage review |
| Explicit demo store/account/source-product mapping | Như + Mai | Before catalog publish/demo seeding |
| Better Auth, `pg`/SQL migrations, session lifetime and pinned versions | Mai, reviewed by team | F001/T005–T007 before real auth/database integration |
| Real human reviewers, interviews, usability participants and consent/logistics | Như + Nhung | Before human gates in F003/F008 |
| Dataset size limits, service deployment, timeout/resources and Neon configuration | Mai + Nhung | Before runtime integration/release |

## Continue with Spec Kit

Start with F001/T001 (frontend setup), then its mock UI tasks. Set the feature directory explicitly when switching features;
do not let the most recently generated feature select the wrong plan.

~~~powershell
$env:SPECIFY_FEATURE_DIRECTORY = "specs/001-web-foundation"
~~~

In the coding-agent chat, request `$speckit-analyze` for F001 after the team
reviews its drafts. Request `$speckit-implement` only when ready to implement;
state the feature and selected task IDs, and follow the task-claim workflow.
The repository's local feature pointer is set to F001 for the next session.
Other agents share the same specs and progress files.

No commit, push, merge, database change, or application implementation was
performed for this planning request.
