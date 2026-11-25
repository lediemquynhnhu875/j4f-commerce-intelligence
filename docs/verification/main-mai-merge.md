# Main / Mai integration merge verification

Date: 2026-11-25 (Asia/Saigon). Scope: user-authorized resolution of the existing
merge on main at 8256c0b; no remote repository access or production DB mutation.

## Resolution

Keep current main User screens, Auth/WorkspaceLayout, date-bounded analysis,
model-service pilot, cached store statistics, Admin paging and action cards.
Mai's offline ingestion and maintenance tools remain additive. API aliases for
prior bounded catalog/workspace consumers remain centrally owner-guarded.
Do not restore deleted LivePage or old PagedCatalog/UserWorkspace compositions.
The two newly moved helper screen files are removed from the active source tree;
their behavior is superseded by the current main screens.

All seven supplied SQL migration files were compared byte-for-byte with their
origin archives and executed in filename order on fresh PGlite. The absent
historical 003 migration was not reconstructed. Migration keys are full basenames,
not numeric prefixes; no filename/checksum was changed. This does not prove the
live Neon migration table is reconciled: inspect it before applying outstanding
schema changes, especially 005_store_stats.sql recorded as deployed by main docs.

## Checks performed

- Backend `npm ci --ignore-scripts`, typecheck and production build passed.
- `node --import tsx --test tests/*.test.ts tests/*.test.mjs`: 32 passed.
- Python `unittest discover -s backend/tests -p 'test_*.py' -v`: 6 passed.
- PGlite: seven available SQL files plus eight owner-scoped catalog/overview/
  option/detail/work and saved-projection checks passed. Isolated synthetic rows.
- Frontend lint, production build, app TypeScript and test TypeScript passed.
  Initial app typecheck needed Next's generated LayoutProps; build generated it.
- Frontend clean install initially rejected two missing optional emnapi entries.
  Repaired lock metadata without changing declared package versions.
- Browser release suite was attempted. 21 browser cases could not launch because
  this environment denies Chromium singleton socket creation (EPERM); one
  browser-independent case passed. This is not a browser pass or a UI assertion
  result. Chromium download was also denied by the CDN. Run release browser
  checks locally; no source tests were changed to hide these restrictions.
- Historical Mai catalog Playwright fixtures describe the retired old UI/API
  composition and were retained, not asserted to pass against current screens.

## Original-machine follow-up

The supplied PowerShell application script checks the merge HEAD, backs up the
current index/conflicted files under ignored tmp, copies only packaged resolutions,
removes the three retired files and stages only those known paths. It never
commits, pushes, migrates, stashes, resets or reads local credentials.
After application run backend/frontend builds, check git diff and then conclude
the merge. Rerun the populated-store ownership HTTP suite against the updated
local backend; its earlier 410-request PASS predates this merge.
Never use force push. If remote main advanced, integrate it before a normal push.
