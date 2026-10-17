# Live dashboard presentation verification

Date: 2026-10-17 (Asia/Saigon). Requesting contributor, Codex-assisted.
Branch: feature/backend-neon-mvp. Existing F005/T007 presentation amendment;
original store/model/human acceptance is unchanged.

## Behavior

Use the mock's colored cards, distribution bars, donut/legend and linked work
cards with the existing authenticated API dataset. Default to the entire catalog;
optional ML scope is computed from saved ml_v2 analysis membership. All product,
category/status/action counts and percentages are derived from API data. No sample
counts, proportions, five-category limit or 100-product cap appear in production UI.
Percentages include all scoped products; unanalyzed products have their own row.
Empty data shows empty states and no invalid chart arithmetic.

Only the latest analysis per product contributes to work and analysis metrics.
Open actual suggestions determine review counts, since needs_review was set on
every experimental import. Priority uses stored priority_score when available;
the table displays at most eight rows, not a product import limit. Work cards link
to the original saved evidence. No fabricated progress percentage is shown.

## Executed verification

- Final `npm run build` and `npm run lint` in frontend: passed.
- Connected Chromium: three cases passed together. Existing real ML journey;
  default all-catalog scope, optional ML scope, chart/category totals computed
  independently from paginated HTTP responses, mobile containment and evidence
  navigation; explicitly intercepted empty dataset with no NaN/Infinity.
- Preview `npm run test:e2e`: six Chromium regressions passed. Mock workflows and
  shared donut behavior remain operational.
- Real checks used the configured second regular account because the first
  password was absent from local .env. Credentials were injected into the test
  process only; source/environment files were not changed for this workaround.
- Desktop 1440 px and mobile 390 px screenshots inspected, stored in ignored
  tmp/overview-desktop.png and tmp/overview-mobile.png. Transition animations are
  disabled for screenshots; no document overflow was detected on mobile.
- Diff whitespace and deliverable paths checked. No database migrations/imports,
  model runs, source-data changes, commit or push. Authentication uses normal
  temporary sessions which tests revoke. Owned temporary backend stopped.

## Limits

This verifies presentation and API-driven values, not model quality or private
store isolation. Existing allPages loading remains suitable only for the bounded
catalog; backend aggregation/pagination work for a full corpus remains pending.
