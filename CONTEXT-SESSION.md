Date: 2025-11-16  
Repository: excel-extension

## Overview

Angular 20 task-pane app for Excel using standalone components and Office.js. Excel integration is wrapped by `ExcelService` with an `isExcel` guard. The app is organized into three main areas:

- `core/` for the root shell, auth/Excel services, and bootstrap config.
- `features/` for routed/hosted UI (SSO home, home, worksheets, tables).
- `shared/` for reusable utilities used across features.

On top of that, we now have a conceptual design for a role-aware, query-centric extension that will:

- Provide role-specific app features and navigation based on auth state.
- Execute remote-style queries and write results into tables on target sheets.
- Remember user-specific query configurations and parameters for refresh.
- Create new sheets/tables per query run, with sensible default names that users can override.

We also have:

- A validated `dev-manifest.xml` for local sideloading.
- A modern lint/test stack (ESLint 9, Angular + Office add-in tooling).
- CI for all PRs and CD to GitHub Pages from `main`.

The near-term focus is: **refining the SPA shell, SSO/middle-tier mocks, and query domain so we can plug in real auth and APIs later** while keeping Excel Online/Desktop flows stable.

## Current State Snapshot

- **Dev server:** `npm start` → `ng serve` at <http://localhost:4200/>.
- **HTTPS dev (optional):**
  - `npm run dev-certs` (calls `scripts/install-dev-certs.mjs` using `office-addin-dev-certs`).
  - `npm run start:dev` → `ng serve --configuration development --ssl true --ssl-cert ~/.office-addin-dev-certs/localhost.crt --ssl-key ~/.office-addin-dev-certs/localhost.key`.
- **Excel integration:** `ExcelService.isExcel` guards Office JS calls so the app can run outside Excel safely. The SPA shell (`AppComponent`) is currently a simple state-based container that:
  - Always loads `SsoHomeComponent` first.
  - Uses an internal `currentView` flag to switch between SSO, Worksheets, and Tables views without changing the URL.
  - Delegates Excel work (listing worksheets, listing tables, creating tables) to `ExcelService`.
- **Manifests:**
  - `dev-manifest.xml` points to localhost (Angular dev server) and is used for sideloading during development.
  - `prod-manifest.xml` points at the GitHub Pages deployment and is aligned with the Dev Kit structure.
- **Manifest validation:**
  - Dev Kit installed; `npm run validate:dev-manifest` uses `office-addin-manifest` to validate `dev-manifest.xml`.
- **Linting/formatting:**
  - ESLint 9 flat config in `eslint.config.mjs` using `@typescript-eslint` and `@angular-eslint` plus `eslint-plugin-office-addins`.
  - HTML templates linted via Angular template parser; static `public/` HTML ignored.
  - Prettier config via `.prettierrc.js` → `office-addin-prettier-config`.
- **Testing:**
  - Unit tests via Karma + Jasmine using `ChromeHeadless`.
  - Local: `npm test -- --watch=false --browsers=ChromeHeadless`.

## CI/CD Snapshot

- **CI (`.github/workflows/ci.yml`):**
  - Trigger: `pull_request` on all branches.
  - Steps: `npm ci` → `npm run lint` → `npm run build` → `npm run test -- --watch=false --browsers=ChromeHeadless`.
  - Purpose: gate all PRs with lint, build, and tests.
- **CD (`.github/workflows/deploy.yml`):**
  - Trigger: `push` to `main` (typically merging `develop` → `main`).
  - Steps: `npm ci` → lint → tests (headless) → `npm run build -- --base-href /excel-extension/` → deploy via `peaceiris/actions-gh-pages` to `gh-pages`.
  - Effect: updates GitHub Pages only after tests pass on `main`.

## Local Dev & Testing Flows

### 1. Run the Angular app (outside Excel)

```bash
npm ci
npm start        # http://localhost:4200/
```

Use this for quick UI changes and basic behavior; Excel-specific features remain guarded by `ExcelService.isExcel` and will no-op outside Excel.

### 2. Run the Angular app over HTTPS (recommended for add-in testing)

```bash
npm run dev-certs   # install/trust dev certs (one-time per machine)
npm run start:dev   # ng serve with HTTPS and dev certs
```

This serves the app at an HTTPS localhost origin, which plays nicer with Office add-in requirements.

### 3. Sideload the add-in into Excel (local testing)

1. Ensure the dev server is running (HTTP or HTTPS):
   - HTTP: `npm start` → `http://localhost:4200/`
   - HTTPS: `npm run start:dev` → `https://localhost:4200/` (certs installed via `dev-certs`).
2. Validate the manifest if desired:

   ```bash
   npm run validate:dev-manifest
   ```

3. In Excel (desktop):
   - Go to **Insert → My Add-ins → Shared Folder / Upload My Add-in**.
   - Choose `dev-manifest.xml` from the repo.
   - Excel loads the task pane pointing to the Angular dev server.
4. Interact with the extension in Excel; Office JS calls go through `ExcelService`.

### 4. Run lint and tests locally

```bash
# Lint TypeScript + templates
npm run lint

# Office add-in–specific lint/format
npm run lint:office
npm run lint:office:fix
npm run prettier

# Unit tests (headless Chrome, CI-style)
npm test -- --watch=false --browsers=ChromeHeadless
```

## High-level App Design (long-term concept)

- **Auth & roles:**
  - Mocked SSO via helpers (`sso-helper.ts`) and middle-tier stubs (`src/middle-tier/app.ts`).
  - An `AuthService` (planned) will hold the current user, auth state, and roles.
  - When not authenticated: only login/home is available in the nav.
  - When authenticated: sign-out appears in the nav, and a user page is visible for viewing the current logged-in user and their roles.
  - Roles will control which features are visible/editable (for example, only some roles can define queries).

- **Query domain:**
  - Each query has a definition (id, name, description, parameters, default sheet/table naming rules).
  - Parameters can be defined per query and saved with last-used values.
  - Executing a query hits a mock remote API, returns rows, and writes them into an Excel table on a target sheet.
  - When a new query is executed, a new sheet/tab and table are created for that query with sensible default names that users can change or keep.
  - For each query, the app remembers the user-specific configuration (parameters, sheet/table names) so a refresh can reuse or modify the last parameters.

- **Remote API (mocked):**
  - A mock data layer (planned `QueryApiMockService`) will simulate an API that takes arguments and returns results.
  - Middle-tier stubs (`fetchTokenFromMiddleTier`, `getUserProfileFromGraph`) already mirror a real backend shape for auth; the query mock will follow a similar pattern but remain in-process.

- **Excel integration for queries:**
  - `ExcelService` will be extended with helpers to create/update tables and sheets for a given query run.
  - Default sheet/table names will be generated from query metadata, with user overrides allowed.
  - A state service will track which sheet/table belongs to which query run, enabling "go to sheet/table" actions.

- **Navigation & UX:**
  - Navigation stays state-based inside `AppComponent` (no route changes) to play nicely with Excel iframes.
  - View modes will include: home summary (all tables + query metrics), global parameters + "refresh all", per-query management/definition, and a user page.
  - Navigational links will be connected to the tabs/tables managed by the extension, so users can jump directly to the related sheet/table from the UI.

## Focused TODO Checklist (high level)

- [ ] Refine local testing docs in `README.md`:
  - Add a "Run in Excel (dev)" section that mirrors the steps above.
  - Clarify HTTP vs HTTPS dev options and when to use each.
- [ ] Add a short "Testing" section to `README.md` documenting `npm run lint`, `npm test`, and `lint:office` commands.
- [ ] Consider adding a simple e2e-style smoke test (manual or scripted) for "open task pane, run a mock query, see data in a table" to document expected behavior when `ExcelService.isExcel` is true.
- [ ] Keep `CONTEXT-SESSION.md` updated as workflows or manifests change, so it remains the live source of truth for:
  - Dev server behavior
  - Sideloading flows
  - CI/CD expectations
  - Long-term app design (auth, roles, queries, middle tier).

## Reference Commands (summary)

```bash
# Install deps
npm ci

# Dev server (HTTP)
npm start        # http://localhost:4200/

# Dev server (HTTPS with Office dev certs)
npm run dev-certs   # one-time per machine
npm run start:dev   # https://localhost:4200/
```
