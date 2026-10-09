# Validation Guide: Web Foundation, Authentication, and Store Ownership

**Status**: Future validation instructions; feature/runtime is not implemented.

## Prerequisites

- For previews: use current draft specs/contracts and visibly labeled synthetic fixtures. For real integration: review final requirements/contracts and coordinate task ownership.
- Complete each task's listed prerequisites; early preview work does not require whole predecessor features or their real runtimes.
- F001 requires no ML artifacts. Real auth/ownership checks require its database/library setup and explicit local account/store fixtures.
- Future setup tasks establish exact pinned dependencies and test/run commands.
- Real database/auth tests use a disposable database and explicit two-store/Admin fixtures. Visual preview checks do not require a database or real account.

## Preview Checks Before Real Integration

1. Complete T001's dev/build/lint checks without Neon, authentication or FastAPI.
2. Inspect T002's mock User/Admin shell, T003's navigation/access states and
   T004's login/loading/failure examples using synthetic fixtures.
3. Record only preview results. Mock success does not create a session, grant
   permissions or complete real-login/navigation acceptance.
4. Review T005–T006 and prepare T007–T008 before real auth/database integration.
   T009–T015 then connect real behavior; T016 verifies the complete flow.

## Scenario Checks

1. Use provisioned demo accounts to verify successful and failed login, logout, and expiry.
2. Exercise the authorization matrix with two stores and one Admin, including direct requests.
3. Walk through both role layouts without requiring catalog or model features.

## Execution and expected results

After the feature's runtime/test setup exists, run `npm --prefix frontend run test; npm --prefix frontend run build`. Web test/build script names are planned package contracts, not currently available commands. For model-service scenarios, execute the backend unittest suite once F004 supplies its dependencies. Record exit codes and actual expected/observed results for every scenario. Human annotation/interview/usability outcomes require real named human evidence; a test runner cannot complete those tasks.

## Failures and handoff

Record missing dependencies/data, failed checks, cross-store denial results and limitations. Do not tick an implementation task when its acceptance depends on an unexecuted check. Separate labeled mock/component checks from real model integration. See [contracts](contracts/interfaces.md) for bounds, response semantics and transitions.
