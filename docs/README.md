# Project Documentation

All contributors and AI agents read and update the same documents in this repository.

| Document | Purpose |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Shared working rules, task ownership, verification, and review |
| [CURRENT_STATE.md](CURRENT_STATE.md) | Current project state and handoff notes |
| [Backend setup](../backend/README.md) | Neon migration, seeds, REST endpoints and runtime commands |
| [Backend verification](verification/sellens-backend.md) | Executed PostgreSQL/HTTP evidence, sanitized responses and limits |
| [Frontend integration](verification/sellens-frontend-integration.md) | Connected UI browser verification, private session proxy and schema/UI conflicts |
| [Supplied database architecture](architecture/sellens-shared-catalog.dbml) | Preserved six-table MVP input; PostgreSQL/shared-catalog amendment in ADR 0004 |
| [Proposed multi-store architecture](architecture/sellens-multi-store.md) | Mermaid/full DBML and staged SQL; one User owns multiple stores; unapplied |
| [PROJECT_BACKLOG.md](PROJECT_BACKLOG.md) | Eight feature boundaries, dependencies and suggested first tasks |
| [Planning evidence audit](verification/planning-audit.md) | Inspected code, failed runtime verification and remaining gaps |
| [repository-structure.md](rules/repository-structure.md) | Code placement and ownership |
| [data-contracts.md](rules/data-contracts.md) | Contracts between data, ML, backend, and frontend |
| [decisions/README.md](decisions/README.md) | Recording decisions that affect multiple components |
| [Stack decision](decisions/0001-web-database-model-stack.md) | Agreed Next.js, Neon PostgreSQL, and Python/FastAPI responsibilities |
| [UI-first order and ID migration](decisions/0003-ui-preview-first-task-order.md) | Corrected prerequisites, mock/real separation and old/new task IDs |
| [Scope and ownership](decisions/0002-planning-scope-and-ownership.md) | Confirmed MVP/member roles and proposed implementation defaults |
| [Feature plans](../specs/) | Requirements, plans, interfaces, validation guides and implementation tasks |
| [manual-review-round-2.md](manual-review-round-2.md) | Independent taxonomy and peer review |

Agent-specific instructions refer to the shared rules:
[Claude Code](../CLAUDE.md) and [Copilot](../.github/copilot-instructions.md).
Codex reads `AGENTS.md`.

Spec Kit is initialized for Codex, Claude and Copilot. The
[constitution](../.specify/memory/constitution.md) is version 1.0.0.
Eight directories under `specs/` contain reviewed draft requirements,
technical plans and 110 unchecked implementation tasks. Requirements-quality
checklists in `checklists/` assess document quality; they do not track code
completion or replace team acceptance.

Handoff workflow: synchronize the branch, claim a task, read the documents,
implement and verify, update task status and handoff notes, then commit and
push them together with the code when authorized.
