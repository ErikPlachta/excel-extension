# TODO: Excel Extension Refactor (feat/data-driven-design)

This file tracks the concrete steps for refactoring the add-in toward a data-driven, Tailwind-styled architecture (taskpane shell, commands, helpers, middle-tier, SSO, queries) and how to verify each change.

## 1. Baseline Verification

- [x] **Run Angular dev server**
  - Command:
    - `npm ci`
    - `npm start` (or `npm run start:dev` for HTTPS)
  - Verify:
    - `http://localhost:4200/` loads without console errors.
    - Outside Excel, the UI shows a sensible "not in Excel" or equivalent state when `ExcelService.isExcel` is false (now via the SPA shell with SSO/Worksheets/Tables views).

- [x] **Validate manifest**
  - Command:
    - `npm run validate:dev-manifest`
  - Verify:
    - No schema errors.
    - Only expected HTTPS/localhost warnings, if any.

- [x] **Sideload in Excel**
  - Steps:
    - Start dev server.
    - Upload `dev-manifest.xml` into Excel (Insert → My Add-ins → Upload).
  - Verify:
    - Taskpane opens and loads the Angular SPA shell.
    - SSO homepage shows on load and navigation buttons switch views without changing the URL.
    - No runtime errors reported by Excel or in the browser dev tools.

## 2. Taskpane Architecture Alignment

- [x] **Clarify/decide folder layout for taskpane**
  - Decision:
    - Keep Angular code in `src/app` and treat it as the taskpane module for now.
    - Revisit a physical rename to `src/taskpane` only after helpers/middle-tier/SSO wiring is stable.
  - Verify:
    - `npm start` and tests continue to run with the current layout.

- [x] **Ensure Angular bootstrap matches template expectations**
  - Goal:
    - `src/main.ts` bootstraps Angular first and uses safe Office/host checks (no hard dependency on `Office.onReady`), so it works both inside and outside Excel.
  - Verify:
    - When run inside Excel, initialization path is correct (no Office.js timing errors) thanks to guarded Office access.
    - When run outside Excel, initialization does not crash and `ExcelService.isExcel` can safely be false.

## 3. Commands Surface

- [x] **Scaffold `src/commands`**
  - Implemented:
    - `src/commands/commands.html` that loads Office.js and `commands.js` and renders a simple body message.
    - `src/commands/commands.ts` with a minimal `onShowTaskpane` handler wired via `Office.actions.associate("showTaskpane", onShowTaskpane)`.
  - Verify:
    - `npm start` continues to work.
    - `npm test -- --watch=false --browsers=ChromeHeadless` passes.

- [x] **Wire `Commands.Url` in manifests**
  - Update `dev-manifest.xml` (and later `prod-manifest.xml`):
    - Set `Commands.Url` to the correct URL (e.g., `https://localhost:4200/commands.html`).
    - Ensure `<ExtensionPoint xsi:type="PrimaryCommandSurface">` references the right resources.
  - Verify:
    - `npm run validate:dev-manifest` passes.
    - In Excel, the commands appear in the ribbon and invoking them triggers the handlers in `commands.ts` (check via console log or a simple alert for now).
    - Unit tests for `onShowTaskpane` continue to pass.

## 4. Helpers & Middle-tier (SSO Scaffolding)

- [x] **Create `src/helpers` based on SSO template (mocked)**
  - Implemented:
    - `src/helpers/sso-helper.ts` exposing `getSsoAuthResult`, `getAccessToken`, and `getUserProfile` over the existing `sso-mock`.
  - Behavior:
    - Returns deterministic fake user + token to simulate SSO.
    - Used by `SsoHomeComponent` so the UI is decoupled from the mock details.
  - Verify:
    - Helpers compile and are covered by `sso-helper.spec.ts`.
    - `npm test -- --watch=false --browsers=ChromeHeadless` passes.

- [x] **Create `src/middle-tier` (placeholder)**
  - Implemented:
    - `src/middle-tier/app.ts` with stubbed `fetchTokenFromMiddleTier` and `getUserProfileFromGraph` functions.
    - `app.spec.ts` to verify the stubs return deterministic mock data.
  - Behavior:
    - Middle-tier helpers are wired into `sso-helper.ts` so the call pattern mirrors a real backend (token → Graph profile) while still using mocks.
  - Verify:
    - Builds and tests succeed.
    - No real network calls; safe to run in browser/Excel.

## 5. SSO-first Taskpane Experience (Mocked)

- [x] **Add SSO-focused SPA shell**
  - `SsoHomeComponent` shows mocked SSO user info with sign-in/sign-out.
  - `AppComponent` acts as a simple SPA shell with internal state (`currentView`) that switches between SSO, Worksheets, and Tables without changing the route.
  - Verify:
    - In Excel Online and desktop, opening the taskpane shows the SSO-like homepage (with fake user data).
    - The SPA navigation buttons switch views via internal state only; the URL never changes.

- [x] **Wire mocked SSO into helpers**
  - Behavior:
    - For local dev, `getAccessToken`/equivalent returns a static or deterministic fake token.
    - Expose fake user profile data to the Angular taskpane.
  - Verify:
    - Taskpane can render the mock SSO user with no network dependency.
    - There is a clear TODO comment or mechanism indicating where real SSO will plug in later.

## 6. Manifest Wiring & Resources Clean-up

- [x] **Align `Taskpane.Url` with Angular entry**
  - Current state:
    - `dev-manifest.xml` uses `Taskpane.Url` pointing at `https://localhost:4200/`, which maps to Angular's `index.html` and works for sideloading.
  - Verify:
    - Sideloading in Excel opens the Angular SPA correctly and refresh does not break the state-based routing.
  - Future option (no action taken yet):
    - If we ever introduce a dedicated `taskpane.html`, update `Taskpane.Url` accordingly and re-run manifest validation.

- [x] **Review `<Resources>` and icons**
  - Current state:
    - `<bt:Images>` and `<bt:Urls>` in `dev-manifest.xml` reference existing icon assets under `assets/icon-*.png` and the already-wired `Taskpane.Url` and `Commands.Url`.
  - Verify:
    - `npm run validate:dev-manifest` passes (confirmed).
    - Icons appear properly in the ribbon/taskpane when sideloaded.

## 8. Documentation Updates

- [x] **Update CONTEXT-SESSION.md**
  - Current state:
    - Documents the SPA shell, Excel integration via `ExcelService.isExcel`, SSO/middle-tier mocks, query-domain concept, and dev/test/sideload flows.
  - Ongoing action:
    - Keep this file as the live source of truth as new features (query domain, roles) are implemented.

- [x] **Update README.md**
  - Implemented:
    - Added an Architecture section describing `src/app`, `src/commands`, `src/helpers`, `src/middle-tier`, and the manifests.
    - Clarified dev commands, testing (`npm test -- --watch=false --browsers=ChromeHeadless`), and linting (`npm run lint`, `npm run lint:office`, `npm run prettier`).
    - Added a "Excel integration and sideloading" section aligned with `CONTEXT-SESSION.md` (dev-certs, HTTPS dev server, sideload steps, manifest validation).
  - Verify:
    - A new contributor can follow README to run the dev server, sideload into Excel, and understand the high-level architecture.

## 9. Query Domain & Role-aware Features (completed on previous branch)

- [x] **Introduce AuthService and role-aware nav**
  - `AuthService` centralizes auth state (user, `isAuthenticated`, `roles`) using `getSsoAuthResult` from `sso-helper`.
  - Mock SSO helpers include roles on the user profile; these flow into `AuthService` and SSO UI.
  - `AppComponent` uses `AuthService` so that worksheets/tables views and nav buttons are only available when authenticated.

- [x] **Review Homepage Signin/sign-out button state awareness**
  - SSO homepage now derives all display state (signed-in flag, user name/email, token snippet) directly from `AuthService` getters.
  - Nav buttons in `AppComponent` already react to `auth.isAuthenticated`, so sign-in/sign-out state is consistently reflected across the shell and homepage.

- [x] **Add user page component**
  - `UserComponent` shows the current user profile (name, email, roles) from `AuthService`.
  - It is wired into the SPA shell as a `currentView` option with a nav button that appears only when authenticated.

- [x] **Define core query domain model**
  - Introduced `QueryParameter`, `QueryDefinition`, `QueryRunLocation`, and `QueryRun` types in `shared/query-model.ts`.
  - Captures query id/name/description, parameter definitions, default sheet/table naming, and last-run metadata including Excel location when applicable.

- [x] **Implement mock query API service**
  - Added `QueryApiMockService` in `shared/query-api-mock.service.ts` providing `getQueries`, `getQueryById`, and `executeQuery(queryId, params)`.
  - Uses a fixed list of `QueryDefinition`s plus deterministic row builders for sales summary, top customers, and inventory status, all in-process with no real HTTP.

- [x] **Add QueryStateService for parameters and runs**
  - Added `QueryStateService` in `shared/query-state.service.ts` using a `BehaviorSubject` to hold queries, last-used params, and last-run info.
  - Exposes helpers like `getQueries()`, `getLastParams(queryId)`, `setLastParams(queryId, params)`, `getLastRun(queryId)`, and `setLastRun(queryId, runInfo)`.

- [x] **Extend ExcelService for query tables**
  - Added `upsertQueryTable` to `ExcelService` to create or update tables for query results, using default or hinted sheet/table names and returning a `QueryRunLocation`.
  - Guarded by `isExcel` so it cleanly no-ops with `null` when not running inside Excel.

- [x] **Build query UI components**
  - Added a minimal `QueryHomeComponent` that lists mock queries and provides a "Run" action per query, wiring `QueryApiMockService`, `QueryStateService`, and `ExcelService.upsertQueryTable`.
  - Integrated it into the SPA shell with a `Queries` nav entry, visible only when authenticated; deeper global-parameters and full query-management UIs can be layered on top later.

- [x] **Wire navigation to Excel artifacts**
  - Added `activateQueryLocation` to `ExcelService` to activate the worksheet and select the table for a given `QueryRunLocation`, guarded by `isExcel`.
  - Query UI now exposes a "Go to table" action per query that uses the last recorded run location from `QueryStateService` and navigates there when available.

- [x] **Apply roles to features**
  - Added `hasRole`/`hasAnyRole` helpers to `AuthService` and used them to gate the Queries nav/view to `analyst`/`admin` roles.
  - Query execution in `QueryHomeComponent` now requires `analyst`/`admin`, and navigation to results requires authentication, ensuring feature access respects roles.

- [x] **Add role-specific sign-in buttons**
  - Updated `AuthService` with `signInAsAnalyst` and `signInAsAdmin` helpers that augment the mock SSO user roles.
  - Replaced the single "Sign in (mock)" button in `AppComponent` with separate "Sign in as analyst" and "Sign in as admin" buttons so it is easy to test role-gated behavior.

- [x] **Refine per-role visibility for components**
  - Clarified role capabilities on the user page by surfacing admin vs analyst messages in `UserComponent` using `AuthService` role helpers.
  - Piped `AuthService` into the SSO home to show a role-specific summary line, making the homescreen clearly reflect the active role.
  - Added unit tests around `QueryHomeComponent` to verify that users without analyst/admin roles cannot run queries, while analysts can.

- [x] **Require auth for all query features at shell level**
  - The Queries nav button and content in `AppComponent` are already gated behind `auth.isAuthenticated && auth.hasAnyRole(['analyst', 'admin'])`, so unauthenticated users cannot reach any query UI.
  - `QueryHomeComponent` also enforces authentication and roles at the method level (e.g., `runQuery`, `goToLastRun`), ensuring that even if shell navigation were bypassed, query operations still require auth.

- [x] **Persist auth session between reloads**
  - Implemented simple `localStorage` persistence in `AuthService`, hydrating the initial auth state from storage on service construction and writing back on state changes.
  - This keeps the mock sign-in (including roles) across page reloads during local development, while remaining compatible with future real SSO token caching strategies.

- [x] **Introduce mock admin-only queries and cleanup messaging**
  - Added a mock `user-audit` query in `QueryApiMockService` that is marked with `allowedRoles: ['admin']` and produces a simple user/role audit table.
  - Extended the query model with an optional `allowedRoles` field and updated `QueryHomeComponent` to compute `canRun` per query, disabling the Run button and tightening permission checks for admin-only queries.
  - Updated the query list UI to show an "Admin only" badge next to admin-only queries and clarified role capabilities on the user profile and SSO home so the UX better communicates analyst vs admin responsibilities.

- [x] **Separate analyst vs admin mock roles**
  - Updated the mock SSO user in `sso-mock.ts` so it has no roles by default, letting the app assign roles explicitly.
  - Adjusted `AuthService.signInAsAnalyst` and `signInAsAdmin` so that analyst sign-in produces `['analyst']` and admin sign-in produces `['admin']`, keeping role-based behavior distinct in local testing.

- [x] **Disable query actions when not in Excel**
  - Updated `QueryHomeComponent` to short-circuit `runQuery`/`goToLastRun` with clear messages when `ExcelService.isExcel` is false.
  - Disabled the "Run" and "Go to table" buttons in the query UI whenever `excel.isExcel` is false so query actions are only available inside Excel.

- [x] **Add user/role banner under navigation**
  - Added a simple banner directly under the main navigation in `AppComponent` that shows the current user's display name along with their roles via `AuthService`.
  - The banner is only rendered when authenticated and uses subtle styling in `app.component.css` to stay consistent with the existing shell layout.

- [x] **Add host/status banner for Excel/online state**
  - Added a status banner under the user banner in `AppComponent` that surfaces `ExcelService.isExcel` and a simple `isOnline` indicator from `navigator.onLine`.
  - The banner appears only when Excel is not detected or the app is offline, and provides friendly guidance about enabling Excel features or restoring connectivity.

## 10. Data-driven Shell, Nav, and Roles (this branch)

- [x] **Introduce central AppConfig model for nav and roles**
  - Defined a typed `AppConfig` (nav items, views, required roles, feature flags) under `src/app/shared/app-config.ts`, including `NavItemConfig`, `RoleDefinition`, and `ViewId`/`RoleId` types so navigation structure and capabilities are described in data rather than hard-coded in components.
  - `AppComponent` now imports `DEFAULT_APP_CONFIG`/`ViewId` and uses the config's `defaultViewId` for its initial `currentView`, while still behaving the same in the UI.

- [x] **Add text/message catalog for core UI copy**
  - Created an `APP_TEXT` object in `src/app/shared/app-text.ts` for nav labels, auth buttons, user-banner fallback text, and host/status messages.
  - Refactored `AppComponent` to expose `text = APP_TEXT` and updated `app.component.html` to use catalog entries instead of hard-coded strings, while preserving existing UX.

- [x] **Refactor AppComponent nav to be data-driven**
  - Replaced the hard-coded nav buttons in `app.component.html` with a loop over `AppConfig.navItems`, using helper methods and `AuthService` role checks to control visibility and access.
  - Replaced view-specific methods (`showSso`, `showTables`, etc.) with a generic `selectView(viewId)` method keyed by nav config, keeping behavior consistent for each view.
  - Verified that nav behavior and role gating match the previous implementation for unauthenticated users, analysts, and admins.

- [x] **Refactor Class and ID Definitions to be fully data-driven**
  - Extended `AppConfig` to include DOM ids and root-level class names for key shell elements (nav, status text, user banner, host-status banner) and per-nav-item ids.
  - Updated `app.component.html` to bind classes and ids from `appConfig.rootIdsAndClasses` and `NavItemConfig.domId` instead of hard-coding them in the template, preserving existing styling and structure.

- [ ] **Introduce shared UI primitives (buttons, banners, tables, lists, sections, cards, dropdowns, icons)**
  - Create a shared UI library under `src/app/shared/ui/` with standalone components for core primitives such as `ButtonComponent`, `StatusBannerComponent`, `TableComponent`, `ListComponent`, `SectionComponent`, `CardComponent`, `DropdownComponent`, and an `IconComponent` or icon registry.
  - Ensure each primitive is driven by typed inputs (e.g., strongly-typed row/column configs for tables, item models for lists/dropdowns, layout variants for sections/cards) so view code passes declarative configs instead of hand-written markup.
  - Move layout/appearance concerns from feature/core CSS files into these shared components, using Tailwind utility classes once configured (or Tailwind-ready class names as a bridge), so styling is consistent and centrally managed.
  - Update existing views (nav, host/status banner, query list, worksheets/tables views, user page) to use the new primitives incrementally, verifying behavior and accessibility remain correct after each migration.

- [ ] **Wire host/auth context into shared components**
  - Refactor the host/status banner to receive its state (Excel detected, online/offline) and text from `AppConfig`/`APP_TEXT` and `ExcelService`, rather than embedding logic in the template.
  - Consider adding an `AppContextService` that exposes derived state (e.g., current view, host status, auth snapshot) to simplify bindings.
  - Verify that banners still respond correctly when Excel is not detected and when offline.

- [ ] **Document the data-driven design in CONTEXT-SESSION.md**
  - Update `CONTEXT-SESSION.md` to describe the new `AppConfig`, text catalog, and shared UI components as the preferred way to add/modify nav items, roles, and core copy.
  - Include a short example of adding a new nav item via configuration only.

- [ ] **Extract shared types into a central types package and enforce TSDoc**
  - Create a `src/types/` (or `src/app/types/`) folder that contains shared type definitions and interfaces used across the app, including (but not limited to) auth-related types, query domain types, app config/nav/role types, and any cross-cutting utility types.
  - Refactor existing type declarations currently embedded in feature/core/shared files (e.g., `AuthState`, `QueryDefinition`, `QueryRun`, `NavItemConfig`, `RoleDefinition`, `ViewId`, `RoleId`) to import from this central types folder, minimizing duplication and clarifying ownership of domain models.
  - Introduce barrel files (e.g., `src/types/index.ts` or domain-specific `index.ts` files) to make imports concise and consistent, supporting a highly typed and data-driven design without deep relative import chains.
  - Add TSDoc comments (`/** ... */`) to all exported types and interfaces under `src` (starting with the new types folder and core/shared services), documenting intent, usage, and important invariants for each model.
  - Configure and enforce a TSDoc-aware lint rule (via ESLint or a dedicated TSDoc plugin) so that missing or malformed documentation for exported symbols is surfaced during `npm run lint`, keeping type documentation up to date as the design evolves.

## 11. Improve Excel Functionality

- [ ] **Add component for logging execution/usage into a worksheet table**
  - Create a shared logging component/service pair that can append log entries (e.g., query runs, navigation events, errors) into an Excel worksheet table for in-workbook debugging.
  - Integrate it with `ExcelService` so that, when `isExcel` is true, logs are written to a configurable sheet/table (with sensible defaults) and can be filtered/cleared from the UI.
  - Verify that logging is no-op outside Excel, and that logs persist within the workbook session for troubleshooting.

- [ ] **Harden query rerun behavior and table data management**
  - Fix the `rowCount` error by ensuring all table-related properties are properly `load`-ed and `context.sync()` is called before reading them in `ExcelService.upsertQueryTable` and any rerun-related helpers.
  - Define a clear overwrite vs append strategy at the config level (e.g., per `QueryDefinition` flags like `writeMode: 'overwrite' | 'append' | 'append-or-overwrite'`) and implement it inside `ExcelService` so reruns behave predictably.
  - Introduce optional key column metadata on `QueryDefinition` (e.g., `primaryKeyColumns: string[]`) to enable smarter upserts (update vs insert) instead of always deleting/rewriting the table when needed.
  - Surface simple, scalable user options for rerun behavior in the query UI (e.g., “Overwrite existing table”, “Append rows”, “Clear before write”) with sensible defaults driven by configuration.
  - Ensure the logging component captures rerun decisions and outcomes (rows written, mode used, any conflicts) for later troubleshooting.

- [ ] **Implement robust query parameter management (global + per-query)**
  - Extend the query domain model to distinguish between global parameters (applied to multiple queries/reports) and query-specific parameters (e.g., date ranges, regions, customer segments) with clear typing and defaults.
  - Add a parameter management UI that lets users define, edit, and reset global and per-query parameter sets, with validation and descriptions sourced from the query metadata.
  - Support “Refresh All” and “Refresh Selected” patterns in the query UI, allowing users to rerun multiple queries with a shared/global parameter context or per-query overrides.
  - Ensure parameter choices are persisted (e.g., via `QueryStateService` and `localStorage`) so that a user’s preferred filters survive reloads and are visible in the UI before refresh.
  - Wire parameter changes into the logging and host-status UX so users can see which parameter set was used for each run and be warned when parameters are missing or invalid.

- [ ] **Support saving and loading named query configurations**
  - Design a `QueryConfiguration` model that captures a named set of query selections, parameter values (global + per-query), and rerun behaviors (overwrite/append) so a “report configuration” can be reused.
  - Implement local storage of configurations keyed by user and workbook context, leveraging the existing auth state to keep configurations scoped to the signed-in user.
  - Add UI affordances to create, rename, “save as”, delete, and restore configurations (soft-delete), making it easy to manage multiple report presets.
  - Prepare the configuration layer for a future backend API by isolating storage concerns behind a service (e.g., `QueryConfigurationService`) with a clear interface that can later be backed by HTTP instead of local storage.
  - Ensure that loading a configuration updates the query list, parameter panels, and any Excel tables in a predictable, observable way, and that failures are logged and surfaced via the host-status/banner UX.
