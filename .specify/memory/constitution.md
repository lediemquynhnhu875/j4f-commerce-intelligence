# J4F Commerce Intelligence Constitution

## Core Principles

### I. Evidence-Based Decision Support

The product MUST provide decision-support hypotheses for the Tiki fashion-product
snapshot. Scores, statuses, and recommendations MUST be grounded in observable
product data and comparable-product evidence. Recommendations MUST cite the facts
used to justify them. The system MUST NOT claim causal guarantees or forecast
future sales from the snapshot. Missing or insufficient evidence MUST be represented
through the documented data-quality and status fields.

Rationale: a snapshot supports comparisons and improvement hypotheses, while causal
claims and forecasts require evidence outside the current product scope.

### II. Agreed Architecture and ML Preservation

The frontend and web backend MUST use Next.js, with the planned web application in
`frontend/`. Application persistence MUST use PostgreSQL hosted on Neon. Model serving
MUST use a separate Python/FastAPI service in `backend/`, reusing modules in `ml/src/`.
The Next.js server MUST own web application logic, database access, and model-service
integration. HTTP routes MUST delegate service logic to appropriate modules.

The existing ML pipeline, its command entry points, and its documented outputs MUST
be preserved when adding web or service functionality. Reusable ML logic MUST remain
in `ml/src/`; notebooks MUST NOT be the sole home of production logic. Web and model
service routes MUST NOT contain model-training or data-cleaning logic. Contributors
MUST NOT replace or refactor the existing pipeline merely to initialize the web stack.
Changes to ML behavior MUST have a scoped task, appropriate verification, and updated
contracts or decisions when affected.

Rationale: separating web responsibilities from Python model execution allows the
team to integrate the application without duplicating or disrupting existing ML work.

### III. Shared Contracts and Data Protection

Data, ML, web APIs, and UI code MUST use the field definitions and stable status
identifiers in `docs/rules/data-contracts.md`. Changes to column names, API fields,
or status values MUST update the contract and be reviewed by affected owners.
Display translations MUST NOT change stored or API status identifiers.

The browser MUST consume documented web APIs. It MUST NOT connect directly to Neon,
access database credentials, or read processed CSV files in production. Database
credentials and model-service integration configuration MUST remain server-side.

Contributors MUST NOT commit secrets, `.env`, raw datasets, trained model binaries,
local databases, or generated build output. Committed data fixtures MUST be small
and anonymized. Scoring outputs MUST retain the documented evidence, model version,
and scoring timestamp fields so results can be traced to their source.

### IV. Verification Before Completion

Implementation tasks MUST remain unchecked until their acceptance criteria are met,
affected documentation is updated, and relevant verification is complete. Handoffs
MUST record commands run, results, limitations, and anything still unverified.
Contributors MUST NOT report tests as passing when they were not executed or when
only source code was inspected.

ML changes MUST respect the existing taxonomy checkpoints, independent holdout,
peer review process, and model evaluation guardrails. Agents MUST NOT fabricate
human review labels, tune taxonomy rules using the independent holdout, or alter
tests or evaluation data merely to make checks pass.

Spec Kit requirements-quality checklists MUST remain distinct from implementation
progress. Their checked items represent reviewed requirements quality, not completed
code. Agents MUST NOT automatically check those items to bypass review.

Rationale: reliable completion records allow another contributor or agent to continue
work without assuming that unverified behavior or incomplete reviews have passed.

### V. Repository-Based Collaboration

All contributors and agents MUST follow `AGENTS.md` and use the repository as the
shared record of requirements, plans, task progress, decisions, and handoffs.
Before editing, they MUST read `README.md`, `docs/CURRENT_STATE.md`, the structure
rules, the data contract, and relevant component and feature documents.

Each active task MUST have one owner, a defined scope, and completion criteria.
Assignments MUST be confirmed through team coordination or a PR before concurrent
work; a Git table does not lock tasks across unsynchronized machines. Agents MUST
preserve other contributors' changes and continue from recorded handoffs when
switching tools or owners.

Generated rules, specifications, plans, and handoff notes MUST be written in English.
Exact contract values, identifiers, human review labels, and user-facing translations
MUST remain unchanged when required by the existing interfaces.

## Technology and Model Constraints

The agreed stack and ownership boundaries are recorded in
`docs/decisions/0001-web-database-model-stack.md`:

| Component | Required technology | Responsibility |
| --- | --- | --- |
| Frontend | Next.js | Dashboard, product analysis, and action-tracking UI |
| Web backend | Next.js | Web APIs under `/api/v1`, application logic, and service integration |
| Database | PostgreSQL on Neon | Application persistence, product scores, and user actions |
| Model service | Python / FastAPI | Model inference using the existing Python ML modules |

Stack selection MUST NOT be reported as runtime completion. ORM choice, web/model
deployment targets, service authentication, and inference execution details MUST be
defined in their relevant feature plans or architecture decisions before implementation
depends on them; this constitution does not select those details.

The ML pipeline MUST preserve the clean-product and product-score contracts, including
`data/processed/clean_products.csv` and `data/processed/product_scores.csv`.
The existing model and review constraints MUST remain in force:

- The primary actionable reference model MUST exclude `review_count` and
  `rating_average`; they MAY be used for the comparison model and status interpretation.
- `favourite_count` MUST remain excluded for the supplied all-zero snapshot.
  `date_created` MUST remain excluded from modeling until its unit and meaning are verified.
- Training metrics MUST use out-of-fold predictions grouped by seller, as documented
  in `ml/README.md`.
- Taxonomy coverage MUST reach at least 90% and reviewed accuracy at least 85% before
  proceeding to peer groups under the existing taxonomy checkpoint.
- Human review MUST follow `docs/manual-review-round-2.md`, including blind holdout
  annotation and separation of fallback development from holdout evaluation.
- Round 2 evaluation targets remain at least 85% taxonomy holdout accuracy, at least
  80% overall peer-pair relevance with no major collapse in the low-similarity band,
  and 100% fallback-review completion before adding new rules.

## Development Workflow and Review

1. Contributors MUST synchronize their branch before claiming work. Agents MUST check
   `git status` and MUST NOT automatically pull, merge, or stash over uncommitted changes.
   Feature branches MUST follow `feature/<area>-<task>` as defined in `AGENTS.md`.
2. Task owners MUST record the feature/task ID, owner, branch, status, dependencies,
   and blockers in `docs/CURRENT_STATE.md`. Blocked or in-progress tasks MUST remain
   unchecked in `tasks.md`.
3. For Spec Kit features, `specs/<feature>/spec.md`, `plan.md`, and `tasks.md` MUST
   provide the shared requirements, implementation plan, and task checklist. Plans
   MUST check the constitution and component boundaries before implementation.
4. Verification MUST fit the change. ML/Python logic changes MUST run
   `python -m unittest discover -s ml/tests -v` from the repository root, plus relevant
   component checks documented by their actual configuration. Documentation-only
   changes MUST check paths, links, and the diff; they do not require model training.
5. After a session that changes files, contributors MUST update the handoff with
   results, affected files, verification evidence, open issues, and next steps, except
   when an explicitly invoked workflow limits writes to a specific artifact; in that
   case, its permitted artifact or final report MUST carry the handoff information.
6. Code and its progress documentation MUST be committed together when a commit is
   authorized. Agents MUST NOT commit or push without a request or existing authorization,
   automatically merge PRs, or force push. Each PR MUST focus on one deliverable and
   receive at least one review according to the ownership table in `README.md`.

## Governance

This constitution records the project's shared principles. `AGENTS.md` supplies
operational working rules; the data contract and architecture decisions define
component interfaces and boundaries. Contributors MUST reconcile discrepancies
explicitly instead of silently changing one source or ignoring another. Direct user
instructions take priority; any resulting governance change and its impact MUST be
documented.

Amendments MUST state the rationale, affected principles, affected owners, and any
contract, workflow, or implementation impact. The relevant owners MUST review the
amendment through the team's existing PR review process. Stack or interface changes
affecting multiple workstreams MUST include an architecture decision or contract
update as appropriate. Adoption of this initial constitution is authorized by the
user's request; future changes MUST preserve the original ratification date.

Constitution versions MUST follow semantic versioning:

- MAJOR for incompatible principle removals or redefinitions.
- MINOR for new principles, sections, or materially expanded guidance.
- PATCH for wording, typo, or clarification changes without a governance change.

Each amendment MUST update the version and last-amended date. Feature plans and PR
reviews MUST check compliance with applicable principles and record any conflict
before treating work as complete. This initial version formalizes existing team
rules and the agreed stack; it does not establish that any application runtime,
database connection, model pipeline run, or human review has been verified.

**Version**: 1.0.0 | **Ratified**: 2026-10-09 | **Last Amended**: 2026-10-09
