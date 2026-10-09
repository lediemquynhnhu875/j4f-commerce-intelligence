# Project State and Handoff

Updated: 2026-10-09 (Asia/Saigon).

## Agreed Technology Stack

| Component | Technology | Responsibility |
| --- | --- | --- |
| Web backend | Next.js | Web APIs, application logic, database access, and model-service integration |
| Frontend | Next.js | Dashboard, product analysis, and action-tracking UI |
| Database | PostgreSQL on Neon | Product data, scores, and user actions |
| Model service | Python / FastAPI | Serve model inference using the existing Python ML modules |

This is the team's agreed target stack. Runtime setup is still pending.
See [the architecture decision](decisions/0001-web-database-model-stack.md).

## Observed State

| Component | Status | Evidence |
| --- | --- | --- |
| Data/ML | Code exists for cleaning, taxonomy, peers, the reference model, scoring, and review queues; the pipeline has not been rerun during these documentation sessions | `ml/src/`, `ml/README.md`, `ml/tests/test_pipeline.py` |
| Web backend | Next.js is agreed for the web backend; its runtime has not been initialized | `frontend/README.md`, `docs/decisions/0001-web-database-model-stack.md` |
| Frontend | Next.js is agreed for the frontend; no runnable web application yet | `frontend/README.md` |
| Database | PostgreSQL on Neon is agreed; provisioning, schema, and connectivity have not been verified | `.env.example`, `docs/decisions/0001-web-database-model-stack.md` |
| Model service | Python/FastAPI is agreed for model serving; the existing Python backend scaffold has no complete runtime yet | `backend/README.md`, `backend/app/` |
| Data contract | Clean products, product scores, statuses, and model guardrails are documented | `docs/rules/data-contracts.md` |
| Manual review | Round 2 instructions exist; completion and quality results have not been verified during these sessions | `docs/manual-review-round-2.md` |
| AI rules | Shared rules and Codex, Claude, and Copilot instructions have been created and translated into English | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` |
| Spec Kit | Specify CLI 1.1.2 is installed locally through uv; the repository is not initialized and has no feature specs or implementation checklists yet | `specify version` and `specify --help` passed using the executable path; repository initialization is still pending |

## Active Tasks

No implementation task has been claimed during these documentation sessions.
Add a row when work starts; leave tasks unchecked (`[ ]`) in `tasks.md` until complete.

| Feature / task ID | Owner | Branch | Status | Dependencies / notes |
| --- | --- | --- | --- | --- |
| None | Unassigned | N/A | No task claimed | The team needs to agree on the first feature |

## Latest Handoff

- CLI follow-up: installed `specify-cli` 1.1.2 using the existing uv installation
  and added `C:\Users\LENOVO\.local\bin` to the user PATH with `uv tool update-shell`.
  Verified version and help using the executable path. Existing terminals need
  to refresh PATH or restart before invoking `specify` by name.
- Spec Kit initialization, constitution generation, and feature creation have
  not been performed.
- Scope: align project documentation and the environment template with the
  team's agreed technology stack.
- Changes: documented Next.js for the web backend and frontend, PostgreSQL on
  Neon for persistence, and Python/FastAPI for model serving. Updated component
  READMEs, repository structure, shared rules, and `.env.example`; added
  `docs/decisions/0001-web-database-model-stack.md`.
- Previous setup: created shared AI rules and handoff documents in English,
  added the documentation index, and corrected paths under `docs/rules/`.
- Verification: checked documentation links, stack references, configuration
  references, and the diff. No application, database, or model runtime was
  initialized or tested during this documentation update.
- Unverified: Neon provisioning/connectivity, web and model-service runtimes,
  actual pipeline runtime, manual review results, and contributors' CLI environments.
- Next step: integrate Spec Kit when requested, review generated files to preserve
  these rules, then select a specific feature and create its spec, plan, and tasks.

## Session Update Template

```text
Date / owner / AI agent:
Feature / task ID / branch:
Results and changed files:
Verification: commands, results, unverified items:
Task status: in progress / blocked / complete:
Open issues or dependencies:
Next step / receiving owner:
```
