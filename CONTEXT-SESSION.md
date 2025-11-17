Date: 2025-11-16  
Repository: excel-extension

## Overview

Angular 20 task-pane app for Excel using standalone components and Office.js. Excel integration is wrapped by `ExcelService` with an `isExcel` guard. The app is organized into three main areas:

- `core/` for the root shell, auth/Excel services, and bootstrap config.
- `features/` for routed/hosted UI (SSO home, home, worksheets, tables, queries, user).
- `shared/` for reusable utilities and cross-cutting concerns (query model/state, config, UI primitives).

We now have a role-aware, query-centric extension that:

- Provides role-specific app features and navigation based on auth state (`AuthService`).
- Executes mock remote-style queries and writes results into tables on target sheets via `ExcelService`.
- Remembers query configurations and last runs (`QueryStateService`) for refresh/navigation.
- Creates new sheets/tables per query run, with sensible default names that users can override.

We also have:

- A validated `dev-manifest.xml` for local sideloading.
- A modern lint/test stack (ESLint 9, Angular + Office add-in tooling).
- CI for all PRs and CD to GitHub Pages from `main`.

The focus of the `feat/data-driven-design` branch is: **evolving the shell, nav, roles, queries, and UI into a data-driven, Tailwind-styled design** where structure, labels, and capabilities are described in configuration rather than hard-coded into components.

## Current State Snapshot

- **Dev server:** `npm start` → `ng serve` at <http://localhost:4200/>.
- **HTTPS dev (optional):**
  - `npm run dev-certs` (calls `scripts/install-dev-certs.mjs` using `office-addin-dev-certs`).
  - `npm run start:dev` → `ng serve --configuration development --ssl true --ssl-cert ~/.office-addin-dev-certs/localhost.crt --ssl-key ~/.office-addin-dev-certs/localhost.key`.
- **Excel integration:** `ExcelService.isExcel` guards Office JS calls so the app can run outside Excel safely. The SPA shell (`AppComponent`) is a state-based container that:
  - Always loads `SsoHomeComponent` first.
  - Uses an internal `currentView` flag to switch between SSO, Worksheets, Tables, User, and Queries views without changing the URL.
  - Delegates Excel work (listing worksheets, listing tables, creating/navigating query tables) to `ExcelService`.
  - Shows a bottom-aligned host/status banner when Excel is not detected or offline.
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

## High-level App Design (current)

- **Auth & roles:**
  - Mocked SSO via helpers (`sso-helper.ts`) and middle-tier stubs (`src/middle-tier/app.ts`).
  - `AuthService` holds the current user, auth state, roles, and access token, with simple `localStorage` persistence.
  - When not authenticated: only SSO home and sign-in buttons are available.
  - When authenticated: sign-out appears, worksheets/tables/user/views are visible, and queries are available only for `analyst`/`admin` roles.
  - Roles control which features are visible/editable (queries, admin-only queries, messaging).

- **Query domain:**
  - Each query has a definition (`QueryDefinition` with id, name, description, parameters, default sheet/table names, optional `allowedRoles`).
  - `QueryApiMockService` simulates a remote API that returns rows for a small set of predefined queries (sales summary, top customers, inventory status, user audit).
  - `QueryStateService` tracks available queries, last-used parameters, and last-run metadata including Excel location, enabling refresh and navigation.
  - An admin-only `user-audit` query is available to illustrate role-gated queries.

- **Excel integration for queries:**
  - `ExcelService` creates/updates tables and sheets for a given query run via `upsertQueryTable` and returns a `QueryRunLocation`.
  - Default sheet/table names come from query metadata, with hooks for user overrides.
  - `activateQueryLocation` navigates to the worksheet/table from the query UI.
  - Query actions and navigation are guarded by `ExcelService.isExcel` so they are disabled and show friendly messaging outside Excel.

- **Navigation & UX:**
  - Navigation is state-based inside `AppComponent` (no route changes) to play nicely with Excel iframes.
  - Views include SSO home, Worksheets, Tables, User, and Queries.
  - A user/role banner appears under the nav when authenticated; a host/status banner is fixed to the bottom when Excel is not detected or the app is offline.
  - The `feat/data-driven-design` branch will progressively move nav, roles/capabilities, query visibility, and key copy into central configuration and text catalogs, and switch styling toward Tailwind utilities.

## Data-driven Shell & Type-safe Configuration

- **AppConfig and nav/roles:**
  - `src/app/shared/app-config.ts` exposes the `AppConfig` model and `DEFAULT_APP_CONFIG` instance that drive the shell.
  - Types like `ViewId`, `RoleId`, `NavItemConfig`, and `RoleDefinition` now live in `src/app/types/app-config.types.ts` and are barrel-exported from `src/app/types/index.ts`.
  - The SPA shell (`AppComponent`) binds its nav, root ids/classes, and default view entirely from `DEFAULT_APP_CONFIG`, so adding or changing nav items is a data change, not a template rewrite.

- **Text/message catalog:**
  - `src/app/shared/app-text.ts` defines `APP_TEXT`, a simple catalog for nav labels, auth buttons, user-banner fallback text, and host/status messages.
  - Components (starting with `AppComponent`) reference `APP_TEXT` rather than hard-coded strings, which centralizes copy and keeps host/auth banners consistent.

- **Host/auth context helper:**
  - `src/app/core/app-context.service.ts` provides an `AppContextService` that exposes a `hostStatus` snapshot (`isExcel`, `isOnline`) and a `getAuthSummary()` helper (auth flag, display name, roles).
  - The shell uses this service to drive the user banner, host/status banner, and view guards, so templates no longer compute host/auth state inline.

- **Shared types and TSDoc:**
  - Shared domain types live under `src/app/types/` (auth, queries, app config) with TSDoc comments explaining intent and key fields.
  - `AuthService`, query services, and config files import their models from this central package, reducing duplication and making it easier to evolve the data-driven design.
  - ESLint is wired with `eslint-plugin-tsdoc` (`tsdoc/syntax`) so invalid/malformed TSDoc is surfaced by `npm run lint`.

### Adding a new nav item (example)

1. **Update config:**
   - Edit `DEFAULT_APP_CONFIG` in `src/app/shared/app-config.default.ts` and add a new `NavItemConfig` entry with a unique `id`, `labelKey`, `viewId`, and any role/auth requirements.
2. **Add text:**
   - Add the corresponding `labelKey` entry to `APP_TEXT.nav` in `src/app/shared/app-text.ts`.
3. **Add view (if needed):
   - Implement the new view component under `src/app/features/...` and wire it into `AppComponent`’s template based on the new `ViewId`.
4. **Result:**
   - The nav updates automatically based on config and text; role gating and host/auth behavior remain consistent.

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
