# Project State and Handoff

Updated: 2026-10-11 (Asia/Saigon).

## Agreed Stack and MVP

| Component | Target technology / responsibility |
| --- | --- |
| Frontend | Next.js App Router, TypeScript and Tailwind in `frontend/` |
| Web backend | Next.js / TypeScript; separate `backend/` scaffold exists in the current checkout |
| Database | PostgreSQL on Neon; real connectivity and migrations pending |
| Model service | Python/FastAPI reusing `ml/src/`; reconcile service location before integration |

Admin provisions email/password accounts; no public registration. Each User has
one explicitly assigned store. Source `seller_id` does not establish ownership.
Analysis provides snapshot decision support without causal or future-sales guarantees.
Older [stack](decisions/0001-web-database-model-stack.md) and
[structure](rules/repository-structure.md) docs still place FastAPI in `backend/`.
The user's later separate Next.js backend setup supersedes that observed folder
description; no service was moved or implemented in this frontend session.

## Observed State

| Area | Current state and evidence |
| --- | --- |
| Spec Kit | Codex/Claude/Copilot integrations; constitution v1.0.0 and eight feature drafts |
| Backlog | 110 tasks: 3 checked, 107 unchecked; a mock does not complete real feature acceptance |
| Frontend | Runnable Next.js 16.4.0 / React 19.3.0 / Tailwind 4.3.3; lint, build, development HTTP and six Chromium browser tests passed |
| User UI | Four Stitch-based synthetic pages: overview, products, analysis, suggestions |
| Admin UI | Four Stitch-based synthetic pages: overview, stores, monitor, model configuration |
| Demo login | One public mock Admin and one mock User; browser-tab role selection only, no server authentication |
| Backend/Neon/model serving | Existing separate Next.js backend scaffold preserved; real auth/API/DB/inference unverified |
| ML/data | Prior pipeline results and updated taxonomy/peer code handed off from the AISC 2026 checkout; metrics in `ml/reports/metrics/`. Four synthetic pipeline tests passed in a Python 3.13 virtual environment on 2026-10-11. Independent taxonomy accuracy is 58%, below the 85% gate; full snapshot/model compatibility and serving remain unverified |
| Human review/release | No human acceptance, independent model review or production readiness claim |

Detailed frontend evidence: [UI verification](verification/sellens-ui-preview.md).
Historical planning evidence: [planning audit](verification/planning-audit.md).

## Active Tasks

Implementation was explicitly requested by the current contributor. The named
team ownership roster is unchanged; no other contributor's work was taken over.
The existing dirty `set_up` branch was retained without pulling or stashing.

| Feature / task ID | Owner | Branch | Status | Dependencies / notes |
| --- | --- | --- | --- | --- |
| F001/T001 | Requesting contributor, Codex-assisted | set_up | Complete | Existing frontend setup verified locally; shared Node LTS baseline still needs review |
| F001/T002 | Requesting contributor, Codex-assisted | set_up | Complete | Both synthetic role shells and responsive layout verified |
| F006/T001 | Requesting contributor, Codex-assisted | set_up | Complete, mock only | Evidence-preserving accept/reject and required reason verified |
| F001/T003–T004 | Requesting contributor, Codex-assisted | set_up | Partial, unchecked | Navigation/login/pending/failure/logout/role-denial built; explicit expired/unassigned fixtures remain |
| F002/T002; F005/T001–T002; F007/T001 | Requesting contributor, Codex-assisted | set_up | Partial, unchecked | Visual implementation exists; loading/error states, wireframe artifacts and contract reviews remain |

## Latest Handoff

### Python Environment Verification - 2026-10-11

- The contributor's test command used system Python 3.9 and failed to import
  `scipy`. The project requires Python >=3.11.
- Created the ignored local `.venv` with Miniconda Python 3.13.13 and installed
  the project's declared dependencies using `.venv/bin/python -m pip install -e .`.
  No source-code or dependency-declaration changes were required.
- Verification: `.venv/bin/python -m unittest discover -s ml/tests -v` passed
  all four tests, including the end-to-end pipeline on 72 synthetic products.
  These temporary test results do not replace the copied full-snapshot reports
  or establish saved-model compatibility with the new environment.
- Use `.venv/bin/python` directly, or run `source .venv/bin/activate` before
  Python commands. The joblib physical-core detection warning did not fail tests.
- F003 remains incomplete: the independent taxonomy gate, full-data validation,
  artifact compatibility and serving checks still apply.

### Data and Model Handoff - 2026-10-11

- Scope: F003 evidence handoff on `feature/data-pipeline-handoff`; no feature
  acceptance or task completion is claimed by copying prior results.
- Provenance: reports were copied from the local
  `/Users/nhule/Desktop/COMPETITION/AISC 2026` checkout. The recorded model run
  was generated on **2026-10-02 at 08:34:25 (Asia/Saigon)**, version
  `j4f-20261002T013425Z`. The handoff date is 2026-10-11; these are historical
  pipeline results, not a new run. Other metric files have no embedded run date.
- Cleaning: six CSVs, 41,603 raw rows and 41,576 clean products; 22 exact
  duplicates removed and 27 duplicated raw product IDs audited/resolved.
  One invalid zero-price row is excluded from model training (41,575 rows).
  `favourite_count` is excluded; `date_created` remains unverified metadata.
- Taxonomy: 59 observed product types; assignment coverage 100%, rule coverage
  90.98%, source-file fallback 9.02% (3,749 products). The 200-row development
  review reached 94.5%; the independent 300-row holdout reached **58%, below
  the required 85%**. The development score does not establish independent
  readiness. Preserve holdout labels and use separate development data for tuning.
- Peer review: all 250 pairs across 50 targets were reviewed; raw relevance
  was 77.6%. At the configured mean-similarity threshold of 0.10, 200 pairs
  across 40 targets were retained with 83.5% relevance. This is a thresholded
  audit result, not the overall relevance score.
- Model evaluation: scikit-learn histogram gradient boosting, two-part
  classification/regression, five seller-grouped folds across 3,806 sellers.

  | Model | ROC-AUC | PR-AUC | RMSLE |
  | --- | --- | --- | --- |
  | Peer baseline | 0.656 | 0.624 | 1.525 |
  | Model A | 0.698 | 0.686 | 1.366 |
  | Model B | 0.869 | 0.900 | 0.646 |

- Model A remains the primary flagging model. Model B adds rating/review
  signals that accumulate after sales and is comparison-only. Outputs provide
  snapshot decision support, not causal explanations or future-sales forecasts.
- Updated files: `ml/config/pipeline.yml`, `ml/config/taxonomy.yml`,
  `ml/src/cli.py`, `ml/src/evaluation/review_queues.py`, and
  `docs/manual-review-round-2.md`. The evaluator joins current taxonomy
  predictions to locked holdout IDs and reports raw/thresholded peer relevance.
- Evidence: [data quality](../ml/reports/metrics/data_quality_report.json),
  [taxonomy summary](../ml/reports/metrics/taxonomy_summary.json),
  [development review](../ml/reports/metrics/taxonomy_review_metrics.json),
  [independent/peer review](../ml/reports/metrics/review_queue_metrics.json),
  and [model metrics](../ml/reports/metrics/model_metrics.json).
- Verification in this documentation update: inspected copied JSON reports
  and checked documentation links/diff. No pipeline rerun, retraining or test
  execution was performed. Raw/processed CSVs, human review originals and the
  model binary remain in the source checkout and are not supplied by these reports.
- Next: improve taxonomy using new development labels; retain independent
  evaluation; share versioned data/model snapshots outside Git; verify this
  checkout's dependencies, tests and artifact compatibility before serving.
  F003 readiness and backend/model integration remain incomplete.

### Previous Frontend Handoff

- Follow-up scope: the user requested separate header/sidebar components and
  exactly four User screen files in one folder. Extracted
  `frontend/src/components/layout/header.tsx` and `sidebar.tsx`;
  `app-shell.tsx` composes them and retains demo role, drawer and notification state.
- User screens now live in `frontend/src/features/user/`: `overview.tsx`,
  `product-list.tsx`, `evidence-panel.tsx` and `suggestions-view.tsx`.
  Preserved existing descriptive names. Shared donut/product presentation and
  suggestion cards moved to `components/`; Admin no longer imports User screens
  for shared helpers. Updated imports, source map, structure rules and task paths.
- Refactor verification: `npm run lint` and `npm run build` passed; existing
  six Chromium tests passed again for role navigation, workflows and mobile behavior.
  No additional task was checked off by this structural refactor.
- Scope: implement only `frontend/` UI from the user's Stitch project Sellens
  Decision Support Platform. Read eight actor screens and the separate palette
  screen. Follow its pink/fuchsia/purple/blue gradient and pale violet surfaces.
- Routes: `/preview/user/{overview,products,analysis,suggestions}` and
  `/preview/admin/{overview,stores,monitor,configuration}`. Login at `/`,
  `/preview` or `/preview/login`. Four menu pages per actor.
- Public fixtures: `admin@sellens.demo` and `user@sellens.demo`, both with
  `Sellens123!`. These are demo-only strings. No real account was provisioned.
- Implemented search/filter/pagination, selected-product analysis, missing
  reference presentation, suggestion accept/reject/progress/Kanban, store
  add/select/suspend, failed-job logs, local config versions, JSON exports,
  responsive sidebar, keyboard navigation and mock notifications.
- Reusable shell/UI components, `src/features/` views and
  `src/lib/preview-fixtures.ts` separate synthetic content from future APIs.
  Local product images come from the Stitch references. Docs are in English;
  interface labels follow the Vietnamese designs.
- Verification from `frontend/`: `npm run lint` passed; `npm run build`
  passed; `npm run test:e2e` passed **6 Chromium tests**. Development server
  `npm run dev -- --port 3100` returned HTTP 200 for `/preview/login`.
  Desktop screenshots and mobile 390 px layout inspected. Test servers stopped.
- Local Node 25.2.1/npm 11.6.2 were used; compatibility with the preferred shared
  Node LTS baseline was not tested. Playwright 1.64.0 is pinned in the lockfile.
- Removed only an obsolete generated Next type validator referencing the
  deleted health route. Pre-existing backend changes/deletions and ML are
  preserved. No commit, push or merge.
- Mock role selection persists in `sessionStorage`; component edits reset on
  reload. No database, durable audit, API, model inference or server permission
  is supplied by these previews. Configuration controls do not change ML.
- Next: review the eight screens with Huy/Như, finish remaining preview states,
  choose the shared Node baseline and reconcile backend/model-service placement.
  Real auth, tenant guards and Neon/model integration retain their existing
  requirements and unchecked tasks.

## Team Ownership

Như: product/QA/human evaluation/reports/demo; Nhung: data science/ML;
Mai: cleaning/data engineering/database/web backend/FastAPI integration;
Huy: frontend/UX. See [ownership decision](decisions/0002-planning-scope-and-ownership.md).
Use [PROJECT_BACKLOG.md](PROJECT_BACKLOG.md) for task dependencies. Confirm
concurrent assignments through the team's coordination channel or a PR.

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
