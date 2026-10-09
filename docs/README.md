# Project Documentation

All contributors and AI agents read and update the same documents in this repository.

| Document | Purpose |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Shared working rules, task ownership, verification, and review |
| [CURRENT_STATE.md](CURRENT_STATE.md) | Current project state and handoff notes |
| [repository-structure.md](rules/repository-structure.md) | Code placement and ownership |
| [data-contracts.md](rules/data-contracts.md) | Contracts between data, ML, backend, and frontend |
| [decisions/README.md](decisions/README.md) | Recording decisions that affect multiple components |
| [Stack decision](decisions/0001-web-database-model-stack.md) | Agreed Next.js, Neon PostgreSQL, and Python/FastAPI responsibilities |
| [manual-review-round-2.md](manual-review-round-2.md) | Independent taxonomy and peer review |

Agent-specific instructions refer to the shared rules:
[Claude Code](../CLAUDE.md) and [Copilot](../.github/copilot-instructions.md).
Codex reads `AGENTS.md`.

Once Spec Kit is integrated, `specs/<feature>/spec.md`, `plan.md`, and `tasks.md`
will store each feature's requirements, technical plan, and implementation
checklist. Spec Kit has not been initialized yet. Requirements quality
checklists in `checklists/` serve a different purpose from progress tracking
in `tasks.md`.

Handoff workflow: synchronize the branch, claim a task, read the documents,
implement and verify, update task status and handoff notes, then commit and
push them together with the code when authorized.
