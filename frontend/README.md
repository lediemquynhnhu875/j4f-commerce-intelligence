This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses `next/font` to load Plus Jakarta Sans, matching the Sellens Stitch screens.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## DEMO 1

# Web Application

Owner: Huy. Reviewer: Như. Web backend/database owner: Mai.

Agreed stack: Next.js App Router and TypeScript for the frontend and web backend.
The Next.js application is initialized and now includes a synthetic Sellens UI
preview. UI ownership is with Huy; web backend and database ownership remain with Mai.

The MVP contains a dashboard, searchable product table, product profile,
comparable-product view, recommendations, and action tracking. Web APIs under
`/api/v1` handle application logic and use PostgreSQL on Neon for persistence.
The Next.js server calls the Python/FastAPI model service in `backend/` when
model inference is needed.

Database credentials and the model-service URL belong to server configuration.
The browser consumes the web application's API; it does not connect directly
to Neon or read processed CSV files.

See the preview commands and source map below. Real APIs, Neon and model serving
are pending. The current checkout has a separate Next.js scaffold in `backend/`;
model-service placement must be reconciled with the older
[stack decision](../docs/decisions/0001-web-database-model-stack.md) before integration.

Start with [F001 foundation](../specs/001-web-foundation/plan.md). Auth-library
routes use `/api/auth`; domain APIs use `/api/v1`. Admin provisions accounts;
each User has one explicitly assigned store. Every server boundary checks
current account state and persisted resource ownership. Mock UI and real API
integration are separate tasks in [the backlog](../docs/PROJECT_BACKLOG.md).

F001/T001 setup and T002 synthetic shell are verified. T003–T004 remain partial:
explicit expired/unassigned presentation still needs work. Mock roles never
grant server permissions. See [verification](../docs/verification/sellens-ui-preview.md).

## Sellens UI Preview

Implemented from the user's Stitch project **Sellens Decision Support Platform**,
including its Luminous Note v2.4 gradient palette. There are four pages per actor
and a shared demo login. All data and credentials are public synthetic fixtures.

Run from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. If that port is busy, Next.js prints the selected
port in the terminal. `/`, `/preview` and `/preview/login` show the demo login.
Click either demo account card to fill the form, then click **Đăng nhập**.

| Demo role | Email | Password |
| --- | --- | --- |
| Admin | `admin@sellens.demo` | `Sellens123!` |
| User / store owner | `user@sellens.demo` | `Sellens123!` |

The User is assigned to the fictional Juno Official Store preview. These strings
do not provision a database account or authenticate against a server.
Role selection persists only in browser-tab `sessionStorage`. Local edits can
survive client navigation but reset on reload. There is no durable history.

| Actor | Page | Route |
| --- | --- | --- |
| User | Store overview | `/preview/user/overview` |
| User | Product catalog | `/preview/user/products` |
| User | Product analysis | `/preview/user/analysis?product=SP-88421` |
| User | Improvement suggestions | `/preview/user/suggestions` |
| Admin | System overview | `/preview/admin/overview` |
| Admin | Store management | `/preview/admin/stores` |
| Admin | Analysis monitor | `/preview/admin/monitor` |
| Admin | Model/rule configuration | `/preview/admin/configuration` |

Working preview interactions include filtering, search, pagination, product
selection, missing-reference states, evidence-preserving acceptance/rejection,
progress updates, list/Kanban, add/suspend store fixtures, failed-job inspection,
local configuration versions, JSON exports, notifications and logout. The mobile
sidebar uses a drawer; wide tables scroll horizontally. Selecting multiple
products opens the first selected product's analysis; it does not run batch ML.

### Source map

- `src/app/(preview)/preview/`: explicit demo routes, separate from future real auth.
- `src/components/layout/header.tsx`: shared top bar, profile and menu/notification triggers.
- `src/components/layout/sidebar.tsx`: shared sidebar, role navigation, mobile drawer and logout trigger.
- `src/components/layout/app-shell.tsx`: composes header/sidebar and coordinates demo state.
- `src/components/navigation.tsx`: role menu links.
- `src/components/ui.tsx`: reusable cards, badges, icons, dialog and export helpers.
- `src/features/admin/`: four Admin screens: `overview.tsx`, `stores.tsx`, `monitor.tsx`, `configuration.tsx`.
- `src/features/user/`: four User screens: `overview.tsx`, `product-list.tsx`, `evidence-panel.tsx`, `suggestions-view.tsx`.
- `src/components/charts/donut.tsx`, `products/product-cell.tsx` and `user/suggestion-card.tsx`: reusable chart, product presentation and suggestion card.
- `src/lib/preview-fixtures.ts`: synthetic accounts, products, stores, jobs and suggestions.
- `src/lib/demo-session.ts`: client-only demo role selection.
- `src/app/globals.css`: Tailwind import, exact Stitch color tokens and responsive styles.
- `public/demo/`: six product illustrations downloaded from the Stitch references.
- `tests/preview/sellens.spec.ts`: six Chromium browser tests; `playwright.config.ts` owns its test server.

### Verification

```powershell
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Build before running the browser suite: it tests the production server on port
3100. Test reports, traces and screenshots are ignored by Git. Verified locally
with Node 25.2.1, npm 11.6.2, Next 16.4.0, React 19.3.0, TypeScript 5.9.3,
Tailwind 4.3.3 and Playwright 1.64.0. The preferred shared Node LTS baseline still
needs team review. `next/font` downloads the font at build time.

The preview does not supply real authentication, server authorization, API/Neon
connectivity or inference. Model configuration controls do not alter ML code.
See [CURRENT_STATE](../docs/CURRENT_STATE.md) for remaining work.

