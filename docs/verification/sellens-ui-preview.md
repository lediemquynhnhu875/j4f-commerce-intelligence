# Sellens UI Preview Verification

Date: 2026-10-09 (Asia/Saigon). Branch: `set_up`.
Scope: user-requested frontend implementation with synthetic data, one demo
Admin and one demo User, and four pages per actor. The existing dirty checkout
was retained; no pull, commit, push or backend/ML edit was performed.

## Design source

Read the nine screens from the user's Stitch project
[Sellens Decision Support Platform](https://stitch.withgoogle.com/projects/2149323366189060050).
Implemented A01 overview, A03 stores, A05 monitor, A06 model configuration,
U02 overview, U03 products, U05 analysis and U06 suggestions.
The ninth screen is the palette reference, not an additional actor page.

The explicit **Luminous Note v2.4** palette takes precedence over the project's
older indigo theme metadata: primary gradient `#F43F5E` → `#D946EF` → `#8B5CF6`
→ `#3B82F6`; canvas `#FDF8FF`; white cards; semantic warning/success/error colors.
Plus Jakarta Sans follows the exported screen HTML. Product thumbnails are
downloaded from those screens into `frontend/public/demo/`; runtime rendering
does not require Stitch. Raw reference downloads stay in ignored `tmp/stitch/`.

The UI deliberately replaces unsupported production, real-time, confidence,
SHAP and guaranteed-uplift claims with labeled synthetic or unavailable states.
Six User catalog rows and their snapshot counts agree. Admin charts and logs
are independently labeled illustrations. No generated result is ML evidence.

## Runtime and commands

- Local runtime: Node `25.2.1`, npm `11.6.2`; Next `16.4.0`, React `19.3.0`,
  TypeScript `5.9.3`, Tailwind `4.3.3`, Playwright `1.64.0`.
- `cd frontend; npm run lint`: passed, no errors or warnings.
- `npm run build`: passed, including TypeScript and prerendering all eight
  workspace routes plus `/`, `/preview` and `/preview/login`.
- `npm run dev -- --port 3100`: ready; requesting `/preview/login` returned
  HTTP 200. The temporary development server was stopped after verification.
- `npx playwright install chromium`: installed the test browser locally.
- `npm run test:e2e`: **6 passed** in Chromium against the production build.
  The test runner owns and stops its temporary server on port 3100.
- Inspected desktop screenshots for both overviews, analysis, suggestions and
  model configuration, and the mobile product table at 390 px. All eight actor
  pages have screenshots in ignored `frontend/test-results/`.

An initial build found an obsolete generated `.next/dev/types/validator.ts`
that referenced the previously removed health route. Deleted that cache file,
then rebuilt successfully. No health route was restored.
Initial browser assertions were corrected to select visible pages because
Next.js retains previous routes hidden in the DOM; Next's route announcer also
has `role=alert`. Actual UI assertions and acceptance behavior were preserved.

## Browser coverage

1. Invalid credentials, both demo accounts, exactly four navigation links per
   role, all eight screens, and logout.
2. Catalog pagination, filter reset to page one, selected-product navigation,
   empty search, and unavailable reference values for insufficient data.
3. Rejection requires a reason; original evidence stays unchanged; acceptance,
   start, completion and Kanban grouping work in the synthetic UI.
4. Add/select/suspend a local store fixture; filter failed jobs; failed jobs
   show no successful inference result.
5. Change/save local model configuration versions and restore defaults.
6. Demo role survives refresh, a different role workspace shows a denial
   presentation, logout removes demo selection, mobile menu/keyboard navigation
   work, and the mobile document does not overflow horizontally.

## Backlog status and limitations

### Follow-up: component and User-folder refactor

At the user's request, extracted `components/layout/header.tsx` and
`components/layout/sidebar.tsx`; `app-shell.tsx` composes them and coordinates
demo state. `features/user/` contains exactly four screens with their original
descriptive filenames: `overview.tsx`, `product-list.tsx`, `evidence-panel.tsx`
and `suggestions-view.tsx`. Reusable donut, product cell/badge and suggestion
card live in `components/`, so Admin does not import User screen modules.
Updated imports, README, structure rules and existing task deliverable paths.

Verification after moving/extracting: `npm run lint` passed, `npm run build`
passed and `npm run test:e2e` passed all six Chromium tests (21.9 s), including
all eight routes and mobile drawer/keyboard/logout behavior. No new tests were
added for this refactor. Route URLs, visual styling, fixtures and existing
task completion counts are unchanged. Real integration remains unverified.

- F001/T001: the user's initialized frontend is now verified runnable.
  Local Node 25 was tested; the plan's preferred shared Node LTS baseline still
  needs a team decision and separate verification.
- F001/T002: synthetic shared shell, role layouts and responsive structure
  implemented and verified.
- F006/T001: synthetic suggestion review/accept/reject implemented and verified.
- F001/T003–T004 remain partial: role menus, failure/pending/login/logout and
  denial are present; explicit expired/unassigned fixture presentations remain.
- F002/T002 remains partial: catalog filtering/pagination/empty states work;
  asynchronous loading/error adapters remain. F005 visual draft/availability
  review and F007 wireframe/contract review are not completed by these screens.

Demo passwords are public UI fixtures, not credentials for a server account.
The selected role is stored in `sessionStorage`, never a real auth session.
Local component changes can survive client navigation in Next.js, but reset on
reload; there is no shared store, database, durable audit log or API integration.
Browser role presentation is not server authorization. No Neon, FastAPI, model,
ML test, human acceptance, cross-browser coverage or production security claim
is made. Existing ML code, data and tests were preserved.

The checkout already contains a separate Next.js scaffold in `backend/`, whereas
older planning docs place FastAPI there. This session implements only the
requested frontend. The team must reconcile model-service location before real
integration; the UI does not establish or change that boundary.
