# Project State and Handoff

Updated: 2026-10-09 (Asia/Saigon).

## Agreed Stack and MVP

| Component | Target technology / responsibility |
| --- | --- |
| Web application | Next.js App Router and TypeScript in `frontend/`; UI, authentication, authorization, APIs and workflow |
| Database | PostgreSQL on Neon; application state and atomic history |
| Model service | Python/FastAPI in `backend/`; reuse `ml/src/` for inference and analysis |

Admin creates email/password accounts; public registration is excluded. Each User
has one explicitly assigned store. Source `seller_id` does not establish ownership.
Analysis is snapshot decision support without future-sales or causal guarantees.
See [stack](decisions/0001-web-database-model-stack.md) and
[scope/ownership](decisions/0002-planning-scope-and-ownership.md) decisions.

## Observed State

| Area | Current state and evidence |
| --- | --- |
| Spec Kit | Initialized with Codex, Claude and Copilot integrations; constitution v1.0.0 exists |
| Planning | Eight feature directories, 24 user stories and 110 unchecked implementation tasks; drafts for team review, not assigned work |
| ML code | Cleaning, taxonomy, peers, model, scoring and review modules exist; source inspected, runtime readiness unverified |
| ML tests | Python 3.12.4; unittest discovery exits 1 at import because `pandas` is missing; four real test methods did not execute |
| Data/artifacts | Raw/processed/model directories contain placeholders; actual snapshot, trained artifacts and completed human labels absent |
| EDA | Existing notebook and 16 figures inspected as historical material; quantitative findings not reproduced |
| Web/service/database | Scaffolds and target architecture only; no runnable Next.js/FastAPI service, Neon connectivity or migrations verified |
| Human evidence/report | Review instructions exist; no completed independent review or full project report found |
| Shared instructions | English `AGENTS.md`, Claude/Copilot instructions, constitution and feature docs |

No application or ML functionality was demonstrated working during this planning
session. Existing source is preserved for verification and scoped gap filling.
Detailed evidence: [planning audit](verification/planning-audit.md).

## Active Tasks

No implementation task has been claimed or started by this planning request.
Proposed owners in task files do not represent team assignments.

| Feature / task ID | Owner | Branch | Status | Dependencies / notes |
| --- | --- | --- | --- | --- |
| None | Unassigned | N/A | No task claimed | Team reviews drafts and confirms claims first |

## Proposed Ownership and First Work

| Member | Responsibility | Recommended first task |
| --- | --- | --- |
| Như | Product, QA, genuine human evaluation, report/slides/demo | F001/T005: auth/ownership acceptance review |
| Nhung | Data science, taxonomy, peers, modeling and evaluation | F003/T001: environment/code/readiness audit |
| Mai | Cleaning, DB, web backend/auth/imports and FastAPI integration | F001/T001: initialize frontend; no auth-review prerequisite |
| Huy | Frontend/UX and User/Admin screens | F001/T002 after T001: mock shell; then mock navigation/login |

Use [PROJECT_BACKLOG.md](PROJECT_BACKLOG.md) for feature links, execution order and
outstanding decisions. Start F001/T001 frontend setup, then F001/T002–T004
mock previews; F003 audit can start independently. Review F001/T005–T006 before
real persistence/auth integration. Connect real catalog/model/workflow components
only when their listed prerequisites pass.

## Latest Handoff

- Scope: corrected checklist ordering at the user's request; documentation only.
  Used the installed Spec Kit task template with each feature selected explicitly.
- Reordered eight task files so local prerequisites appear before their dependents.
  F001/T001 now initializes the frontend without waiting for auth review.
  F001/T002–T004 separately track mock shell, navigation and login.
- Early catalog/import, analysis, dashboard and suggestion mocks, plus Admin
  wireframes, no longer wait for unrelated database/API/model readiness.
  Real integration still requires reviewed contracts, active server guards and
  genuine model/human evidence.
- Three new mock tasks bring the total to 110 unchecked tasks. No task was
  claimed, implemented or marked complete. Existing completed preparation includes
  shared rules, stack/scope decisions, Spec Kit/constitution and draft feature plans.
- Renumbering occurred before execution; all current task references and first-task
  recommendations were updated. Use the
  [ID migration](decisions/0003-ui-preview-first-task-order.md) for older references.
  Preserve task IDs once owners start work.
- Verified task format, local execution order, dependency references/acyclicity,
  75 requirement mappings, owner preservation, 337 local links and diff whitespace.
  These checks do not establish runtime readiness.
- Existing blockers remain: Python dependencies, actual source/model artifacts,
  human review and runtime/Neon provisioning. No application/ML code or tests were
  changed; prior frontend placeholder deletions remain intact.
- Local feature pointer selects F001. Next step: coordinate the F001/T001 claim,
  perform frontend setup, then claim the mock tasks. No commit, push or merge.

## Session Update Template

~~~text
Date / owner / AI agent:
Feature / task ID / branch:
Results and changed files:
Verification: commands, results, unverified items:
Task status: in progress / blocked / complete:
Open issues or dependencies:
Next step / receiving owner:
~~~
