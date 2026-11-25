# Three-store ownership orchestration — 2026-11-17

Mai, Codex-assisted; user explicitly requested continuation after screenshot evidence
of Gia Dung's57 products/57 analyses/71 suggestions and saved profile evidence.
Prior live two-store check passed93 requests, with owner-scoped counts256/254/272
and56/56/98, two directions and2 SQL assignee rejections. Gia Dung import57/57/71
and zero-insert rerun were user-reported successes. Do not equate these with a
completed three-store matrix.

Added test-three-stores.mjs, delegating to the existing business-read-only two-store
HTTP CLI for all three pairs. No runtime route, schema, import, media or frontend
change. Child credentials are environment-only, never shell-interpolated or printed.
Checks enforce three distinct emails/stores, consistent account-store identity and
counts across pairs, six unique product/analysis/action directions and six assignee
rejections. Child failures/timeouts/invalid reports stop the aggregate PASS. Reports
contain only explicitly selected counts/IDs/coverage. Child auth sessions still use
normal login/logout; business data fingerprints and safe rejected probes remain.

Executed7 Node unit tests against fixture child reports, covering matrix success,
credential omission, duplicate accounts, failed/writable child reports, incomplete
coverage, changing counts, missing assignee checks and changing store assignment.
No real credentials, native live HTTP, pg driver or Neon connection was used here.
The underlying current two-store test was recovered from its exact prior artifact,
not reconstructed from memory. Native three-account execution remains user-side.

Expected live inventory (if unchanged):store3=256 products/254 analyses/272 work,
store2=56/56/98,store9=57/57/71. No seed, reset, data transfer, account provisioning,
password update, schema mutation or live import performed. Source worktree has no
Git metadata; no commit/push/deploy. WS1 acceptance still includes media, deployment,
restore, full-import scope agreement and broader mutation/concurrency checks.
