# Context Session

Date: 2025-11-18  
Repository: excel-extension
Branch: feat/improve-excel-functionality

<!-- BEGIN:COPILOT-INSTRUCTIONS -->

## Copilot Instructions (CONTEXT-SESSION.md)

This file describes the **session/branch-level context** for the current work.

- Treat this as the high-level narrative and architecture overview for the active branch (e.g., `feat/improve-excel-functionality`). It should summarize what’s implemented, how it fits together, and what the current branch is trying to achieve.
- Do **not** track granular tasks or checklists here—that belongs in `TODO.md`. Instead, link back to sections in `TODO.md` when you need to reference specific work (for example, "see section 11"), and keep this file focused on what’s true now.
- When a TODO section under an H2 in `TODO.md` is materially implemented or refined (e.g., workbook ownership model, Excel telemetry, Office.js wrapper behavior), update this file so its descriptions match the actual code and behavior. Prefer short, accurate summaries over historical notes.
- Keep this file aligned with `TODO.md` **and** `CONTEXT-CURRENT.md`:
  - `TODO.md` = actionable tasks and subtasks.
  - `CONTEXT-SESSION.md` = branch-level context and design.
  - `CONTEXT-CURRENT.md` = current focus sandbox (a detailed zoom-in on the active TODO checklist item).
- When you change architecture, flows, or major behaviors (e.g., query execution semantics, ownership rules, telemetry strategy), update this file in a single coherent pass for the relevant section instead of sprinkling small edits.
- Do not treat this file as scratch notes. If you need per-session notes, use `CONTEXT-CURRENT.md` between its `CURRENT-FOCUS` markers.

<!-- END:COPILOT-INSTRUCTIONS -->

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

The focus of the `feat/improve-excel-functionality` branch is: **refining Excel integration, workbook ownership, and query execution behavior** while preserving the existing data-driven shell and type-safe configuration. This includes improving `ExcelService`/Office.js wrapper logic, hardening workbook ownership flows, and tightening telemetry and error handling around query runs.

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
  - Long-term app design (auth, roles, queries, middle tier, Excel/Office.js integration).

## Excel/Office.js Wrapper and Ownership Focus (feat/improve-excel-functionality)

This branch builds on the data-driven shell and workbook ownership work to refine how query results are written into Excel tables and how Office.js is used inside `ExcelService`. The current behavior is **overwrite-only** for query tables; append semantics have been explicitly removed after proving too brittle in practice.

### Goals (as implemented now)

- Ensure query reruns behave predictably in overwrite mode:
  - Header rows are written exactly once at creation and remain anchored on reruns.
  - Overwrite mode replaces table data body rows without moving headers or causing range-alignment errors.
  - Append mode is intentionally not supported in this branch; any future reintroduction will be treated as a separate feature.
- Keep all Excel interactions ownership-aware and safe for user tables by routing decisions through `WorkbookService` helpers.
- Maintain strong typing and TSDoc across `ExcelService`, workbook models, and telemetry helpers.
- Centralize success/error reporting for Excel operations via `ExcelTelemetryService` and `ExcelOperationResult`.

### Current implementation snapshot

- **Workbook ownership model**
  - Ownership metadata is stored in a dedicated hidden worksheet (e.g., `_Extension_Ownership`) with rows keyed by `sheetName`, `tableName`, and `queryId`, plus flags like `isManaged` and `lastTouchedUtc`.
  - `WorkbookService` exposes typed helpers (`WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`) and operations such as:
    - `getSheets()`, `getTables()`, `getTableByName(name)`.
    - `getOwnership()`, `isExtensionManagedTable(table)`, `getManagedTablesForQuery(queryId)`.
    - `getOrCreateManagedTableTarget(query)` to choose safe sheet/table targets for query runs.
  - Excel features (Queries view, Tables view) rely on these helpers instead of making assumptions about table names.

- **ExcelService / query table behavior**
  - `ExcelService` is the low-level Office.js wrapper responsible for:
    - Creating/updating tables for query runs via `upsertQueryTable`.
    - Navigating to query tables via `activateQueryLocation`.
    - Reading/writing workbook ownership metadata.
    - Purging extension-managed tables and ownership metadata via `purgeExtensionManagedContent` (dev-only reset path).
    - Routing successes/failures through `ExcelTelemetryService` and returning `ExcelOperationResult` values.
  - `upsertQueryTable` now behaves as follows:
    - Computes an `effectiveHeader` and `effectiveValues` from the query result rows.
    - Uses `WorkbookService`/ownership metadata to find an existing managed table for the query or create a new one on a target sheet.
    - When creating a new table, writes header + data at a fixed starting cell (typically `A1`) and records ownership.
    - When updating an existing managed table:
      - Ensures headers are shown.
      - Loads `headerRange` and `dataBodyRange` and checks header shape.
      - If the header shape differs from `effectiveHeader`, deletes the table and recreates it from scratch at the same anchor.
      - If the header shape matches, overwrites the header row values and clears all data body rows using `table.rows`, then adds new rows via `table.rows.add(effectiveValues)`.
    - The `writeMode` used internally is always `'overwrite'` in this branch; there is no append branch.
  - Query UI (`QueryHomeComponent`) has been simplified so that:
    - There is no write-mode dropdown; queries do not expose append/overwrite as a user-facing choice.
    - `runQuery` always calls `excel.upsertQueryTable` with `writeMode` effectively set to overwrite semantics.

- **Telemetry and logging**
  - `ExcelTelemetryService` normalizes Office errors and successes into structured `ExcelOperationResult` values and writes to:
    - The console (always, when `isExcel` is true).
    - An optional in-workbook telemetry table when workbook logging is enabled via Settings (`TelemetrySettings` + `SettingsComponent`).
  - `ExcelService.upsertQueryTable` uses telemetry helpers to log:
    - Operation name and query id.
    - Header length and data row count.
    - Target sheet/table and whether a new table was created vs an existing one reused.
    - Header shape match vs mismatch and the resulting geometry decision (reuse vs delete/recreate).
  - These logs are aligned with the `ExcelOperationResult` model so the query UI can surface user-friendly error messages when needed.

### Active refinement work

The "Refine and Refactor Office.js Wrapper Logic" TODO section (under **11. Refine & Improve Excel Functionality** in `TODO.md`) tracks the detailed checklist for this branch. In this branch state, the key completed work is:

- **Office.js usage review**
  - `ExcelService` methods that use `Excel.run` / `context.sync` ensure that:
    - Only required fields are loaded via `load`.
    - `context.sync()` is called before reading loaded properties.
    - `ExcelService.isExcel` is respected for all entry points and host checks are in place.

- **Geometry and header behavior in `upsertQueryTable` (overwrite-only)**
  - Header and data behavior are separated:
    - `headerRange` and `dataBodyRange` are handled explicitly when a table exists.
    - Overwrite operations manipulate data body rows via `table.rows` and keep header rows anchored.
  - Overwrite mode:
    - Creates a new managed table (header + data) when no existing table is found for a query.
    - When a managed table exists, keeps the header in place and clears/replaces only the data body rows.
    - Avoids resizing the table in ways that misalign headers, relying on `table.rows` to manage body geometry.
  - Append mode:
    - Removed for now. Any behavior referring to append/write-mode branching in older docs or code has been simplified to overwrite-only in both `ExcelService` and `QueryHomeComponent`.

- **Telemetry and observability**
  - Telemetry from `upsertQueryTable` and related helpers logs:
    - Effective header length and row counts.
    - Header shape match/mismatch and geometry decisions.
    - Any Office.js errors or range-alignment issues.
  - Logs are routed through `ExcelTelemetryService`, and tests cover host-agnostic portions of this behavior.

- **TSDoc and helper extraction**
  - `ExcelService` now has file-, class-, and method-level TSDoc documenting:
    - How it collaborates with `WorkbookService` and `ExcelTelemetryService`.
    - How ownership-aware behaviors work and when operations can safely mutate tables.
    - How callers should interpret `ExcelOperationResult` results.
  - Private helpers have been factored for computing headers/values from query rows and for recording ownership.

- **Type dependencies and Office typings**
  - Office typings are kept minimal and focused on the Office.js boundary; app code stays strongly typed while Office globals stay loosely typed at the edges.
  - Further dependency cleanup or upgrades for Office typings are tracked as follow-up work rather than part of this branch’s core scope.

### Manual validation scenarios (overwrite-only)

In addition to the "Excel ownership testing" matrix already captured below, this branch emphasizes the following scenarios (also referenced from the TODO and CONTEXT-CURRENT):

- **Header stability on overwrite**
  - Run a query to create a table; observe that a table with a single header row and data is created.
  - Rerun the same query and verify that:
    - The header row remains in the same position.
    - Data rows are replaced but not duplicated.
    - No Excel errors about invalid ranges appear.

- **Ownership-aware overwrite**
  - Start from a workbook where `_Extension_Ownership` already tracks a managed table for a query.
  - Rerun that query and confirm that:
    - The same managed table is reused (unless header shape changed, in which case a delete/recreate is logged).
    - Ownership metadata remains consistent with the active table.

- **Header shape change safety**
  - Modify a query definition so the output schema changes (e.g., add/remove/rename a column) and run it against a workbook where a previous schema exists.
  - Verify that overwrite mode:
    - Detects header mismatch.
    - Deletes and recreates the managed table instead of forcing a dangerous resize on the existing one.
    - Updates ownership metadata appropriately.

- **Purge and rerun**
  - Use the dev-only purge action wired to `ExcelService.purgeExtensionManagedContent` to clear extension-managed tables and ownership metadata.
  - Rerun queries and confirm that tables and ownership records are recreated from a clean state with no stale geometry.

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
