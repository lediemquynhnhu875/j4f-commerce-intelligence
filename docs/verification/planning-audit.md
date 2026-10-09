# Planning Evidence Audit

Date: 2026-10-09 (Asia/Saigon).
Scope: repository inspection and backlog preparation; no application implementation.

The sections below record the initial 107-task planning baseline. The later
UI-first revision is recorded separately at the end; use that revision for the
current task count and ordering.

## Available evidence

- Python 3.12.4 is available. Spec Kit is initialized, with Codex, Claude and
  Copilot integrations and constitution version 1.0.0.
- The eight feature documents were prepared sequentially using the installed
  specification template resolver, plan setup helper, and task setup helper with
  an explicit feature directory. Generated artifacts are drafts for team review.
- Reusable cleaning, taxonomy, peer retrieval, reference-model, scoring and
  review-queue code exists under `ml/src/`. Four test methods exist in
  `ml/tests/test_pipeline.py`. Code existence does not establish runtime readiness.
- The EDA/taxonomy notebook and 16 existing figure files provide historical
  investigation material. They do not establish current model quality or replace
  independent human review.
- No complete project/competition report was found in the checkout. Planning uses
  the user's supplied requirements, repository rules, and inspected code.

## Runtime verification attempted

From the repository root:

~~~powershell
python --version
python -m unittest discover -s ml/tests -v
~~~

Python reports 3.12.4. Test discovery exits with code 1 because `pandas` is
missing. The runner reports an import failure, not execution of the four real
test methods. No pipeline test passed in this session. Dependencies were not
installed as part of this documentation request.

`data/raw/`, `data/processed/` and `ml/artifacts/` contain placeholders in this
checkout. The source snapshot, trained artifacts and completed review labels
are unavailable. Historical row counts in the ML README have not been reproduced.
Private holdout predictions were not inspected and human labels were not generated.

## Reuse and remaining gaps

| Area | Inspected capability | Verification or implementation still required |
| --- | --- | --- |
| Cleaning | Alias handling, required fields, duplicate audits and invalid-price flags | Run with the actual six-file source; preserve source identity and audit rejected rows |
| Taxonomy | Configurable rules, review queues and corrected-label evaluation | Real reviewers, coverage/accuracy gates and independent holdout evaluation |
| Peers | Type-based retrieval and target/same-seller exclusions | Export and reload the fitted retrieval corpus/index; evaluate peer relevance |
| Model A/B | Actionable-field primary model and feedback-field comparison; fitted preprocessing pipeline | Verify target semantics, grouped out-of-fold metrics, leakage tests, baselines and supported claims |
| Saved model | A fitted estimator and feature lists are exported | Package calibration, config, provenance, compatibility and artifact identity together |
| Scoring | Existing status/evidence/recommendation rules | Reuse centrally in Python; define finite/null semantics and eligibility by reason |
| EDA | Existing notebook and figures | Reproduce with source data and record exclusions; figures alone are not evaluation evidence |
| Web/database/service | Directory scaffolds | Initialize, implement and verify Next.js, Neon and FastAPI |

The current CLI scoring path consumes precomputed prediction CSVs; it is not
proof of serving a saved bundle on a new request. Peer retrieval fits its batch
objects without a complete serving export. Saved-model metadata does not yet
provide the full calibration/configuration contract required by the service.
These gaps are assigned to F003 before F004 may claim real inference integration.

`quantity_sold` is the observed target. It must not become an input to the same
target estimator. Observation/status comparisons are separate from prediction
features. Model B's rating/review inputs require explicit interpretation because
they accumulate after sales.

An unavailable model or peer basis must produce a reason and unavailable reference
values, not invented zeros or nonfinite numbers. Feedback-only insufficiency may
retain otherwise valid reference values if the reason is explicit. Source snapshot
time/window and scoring time must remain distinct; unverified source timing is
recorded as unknown.

## Planning verification boundary

All 107 implementation tasks start unchecked. Requirement-quality checks are
document reviews, not implementation completion. Planned test commands in feature
quickstarts are future acceptance instructions; unavailable web/service suites
were not run. No database was provisioned or migration applied, and no model was
trained, served or certified ready.

## Document validation results

The final planning check verified:

- Eight feature directories and 64 feature Markdown files, with three stories
  per feature and all required spec/plan/task/design sections.
- 107 unchecked implementation tasks; one exact named primary owner and a separate
  reviewer per task; deliverable path, dependencies, completion criteria and
  verification method present.
- Every dependency resolves; the task graph is acyclic and summary dependencies
  match the task metadata. Conditional parallel tasks have no identical primary
  deliverable paths.
- All 75 functional requirements have explicit planned task coverage, including
  cross-feature coverage where a later bounded feature completes the requirement.
- 321 local document links resolve. No unresolved template tokens or trailing
  whitespace were found in the reviewed documents; `git diff --check` passed.
- No tracked application code changed. The five pre-existing frontend placeholder
  deletions were preserved. The local feature pointer selects F001.

The 64 checked requirements-quality items across eight checklists describe document
review only; they are unrelated to the 107 unchecked implementation tasks. Team
approval, runtime checks and human evaluation remain future work.

See [the backlog](../PROJECT_BACKLOG.md) and
[current handoff](../CURRENT_STATE.md) for execution prerequisites.

## UI-first Revision Validation

The user's later sequencing correction replaces the initial task order. Eight
checklists now contain 110 unchecked tasks, including three separate F001 mock
tasks. There are still 24 user stories and 75 mapped functional requirements.

- F001/T001 initializes the frontend without an auth-review dependency;
  T002–T004 cover mock shell, navigation and login.
- Every checklist is numbered in its displayed execution order. Every local
  prerequisite appears earlier; all cross-feature IDs resolve and the combined
  dependency graph is acyclic. Metadata and summary dependencies agree.
- The original primary owners/reviewers are preserved through the documented
  migration; no assignment, completion marker or human evidence was invented.
- Early mock/wireframe tasks use draft contracts and synthetic fixtures. Real
  catalog and analysis operations explicitly depend on server authorization
  guards; actual ML/human gates and real integration checks remain required.
- The documentation check validates 337 local links, with no parallel primary
  file conflicts. `git diff --check` passes. F001 is restored as the local
  selected feature after resolving task templates sequentially.
- No application/ML code, dependency installation, schema or test implementation
  changed. Existing frontend placeholder deletions remain untouched.

See `docs/decisions/0003-ui-preview-first-task-order.md` for old/current task IDs.
