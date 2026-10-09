# 0003: UI Preview First and Dependency-Ordered Tasks

Date: 2026-10-09 (Asia/Saigon).
Status: accepted workflow correction requested by the user.

## Decision

Start with a runnable Next.js/TypeScript frontend and labeled synthetic UI previews. Auth/permission review is required before real integration; it does not block framework setup or mock forms/layouts. Early previews use current draft requirements and contracts without claiming their final approval.

Separate mock acceptance from real authentication/API/model acceptance. Real server ownership checks, model/human gates and reviewer evidence remain required.

Display local task prerequisites before dependents. Phase headings describe increments and add no implicit blockers. [P] remains conditional on listed prerequisites and nonconflicting files.

## ID migration

Before this revision, all 107 tasks were unchecked and none was claimed. The user's request to correct execution order authorizes this one-time renumbering. All current references and dependency summaries are updated. After work starts, preserve IDs and add follow-up tasks instead of renumbering.

Three new F001 tasks isolate the mock shell, navigation and login preview. There are now 110 unchecked tasks. Actual assignments remain unconfirmed.

| Previous ID | Current ID | Work identity |
| --- | --- | --- |
| New preview task | F001/T002 | Build the shared User/Admin shell with visibly labeled synthetic previews |
| New preview task | F001/T003 | Build navigation and denied/expired/unassigned states against preview fixtures |
| New preview task | F001/T004 | Build the login form and pending/failure/logout states with synthetic fixtures |
| F001/T001 | F001/T005 | Review scope and confirm the authorization acceptance matrix |
| F001/T002 | F001/T001 | Initialize the Next.js App Router TypeScript app and pin its frontend runtime dependencies |
| F001/T003 | F001/T007 | Add Neon connection and reviewed account/store/auth-schema migrations |
| F001/T004 | F001/T008 | Create server-only configuration and database transaction helpers |
| F001/T005 | F001/T006 | Define login/logout/expiry acceptance cases |
| F001/T006 | F001/T009 | Implement the maintained email/password session integration and operator bootstrap |
| F001/T007 | F001/T010 | Connect the login/logout UI to real authentication |
| F001/T008 | F001/T011 | Implement session, role, active-account, and store authorization guards |
| F001/T009 | F001/T012 | Expose the normalized session endpoint with minimal account DTO |
| F001/T010 | F001/T013 | Implement the cross-store and account-state regression suite |
| F001/T011 | F001/T014 | Connect the shared shell to real role-specific session layouts |
| F001/T012 | F001/T015 | Connect navigation and denied-access states to the real session contract |
| F001/T013 | F001/T016 | Verify the full foundation flow and handoff |
| F002/T001 | F002/T003 | Review import/catalog cases and demo ownership mapping requirements |
| F002/T002 | F002/T004 | Verify the existing cleaning pipeline in a prepared Python environment |
| F002/T003 | F002/T005 | Implement catalog/snapshot/import staging schema |
| F002/T004 | F002/T006 | Verify required analysis fields and cleaning null semantics |
| F002/T005 | F002/T007 | Write import validation/idempotency/rollback contract tests |
| F002/T006 | F002/T008 | Implement staged CSV import validation |
| F002/T007 | F002/T009 | Implement atomic snapshot publication and explicit ownership mappings |
| F002/T008 | F002/T001 | Build the Admin import validation/mapping UI with labeled mock responses |
| F002/T009 | F002/T011 | Implement scoped catalog queries and product-list route |
| F002/T010 | F002/T002 | Build catalog list/search/filter/pagination UI with labeled mocks |
| F002/T011 | F002/T012 | Connect the catalog UI to scoped web APIs |
| F002/T012 | F002/T013 | Implement product-detail DTO with scoped provenance |
| F002/T013 | F002/T014 | Build product detail and unavailable-data presentation |
| F002/T014 | F002/T015 | Verify imports and catalog handoff |
| F002/T015 | F002/T010 | Connect import validation and mapping UI to real Admin endpoints |
| F003/T001 | F003/T001 | Reproduce the existing ML environment and module/test audit |
| F003/T002 | F003/T002 | Obtain approved source snapshot and verify cleaning provenance |
| F003/T003 | F003/T003 | Verify observed-sales semantics and freeze the no-leakage feature allowlist |
| F003/T004 | F003/T004 | Set evaluation and low-similarity peer acceptance criteria before review |
| F003/T005 | F003/T005 | Audit existing EDA/taxonomy outputs and reuse the current notebook |
| F003/T006 | F003/T006 | Coordinate real blind taxonomy and peer annotations |
| F003/T007 | F003/T007 | Evaluate existing taxonomy/peer checkpoints and document only evidenced gaps |
| F003/T008 | F003/T008 | Export/version the peer snapshot and verify retrieval exclusions |
| F003/T009 | F003/T009 | Add targeted leakage, split and baseline invariants to existing tests |
| F003/T010 | F003/T010 | Evaluate baseline and existing reference models out of sample |
| F003/T011 | F003/T011 | Complete the existing saved bundle with calibration, config and provenance |
| F003/T012 | F003/T012 | Add reusable inference over the saved fitted models without retraining |
| F003/T013 | F003/T013 | Audit/fix reason-specific eligibility and finite-or-null scoring behavior |
| F003/T014 | F003/T014 | Review user-facing status explanations and analytical limitations |
| F003/T015 | F003/T015 | Freeze the serving input/output and artifact compatibility contract |
| F003/T016 | F003/T016 | Review the ML readiness gate and handoff |
| F004/T001 | F004/T002 | Review analysis integration and failure acceptance cases |
| F004/T002 | F004/T003 | Prepare serving dependency manifest and trusted artifact configuration |
| F004/T003 | F004/T004 | Implement immutable analysis-run persistence schema |
| F004/T004 | F004/T005 | Provide reviewed serving validation cases and expected semantics |
| F004/T005 | F004/T006 | Implement FastAPI schemas and authenticated inference contract tests |
| F004/T006 | F004/T007 | Implement lifespan loading, compatibility checks and readiness |
| F004/T007 | F004/T008 | Implement inference adapter using reusable ML prediction/scoring |
| F004/T008 | F004/T009 | Implement the server-only authenticated model client |
| F004/T009 | F004/T010 | Implement analysis request, idempotency and frozen input/output persistence |
| F004/T010 | F004/T011 | Expose authorized request and saved-analysis routes |
| F004/T011 | F004/T001 | Build result/loading/error UI against clearly labeled analysis mocks |
| F004/T012 | F004/T012 | Connect the result UI to real saved analysis endpoints |
| F004/T013 | F004/T013 | Verify real inference integration and ownership/failure handoff |
| F005/T001 | F005/T003 | Review dashboard metrics, denominators and no-data acceptance cases |
| F005/T002 | F005/T001 | Prepare dashboard wireframes and draft DTO mock mapping |
| F005/T003 | F005/T004 | Implement scoped dashboard aggregation/query contract tests |
| F005/T004 | F005/T005 | Review display DTO semantics for references, gaps and peer evidence |
| F005/T005 | F005/T006 | Implement current-store dashboard aggregation and endpoint |
| F005/T006 | F005/T002 | Build metric cards and review-priority UI using labeled fixtures |
| F005/T007 | F005/T007 | Connect overview to real scoped dashboard data |
| F005/T008 | F005/T008 | Implement observed/reference/gap and peer evidence components |
| F005/T009 | F005/T009 | Connect result presentation to real frozen analysis DTOs |
| F005/T010 | F005/T010 | Implement scoped deterministic analysis history queries |
| F005/T011 | F005/T011 | Build history navigation and immutable input comparison |
| F005/T012 | F005/T012 | Evaluate dashboard comprehension and acceptance |
| F006/T001 | F006/T002 | Review decision/progress transitions and completion meaning |
| F006/T002 | F006/T003 | Audit suggestion originals and evidence from existing rule outputs |
| F006/T003 | F006/T004 | Implement immutable originals, action state and append-only events schema |
| F006/T004 | F006/T005 | Add transition/ownership/concurrency/atomicity contract tests |
| F006/T005 | F006/T006 | Implement scoped original suggestion retrieval and decisions |
| F006/T006 | F006/T001 | Build suggestion review/accept/reject UI against approved DTOs |
| F006/T007 | F006/T007 | Expose suggestion/action decision endpoints |
| F006/T008 | F006/T008 | Implement transactional action updates with optimistic concurrency |
| F006/T009 | F006/T009 | Build editable copy, progress and completion controls |
| F006/T010 | F006/T010 | Implement scoped append-only history endpoint |
| F006/T011 | F006/T011 | Connect decisions/progress/history to real APIs |
| F006/T012 | F006/T012 | Verify improvement workflow and history |
| F007/T001 | F007/T002 | Review Admin permissions, safe suspension and reassignment cases |
| F007/T002 | F007/T001 | Prepare account/store/catalog/monitor wireframes |
| F007/T003 | F007/T003 | Create Admin API permission and management invariants tests |
| F007/T004 | F007/T004 | Implement reusable Admin-management query/mutation boundary |
| F007/T005 | F007/T005 | Implement account/store provisioning and management endpoints |
| F007/T006 | F007/T006 | Implement suspension/reactivation and last-Admin safeguards |
| F007/T007 | F007/T007 | Build account/store management screens |
| F007/T008 | F007/T008 | Implement category/archive/reassignment management through catalog services |
| F007/T009 | F007/T009 | Build category/product assignment management screens |
| F007/T010 | F007/T010 | Implement operational overview, processing filters and stale-run reconciliation |
| F007/T011 | F007/T011 | Build operational overview and analysis monitor UI |
| F007/T012 | F007/T012 | Verify Admin management and monitoring handoff |
| F008/T001 | F008/T001 | Review release matrix, priorities and human evaluation protocol |
| F008/T002 | F008/T002 | Prepare reproducible two-store/Admin fixture and artifact setup plan |
| F008/T003 | F008/T003 | Prepare the joined owner/Admin UI journey and accessibility checklist |
| F008/T004 | F008/T004 | Consolidate reproducible ML metrics, peer quality and limitations |
| F008/T005 | F008/T005 | Implement integrated API ownership and failure regression scenarios |
| F008/T006 | F008/T006 | Implement browser owner/Admin journey checks |
| F008/T007 | F008/T007 | Execute and review end-to-end and failure results |
| F008/T008 | F008/T008 | Conduct real user interviews and record findings |
| F008/T009 | F008/T009 | Conduct usability evaluation of evidence and improvement work |
| F008/T010 | F008/T010 | Write and validate clean-machine setup/run instructions |
| F008/T011 | F008/T011 | Review report model claims and scientific limitations |
| F008/T012 | F008/T012 | Prepare the final report, slides outline and demo script |
| F008/T013 | F008/T013 | Rehearse UI demo and resolve evidenced UX blockers within scoped tasks |
| F008/T014 | F008/T014 | Approve or block demo readiness with evidence-based handoff |

## Consequences

F001/T001 is framework setup; F001/T002–T004 are mock previews; F001/T005–T008 review real behavior and prepare persistence; F001/T009–T015 integrate real behavior; F001/T016 verifies the joined flow.

Product/catalog, analysis, dashboard and suggestion mocks plus Admin wireframes no longer wait for unrelated real API/model checkpoints. Their real integration still waits for final contract and component evidence.

Business scope and the constitution are unchanged. No app code, tests, database migration, assignment or completion evidence is created by this correction.
