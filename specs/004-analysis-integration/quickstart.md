# Validation Guide: Model Serving and Application Integration

**Status**: Future validation instructions; feature/runtime is not implemented.

## Prerequisites

- For previews: use current draft specs/contracts and visibly labeled synthetic fixtures. For real integration: review final requirements/contracts and coordinate task ownership.
- Complete each task's listed prerequisites; early preview work does not require whole predecessor features or their real runtimes.
- Real ML scenarios require approved data and trusted model artifacts; mock previews use synthetic fixtures and require no model. Secrets remain local.
- Future setup tasks establish exact pinned dependencies and test/run commands.
- Real database/auth tests use a disposable database and explicit two-store/Admin fixtures. Visual preview checks do not require a database or real account.

## Scenario Checks

1. Use the real verified F003 bundle with direct service validation scenarios before web integration.
2. Request analysis as two Users and simulate invalid/service failure cases.
3. Use distinct mock and real saved-analysis cases for each processing/analytic state.

## Execution and expected results

After the feature's runtime/test setup exists, run `npm --prefix frontend run test; npm --prefix frontend run build`. Web test/build script names are planned package contracts, not currently available commands. For model-service scenarios, execute the backend unittest suite once F004 supplies its dependencies. Record exit codes and actual expected/observed results for every scenario. Human annotation/interview/usability outcomes require real named human evidence; a test runner cannot complete those tasks.

## Failures and handoff

Record missing dependencies/data, failed checks, cross-store denial results and limitations. Do not tick an implementation task when its acceptance depends on an unexecuted check. Separate labeled mock/component checks from real model integration. See [contracts](contracts/interfaces.md) for bounds, response semantics and transitions.
