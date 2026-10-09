# Shared Working Rules

These rules apply to every contributor and AI agent working on J4F Commerce
Intelligence, including Codex, Claude Code, and Copilot. Store progress and
handoffs in Git; private chat history does not replace project documentation.
Direct user instructions take priority. When they differ from existing project
documentation, record the change and its impact.

## 1. Before Starting a Task

- Read `README.md`, `docs/CURRENT_STATE.md`, `docs/rules/repository-structure.md`,
  and `docs/rules/data-contracts.md`.
- Read the relevant component README, decisions in `docs/decisions/`, and the
  feature's `spec.md`, `plan.md`, and `tasks.md` when available.
- Check the current branch and `git status`. Do not overwrite, delete, or revert
  another contributor's changes. Verify and document discrepancies between code
  and documentation.
- Contributors must synchronize their branch with the remote before claiming
  work. AI agents must not automatically pull, merge, or stash in a working tree
  with uncommitted changes.
- Identify the scope, task ID, owner, and completion criteria. Check the active
  task table in `docs/CURRENT_STATE.md` before editing code.

## 2. Task Ownership and Coordination

- Each task has one owner at a time. Record its feature/task ID, owner, branch,
  and status in the active task table.
- Before working concurrently, the team must confirm assignments through its
  coordination channel or a PR. The table in Git is a record; it cannot lock a
  task across machines that have not synchronized.
- Branch from `main` using `feature/<area>-<task>`. Keep each PR focused on one
  deliverable.
- Leave in-progress and blocked tasks unchecked (`[ ]`). Record blockers,
  dependencies, and next steps. Do not take over another owner's task without
  a handoff.
- When changing agents or contributors, read the handoff and continue the
  existing task. Do not create duplicate tasks or redo verified work.

## 3. Architecture, Data, and Product Scope

- Follow the agreed stack: Next.js for the web backend and frontend, PostgreSQL
  on Neon for persistence, and Python/FastAPI for model serving. See
  `docs/decisions/0001-web-database-model-stack.md` for component boundaries.
- Follow code placement and ownership in `docs/rules/repository-structure.md`.
  Reusable ML logic belongs in `ml/src/`, not only in notebooks.
- Backend routes handle HTTP; business logic belongs in services. The frontend
  consumes documented APIs and must not read processed CSV files directly in
  production.
- Changes to data columns, API fields, or statuses require an update to
  `docs/rules/data-contracts.md` and communication of the impact to affected owners.
- Record decisions affecting multiple components in `docs/decisions/` using the
  existing template. Do not change the stack or architecture outside the task scope.
- The product provides decision-support hypotheses from a snapshot. It does
  not guarantee causal effects or forecast future sales. Recommendations must
  cite observable evidence.
- Preserve model guardrails in the data contract and checkpoints in `ml/README.md`.
  Do not use the independent holdout to tune taxonomy rules or fill in human
  review labels automatically.
- Do not commit `.env`, secrets, raw data, model binaries, local databases, or
  build output. Committed fixtures must be small and anonymized.

## 4. Checklists and Completion Criteria

- Once Spec Kit is installed, agents share `specs/<feature>/spec.md`, `plan.md`,
  and `tasks.md`. Agent-specific skill directories support the workflow.
- `tasks.md` tracks implementation. Change `[ ]` to `[x]` only after meeting
  the task criteria, updating affected documentation, and completing relevant checks.
- Spec Kit's `checklists/*.md` assess requirements quality. A checked item there
  does not mean implementation is complete. Do not check items automatically
  to bypass review.
- Record verification evidence in the handoff: commands run, results, and
  limitations. Do not claim tests passed when they were not run or code was
  only inspected.
- If the environment or data needed for verification is unavailable, document
  what remains unverified. Keep the task incomplete when its acceptance criteria
  still depend on that verification.
- Do not invent feature specs, task IDs, or retrospective completion claims just
  to fill a template. Until Spec Kit is available, record scope and status in
  the handoff document.

## 5. Verification Appropriate to the Change

- For ML/Python logic changes, run from the repository root:
  `python -m unittest discover -s ml/tests -v`.
- Run additional checks for affected components according to their README and
  actual configuration. The backend and frontend currently lack complete
  runtimes; do not report their checks as passing.
- For documentation-only changes, check paths, links, and the diff. Running
  the pipeline or training a model is unnecessary.
- Do not alter tests or evaluation data merely to make checks pass.

## 6. Handoff and Review

- After each session that changes files, update `docs/CURRENT_STATE.md` with
  results, feature/task IDs, relevant files, verification evidence, open issues,
  and next steps.
- Keep the state document concise and current. Detailed history belongs in
  commits, PRs, and feature documentation.
- Commit code together with its progress documentation. AI agents may commit
  or push only when requested or already authorized. Do not automatically merge
  PRs or force push.
- Each PR requires at least one review according to the ownership table in
  `README.md`. Completing an implementation task does not mean its PR is approved
  or merged.
- Write repository rules, specifications, and handoff notes in English. Preserve
  exact data values, identifiers, and user-facing labels required by existing contracts.
- At the end of a session, report what changed, what was checked, and what
  remains unverified.
