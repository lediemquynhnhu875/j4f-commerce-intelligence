# Project State and Handoff

Updated: 2026-10-16 (Asia/Saigon).

## Agreed Stack and MVP

| Component | Target technology / responsibility |
| --- | --- |
| Frontend | Next.js App Router, TypeScript and Tailwind in `frontend/` |
| Web backend | Next.js / TypeScript in separate `backend/`; real shared-catalog REST API |
| Database | PostgreSQL on Neon; inspected empty schema, additive migration and repeatable development seed applied |
| Model service | Python/FastAPI reusing `ml/src/`; reconcile service location before integration |

Admin provisions email/password accounts; no public registration. The supplied
2026-10-14 backend architecture uses a shared catalog, overriding the older store
plan for this deliverable; frontend store mocks remain unchanged. Source
`seller_id` does not establish ownership. See [amendment](decisions/0004-shared-catalog-backend.md).
Analysis provides snapshot decision support without causal or future-sales guarantees.
The older [stack decision](decisions/0001-web-database-model-stack.md) placed
FastAPI in `backend/`; the existing separate Next.js backend has now been extended.
Python model serving remains pending; no ML/service code was moved or changed.

## Observed State

| Area | Current state and evidence |
| --- | --- |
| Spec Kit | Codex/Claude/Copilot integrations; constitution v1.0.0 and eight feature drafts |
| Backlog | 110 tasks: 3 checked, 107 unchecked; a mock does not complete real feature acceptance |
| Frontend | Connected UI at /login, /user/*, /admin/*; isolated mocks under /preview/*; lint/typecheck/build, six preview browser tests and five live journeys passed across scoped runs |
| User UI | Four Stitch-based synthetic pages: overview, products, analysis, suggestions |
| Admin UI | Four Stitch-based synthetic pages: overview, stores, monitor, model configuration |
| Authentication | Main login uses backend accounts and HttpOnly session proxy; isolated preview login still uses public mock roles |
| Backend/Neon | Real PostgreSQL REST API, scrypt/Bearer sessions, active/admin checks, pagination, immutable analyses and atomic action audit; see backend verification |
| Model serving | Unimplemented; saved seed analyses are synthetic insufficient-basis fixtures, not inference |
| ML/data | Prior pipeline results and updated taxonomy/peer code handed off from the AISC 2026 checkout; metrics in `ml/reports/metrics/`. Four synthetic pipeline tests passed in a Python 3.13 virtual environment on 2026-10-11. Independent taxonomy accuracy is 58%, below the 85% gate; full snapshot/model compatibility and serving remain unverified |
| Human review/release | No human acceptance, independent model review or production readiness claim |

Detailed frontend evidence: [UI verification](verification/sellens-ui-preview.md).
Historical planning evidence: [planning audit](verification/planning-audit.md).

## Active Tasks

Frontend integration now explicitly authorized: requesting contributor,
Codex-assisted, continuing dirty `feature/backend-neon-mvp` without pull/stash.
Scope amendment for F001/T012–T015, F002/T014, F004/T012, F005/T007/T009,
F006/T011 and F007/T007/T009/T011; shared-catalog integration implemented and
verified, original store/model/human acceptance remains unchecked. See ADR 0005
for schema/UI conflicts and integration verification for executed evidence.

Current backend session: directly authorized shared-catalog amendment of
F001/T007–T011, F002/T006/T011/T013, F004/T004/T011 and F007/T004–T006/T008;
owner requesting contributor, Codex-assisted, branch `feature/backend-neon-mvp`.
Remote fetched; branch created from synchronized `origin/main` with clean tree.
Requested shared-catalog deliverable implemented and verified; original feature
acceptance checkboxes remain unchanged because store/UI/model/review criteria differ.
See [scope amendment](decisions/0004-shared-catalog-backend.md).
The supplied bare PostgreSQL URI was placed under DATABASE_URL unchanged;
corrected sample credentials live only in ignored `.env`.

Implementation was explicitly requested by the current contributor. The named
team ownership roster is unchanged; no other contributor's work was taken over.
The earlier frontend session retained its dirty `set_up` branch; the backend
session started clean, fetched remote refs and branched from `origin/main`.

| Feature / task ID | Owner | Branch | Status | Dependencies / notes |
| --- | --- | --- | --- | --- |
| F001/T007; F002/T006; F007/T005 multi-store amendment | Requesting contributor, Codex-assisted | feature/backend-neon-mvp | Schema proposal prepared; unapplied, acceptance unchecked | One User owns many stores; explicit legacy assignment and future scoped API/UI required |
| F001/T012–T015; F002/T014; F004/T012; F005/T007/T009; F006/T011; F007/T007/T009/T011 amendment | Requesting contributor, Codex-assisted | feature/backend-neon-mvp | Connected shared-catalog UI verified; original acceptance unchecked | Later direct request authorizes integration; stores/ML jobs/config writes unsupported |
| F001/T007–T011; F002/T006/T011/T013; F004/T004/T011; F007/T004–T006/T008 amendment | Requesting contributor, Codex-assisted | feature/backend-neon-mvp | Shared-catalog backend verified; original acceptance unchecked | Supplied schema supersedes store plan for this backend; frontend/model integration excluded |
| F001/T001 | Requesting contributor, Codex-assisted | set_up | Complete | Existing frontend setup verified locally; shared Node LTS baseline still needs review |
| F001/T002 | Requesting contributor, Codex-assisted | set_up | Complete | Both synthetic role shells and responsive layout verified |
| F006/T001 | Requesting contributor, Codex-assisted | set_up | Complete, mock only | Evidence-preserving accept/reject and required reason verified |
| F001/T003–T004 | Requesting contributor, Codex-assisted | set_up | Partial, unchecked | Navigation/login/pending/failure/logout/role-denial built; explicit expired/unassigned fixtures remain |
| F002/T002; F005/T001–T002; F007/T001 | Requesting contributor, Codex-assisted | set_up | Partial, unchecked | Visual implementation exists; loading/error states, wireframe artifacts and contract reviews remain |

## Latest Handoff

### Bounded ML Sample Import - 2026-10-16

- Direct user request: import 100 real source products in five product-type groups
  of 20, including their saved ML analyses and recommendations. Same contributor,
  Codex-assisted, dirty `feature/backend-neon-mvp`; existing frontend edits preserved.
- Continuing F002 import/catalog and F004/F005 saved-result integration amendments;
  no original store/human/model acceptance tasks are marked complete. Scope uses
  the existing shared catalog; multi-store proposals remain unapplied.
- Source `data/processed/products_full.json` validated against both result CSVs.
  Neon read-only inspection confirms migration 001/shared catalog, no stores/runs.
- Applied additive migration 002_ml_sample and imported 100 products/100 analyses/
  104 suggestions/104 initial history events. Five groups of 20: men's loafers,
  crossbody bags, backpacks, men's wallets and hats. Source IDs ordered within
  five-per-status strata; sample is not representative of corpus proportions.
- Repeat import returned zero inserted products. Database now has 110 products,
  103 analyses and one import run; old seed rows remain. Legacy statuses coexist
  with six versioned ML statuses; original suggestions and source inputs are frozen.
- Added sample importer, run provenance, status validation and visible experimental
  results/intervals/evidence in live pages. No brand/product URL imported; image URLs
  remain null. No Python code, trained artifacts or store assignment changed.
- Checks: backend typecheck/eight unit tests, backend/frontend production builds,
  frontend lint, 32 real HTTP checks including source-to-DB/API comparisons, one
  Chromium journey testing all five category filters and saved ML display passed.
  Sandbox junction/font and generated frontend cache build failures were resolved;
  successful final builds used the same project configuration.
- See [verification](verification/ml-sample-import.md) and [ADR 0007](decisions/0007-bounded-ml-sample-import.md).
  Detailed HTTP results are in ignored tmp/ml-sample-http.json. No commit/push.
  Multi-store isolation, full-corpus import/performance, live inference and human
  quality acceptance remain pending. Full legacy integration suites were not rerun.

### Legacy Login Path Correction - 2026-10-14

- Same contributor/branch and F001 login integration amendment. Screenshot showed
  the legacy preview login still validating mock credentials instead of Neon.
- `/preview` and `/preview/login` now show real API login, matching `/` and `/login`.
  Explicit mock entry moved to `/preview/demo-login`; mock shell links/tests updated.
- No credentials, database data/schema or store proposal changed. Frontend lint
  and production build passed. Real Admin browser regression passed: all four
  login entry points use real form, old /preview/login posts 200, Admin accounts
  read returns 200, logout returns to /login. All six preview browser regressions
  passed at the explicit demo-login path; diff whitespace checks passed.

### Multi-store Schema Proposal - 2026-10-14

- User now confirms one account owns multiple stores, with products per store;
  ML exports remain unused. This supersedes one-store and shared-catalog-only
  assumptions for future ownership work; ADR 0006 records the impact.
- Prepared Mermaid, complete revised DBML and staged PostgreSQL proposals under
  `docs/architecture/` and `backend/db/proposals/`. Owner: requesting contributor,
  Codex-assisted, same dirty branch; related F001/F002/F007 scope amendment, no new
  invented task IDs or acceptance checks. No pull/stash/commit/push.
- Added store owner/product relations, nullable legacy assignment then guarded
  NOT NULL finalization; preserve existing fields/history and applied migration 001.
- Verification: diagram/schema text, relative paths and diff only. SQL not applied
  or executed against PostgreSQL; no store data created/assigned. API/UI remain
  shared catalog until store CRUD/selection and nested ownership checks are built.

### Connected Frontend / Backend - 2026-10-14

- Real login, HTTP client/DTOs, server cookie proxy and connected workspaces with
  session/role/error/loading states. Preview stays under `/preview/*`; live errors
  do not fall back to mocks. No database credentials or browser Bearer-token storage.
- Catalog/overview/frozen analyses, work/transitions/history and Admin management
  use PostgreSQL-backed endpoints. Stores, ML/jobs and config writes lack APIs;
  unavailable/read-only states make that conflict explicit. ADR 0005 records scope.
- Frontend lint/typecheck/build and all six preview tests passed. Five live journeys
  passed across scoped runs: real auth/catalog, work/audit, Admin CRUD/suspension,
  simulated failure/retry and required-reason rejection. Internal-host origin check
  and session handling fixed; cached hidden-page test selectors corrected.
- Original seed counts/action states unchanged. Test work IDs 4/5 completed, ID 6
  rejected with history; test account ID 4 suspended. Disposable products removed.
  No migration, secret publication, commit or push. Temporary test processes stopped;
  existing port 3001 preserved. See [verification](verification/sellens-frontend-integration.md).
- Next: team review, stores/model/API decisions and human/deployment checks.
- Final documentation/security checks: 87 relative links resolved; whitespace diff
  check passed; no local database URL or sample passwords found in 51 changed/new files.

### Explicit Endpoint Table Refactor - 2026-10-14

- Same requesting contributor/branch and existing backend amendment; no new task
  or feature acceptance claim. Retained the dirty tree without pull/stash.
- Replaced resource/method dispatch branches in `backend/src/server/api.ts` with
  one explicit HTTP-method/full-path table and named handlers. Kept the Next.js
  catch-all, aliases, services, authentication, CORS and error envelopes.
- Frontend, migrations, seed definitions and database configuration unchanged.
- Verification: `npm run typecheck`, `npm test` (5 passing tests), production
  build and `npm run test:http` (62 passing requests against temporary port 3002)
  succeeded. PostgreSQL seed DTOs still matched direct queries; aliases, auth,
  nested IDs, 404/405 and CRUD passed. Temporary CRUD fixtures were removed.
- Saved [refactor evidence](verification/sellens-backend-refactor-http.json).
  Temporary server stopped after checks; port 3001 server was not interrupted.

### Shared-Catalog Neon Backend - 2026-10-14

- Extended existing Next.js backend; pooled parameterized SQL, strict validation,
  safe JSON errors, CORS, scrypt/Bearer authentication, admin management, CRUD,
  immutable saved analyses and transactional action/history services. Frontend unchanged.
- Read supplied DBML and recorded shared-catalog/role/status changes in ADR 0004,
  contracts and structure rules. Original Spec Kit IDs/checklists are unchanged.
- Neon inspection showed no existing tables. Applied additive checksummed migration;
  inserted 10 products, 3 analyses, 2 Users/database reviewers, 1 Admin, 3 categories,
  3 actions and 3 audit events. Reruns applied no changes and inserted no duplicates.
- Verification: backend typecheck, 4 unit tests, production build and 62 real HTTP
  checks passed; full product/analysis DTOs matched direct PostgreSQL queries.
  ID parsing and ON DELETE RESTRICT error handling defects were fixed and retested.
  Unused vulnerable lint scaffold dependencies removed; npm audit found zero issues.
- Documentation verification: 78 relative links resolved; diff whitespace checks
  passed and no local DATABASE_URL/sample-password values appeared in changed files.
- See [backend README](../backend/README.md) and [verification](verification/sellens-backend.md)
  for exact requests, sanitized examples, evidence and limitations. Secrets remain
  ignored; no commit/push performed. No frontend integration, inference, human
  acceptance or production-readiness claim. Mai/Huy/Nhung review remains the next step.

### Six Statuses and Rule-Based Actions - 2026-10-12

- Completed steps 6 and 7 against the existing taxonomy v2 snapshot. Rule version
  `rule-based-v2-good-peer-video`; Model A predictions from
  `j4f-20261011T181008Z` reused without retraining. This is a new scoring run,
  not a new taxonomy evaluation or model-training run; previous outputs intact.
- All 41,576 products scored: performing well 18,176; untapped potential 5,892;
  difficult to sell 12,380; insufficient data 5,128. Both feedback/low-sales
  statuses have zero qualifying products under the current reference intervals.
  All six branches are tested; thresholds were not changed to fill categories.
- 27,696 products received 42,652 evidence-backed actions, with stable `rule_id`,
  hypothesis and validation fields. Video suggestions require explicit video
  absence, at least five good-selling peers with known video presence and a
  video share >=40%. Good peers are positive sellers above the selected-peer
  75th percentile; unknown video values are excluded, not treated as absence.
- Scope guards suppress actions and clear primary references for 1,015
  out-of-scope products and 107 unresolved types. Missing/weak peer or model
  evidence is also guarded. Model B never drives the primary status.
- Ignored outputs: `data/processed/scoring_mvp_v2/product_scores.csv`, compact
  `product_statuses.csv`, flat `product_recommendations.csv` and local summary.
  Shared [aggregate report](../ml/reports/metrics/scoring_mvp_v2.json),
  [rule guide](ml/interpretation-guide.md) and updated data contract support handoff.
- Verification: 36 tests passed. Real-output checks passed for unique IDs,
  labels, strict recommendation JSON, scope guards, video evidence, action-table
  joins/counts and unchanged source hashes. No commit or push performed.
- Limitations: taxonomy frozen holdout remains **63%, below 85%**; new peer
  groups still need human validation. Statuses/actions are review hypotheses,
  not causal conclusions or sales forecasts; `quality_acceptance=false`.

### Taxonomy V2 and Full Requested Rerun - 2026-10-12

- Added 8 canonical unisex/unknown-gender labels (67 total), versioned rule config
  and guide. Specific title, gift suppression, description/context and shape/gender
  precedence are implemented in `ml/src/taxonomy/rules.py`; v1 remains available.
  Cross-component label changes are recorded in `docs/rules/data-contracts.md`.
- Full snapshot v2 rule coverage is 94.84%; fallback 2,144 / 5.16%. Frozen
  holdout 189/300 = **63%, below 85%**. Old development 200 is 81%, a regression
  from 94.5%; round-3 frozen labels 79.5%, or 83.5% using 18 explicitly identified
  AI schema-migration proposals. Holdout/original labels were not rewritten.
- The contributor explicitly requested model reruns despite previous failing
  gates. Dedicated `ml/src/evaluation/rerun_taxonomy_v2.py` executed all stages
  in a separate experiment with `quality_acceptance=false`; ordinary CLI gate
  behavior is unchanged. Recomputed peers; 41,575 rows trained, one excluded.
- Reference model version `j4f-20261011T181008Z`: baseline ROC-AUC 0.655 / RMSLE
  1.521; Model A 0.700 / 1.361; Model B 0.868 / 0.646. Model A remains primary.
  Scored all 41,576 products; 27,382 products received 40,331 recommendations.
- Retrained the taxonomy text experiment with 707 development examples / 60
  classes and grouped OOF accuracy 62.52%, macro F1 0.525. Margin >=0.8 reached
  93.68% accuracy on only 13.44% of rows; no global-quality or readiness claim.
  Eighteen added training labels are AI-proposed schema migrations, not new
  independent human annotations. Eight holdout-overlap annotation rows were excluded.
- Outputs: ignored `data/processed/taxonomy_v2_run/`, `ml/artifacts/taxonomy_v2_run/`
  and `data/local_reviews/taxonomy_round_3/text_model_v2/`. Shared reports:
  [full rerun](../ml/reports/metrics/taxonomy_v2_run.json),
  [reference models](../ml/reports/metrics/model_metrics_v2.json),
  [text v2](../ml/reports/metrics/taxonomy_text_experiment_v2.json).
  [V2 handoff](ml/taxonomy-v2-rerun.md) documents semantics and reproduction.
- Verification: 30 tests passed; real scoring IDs/strict JSON/null invariants
  and source/holdout checksums verified. New peer groups lack a new human audit.
  Previous outputs remain intact; no commit/push or readiness checklist completion.
- Next: review development regressions, add examples for sparse classes and
  evaluate an independently labelled fresh v2 holdout after freezing definitions.

### User Confirmation, Error Triage and Text Model - 2026-10-12

- The contributor explicitly confirmed individual review of all 400 round-3
  labels. Recorded `requesting_contributor` as the participant ID and AI-assisted
  confirmation provenance/hash; no real name, confidence or second-review values
  were invented. All supplied labels are unchanged; formal confidence/second-review
  metadata is still incomplete, but confirmed labels support development experiments.
- Added `ml/src/evaluation/taxonomy_errors.py` and local error/ambiguity analyses.
  Organized 143 errors into seven hypotheses: wording/semantic gaps 50, scope
  filter 26, taxonomy/information gaps 24, description evidence 17, rule priority
  14, category override 10, sparse title 2. All 24 ambiguous cases are analyzed;
  no AI analysis was written as independent human second review or new ground truth.
- Added `ml/src/taxonomy/text_classifier.py`: TF-IDF word/char + balanced LinearSVC,
  five-fold near-duplicate-grouped development evaluation. Combined 750 input
  annotations, excluded holdout overlaps/ambiguous labels, trained on 689 examples
  spanning 54 classes and 679 title groups. Eight holdout-overlap annotation rows
  were removed. Heldout label contents were never used for training or model selection.
- Development OOF accuracy 64.59%, macro F1 0.575; round-3 subset 61.97%.
  At margin >=0.8, 104 rows (15.09% coverage) reached 90.38% accuracy. This narrow
  selected result is not global accuracy or a readiness pass. Sparse class support
  and label boundaries remain limiting factors. No new holdout evaluation was run.
- Local OOF predictions/errors/confusion/model bundle live under ignored
  `data/local_reviews/taxonomy_round_3/text_model/`. Shared reports:
  [text metrics](../ml/reports/metrics/taxonomy_text_experiment.json) and
  [error analysis](../ml/reports/metrics/taxonomy_error_analysis.json).
  [Experiment guide](ml/taxonomy-text-experiment.md) documents sources, grouping,
  metrics, limitations and reproduction commands.
- Verification: 25 unittest tests passed, including text-only input and no
  identified duplicate-group leakage across folds. Confirmed-label checksum and
  saved classifier round-trip were verified. Production taxonomy/model/scoring
  outputs remain unchanged; the prior candidate holdout remains 59.67% and the
  original production holdout 58%, both below 85%.
- Next: agree on missing-label/scope definitions, target development rule/description
  errors and sparse-class examples, then independently evaluate a frozen final
  candidate. No feature acceptance, commit, push or independent review was claimed.

### Completed Labels and Full Candidate Evaluation - 2026-10-12

- Found the reviewed 254-row pending set saved under an unrelated filename.
  Renamed the unchanged workbook to local `taxonomy_pending_review_labelled.xlsx`,
  extracted explicit worksheet values to `taxonomy_pending_review_labelled.csv`
  and merged annotations into the frozen 400-row development queue. All 400
  primary labels are present and valid; reviewer/confidence remain blank and
  24 ambiguous cases still need second review. Validation remains incomplete.
- Created local `priority_additions_candidate.yml` and `candidate_taxonomy.yml`
  plus experimental evaluation scripts. Candidate name processing strips gift
  phrases and retains supported specific bag categories over generic bag names.
  Candidate rules were developed only from round-3 labels, which were AI-assisted.
  These prototype transforms depend on the original classified snapshot and
  are not a deployable serving taxonomy or a change to production rules.
- Round-3 development result: 32.25% frozen baseline versus 64.25% candidate;
  128 previously incorrect rows fixed, zero previously correct rows regressed
  on this 400-row set. This is a development score, not independent accuracy.
- Full candidate evaluation ran on 2026-10-12 at 00:20 (Asia/Saigon), reusing
  the source clean snapshot, not rerunning cleaning or training. Output:
  ignored `data/interim/taxonomy_round_3_candidate/clean_products_candidate.csv`.
  All 41,576 IDs are unique; 2,002 product types changed. Assignment coverage
  100%; rule coverage 92.26%; fallback 3,216 rows / 7.74% (previously 3,749 / 9.02%).
- A single aggregate check against the locked holdout after freezing this
  candidate found **179/300 correct (59.67%)**, versus 58% previously. The
  original 200-row development review fell from 94.5% to 91.5%. Holdout labels
  and original files were preserved; no row-level holdout errors were used to
  tune candidate rules. Do not tune the next candidate from this holdout result.
- [Candidate evaluation report](../ml/reports/metrics/taxonomy_round_3_candidate.json)
  records source/config/holdout hashes and limitations. The 85% holdout gate
  still fails; production taxonomy, peer/model outputs and scoring were not replaced
  or retrained. Earlier 58% metrics describe production, not this candidate.
- Verification: candidate evaluation completed; all development predictions
  matched the separate 400-row candidate run; holdout hash unchanged; ID uniqueness,
  complete holdout joins and explicit annotation label checks passed. No new
  source-code changes or additional model tests were required for this local experiment.
- Next: resolve reviewer/confidence and ambiguous cases; review the 143 remaining
  development mismatches and failures on prior development labels; improve
  development rules or evaluate a text classifier using development-only splits.
  Independent taxonomy acceptance and downstream rerun remain pending.

### Partial Human Annotation Merge - 2026-10-11

- The contributor supplied 146 `human_product_type` values in the priority
  subset `ai_proposals_needing_review.csv`, not in the main 400-row queue.
  All supplied labels are valid and match the AI proposals; this is AI-assisted
  development review, not a blind independent evaluation.
- Merged 146 supplied annotation cells into the main queue by product ID after
  validating frozen fields. Preserved all other annotations and product data;
  saved a timestamped pre-merge backup and `annotation_merge_summary.json`.
  Exported 254 unlabelled rows to ignored `taxonomy_pending_review.csv`.
- Added CLI `merge-taxonomy-development` and a regression test covering subset
  merge, idempotency, conflict rejection and absence of fabricated metadata.
- Validation: 146 labelled / 400 rows, zero invalid labels, zero accepted rows
  because confidence/reviewer fields are absent; 24 ambiguous rows need second
  review. `complete=false` and exit 2 are expected for this partial handoff.
- Next: complete the remaining labels, actual reviewer/confidence metadata and
  second-review cases; validate before rule refinement. No confidence, reviewer
  identity or missing human label was generated. Rules, model outputs and the
  58% holdout metric are unchanged. Local review CSVs remain outside Git.

### AI-Assisted Development Annotation - 2026-10-11

- The contributor explicitly requested AI detection/labels for the 400-row
  round-3 queue. Added local proposal columns `ai_product_type`, `ai_confidence`,
  `ai_review_note`, `ai_evidence`, source/timestamp and a human-review flag.
  Read all product names and consulted descriptions for uncertain cases.
- All 400 proposals use existing label IDs. Subjective confidence counts:
  254 high, 122 medium, 24 low. A local 146-row priority-review CSV contains
  medium/low cases. 271 proposals differ from frozen predictions; this is a
  disagreement count, not measured accuracy or confirmed prediction errors.
- Original product fields and human annotation columns remain unchanged; all
  human labels are still blank. Preserved a pre-AI backup and local proposal
  provenance/mapping. The whole review directory remains ignored by Git.
- Verification: checked queue identity, label membership, blank human fields
  against the backup and expected incomplete human validation. No holdout labels
  were read or modified; taxonomy rules and the reported 58% holdout are unchanged.
- Next: humans review AI suggestions and fill their own confirmed labels,
  confidence and reviewer identity. AI suggestions may assist development but
  do not satisfy the human review or independent evaluation gate.

### Taxonomy Development Queue - Round 3 - 2026-10-11

- Authorized follow-up scope: prepare new development annotations for taxonomy
  refinement; overlapping F003/T005-T007, with human annotation still pending.
  Existing branch and team ownership retained; no readiness gate is completed.
- Created ignored local `data/local_reviews/taxonomy_round_3/` with
  `taxonomy_development_round_3.csv` (400 rows),
  `taxonomy_label_set_round_3.csv` (59 labels), a provenance/sampling manifest
  and Vietnamese `HUONG_DAN.md`. Quotas: 200 source fallbacks, 150 category-rule
  rows and 50 candidate name/category disagreements. Every annotation is blank.
- Excluded 1,114 unique IDs from original development reviews, locked holdout,
  fallback review and peer-audit target/peer IDs. Verified zero ID overlap.
  Holdout files were read only for IDs; labels were not used for sampling or tuning.
- Added proposed annotation definitions/boundaries in
  `ml/config/taxonomy_label_guide.yml`; label IDs and prediction rules are unchanged.
  Reviewers should agree on these definitions, label the main product from name
  and relevant description, and avoid guessing gender/type from source filenames.
- Added `ml/src/evaluation/development.py`, CLI commands
  `create-taxonomy-development` and `validate-taxonomy-development`, six focused
  tests and [round-3 instructions](manual-review-round-3.md). Creation refuses
  to overwrite an existing queue. Validation checks frozen columns, allowed
  labels, confidence/reviewer and unresolved second-review cases.
- Verification: `.venv/bin/python -B -m unittest discover -s ml/tests -v`
  passed all 21 tests; `git check-ignore` confirms local review files are ignored.
  Initial validation reports 400 rows, zero labels/invalid labels and
  `complete=false` (exit 2, expected before human annotation).
- Next: humans fill `human_product_type`, `review_confidence` and `reviewer`;
  second-review low-confidence/ambiguous rows and resolve disagreements. Run
  `.venv/bin/python -B -m ml.src.cli validate-taxonomy-development` afterward.
  Use accepted development labels to improve rules; do not tune from holdout.
  Holdout accuracy remains 58%; queue creation does not improve that metric.
  Local CSVs remain outside Git; code/config/instructions are suitable for review.

### Status and Recommendation Implementation - 2026-10-11

- Authorized scope: MVP steps 6 and 7, overlapping F003/T013-T014; current
  branch `feature/data-pipeline-handoff` retained. This work does not complete
  saved-model inference, independent quality gates or human acceptance.
- Enhanced existing `ml/src/scoring/status.py`: six stable statuses, Vietnamese
  explanations, hypothesis/limitation fields and evidence-linked rule actions.
  CSV boolean parsing is explicit; missing Model A predictions no longer fall
  back to baseline. Invalid peer/model/observation basis clears reference fields;
  feedback-only insufficiency preserves a valid reference.
- Price, image, video, description and review rules now run for products with
  sufficient evidence, including performing/difficult-to-sell statuses. Unknown
  video presence is not treated as absence. Video evidence uses all selected
  peers, not a verified high-performing subset. Every action includes evidence,
  a hypothesis and a validation step; no LLM is used.
- CLI `score --output-file` supports separate output paths and writes an adjacent
  `.summary.json`. Updated `docs/rules/data-contracts.md`, `ml/README.md` and
  [interpretation guide](ml/interpretation-guide.md).
- Real-data scoring was executed on 2026-10-11 using existing AISC 2026 peer
  features and Model A out-of-fold predictions from `j4f-20261002T013425Z`.
  No full-data model retraining or saved-bundle serving was performed. Outputs
  are ignored local `data/processed/product_scores.csv` and
  `product_scores.summary.json`; original source-checkout scores were preserved.
- Results: 41,576 products; performing well 18,384; untapped potential 5,998;
  difficult to sell 12,761; insufficient data 4,433. Both feedback/low-sales
  statuses have zero rows under current interval/review thresholds. All six
  branches are exercised in controlled tests; thresholds were not changed to
  populate statuses. 27,544 products received 40,716 recommendations.
- Breakdown of insufficiency: 3,246 low-similarity groups, 982 small peer groups,
  one invalid product and 204 feedback-only cases.
- Verification: `.venv/bin/python -B -m unittest discover -s ml/tests -v`
  passed 15 tests (11 scoring tests plus four existing tests). Real-output checks
  cover unique IDs, all status explanations, strict JSON and reason-specific
  reference null/retention behavior. `git diff --check` passed.
- Shared result evidence: [scoring summary](../ml/reports/metrics/scoring_summary.json).
  Taxonomy holdout remains 58%, below 85%; outputs are exploratory and require
  human review. Next: review representative recommendations and improve taxonomy
  before real API/DB integration. No task checklist, commit or push was completed.

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
