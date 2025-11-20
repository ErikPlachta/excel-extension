# Context Session

Date: 2025-11-19  
Repository: excel-extension
Branch: feat/add-query-config

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
- Executes mock remote-style queries (calls against API-style definitions) and writes results into tables on target sheets via `ExcelService`.
- Remembers query configurations and last runs (`QueryStateService`) for refresh/navigation.
- Creates new sheets/tables per query run, with sensible default names that users can override.

We also have:

- A validated `dev-manifest.xml` for local sideloading.
- A modern lint/test stack (ESLint 9, Angular + Office add-in tooling).
- CI for all PRs and CD to GitHub Pages from `main`.

The focus of the `feat/add-query-config` branch is: **refactoring the Queries experience into an API-centric, configuration-driven model** while preserving existing behavior through a `queries-old` safety copy. This includes clarifying API vs query terminology in the mock/data layers, cloning the current Queries feature for regression safety, and then introducing an API catalog, per-workbook selected queries, and named configurations in later phases.

Early work on this branch is concentrating on **Phase 0 and Phase 1** of the Queries refactor (see section 12 in `TODO.md`): aligning terminology and documentation, and creating a `queries-old` copy of the current Queries feature that can be exercised via an internal route without altering the primary user experience.

When updating planning/checklist docs (like `TODO.md` or this file), treat explicitly mentioned scopes (for example, a whole section) as all-inclusive and prefer a single consistent pass over that scope instead of piecemeal edits. Every discrete actionable bullet should be a checkbox with an accurate `[x]`/`[ ]` state.

### Current Queries behavior (baseline)

The current Queries view presents a **flat list of query definitions** driven by `QueryDefinition` catalog entries from `QueryApiMockService`. Each definition describes an API-style data operation (id, name, description, parameter keys, default sheet/table names, allowed roles, and UI config), and the view renders one row per definition without any per-workbook selection layer yet.

Parameter management is **data driven and split into global vs per-query** state via `QueryStateService`:

- A global parameter panel at the top of the view exposes shared keys like `StartDate`, `EndDate`, `Group`, and `SubGroup`. These values are stored in `globalParams`, persisted in `localStorage`, and can be applied across multiple queries.
- Each query row has a `Run` checkbox and an associated details panel that can override parameters on a per-query basis. These overrides live in `queryParams[query.id]` and are also persisted. Effective parameters for a run are computed per query based on the chosen mode.
- Two batch Run buttons allow running all selected queries in either **Global** or **Unique** parameter mode; both flows ultimately call the same `runSingle`/`runQuery` helper so telemetry and error handling stay consistent.

Telemetry for query execution uses the shared `TelemetryService`/`ExcelTelemetryService` pipeline:

- `QueryHomeComponent` emits app-level events (for example, batch run requested/completed, single query run, errors) through `TelemetryService`, which can log to the console and, when enabled in Settings, to an in-workbook telemetry table.
- `ExcelService.upsertQueryTable` returns a typed `ExcelOperationResult<QueryRunLocation>` instead of throwing, normalizes Excel-specific errors, and appends structured log entries when workbook logging is on.
- `QueryStateService` records successful runs as `QueryRun` entries with locations; `goToLastRun` uses this state (and workbook ownership helpers) to navigate back to the last table for a query.

This baseline—flat catalog-style Queries view, global + per-query parameter management, and centralized telemetry for execution and navigation—serves as the regression reference for the later API catalog, per-workbook selection, configuration, and queued-execution phases in section 12 of `TODO.md`.

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
  - `dev-manifest.xml` display name clearly calls out the dependency on the localhost dev server.
  - `README.md` documents the "blank taskpane" scenario and how to resolve it (start the dev server, reload the add-in).

## Application telemetry

Application telemetry is centralized in `TelemetryService` under `src/app/core/telemetry.service.ts`. It is responsible for enriching events with app context, choosing the right sinks (console vs workbook table), and normalizing Excel/Office.js errors.

- **Event model:**
  - `AppTelemetryEvent` is the base event shape (category, name, severity, message, optional `context`, `sessionId`, `correlationId`).
  - `WorkflowTelemetryEvent` and `FeatureTelemetryEvent` are typed specializations used for long-running workflows and UI/feature events. Helpers `createWorkflowEvent` and `createFeatureEvent` in `TelemetryService` construct these with sensible default categories.
  - Severity is expressed as a `TelemetrySeverity` union (e.g., `"debug" | "info" | "warn" | "error"`) and is mapped internally to both console methods and a simplified workbook `level` (`"info" | "error"`).

- **Configuration via Settings:**
  - Telemetry configuration lives on `AppSettings.telemetry` / `TelemetrySettings` (see `src/app/types` and `SettingsService`). Key knobs include:
    - `enableConsoleLogging`: turn console logging on/off without touching call sites.
    - `enableWorkbookLogging`: control whether events are also appended into an in-workbook log table.
    - `sessionStrategy`: how session ids are generated/used (currently per-load).
    - `logWorksheetName`, `logTableName`: worksheet and table names for the log surface (defaults to `_Extension_Log` / `_Extension_Log_Table`).
    - `logColumns`: column labels for timestamp, level, operation, message, sessionId, and correlationId; defaults are applied when persisted settings are missing fields.
  - `SettingsService` merges persisted values over defaults so older settings files automatically pick up new telemetry fields without migrations.

- **Sinks and behavior:**
  - **Console sink:**
    - Always host-agnostic; when `enableConsoleLogging` is true, all events go to the browser/Excel console.
    - Severity chooses the console method: `debug` → `console.debug`, `info` → `console.info`, `warn` → `console.warn`, `error` → `console.error`.
    - Events are enriched with:
      - A generated `sessionId` (per Angular runtime load, unless overridden).
      - `hostStatus` from `AppContextService` (is Excel host, online/offline snapshot).
      - `authSummary` from `AppContextService` (auth flag, display name, roles).

  - **Workbook sink (in-workbook log table):**
    - Controlled by `telemetry.enableWorkbookLogging` and guarded by host checks so it is a no-op outside Excel.
    - When enabled **and** the host is Excel (`Office.context.host === Office.HostType.Excel`), `TelemetryService` writes log rows into a configurable table on a dedicated worksheet using Office.js:
      - Worksheet: `logWorksheetName` (default `_Extension_Log`).
      - Table: `logTableName` (default `_Extension_Log_Table`).
      - Columns: labels from `logColumns` for timestamp, level, operation, message, sessionId, correlationId.
    - Behavior is best-effort:
      - If the sheet or table does not exist, it is created with a single header row at `A1:F1` and the configured column labels.
      - Each event appends one row with ISO timestamp, mapped level, operation name, message, sessionId, and correlationId.
      - Office.js failures are swallowed; the console remains the primary diagnostic surface. This avoids surfacing noisy add-in errors to end users while still keeping structured telemetry in the browser/Excel dev tools.

- **Error normalization for Excel operations:**
  - Excel/Office.js wrappers (for example, `ExcelService`) are expected to use `TelemetryService.normalizeError` to convert thrown values into a typed `ExcelOperationResult<T>` with an `ExcelErrorInfo` payload.
  - `normalizeError`:
    - Extracts a message from the thrown value (if present), falls back to a friendly fallback message.
    - Logs an `AppTelemetryEvent` with category `"excel"`, severity `"error"`, and `context.raw` containing the original error.
    - Returns `{ ok: false, error }` to the caller so components can render user-friendly error messages without re-parsing exceptions.

- **Where events are emitted today (high level):**
  - **Query execution:**
    - `ExcelService.upsertQueryTable` uses telemetry to log successes/failures for query runs (operation name, query id, sheet/table names, row counts) via `ExcelOperationResult` and error normalization.
    - When workbook logging is enabled, these operations also write into the log table so rerun decisions and failures can be inspected directly inside Excel.
  - **Workbook ownership and purge flows:**
    - Ownership-aware helpers (`WorkbookService` and purge helpers in `ExcelService`) emit telemetry around table creation, reuse, conflicts with user tables, and purge/reset operations.
  - **Settings and auth (planned/initial wiring):**
    - Settings changes that affect telemetry (e.g., toggling workbook logging) and key auth transitions (sign-in/out, role changes) are being wired to `TelemetryService` so future analysis can correlate behavior with configuration and user context.

When adding new features, prefer logging via `TelemetryService.logEvent` (or the helper builders) instead of direct `console` calls. For new event types, extend the typed event models under `src/app/types`, add TSDoc, and update this section with a short note on where those events fire. - Sets `<DisplayName>` to `"Excel Extension (Dev – localhost:4200)"` so the dev-only nature is obvious. - Uses a `Description` that explicitly mentions the need to run `npm start` or `npm run start:dev` and explains that a blank taskpane usually means the dev server is not reachable. - Updates `GetStarted.Title` / `GetStarted.Description` to call out the dev server requirement and to suggest starting the dev server if the taskpane is blank after clicking **Show Task Pane**. - Points `GetStarted.LearnMoreUrl` at the GitHub repo for deeper troubleshooting.

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

### Office.js wrapper behavior – manual Excel test scenarios

Use these scenarios in a real Excel workbook (with the dev add-in sideloaded) to validate header stability, overwrite behavior, and error handling when ranges are misaligned.

1. **Header stability – first run and overwrite rerun**
   1.1. Start Excel with a blank workbook and sideload the dev add-in using `dev-manifest.xml`.
   1.2. Ensure the Angular dev server is running and that `ExcelService.isExcel` shows as true in the host/status banner.
   1.3. As an analyst or admin, run a query that produces a modest result set (for example the sales summary query).
   1.4. Observe that a new worksheet is created (or reused) with a single Excel table that has: - Exactly one header row. - Data rows directly beneath the header.
   1.5. Without editing the table, rerun the same query.
   1.6. Confirm:
   - The header row remains in the same row and columns.
   - Existing data rows are replaced with the new rows (no duplicated header blocks).
   - Excel does **not** show any errors about invalid or overlapping ranges.

1. **Overwrite behavior with existing managed table**
1. Use a workbook where a query has already been run once and `_Extension_Ownership` contains a row for that `(sheetName, tableName, queryId)`.
1. Close and reopen Excel and the taskpane to ensure ownership state is reloaded.
1. Run the same query again from the Queries view.
1. Confirm:
   - The table name and sheet name remain the same.
   - Only the data body rows change (no extra header row appears; the header stays anchored).
   - The ownership row for that query/table is still present with an updated `lastTouchedUtc`.

1. **Header shape change – safe delete/recreate**
1. In code, temporarily modify a query definition so it adds, removes, or renames at least one column (for example, add a new "Region" column to the sales query).
1. Build and restart the dev server, then sideload or reload the add-in.
1. In Excel, open a workbook where the old version of that query has already created a managed table.
1. Run the modified query.
1. Confirm:
   - The old table is removed and a new table is created in the same header position with the updated header row.
   - There is still exactly one header row followed by data rows (no duplicated header blocks).
   - No Excel range or resize errors are shown during the operation.

1. **User table name conflict – safe alternate table**
1. In a new workbook, manually insert a table on `Sheet1` and name it using one of the query default table names (for example `tbl_SalesSummary`).
1. Populate a few rows with obvious sample data.
1. Sideload the dev add-in and run the matching query from the Queries view.
1. Confirm:
   - The manually created user table and its data are unchanged.
   - The extension creates a separate, suffixed table (for example `tbl_SalesSummary_Query_<id>` or equivalent) to hold query results.
   - `_Extension_Ownership` marks only the extension-created table as managed.

1. **Misaligned range / geometry error handling**
1. Run a query to create a managed table.
1. Manually edit the worksheet to introduce a potential geometry problem, for example:
   - Insert a blank row in the middle of the table.
   - Add unrelated values directly below or beside the table so that an automatic resize would collide.

1. Rerun the same query.
1. Observe behavior and confirm:
   - The extension either successfully overwrites the existing data body rows without colliding with unrelated content **or** fails gracefully via a user-visible error.
   - If an error occurs, the query UI shows a friendly error message (from `ExcelOperationResult`) instead of an unhandled exception, and the workbook remains in a usable state.
   - Any workbook telemetry table (if enabled) contains a log entry describing the failure and the affected table.

1. **Purge extension-managed content and rerun**
1. In a workbook where multiple queries have been run, open the Tables/Settings view that exposes the dev-only "purge extension-managed content" action wired to `ExcelService.purgeExtensionManagedContent`.
1. Trigger the purge.
1. Confirm:
   - All extension-managed tables are removed.
   - Any now-empty worksheets created solely for managed tables are removed.
   - The `_Extension_Ownership` sheet (and any workbook telemetry table, if configured to be purged) is removed.
   - User-created tables and worksheets remain intact.

1. Run one of the queries again.
1. Confirm that a fresh managed table and `_Extension_Ownership` sheet are created and that header and data behavior match Scenario 1.

### Office.js wrapper behavior (summary)

- **Overwrite-only semantics:** Query runs always use overwrite behavior. On the first run, `ExcelService.upsertQueryTable` creates a managed table and writes a single header row plus data rows. On rerun, the header remains anchored while **only the data body rows** are cleared and replaced; append mode is not exposed in the UI or code paths in this branch.
- **Ownership expectations:** All potentially destructive operations (creating, resizing, or deleting tables) are routed through `WorkbookService` and `_Extension_Ownership`. The extension only mutates tables it has explicitly marked as managed; user tables with conflicting names are left intact and new, suffixed tables are created instead.
- **Geometry safety:** Header and data ranges are treated separately. When a header-shape mismatch is detected on rerun, the extension deletes and recreates the managed table at the same anchor instead of trying to resize into misaligned ranges. Manual geometry issues (extra rows/values colliding with the table) surface as friendly, typed errors via `ExcelOperationResult` rather than raw Office.js exceptions.
- **Typed boundaries:** Office.js objects remain `any` at the integration edge, but `ExcelService` and `WorkbookService` project workbook state into strongly typed models (`WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`, `ExcelOperationResult`) that the rest of the app consumes. TSDoc on these models and services documents where the boundary lies and how to evolve it.
- **Evolution strategy:** Future changes to Excel behavior (for example, reintroducing append semantics or new table layouts) should be implemented by:
  - Extending the workbook models and `WorkbookService` helpers rather than calling Office.js directly from features.
  - Updating `ExcelService` to keep overwrite logic the default and to gate any new modes behind explicit, typed configuration.
  - Adding corresponding manual scenarios under "Office.js wrapper behavior – manual Excel test scenarios" and updating tests so geometry and ownership guarantees remain enforced.

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
