# Context Session

Date: 2025-11-16  
Repository: excel-extension

## Overview

Angular 20 task-pane app for Excel using standalone components and Office.js. Excel integration is wrapped by `ExcelService` with an `isExcel` guard, and shared workbook state is exposed via a higher-level `WorkbookService`. The app is organized into three main areas:

- `core/` for the root shell, auth/Excel/workbook services, and bootstrap config.
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

When updating planning/checklist docs (like `TODO.md` or this file), treat explicitly mentioned scopes (for example, a whole section) as all-inclusive and prefer a single consistent pass over that scope instead of piecemeal edits. Every discrete actionable bullet should be a checkbox with an accurate `[x]`/`[ ]` state.

## Current State Snapshot

- **Dev server:** `npm start` → `ng serve` at <http://localhost:4200/>.
- **HTTPS dev (optional):**
  - `npm run dev-certs` (calls `scripts/install-dev-certs.mjs` using `office-addin-dev-certs`).
  - `npm run start:dev` → `ng serve --configuration development --ssl true --ssl-cert ~/.office-addin-dev-certs/localhost.crt --ssl-key ~/.office-addin-dev-certs/localhost.key`.
- **Excel integration:** `ExcelService.isExcel` guards Office JS calls so the app can run outside Excel safely. A higher-level `WorkbookService` provides strongly-typed, shared access to workbook artifacts (tabs/sheets and tables) so all features interact with the workbook through a consistent abstraction. The SPA shell (`AppComponent`) is a state-based container that:
  - Always loads `SsoHomeComponent` first.
  - Uses an internal `currentView` flag to switch between SSO, Worksheets, Tables, User, and Queries views without changing the URL.
  - Delegates Excel work (listing worksheets, listing tables, creating/navigating query tables) to `ExcelService` and `WorkbookService` instead of making ad hoc Office.js calls.
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

As we evolve the app, a key principle is that **new or modified code ships with TSDoc and tests together**. For any feature work on this branch:

- Public services, components, and exported types/interfaces should have complete TSDoc at the time they are introduced or materially changed.
- Behavior changes should be accompanied by or reflected in unit tests (service specs, component specs) so regressions are caught early.
- ESLint’s TSDoc rules and the existing Karma/Jasmine suite are the enforcement backbone; if you touch a file, expect to touch its docs/tests too.

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

### Known test issue on this branch

- On branch `feat/improve-excel-functionality`, `npm test -- --watch=false --browsers=ChromeHeadless` currently fails due to a pre-existing SSO spec import problem:
  - `src/app/features/sso/sso-home.component.spec.ts` imports `../helpers/sso-mock`, which no longer exists now that SSO helpers were refactored into `src/helpers/sso-helper.ts` and related mocks.
- This failure is **not** related to the workbook ownership work; tests for ownership-related services/components are blocked by this unresolved SSO spec error.
- Resolution is intentionally deferred to a separate task/branch so the ownership-focused work here stays scoped; once addressed, the full test suite should pass again without changes to the ownership model.

## High-Level App Design

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
  - Admin-only queries (such as `user-audit` and the JSON:API-inspired `jsonapi-example`) are available to illustrate role-gated behavior.

- **Excel integration for queries and tables:**
  - `ExcelService` creates/updates tables and sheets for a given query run via `upsertQueryTable` and returns a `QueryRunLocation`.
  - `WorkbookService` exposes shared, strongly-typed helpers for:
    - Getting workbook tabs/sheets (e.g., `getSheets()` / future `getTab(name)` helpers).
    - Getting workbook tables (e.g., `getTables()` and `getTableByName(name)`), used by the Tables view and the query Go-to-table behavior.
  - Default sheet/table names come from query metadata, with hooks for user overrides.
  - `activateQueryLocation` navigates to the worksheet/table from the query UI.
  - Query and table actions are guarded by `ExcelService.isExcel` so they are disabled and show friendly messaging outside Excel.
  - Telemetry for Excel operations (such as `upsertQueryTable`) flows through `ExcelTelemetryService`, which normalizes successes and failures into a typed `ExcelOperationResult`/`ExcelErrorInfo` and logs them to the console for debugging.
  - A `SettingsService` manages persisted app-wide settings (currently under `AppSettings.telemetry`), including a `enableWorkbookLogging` flag that controls whether telemetry entries are also written into a dedicated `_Extension_Log` worksheet via `ExcelService.appendLogEntry` when running inside Excel.
  - The `SettingsComponent` (reachable via a new "Settings" nav item) exposes a simple checkbox labeled "Enable in-workbook telemetry log table" that toggles this behavior, letting developers opt into an in-workbook audit trail of Excel operations without affecting default behavior.

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

### Layout/class hints and UI primitives wiring

- **UiLayoutHints:**
  - `src/app/types/ui/primitives.types.ts` defines `UiLayoutHints`, a small configuration type used to describe layout and density hints for UI primitives.
  - Fields include optional `rootClass`, `extraClasses`, `sectionVariant` (e.g., `"default" | "dense"`), and `cardVariant`.
  - These hints are intentionally generic and variant-driven so they can later map cleanly to Tailwind (or other class-driven strategies) inside primitives rather than in feature components.

- **AppConfig.viewLayout:**
  - `src/app/types/app-config.types.ts` extends `AppConfig.ui` with an optional `viewLayout?: Partial<Record<ViewId, UiLayoutHints>>`.
  - The default configuration in `src/app/shared/app-config.default.ts` sets sensible per-view `sectionVariant` values, for example:
    - `sso`, `user`, `queries` → `sectionVariant: "default"`.
    - `worksheets`, `tables` → `sectionVariant: "dense"` to tighten spacing for grid-heavy views.
  - Feature code does **not** read `viewLayout` directly; only the shell/primitives do.

- **Root shell classes:**
  - `AppConfig.rootIdsAndClasses` now includes optional `rootClass` and `extraRootClasses` fields alongside existing `navClass`, `statusClass`, `userBannerClass`, and `hostStatusClass`.
  - `src/app/shared/app-config.default.ts` sets `rootClass: "app-shell"` and an empty `extraRootClasses` string; these can be changed in one place to affect global shell styling.
  - The active shell in `src/app/core/app.component.*` binds these via a computed `rootShellClass` getter and wraps the shell in a root container div using that class string.

- **Shell → Section wiring:**
  - The core `AppComponent` (under `src/app/core`) is responsible for translating `AppConfig` layout hints into primitive inputs.
  - For each core view (SSO, user, worksheets, tables, queries), the shell chooses a `SectionComponent` and passes a `variant` computed from `appConfig.ui.viewLayout[viewId].sectionVariant` (defaulting to `"default"` when not specified).
  - This keeps Section density/spacing driven entirely from configuration, so tightening or relaxing layout is a config-only change.

- **Primitives behavior:**
  - `SectionComponent` in `src/app/shared/ui/section.component.ts` exposes a `variant: "default" | "dense"` input and derives its CSS class (`section` vs `section section-dense`) from that value.
  - `CardComponent` in `src/app/shared/ui/card.component.ts` exposes a simple `variant: "default" | "emphasis"` input and applies emphasis styling via classes.
  - As we move toward Tailwind, these primitives will own the mapping from variants to class names, keeping feature components and configuration strictly typed and style-agnostic.

- **TSDoc expectations for UI primitives:**
  - New UI-related types under `src/app/types/ui/` (button variants, banners, table column defs, list items, icons, layout hints) should carry TSDoc describing intent, expected values, and relationships to components.
  - Each primitive component under `src/app/shared/ui/` is expected to document its inputs/outputs with TSDoc or JSDoc, especially when those inputs are config-driven (e.g., `variant`, `size`, `items`, `columns`).
  - The goal is that contributors can discover how to use primitives and which config fields drive them directly from IntelliSense and TSDoc, without having to read implementation details.

### Legacy vs core shell

- The **active shell** lives in `src/app/core/app.component.*` and is the only `AppComponent` bootstrapped from `src/main.ts`.
- An older, pre-core `AppComponent` that once lived at `src/app/app.component.*` has been archived under `_ARCHIVE/legacy-root/` as a stub for historical reference.
- The top-level `src/app/app.component.ts` file is now a no-op module with a header comment pointing at the archived version and the core shell; this avoids confusion and ensures only the core shell participates in the build and tests.

### Adding a new nav item (example)

1. **Update config:**
   - Edit `DEFAULT_APP_CONFIG` in `src/app/shared/app-config.default.ts` and add a new `NavItemConfig` entry with a unique `id`, `labelKey`, `viewId`, and any role/auth requirements.
2. **Add text:**
   - Add the corresponding `labelKey` entry to `APP_TEXT.nav` in `src/app/shared/app-text.ts`.
3. \*\*Add view (if needed):
   - Implement the new view component under `src/app/features/...` and wire it into `AppComponent`’s template based on the new `ViewId`.
4. **Result:**
   - The nav updates automatically based on config and text; role gating and host/auth behavior remain consistent.

### Dev server offline / blank taskpane behavior

- When using `dev-manifest.xml`, the taskpane `SourceLocation`/`Taskpane.Url` points at `https://localhost:4200/`, which is served only while the Angular dev server (`npm start` or `npm run start:dev`) is running.
- If the dev server is **not** running when Excel tries to show the taskpane, the iframe navigation fails at the network layer and **no HTML is loaded**. In this state:
  - None of the Angular/Office code runs (`main.ts`, `ExcelService`, host banners, etc.).
  - There is no way for the add-in to render an in-pane fallback message because the page itself never loads.
- To make this behavior discoverable, we rely on manifest metadata and docs instead of an in-pane fallback:
  - `dev-manifest.xml` now:
    - Sets `<DisplayName>` to `"Excel Extension (Dev – localhost:4200)"` so the dev-only nature is obvious.
    - Uses a `Description` that explicitly mentions the need to run `npm start` or `npm run start:dev` and explains that a blank taskpane usually means the dev server is not reachable.
    - Updates `GetStarted.Title` / `GetStarted.Description` to call out the dev server requirement and to suggest starting the dev server if the taskpane is blank after clicking **Show Task Pane**.
    - Points `GetStarted.LearnMoreUrl` at the GitHub repo for deeper troubleshooting.
- Expected remediation when Excel shows a blank taskpane in dev:
  1. In the repo, run `npm start` (HTTP) or `npm run start:dev` (HTTPS dev certs) so `https://localhost:4200/` is reachable.
  2. Close and reopen the taskpane (or reload the add-in) from Excel.
  3. Confirm that the SSO home shell loads and that host/auth banners behave as documented above.

## Focused TODO Checklist (high level)

- [ ] Refine local testing docs in `README.md`:
  - Add a "Run in Excel (dev)" section that mirrors the steps above.
  - Clarify HTTP vs HTTPS dev options and when to use each.
- [ ] Add a short "Testing" section to `README.md` documenting `npm run lint`, `npm test`, and `lint:office` commands.
- [ ] Consider adding a simple e2e-style smoke test (manual or scripted) for "open task pane, run a mock query, see data in a table" to document expected behavior when `ExcelService.isExcel` is true.
- [x] Integrate UI primitives into core shell views incrementally (nav/auth now use `app-button`; other views already onboarded).
- [x] Prepare UI primitives for Tailwind adoption by centralizing variant/size/icon-to-class mappings inside components (`ButtonComponent`, `IconComponent`).
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

## Excel ownership testing

When validating the workbook ownership model and safe table management, use this matrix as the baseline:

- **Scenario A – First run creates managed table + ownership**
  - Start from a blank workbook, sideload the dev add-in, sign in, and run a query (for example the sales summary query) once.
  - Verify a new table is created with the expected default (or suffixed) name, that a `_Extension_Ownership` sheet exists, and that it contains a single data row with `sheetName`, `tableName`, `queryId`, `isManaged = "true"`, and a non-empty `lastTouchedUtc`.

- **Scenario B – Rerun uses the same managed table**
  - In the same workbook, run the same query again.
  - Verify there are no Excel/Office errors, the table name is unchanged, the data is updated according to the current semantics (today this still means header + rows are re-written/append on each run), and the ownership row for that `(sheetName, tableName, queryId)` is still present with an updated `lastTouchedUtc`.

- **Scenario C – User table name conflict is safe**
  - In a new workbook, manually create a table named with the query’s `defaultTableName` (for example `tbl_SalesSummary`) and populate a few rows.
  - Sideload the add-in, sign in, and run the matching query.
  - Verify the user table’s data is not overwritten or deleted and that the extension either creates a new, suffixed table (or otherwise safe alternative) and records only that table as managed in `_Extension_Ownership`.

- **Scenario D – Go-to-table honors ownership**
  - Use a workbook where Scenario A has been run so that ownership metadata exists.
  - Reload the taskpane, sign in, and click "Go to table" for that query before re-running it.
  - Verify Excel activates the correct worksheet and selects the managed table without `rowCount`/`load`/`values` errors.

- **Scenario E – Purge + clean rerun**
  - In a workbook with multiple extension-managed tables, use the dev-only "Reset extension-managed tables" entry point wired to `ExcelService.purgeExtensionManagedContent`.
  - Verify all extension-managed tables and any now-empty sheets are removed, `_Extension_Ownership` is deleted, user tables remain intact, and that running a query again recreates tables and ownership rows on a clean slate.
