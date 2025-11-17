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

- [x] **Wire host/auth context into shared components**
  - Introduced an `AppContextService` that exposes a snapshot `hostStatus` (Excel detected, online/offline) and a `getAuthSummary()` helper for derived auth state (authenticated flag, display name, roles).
  - Updated `AppComponent` to consume `AppContextService` instead of embedding host/auth logic directly, and refactored the user banner, host/status banner, and view guards to bind against `hostStatus`/`authSummary` while still using `AppConfig`/`APP_TEXT` for text.
  - Verify in Excel and the browser that banners still respond correctly when Excel is not detected and when offline, and that authenticated/role-aware behavior remains unchanged.

- [x] **Extract shared types into a central types package and enforce TSDoc**
  - Created a `src/app/types/` folder containing shared type definitions for auth state (`AuthState`), query domain (`QueryParameter`, `QueryDefinition`, `QueryRunLocation`, `QueryRun`), and app config/nav/roles (`RoleId`, `ViewId`, `NavItemConfig`, `RoleDefinition`, `AppConfig`), along with a barrel file (`src/app/types/index.ts`).
  - Refactored existing type declarations embedded in `AuthService`, `query-model`, and `app-config` to import from the central types folder and re-export type aliases where appropriate, minimizing duplication and clarifying ownership of domain models.
  - Added TSDoc comments to the new shared types to document intent and usage, and kept the structure ready for a future TSDoc-aware lint rule so missing documentation can be surfaced during `npm run lint` as the type surface grows.

- [x] **Document the data-driven design in CONTEXT-SESSION.md**
  - Updated `CONTEXT-SESSION.md` to describe the new `AppConfig`, text catalog, shared types, and `AppContextService` as the preferred way to add/modify nav items, roles, and core host/auth copy.
  - Included a short example of adding a new nav item via configuration only, highlighting how `AppConfig` and `APP_TEXT` work together.

- [x] **Onboard strict typing and TSDoc enforcement across `src/`**
  - Extend the shared types strategy so that all cross-cutting models under `src/app` either live in `src/app/types` or are explicitly documented with TSDoc where they are defined (e.g., feature-specific view models).
  - Introduce an ESLint rule set (via `@typescript-eslint` and/or additional plugins) that requires:
    - No `any` in `src/app/**` except in clearly documented, intentional escape hatches.
    - TSDoc (or JSDoc) on all exported types, interfaces, classes, and public functions in `src/app/**`.
  - Start with high-leverage areas:
    - `core/` services (`AuthService`, `ExcelService`, `AppContextService`) and shell (`AppComponent`).
    - `shared/` query domain and config (`QueryApiMockService`, `QueryStateService`, `app-config`, `app-text`).
    - `types/` package, ensuring every exported symbol has clear, actionable TSDoc.
  - Gradually tighten rules for `features/` by:
    - Adding or refining component-level input/output types and view models.
    - Documenting key components with TSDoc on inputs/outputs and important methods.
  - Update `CONTEXT-SESSION.md` to include a short "Strict typing & TSDoc" subsection that explains:
    - Where shared types live.
    - Which ESLint rules enforce typing and documentation.
    - How to add new types/components so that they pass lint and provide good IntelliSense.

## 11. Build UI Primitives Library

- [x] **Establish shared UI library structure**
  - Create `src/app/shared/ui/` with a clear folder structure per primitive (e.g., `button/`, `banner/`, `table/`, `list/`, `section/`, `card/`, `dropdown/`, `icon/`), each containing a standalone component and any related models.
  - Add a simple barrel file (e.g., `src/app/shared/ui/index.ts`) that re-exports the primitives so feature code can import from a single place.
  - Ensure all primitives follow Angular standalone patterns (no NgModule) and are easy to include in other standalone components' `imports` arrays.

- [x] **Define strongly-typed models for UI primitives**
  - Introduce UI-related types under `src/app/types/ui/` (or an equivalent folder), such as `UiButtonVariant`, `UiBannerType`, `UiTableColumnDef`, `UiListItem`, `UiCardVariant`, `UiDropdownItem`, and `UiIconName`.
  - Keep these types generic and domain-agnostic so they can be reused across features (queries, worksheets, user page) and extend the central types/TSDoc strategy.
  - Add TSDoc comments explaining how each type is intended to be used and how it maps to visual behavior.

- [x] **Implement core primitives (Button and Banner)**
  - Implement `ButtonComponent` with inputs like `label`, `variant`, `size`, `disabled`, `iconName`, and an output `clicked` event; apply Tailwind-ready classes based on variant/size.
  - Implement `StatusBannerComponent` (or `BannerComponent`) with inputs for `type` (`info`/`warning`/`error`), `title`, `message`, and `iconName`, rendering nothing when `message` is empty.
  - Wire `AppComponent` to use `ButtonComponent` for nav actions (driven by `AppConfig`/`APP_TEXT`) and `StatusBannerComponent` for the host-status banner, preserving current behavior.

- [x] **Onboard Button primitive into nav using config-driven variants**
  - Extend `NavItemConfig` (or a related config type) to optionally carry `UiButtonConfig` or direct `variant`/`size` hints, keeping types aligned with `UiButtonVariant`/`UiButtonSize`.
  - Replace raw `<button>` elements in the shell nav (`app.component.html`) with `<app-button>` usages driven entirely by `AppConfig`/`APP_TEXT` and the new button config fields.
  - Verify that role gating, focus/keyboard behavior, and labels remain unchanged while nav buttons now respect `AppConfig.ui.navButtonVariant`/`navButtonSize` defaults.

- [x] **Implement data-driven Table and List primitives**
  - Create `TableComponent` that accepts `columns: UiTableColumnDef[]` and `rows: T[]` (generic), plus optional `rowKey` and cell template hooks for specialized rendering.
  - Create `ListComponent` that accepts `items: UiListItem[]` and supports optional selection (`single`/`multi`), icons, badges, and per-item action affordances.
  - Refactor at least one existing view (e.g., query list or worksheets view) to use `TableComponent` or `ListComponent`, turning its current markup into a config-driven table/list.

- [x] **Onboard Table/List primitives into an existing feature**
  - Choose a candidate view (for example, the query list or worksheets view) and design a minimal `UiTableColumnDef[]`/`UiListItem[]` configuration that reflects its current columns/items.
  - Replace the view’s hand-written table/list markup with the new `TableComponent` or `ListComponent`, binding all data and labels from existing view models and `APP_TEXT`.
  - Confirm that sorting/selection (if present), empty states, and role/Excel guards behave exactly as before, with the layout now driven by the shared primitives.

- [x] **Implement Section and Card primitives**
  - Implement `SectionComponent` that provides a titled, optionally collapsible container with `<ng-content>` for body content and variants for density/spacing.
  - Implement `CardComponent` that provides a flexible surface for presenting a query, user, or worksheet summary, with inputs for `title`, `subtitle`, `iconName`, and `variant`.
  - Use `SectionComponent`/`CardComponent` to restructure portions of the SSO home, user page, and query list into consistent, reusable layouts.

- [x] **Onboard Section/Card primitives into core pages**
  - Identify 1–2 high-traffic pages (such as SSO home and the user page) and sketch how their existing content maps into `SectionComponent`/`CardComponent` without changing copy.
  - Replace ad-hoc containers in those pages with the new primitives, ensuring titles, subtitles, and body content are still sourced from `APP_TEXT` and existing view models.
  - Verify that spacing, responsiveness, and role-dependent visibility are preserved or improved, and adjust `AppConfig` layout hints if needed.

- [x] **Implement Dropdown and Icon primitives**
  - Implement `DropdownComponent` that accepts `items: UiDropdownItem[]`, `value`, `placeholder`, and emits `valueChange` when selections change; ensure keyboard accessibility and clear focus styles.
  - Implement `IconComponent` that maps `UiIconName` values to SVGs or CSS classes via a small registry, so icons used by buttons, banners, cards, and lists remain consistent.
  - Replace ad-hoc icons (or future icons) in features with `IconComponent` usages, driven by config/text where appropriate.

- [x] **Onboard Dropdown/Icon primitives into query and shell flows**
  - Introduce `DropdownComponent` into a targeted area such as query parameter selection or role-specific filters, wiring its `items` and `value` to existing view models and `APP_TEXT` labels.
  - Replace any inline or hard-coded icons in the shell (nav, banners, cards) and feature views with `IconComponent`, using `UiIconName` and configuration/text to drive icon choice.
  - Confirm that keyboard navigation, screen-reader labels, and visual affordances meet accessibility expectations after the swap.

- [x] **Integrate primitives into existing views incrementally**
  - [x] Migrate the host-status banner in `AppComponent` to use `StatusBannerComponent` (and `IconComponent` as needed) while keeping text from `APP_TEXT` and visibility from `AppContextService`/`AppConfig`.
  - [x] Use `SectionComponent`/`CardComponent` within the user page to lay out profile info with primitives, keeping copy/auth behavior unchanged and avoiding additional shared wrapper components.
  - [x] Expand the query list view to rely fully on `ListComponent`/`TableComponent` for query items, mapping existing query metadata into `UiListItem`/`UiTableColumnDef[]` while preserving role/Excel guards.
  - [x] Refactor worksheets and tables views to use `SectionComponent` plus `ListComponent`/`TableComponent` for Excel artifacts, maintaining existing `ExcelService.isExcel` checks and role gating.
- [x] **Make navigation behavior fully data-driven**
  - Extended `NavItemConfig` and `AppConfig` to describe nav behavior via an `actionType` (e.g., `select-view`, `sign-in-analyst`, `sign-in-admin`, `sign-out`) instead of hard-coding click handlers in `AppComponent`.
  - Added config entries in `DEFAULT_APP_CONFIG.navItems` for the sign-in/sign-out buttons, including their variants/sizes, so all nav buttons (view selection and auth) are created from config.
  - Implemented a `handleNavClick(item: NavItemConfig)` dispatcher in `AppComponent` that interprets `actionType` and calls `selectView`, `signInAnalyst`, `signInAdmin`, or `signOut` accordingly.
  - Refined visibility rules so sign-in buttons only appear when logged out, sign-out only when logged in, and other items still respect `requiresAuth`/`requiredRoles`, keeping nav fully data-driven.

- [x] **Extend AppConfig with layout and class hints for primitives**
  - Add optional per-view/per-section layout hints (e.g., section density, card usage) and class hooks (e.g., `rootClass`, `extraClasses`) to `AppConfig`/UI config types so primitives can consume them without changing feature logic.
  - Keep these hints generic and variant-driven so they can later map cleanly to Tailwind or other class-driven strategies defined inside primitives, not in feature components.

- [x] **Wire layout hints into shell and primitives**
  - Bind `rootIdsAndClasses.rootClass`/`extraRootClasses` from `AppConfig` onto the main shell container in the real `AppComponent` template so shell-level classes are fully data-driven.
  - Feed `AppConfig.ui.viewLayout[viewId].sectionVariant` into `SectionComponent` (and later `CardComponent`) for core views (SSO, user, worksheets, tables, queries) so density/spacing is controlled via configuration instead of hard-coded inputs.
  - Keep the wiring thin and config-driven so future Tailwind/class-driven strategies only need to touch primitives/templates, not feature components.

- [x] **Remove or archive legacy root and tables components (core vs old app root)**
  - Identify legacy Angular root components/templates and the older `TablesComponent` under `src/app/` that predate the data-driven shell and `features/` structure.
  - Confirm they are no longer referenced by routing, bootstrap, or tests, then either delete them or move them under `_ARCHIVE/` with a brief note, to avoid confusion with the new `core/` + `features/` layout.
  - Re-run build and tests to ensure no references remain and the taskpane still boots correctly in Excel and the browser.

- [x] **Document layout/class hints and primitives wiring in CONTEXT-SESSION.md**
  - Add a short section describing the new `UiLayoutHints` and `AppConfig.ui.viewLayout` fields, including how they are intended to drive `SectionComponent`/`CardComponent` density and shell-level classes.
  - Clarify which components currently consume these hints and which are prepared for future Tailwind/class-driven styling, so contributors know where to plug in when migrating styles.
  - Ensure the documentation matches the actual wiring in `AppComponent`, primitives, and views, updating examples as needed.

- [x] **TSDDocs**
  - Add full TSDocs to all new types/interfaces in `src/app/types/ui/` and `src/app/shared/ui/` components, explaining their purpose and usage patterns.
  - Add full TSDocs to all new types/interfaces in `src/app/types/ui/` and `src/app/shared/ui/` components, explaining their purpose and usage patterns.

## 12. Improve Excel Functionality

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

## 13. Research Class Driven Styles

- [ ] **Prepare primitives for Tailwind adoption**
  - Research and define a Tailwind (or other class-driven) strategy for the UI primitives that keeps feature code using typed variants while mapping variants to class lists inside the primitives.
  - Plan how to migrate styling from existing CSS files into class-driven definitions in primitive templates with minimal disruption.
  - Identify and document any build-time changes needed (e.g., Tailwind config, purge paths) without implementing them on this branch.

- [ ] **Verify integrity of Migration Guidelines**
  - After each migration of a view to primitives or class-driven styles, verify behavior, responsiveness, and accessibility (focus order, keyboard interaction) to avoid UX regressions and adjust config/text as needed.
