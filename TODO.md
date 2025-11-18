# TODO: Excel Extension Refactor (feat/data-driven-design)

This file tracks the concrete steps for refactoring the add-in toward a data-driven, Tailwind-styled architecture (taskpane shell, commands, helpers, middle-tier, SSO, queries) and how to verify each change.

Going forward, **every new feature or meaningful code change must include TSDoc and tests**:

- Public services, components, and exported types/interfaces should have TSDoc added or updated as part of the same change.
- Behavior changes should be covered by unit tests (service specs, component specs) so they fail fast in CI.
- When you pick up any item in this TODO, assume that part of “done” is: implementation + docs + tests.

## 1. Baseline Verification

- [x] **Run Angular dev server**
  - Command:
    - [x] `npm ci`
    - [x] `npm start` (or `npm run start:dev` for HTTPS)
  - Verify:
    - [x] `http://localhost:4200/` loads without console errors.
    - [x] Outside Excel, the UI shows a sensible "not in Excel" or equivalent state when `ExcelService.isExcel` is false (now via the SPA shell with SSO/Worksheets/Tables views).

- [x] **Validate manifest**
  - Command:
    - [x] `npm run validate:dev-manifest`
  - Verify:
    - [x] No schema errors.
    - [x] Only expected HTTPS/localhost warnings, if any.

- [x] **Sideload in Excel**
  - Steps:
    - [x] Start dev server.
    - [x] Upload `dev-manifest.xml` into Excel (Insert → My Add-ins → Upload).
  - Verify:
    - [x] Taskpane opens and loads the Angular SPA shell.
    - [x] SSO homepage shows on load and navigation buttons switch views without changing the URL.
    - [x] No runtime errors reported by Excel or in the browser dev tools.

## 2. Taskpane Architecture Alignment

- [x] **Clarify/decide folder layout for taskpane**
  - Decision:
    - [x] Keep Angular code in `src/app` and treat it as the taskpane module for now.
    - [ ] Revisit a physical rename to `src/taskpane` only after helpers/middle-tier/SSO wiring is stable.
  - Verify:
    - [x] `npm start` and tests continue to run with the current layout.

- [x] **Ensure Angular bootstrap matches template expectations**
  - Goal:
    - [x] `src/main.ts` bootstraps Angular first and uses safe Office/host checks (no hard dependency on `Office.onReady`), so it works both inside and outside Excel.
  - Verify:
    - [x] When run inside Excel, initialization path is correct (no Office.js timing errors) thanks to guarded Office access.
    - [x] When run outside Excel, initialization does not crash and `ExcelService.isExcel` can safely be false.

## 3. Commands Surface

- [x] **Scaffold `src/commands`**
  - Implemented:
    - [x] `src/commands/commands.html` that loads Office.js and `commands.js` and renders a simple body message.
    - [x] `src/commands/commands.ts` with a minimal `onShowTaskpane` handler wired via `Office.actions.associate("showTaskpane", onShowTaskpane)`.
  - Verify:
    - [x] `npm start` continues to work.
    - [x] `npm test -- --watch=false --browsers=ChromeHeadless` passes.

- [x] **Wire `Commands.Url` in manifests**
  - Update `dev-manifest.xml` (and later `prod-manifest.xml`):
    - [x] Set `Commands.Url` to the correct URL (e.g., `https://localhost:4200/commands.html`).
    - [x] Ensure `<ExtensionPoint xsi:type="PrimaryCommandSurface">` references the right resources.
  - Verify:
    - [x] `npm run validate:dev-manifest` passes.
    - [x] In Excel, the commands appear in the ribbon and invoking them triggers the handlers in `commands.ts` (check via console log or a simple alert for now).
    - [x] Unit tests for `onShowTaskpane` continue to pass.

## 4. Helpers & Middle-tier (SSO Scaffolding)

- [x] **Create `src/helpers` based on SSO template (mocked)**
  - Implemented:
    - [x] `src/helpers/sso-helper.ts` exposing `getSsoAuthResult`, `getAccessToken`, and `getUserProfile` over the existing `sso-mock`.
  - Behavior:
    - [x] Returns deterministic fake user + token to simulate SSO.
    - [x] Used by `SsoHomeComponent` so the UI is decoupled from the mock details.
  - Verify:
    - [x] Helpers compile and are covered by `sso-helper.spec.ts`.
    - [x] `npm test -- --watch=false --browsers=ChromeHeadless` passes.

- [x] **Create `src/middle-tier` (placeholder)**
  - Implemented:
    - [x] `src/middle-tier/app.ts` with stubbed `fetchTokenFromMiddleTier` and `getUserProfileFromGraph` functions.
    - [x] `app.spec.ts` to verify the stubs return deterministic mock data.
  - Behavior:
    - [x] Middle-tier helpers are wired into `sso-helper.ts` so the call pattern mirrors a real backend (token → Graph profile) while still using mocks.
  - Verify:
    - [x] Builds and tests succeed.
    - [x] No real network calls; safe to run in browser/Excel.

## 5. SSO-first Taskpane Experience (Mocked)

- [x] **Add SSO-focused SPA shell**
  - [x] `SsoHomeComponent` shows mocked SSO user info with sign-in/sign-out.
  - [x] `AppComponent` acts as a simple SPA shell with internal state (`currentView`) that switches between SSO, Worksheets, and Tables without changing the route.
  - Verify:
    - [x] In Excel Online and desktop, opening the taskpane shows the SSO-like homepage (with fake user data).
    - [x] The SPA navigation buttons switch views via internal state only; the URL never changes.

- [x] **Wire mocked SSO into helpers**
  - Behavior:
    - [x] For local dev, `getAccessToken`/equivalent returns a static or deterministic fake token.
    - [x] Expose fake user profile data to the Angular taskpane.
  - Verify:
    - [x] Taskpane can render the mock SSO user with no network dependency.
    - [x] There is a clear TODO comment or mechanism indicating where real SSO will plug in later.

## 6. Manifest Wiring & Resources Clean-up

- [x] **Align `Taskpane.Url` with Angular entry**
  - Current state:
    - [x] `dev-manifest.xml` uses `Taskpane.Url` pointing at `https://localhost:4200/`, which maps to Angular's `index.html` and works for sideloading.
  - Verify:
    - [x] Sideloading in Excel opens the Angular SPA correctly and refresh does not break the state-based routing.
  - Future option (no action taken yet):
    - If we ever introduce a dedicated `taskpane.html`, update `Taskpane.Url` accordingly and re-run manifest validation.

- [x] **Review `<Resources>` and icons**
  - Current state:
    - [x] `<bt:Images>` and `<bt:Urls>` in `dev-manifest.xml` reference existing icon assets under `assets/icon-*.png` and the already-wired `Taskpane.Url` and `Commands.Url`.
  - Verify:
    - [x] `npm run validate:dev-manifest` passes (confirmed).
    - [x] Icons appear properly in the ribbon/taskpane when sideloaded.

## 8. Documentation Updates

- [x] **Update CONTEXT-SESSION.md**
  - Current state:
    - [x] Documents the SPA shell, Excel integration via `ExcelService.isExcel`, SSO/middle-tier mocks, query-domain concept, and dev/test/sideload flows.
  - Ongoing action:
    - [ ] Keep this file as the live source of truth as new features (query domain, roles) are implemented.

- [x] **Update README.md**
  - Implemented:
    - [x] Added an Architecture section describing `src/app`, `src/commands`, `src/helpers`, `src/middle-tier`, and the manifests.
    - [x] Clarified dev commands, testing (`npm test -- --watch=false --browsers=ChromeHeadless`), and linting (`npm run lint`, `npm run lint:office`, `npm run prettier`).
    - [x] Added a "Excel integration and sideloading" section aligned with `CONTEXT-SESSION.md` (dev-certs, HTTPS dev server, sideload steps, manifest validation).
  - Verify:
    - [x] A new contributor can follow README to run the dev server, sideload into Excel, and understand the high-level architecture.

## 9. Query Domain & Role-aware Features (completed on previous branch)

- [x] **Introduce AuthService and role-aware nav**
  - [x] `AuthService` centralizes auth state (user, `isAuthenticated`, `roles`) using `getSsoAuthResult` from `sso-helper`.
  - [x] Mock SSO helpers include roles on the user profile; these flow into `AuthService` and SSO UI.
  - [x] `AppComponent` uses `AuthService` so that worksheets/tables views and nav buttons are only available when authenticated.

- [x] **Review Homepage Signin/sign-out button state awareness**
  - [x] SSO homepage now derives all display state (signed-in flag, user name/email, token snippet) directly from `AuthService` getters.
  - [x] Nav buttons in `AppComponent` already react to `auth.isAuthenticated`, so sign-in/sign-out state is consistently reflected across the shell and homepage.

- [x] **Add user page component**
  - [x] `UserComponent` shows the current user profile (name, email, roles) from `AuthService`.
  - [x] It is wired into the SPA shell as a `currentView` option with a nav button that appears only when authenticated.

- [x] **Define core query domain model**
  - [x] Introduced `QueryParameter`, `QueryDefinition`, `QueryRunLocation`, and `QueryRun` types in `shared/query-model.ts`.
  - [x] Captures query id/name/description, parameter definitions, default sheet/table naming, and last-run metadata including Excel location when applicable.

- [x] **Implement mock query API service**
  - [x] Added `QueryApiMockService` in `shared/query-api-mock.service.ts` providing `getQueries`, `getQueryById`, and `executeQuery(queryId, params)`.
  - [x] Uses a fixed list of `QueryDefinition`s plus deterministic row builders for sales summary, top customers, and inventory status, all in-process with no real HTTP.

- [x] **Add QueryStateService for parameters and runs**
  - [x] Added `QueryStateService` in `shared/query-state.service.ts` using a `BehaviorSubject` to hold queries, last-used params, and last-run info.
  - [x] Exposes helpers like `getQueries()`, `getLastParams(queryId)`, `setLastParams(queryId, params)`, `getLastRun(queryId)`, and `setLastRun(queryId, runInfo)`.

- [x] **Extend ExcelService for query tables**
  - [x] Added `upsertQueryTable` to `ExcelService` to create or update tables for query results, using default or hinted sheet/table names and returning a `QueryRunLocation`.
  - [x] Guarded by `isExcel` so it cleanly no-ops with `null` when not running inside Excel.

- [x] **Build query UI components**
  - [x] Added a minimal `QueryHomeComponent` that lists mock queries and provides a "Run" action per query, wiring `QueryApiMockService`, `QueryStateService`, and `ExcelService.upsertQueryTable`.
  - [x] Integrated it into the SPA shell with a `Queries` nav entry, visible only when authenticated; deeper global-parameters and full query-management UIs can be layered on top later.

- [x] **Wire navigation to Excel artifacts**
  - [x] Added `activateQueryLocation` to `ExcelService` to activate the worksheet and select the table for a given `QueryRunLocation`, guarded by `isExcel`.
  - [x] Query UI now exposes a "Go to table" action per query that uses the last recorded run location from `QueryStateService` and navigates there when available.

- [x] **Apply roles to features**
  - [x] Added `hasRole`/`hasAnyRole` helpers to `AuthService` and used them to gate the Queries nav/view to `analyst`/`admin` roles.
  - [x] Query execution in `QueryHomeComponent` now requires `analyst`/`admin`, and navigation to results requires authentication, ensuring feature access respects roles.

- [x] **Add role-specific sign-in buttons**
  - [x] Updated `AuthService` with `signInAsAnalyst` and `signInAsAdmin` helpers that augment the mock SSO user roles.
  - [x] Replaced the single "Sign in (mock)" button in `AppComponent` with separate "Sign in as analyst" and "Sign in as admin" buttons so it is easy to test role-gated behavior.

- [x] **Refine per-role visibility for components**
  - [x] Clarified role capabilities on the user page by surfacing admin vs analyst messages in `UserComponent` using `AuthService` role helpers.
  - [x] Piped `AuthService` into the SSO home to show a role-specific summary line, making the homescreen clearly reflect the active role.
  - [x] Added unit tests around `QueryHomeComponent` to verify that users without analyst/admin roles cannot run queries, while analysts can.

- [x] **Require auth for all query features at shell level**
  - [x] The Queries nav button and content in `AppComponent` are already gated behind `auth.isAuthenticated && auth.hasAnyRole(['analyst', 'admin'])`, so unauthenticated users cannot reach any query UI.
  - [x] `QueryHomeComponent` also enforces authentication and roles at the method level (e.g., `runQuery`, `goToLastRun`), ensuring that even if shell navigation were bypassed, query operations still require auth.

- [x] **Persist auth session between reloads**
  - [x] Implemented simple `localStorage` persistence in `AuthService`, hydrating the initial auth state from storage on service construction and writing back on state changes.
  - [x] This keeps the mock sign-in (including roles) across page reloads during local development, while remaining compatible with future real SSO token caching strategies.

- [x] **Introduce mock admin-only queries and cleanup messaging**
  - [x] Added a mock `user-audit` query in `QueryApiMockService` that is marked with `allowedRoles: ['admin']` and produces a simple user/role audit table.
  - [x] Extended the query model with an optional `allowedRoles` field and updated `QueryHomeComponent` to compute `canRun` per query, disabling the Run button and tightening permission checks for admin-only queries.
  - [x] Updated the query list UI to show an "Admin only" badge next to admin-only queries and clarified role capabilities on the user profile and SSO home so the UX better communicates analyst vs admin responsibilities.

- [x] **Separate analyst vs admin mock roles**
  - [x] Updated the mock SSO user in `sso-mock.ts` so it has no roles by default, letting the app assign roles explicitly.
  - [x] Adjusted `AuthService.signInAsAnalyst` and `signInAsAdmin` so that analyst sign-in produces `['analyst']` and admin sign-in produces `['admin']`, keeping role-based behavior distinct in local testing.

- [x] **Disable query actions when not in Excel**
  - [x] Updated `QueryHomeComponent` to short-circuit `runQuery`/`goToLastRun` with clear messages when `ExcelService.isExcel` is false.
  - [x] Disabled the "Run" and "Go to table" buttons in the query UI whenever `excel.isExcel` is false so query actions are only available inside Excel.

- [x] **Add user/role banner under navigation**
  - [x] Added a simple banner directly under the main navigation in `AppComponent` that shows the current user's display name along with their roles via `AuthService`.
  - [x] The banner is only rendered when authenticated and uses subtle styling in `app.component.css` to stay consistent with the existing shell layout.

- [x] **Add host/status banner for Excel/online state**
  - [x] Added a status banner under the user banner in `AppComponent` that surfaces `ExcelService.isExcel` and a simple `isOnline` indicator from `navigator.onLine`.
  - [x] The banner appears only when Excel is not detected or the app is offline, and provides friendly guidance about enabling Excel features or restoring connectivity.

## 10. Data-driven Shell, Nav, and Roles (this branch)

- [x] **Introduce central AppConfig model for nav and roles**
  - [x] Defined a typed `AppConfig` (nav items, views, required roles, feature flags) under `src/app/shared/app-config.ts`, including `NavItemConfig`, `RoleDefinition`, and `ViewId`/`RoleId` types so navigation structure and capabilities are described in data rather than hard-coded in components.
  - [x] `AppComponent` now imports `DEFAULT_APP_CONFIG`/`ViewId` and uses the config's `defaultViewId` for its initial `currentView`, while still behaving the same in the UI.

- [x] **Add text/message catalog for core UI copy**
  - [x] Created an `APP_TEXT` object in `src/app/shared/app-text.ts` for nav labels, auth buttons, user-banner fallback text, and host/status messages.
  - [x] Refactored `AppComponent` to expose `text = APP_TEXT` and updated `app.component.html` to use catalog entries instead of hard-coded strings, while preserving existing UX.

- [x] **Refactor AppComponent nav to be data-driven**
  - [x] Replaced the hard-coded nav buttons in `app.component.html` with a loop over `AppConfig.navItems`, using helper methods and `AuthService` role checks to control visibility and access.
  - [x] Replaced view-specific methods (`showSso`, `showTables`, etc.) with a generic `selectView(viewId)` method keyed by nav config, keeping behavior consistent for each view.
  - [x] Verified that nav behavior and role gating match the previous implementation for unauthenticated users, analysts, and admins.

- [x] **Refactor Class and ID Definitions to be fully data-driven**
  - [x] Extended `AppConfig` to include DOM ids and root-level class names for key shell elements (nav, status text, user banner, host-status banner) and per-nav-item ids.
  - [x] Updated `app.component.html` to bind classes and ids from `appConfig.rootIdsAndClasses` and `NavItemConfig.domId` instead of hard-coding them in the template, preserving existing styling and structure.

- [x] **Wire host/auth context into shared components**
  - [x] Introduced an `AppContextService` that exposes a snapshot `hostStatus` (Excel detected, online/offline) and a `getAuthSummary()` helper for derived auth state (authenticated flag, display name, roles).
  - [x] Updated `AppComponent` to consume `AppContextService` instead of embedding host/auth logic directly, and refactored the user banner, host/status banner, and view guards to bind against `hostStatus`/`authSummary` while still using `AppConfig`/`APP_TEXT` for text.
  - [x] Verify in Excel and the browser that banners still respond correctly when Excel is not detected and when offline, and that authenticated/role-aware behavior remains unchanged.

- [x] **Extract shared types into a central types package and enforce TSDoc**
  - [x] Created a `src/app/types/` folder containing shared type definitions for auth state (`AuthState`), query domain (`QueryParameter`, `QueryDefinition`, `QueryRunLocation`, `QueryRun`), and app config/nav/roles (`RoleId`, `ViewId`, `NavItemConfig`, `RoleDefinition`, `AppConfig`), along with a barrel file (`src/app/types/index.ts`).
  - [x] Refactored existing type declarations embedded in `AuthService`, `query-model`, and `app-config` to import from the central types folder and re-export type aliases where appropriate, minimizing duplication and clarifying ownership of domain models.
  - [x] Added TSDoc comments to the new shared types to document intent and usage, and kept the structure ready for a future TSDoc-aware lint rule so missing documentation can be surfaced during `npm run lint` as the type surface grows.

- [x] **Document the data-driven design in CONTEXT-SESSION.md**
  - [x] Updated `CONTEXT-SESSION.md` to describe the new `AppConfig`, text catalog, shared types, and `AppContextService` as the preferred way to add/modify nav items, roles, and core host/auth copy.
  - [x] Included a short example of adding a new nav item via configuration only, highlighting how `AppConfig` and `APP_TEXT` work together.

- [x] **Onboard strict typing and TSDoc enforcement across `src/`**
  - [x] Extend the shared types strategy so that all cross-cutting models under `src/app` either live in `src/app/types` or are explicitly documented with TSDoc where they are defined (e.g., feature-specific view models).
  - [x] Introduce an ESLint rule set (via `@typescript-eslint` and/or additional plugins) that requires:
    - [x] No `any` in `src/app/**` except in clearly documented, intentional escape hatches.
    - [x] TSDoc (or JSDoc) on all exported types, interfaces, classes, and public functions in `src/app/**`.
  - [x] Start with high-leverage areas:
    - [x] `core/` services (`AuthService`, `ExcelService`, `AppContextService`) and shell (`AppComponent`).
    - [x] `shared/` query domain and config (`QueryApiMockService`, `QueryStateService`, `app-config`, `app-text`).
    - [x] `types/` package, ensuring every exported symbol has clear, actionable TSDoc.
  - [x] Gradually tighten rules for `features/` by:
    - [x] Adding or refining component-level input/output types and view models.
    - [x] Documenting key components with TSDoc on inputs/outputs and important methods.
  - [x] Update `CONTEXT-SESSION.md` to include a short "Strict typing & TSDoc" subsection that explains:
    - [x] Where shared types live.
    - [x] Which ESLint rules enforce typing and documentation.
    - [x] How to add new types/components so that they pass lint and provide good IntelliSense.

## 11. Build UI Primitives Library

- [x] **Establish shared UI library structure**
  - [x] Create `src/app/shared/ui/` with a clear folder structure per primitive (e.g., `button/`, `banner/`, `table/`, `list/`, `section/`, `card/`, `dropdown/`, `icon/`), each containing a standalone component and any related models.
  - [x] Add a simple barrel file (e.g., `src/app/shared/ui/index.ts`) that re-exports the primitives so feature code can import from a single place.
  - [x] Ensure all primitives follow Angular standalone patterns (no NgModule) and are easy to include in other standalone components' `imports` arrays.

- [x] **Define strongly-typed models for UI primitives**
  - [x] Introduce UI-related types under `src/app/types/ui/` (or an equivalent folder), such as `UiButtonVariant`, `UiBannerType`, `UiTableColumnDef`, `UiListItem`, `UiCardVariant`, `UiDropdownItem`, and `UiIconName`.
  - [x] Keep these types generic and domain-agnostic so they can be reused across features (queries, worksheets, user page) and extend the central types/TSDoc strategy.
  - [x] Add TSDoc comments explaining how each type is intended to be used and how it maps to visual behavior.

- [x] **Implement core primitives (Button and Banner)**
  - [x] Implement `ButtonComponent` with inputs like `label`, `variant`, `size`, `disabled`, `iconName`, and an output `clicked` event; apply Tailwind-ready classes based on variant/size.
  - [x] Implement `StatusBannerComponent` (or `BannerComponent`) with inputs for `type` (`info`/`warning`/`error`), `title`, `message`, and `iconName`, rendering nothing when `message` is empty.
  - [x] Wire `AppComponent` to use `ButtonComponent` for nav actions (driven by `AppConfig`/`APP_TEXT`) and `StatusBannerComponent` for the host-status banner, preserving current behavior.

- [x] **Onboard Button primitive into nav using config-driven variants**
  - [x] Extend `NavItemConfig` (or a related config type) to optionally carry `UiButtonConfig` or direct `variant`/`size` hints, keeping types aligned with `UiButtonVariant`/`UiButtonSize`.
  - [x] Replace raw `<button>` elements in the shell nav (`app.component.html`) with `<app-button>` usages driven entirely by `AppConfig`/`APP_TEXT` and the new button config fields.
  - [x] Verify that role gating, focus/keyboard behavior, and labels remain unchanged while nav buttons now respect `AppConfig.ui.navButtonVariant`/`navButtonSize` defaults.

- [x] **Implement data-driven Table and List primitives**
  - [x] Create `TableComponent` that accepts `columns: UiTableColumnDef[]` and `rows: T[]` (generic), plus optional `rowKey` and cell template hooks for specialized rendering.
  - [x] Create `ListComponent` that accepts `items: UiListItem[]` and supports optional selection (`single`/`multi`), icons, badges, and per-item action affordances.
  - [x] Refactor at least one existing view (e.g., query list or worksheets view) to use `TableComponent` or `ListComponent`, turning its current markup into a config-driven table/list.

- [x] **Onboard Table/List primitives into an existing feature**
  - [x] Choose a candidate view (for example, the query list or worksheets view) and design a minimal `UiTableColumnDef[]`/`UiListItem[]` configuration that reflects its current columns/items.
  - [x] Replace the view’s hand-written table/list markup with the new `TableComponent` or `ListComponent`, binding all data and labels from existing view models and `APP_TEXT`.
  - [x] Confirm that sorting/selection (if present), empty states, and role/Excel guards behave exactly as before, with the layout now driven by the shared primitives.

- [x] **Implement Section and Card primitives**
  - [x] Implement `SectionComponent` that provides a titled, optionally collapsible container with `<ng-content>` for body content and variants for density/spacing.
  - [x] Implement `CardComponent` that provides a flexible surface for presenting a query, user, or worksheet summary, with inputs for `title`, `subtitle`, `iconName`, and `variant`.
  - [x] Use `SectionComponent`/`CardComponent` to restructure portions of the SSO home, user page, and query list into consistent, reusable layouts.

- [x] **Onboard Section/Card primitives into core pages**
  - [x] Identify 1–2 high-traffic pages (such as SSO home and the user page) and sketch how their existing content maps into `SectionComponent`/`CardComponent` without changing copy.
  - [x] Replace ad-hoc containers in those pages with the new primitives, ensuring titles, subtitles, and body content are still sourced from `APP_TEXT` and existing view models.
  - [x] Verify that spacing, responsiveness, and role-dependent visibility are preserved or improved, and adjust `AppConfig` layout hints if needed.

- [x] **Implement Dropdown and Icon primitives**
  - [x] Implement `DropdownComponent` that accepts `items: UiDropdownItem[]`, `value`, `placeholder`, and emits `valueChange` when selections change; ensure keyboard accessibility and clear focus styles.
  - [x] Implement `IconComponent` that maps `UiIconName` values to SVGs or CSS classes via a small registry, so icons used by buttons, banners, cards, and lists remain consistent.
  - [x] Replace ad-hoc icons (or future icons) in features with `IconComponent` usages, driven by config/text where appropriate.

- [x] **Onboard Dropdown/Icon primitives into query and shell flows**
  - [x] Introduce `DropdownComponent` into a targeted area such as query parameter selection or role-specific filters, wiring its `items` and `value` to existing view models and `APP_TEXT` labels.
  - [x] Replace any inline or hard-coded icons in the shell (nav, banners, cards) and feature views with `IconComponent`, using `UiIconName` and configuration/text to drive icon choice.
  - [x] Confirm that keyboard navigation, screen-reader labels, and visual affordances meet accessibility expectations after the swap.

- [x] **Integrate primitives into existing views incrementally**
  - [x] Migrate the host-status banner in `AppComponent` to use `StatusBannerComponent` (and `IconComponent` as needed) while keeping text from `APP_TEXT` and visibility from `AppContextService`/`AppConfig`.
  - [x] Use `SectionComponent`/`CardComponent` within the user page to lay out profile info with primitives, keeping copy/auth behavior unchanged and avoiding additional shared wrapper components.
  - [x] Expand the query list view to rely fully on `ListComponent`/`TableComponent` for query items, mapping existing query metadata into `UiListItem`/`UiTableColumnDef[]` while preserving role/Excel guards.
  - [x] Refactor worksheets and tables views to use `SectionComponent` plus `ListComponent`/`TableComponent` for Excel artifacts, maintaining existing `ExcelService.isExcel` checks and role gating.
- [x] **Make navigation behavior fully data-driven**
  - [x] Extended `NavItemConfig` and `AppConfig` to describe nav behavior via an `actionType` (e.g., `select-view`, `sign-in-analyst`, `sign-in-admin`, `sign-out`) instead of hard-coding click handlers in `AppComponent`.
  - [x] Added config entries in `DEFAULT_APP_CONFIG.navItems` for the sign-in/sign-out buttons, including their variants/sizes, so all nav buttons (view selection and auth) are created from config.
  - [x] Implemented a `handleNavClick(item: NavItemConfig)` dispatcher in `AppComponent` that interprets `actionType` and calls `selectView`, `signInAnalyst`, `signInAdmin`, or `signOut` accordingly.
  - [x] Refined visibility rules so sign-in buttons only appear when logged out, sign-out only when logged in, and other items still respect `requiresAuth`/`requiredRoles`, keeping nav fully data-driven.

- [x] **Extend AppConfig with layout and class hints for primitives**
  - [x] Add optional per-view/per-section layout hints (e.g., section density, card usage) and class hooks (e.g., `rootClass`, `extraClasses`) to `AppConfig`/UI config types so primitives can consume them without changing feature logic.
  - [x] Keep these hints generic and variant-driven so they can later map cleanly to Tailwind or other class-driven strategies defined inside primitives, not in feature components.

- [x] **Wire layout hints into shell and primitives**
  - [x] Bind `rootIdsAndClasses.rootClass`/`extraRootClasses` from `AppConfig` onto the main shell container in the real `AppComponent` template so shell-level classes are fully data-driven.
  - [x] Feed `AppConfig.ui.viewLayout[viewId].sectionVariant` into `SectionComponent` (and later `CardComponent`) for core views (SSO, user, worksheets, tables, queries) so density/spacing is controlled via configuration instead of hard-coded inputs.
  - [x] Keep the wiring thin and config-driven so future Tailwind/class-driven strategies only need to touch primitives/templates, not feature components.

- [x] **Remove or archive legacy root and tables components (core vs old app root)**
  - [x] Identify legacy Angular root components/templates and the older `TablesComponent` under `src/app/` that predate the data-driven shell and `features/` structure.
  - [x] Confirm they are no longer referenced by routing, bootstrap, or tests, then either delete them or move them under `_ARCHIVE/` with a brief note, to avoid confusion with the new `core/` + `features/` layout.
  - [x] Re-run build and tests to ensure no references remain and the taskpane still boots correctly in Excel and the browser.

- [x] **Document layout/class hints and primitives wiring in CONTEXT-SESSION.md**
  - [x] Add a short section describing the new `UiLayoutHints` and `AppConfig.ui.viewLayout` fields, including how they are intended to drive `SectionComponent`/`CardComponent` density and shell-level classes.
  - [x] Clarify which components currently consume these hints and which are prepared for future Tailwind/class-driven styling, so contributors know where to plug in when migrating styles.
  - [x] Ensure the documentation matches the actual wiring in `AppComponent`, primitives, and views, updating examples as needed.

- [x] **TSDDocs**
  - [x] Add full TSDocs to all new types/interfaces in `src/app/types/ui/` and `src/app/shared/ui/` components, explaining their purpose and usage patterns.
  - [x] Add full TSDocs to all new types/interfaces in `src/app/types/ui/` and `src/app/shared/ui/` components, explaining their purpose and usage patterns.

## 12. Refine & Improve Excel Functionality

- [x] **Handle unreachable dev server / blank taskpane experience**
  - [x] When the Angular dev server (e.g., `https://localhost:4200/`) is not reachable, Excel currently shows a blank taskpane and console errors like "Could not connect to the server".
  - [x] Since the taskpane iframe never loads any HTML when `https://localhost:4200/` is down, there is no true in-pane fallback surface; instead, focus on improving manifest metadata and docs so users understand what a blank pane means and how to fix it.
  - [x] Update `dev-manifest.xml` to better reflect the design intent for this dev-only add-in, for example:
    - [x] Make `<DisplayName>` clearly indicate this is a **dev** task pane that requires the Angular dev server (e.g., "Excel Extension (Dev – localhost:4200)").
    - [x] Rewrite `<Description>` to mention that the pane will appear blank if the dev server is not running and to start `npm start` / `npm run start:dev` from the repo.
    - [x] Adjust `GetStarted.Title` / `GetStarted.Description` strings so the Office UI around the add-in (ribbon/tooltip/get started panel) explicitly tells users to ensure the dev server is running when they observe a blank pane.
    - [x] Optionally point `SupportUrl` at a help/README page that documents common dev issues, including the "blank taskpane because dev server is offline" scenario.
  - [x] Update `CONTEXT-SESSION.md` with a short subsection explaining:
    - [x] Why we cannot show a real fallback surface when `localhost:4200` is unreachable.
    - [x] Which manifest fields carry the "dev server required" messaging.
    - [x] The expected remediation steps when Excel shows a blank taskpane (start the dev server, reload the add-in).

- [x] **Add Generic Query against https://jsonapi.org/examples/**
  - [x] Implemented a new `jsonapi-example` query in `QueryApiMockService` that performs a real HTTP GET to `https://jsonplaceholder.typicode.com/users` and maps returned users into flat, Excel-friendly rows (Id, Name, Username, Email, Phone, Website, City, Company).
  - [x] Kept a deterministic local fallback so that if the remote call fails or returns an unexpected shape, the query still produces sample rows using the existing local mock builder.
  - [x] The existing query execution logic in `QueryHomeComponent` already handles the resulting rows and passes them to `ExcelService.upsertQueryTable`, so the JSONPlaceholder user data (or fallback) is visualized in Excel without additional UI changes.
  - [x] Verified that the new query appears in the query list, executes the remote call when run (subject to network connectivity/CORS), and that the resulting table is populated with user data when the response is compatible.
  - [x] Query should be admin role only (the query definition sets `allowedRoles: ["admin"]` so only admins can run it).

- [x] **Query UI is Data Driven**
  - [x] Introduced a `QueryUiConfig` model (via an optional `uiConfig` field on `QueryDefinition`) that describes how each query can appear and behave in the UI (badge label key and an `actions` collection).
  - [x] Defined a small set of `QueryUiAction` types (`run-query`, `go-to-table`) and a central dispatcher in `QueryHomeComponent` (`dispatchAction`) that interprets these actions and routes them to the existing `runQuery`/`goToLastRun` methods.
  - [x] Replaced the hand-wired `Run` / `Go to table` buttons in `QueryHomeComponent` with a loop over each query's `uiConfig.actions`, rendering `ButtonComponent` instances from config and using the dispatcher instead of direct method bindings.
  - [x] Kept action visibility and enabled/disabled state data-driven by combining `uiConfig` with `AuthService` role checks and `ExcelService.isExcel`, so admin-only or Excel-only actions are controlled via configuration and current host/auth context.
  - [x] Left a follow-up note to extend `CONTEXT-SESSION.md` with a short section showing how to add or modify query UI behavior by editing `QueryUiConfig` (not templates), including an example of wiring a new query with custom actions and role/host gating.

- [x] **Wire standard uiConfig onto all queries (buttons + badges)**
  - [x] Implementation:
    - [x] Add a small helper (e.g., `createStandardQueryUiConfig(options)`) in `QueryApiMockService` or a nearby config helper that returns a `QueryUiConfig` with a standard `run-query` and `go-to-table` action set, plus an optional `badgeLabelKey` when a query is admin-only.
    - [x] Attach `uiConfig` to each `QueryDefinition` in `QueryApiMockService` using this helper so that all queries (sales summary, top customers, inventory, user audit, JSONPlaceholder users) share a consistent action/badge shape driven solely by config.
    - [x] Update `QueryHomeComponent` list/badge rendering to prefer `uiConfig.badgeLabelKey` (resolved through `APP_TEXT`) when present, falling back to the existing `isAdminOnly` logic to avoid regressions for any queries that do not declare a badge yet.
  - [x] Testing:
    - [x] Run `npm test -- --watch=false --browsers=ChromeHeadless` and verify existing `QueryHomeComponent` tests still pass, adding/adjusting specs as needed to cover:
      - [x] Presence of `run-query` and `go-to-table` actions on all queries via `uiConfig`.
      - [x] Correct enabling/disabling of buttons based on roles (`analyst` vs `admin`) and `ExcelService.isExcel` state.
      - [x] Badge visibility for admin-only queries when signed in as admin vs analyst.
    - [x] Manually sideload in Excel (desktop or online), sign in as analyst and admin, and confirm that each query renders the expected buttons and badges and that clicking `Run`/`Go to table` still routes through `runQuery`/`goToLastRun` without errors.
  - [x] Documentation:
    - [x] Extend `CONTEXT-SESSION.md` with a short "Query UI config & actions" subsection that:
      - [x] Shows the `QueryUiConfig`/`QueryUiActionConfig` shape.
      - [x] Includes a concrete `QueryDefinition` example with `uiConfig` using the new helper.
      - [x] Explains how role/host checks interact with `uiConfig` to control button enabled/disabled state.
    - [x] Briefly note in `README.md` under the queries section that query actions (Run / Go to table) and badges are now driven by `uiConfig` on each query rather than hard-coded in the template, and point contributors to `CONTEXT-SESSION.md` for details.

- [x] **Refactor Excel features to use WorkbookService consistently**
  - [x] Replace direct calls to `ExcelService.getWorksheets` / `ExcelService.getTables` in features (Queries, Tables, future views) with `WorkbookService.getSheets` / `WorkbookService.getTables` / `WorkbookService.getTableByName` so workbook enumeration and lookup logic is centralized.
  - [x] Keep `ExcelService` focused on low-level Office.js interactions and mutations, while `WorkbookService` provides the typed, feature-friendly workbook abstraction.
  - [x] Add unit tests around `WorkbookService` to cover listing, lookup, and (once implemented) ownership-aware behaviors.

- [ ] **Introduce workbook ownership model & safe table management**
  - [x] Capture current behavior (done):
    - [x] `ExcelService` currently creates or resizes tables for query runs via `upsertQueryTable`, using query defaults and optional location hints to choose sheet/table names; it does not yet persist or reload any ownership metadata and relies entirely on table naming conventions plus a placeholder `recordOwnership` hook.
    - [x] `WorkbookService` exposes shared helpers to list sheets/tabs and tables (`getSheets`, `getTables`, `getTableByName`) and to read ownership state (`getOwnership`, `isExtensionManagedTable`, `getManagedTablesForQuery`), but today `getWorkbookOwnership` in `ExcelService` always returns an empty array, so no tables are treated as owned/managed until a real metadata store is implemented.
  - [x] Design (in progress):
    - [x] Define strongly typed models for workbook artifacts under `src/app/types` (e.g., `WorkbookTabInfo`, `WorkbookTableInfo`) and an additional `WorkbookOwnershipInfo` that captures whether a table is managed by the extension, which query/feature it belongs to, and when it was last touched.
    - [x] Decide on a metadata strategy to persist ownership at the workbook level without being destructive:
      - [x] Use a dedicated hidden worksheet (`_Extension_Ownership`) that stores ownership rows keyed by sheet name, table name, and query id, with columns for `sheetName`, `tableName`, `queryId`, `isManaged`, and `lastTouchedUtc`.
    - [x] Add helpers to `WorkbookService` such as:
      - [x] `isExtensionManagedTable(table: WorkbookTableInfo): boolean`.
      - [x] `getManagedTablesForQuery(queryId: string): WorkbookTableInfo[]`.
      - [x] `getOrCreateManagedTableTarget(query: QueryDefinition)` that centralizes safe target resolution for create/update behavior.
  - [ ] Implementation plan (partially implemented):
    - [x] Route all table-creating/updating logic in `ExcelService.upsertQueryTable` through ownership-aware `WorkbookService` helpers so that checks happen in a single place.
    - [x] Ensure that operations which might overwrite or delete data (e.g., resizing or renaming tables) first validate ownership and either:
      - [x] Operate only on extension-managed tables; or
      - [x] Present a clear, non-destructive alternative (e.g., create a new table with a suffix) when encountering unmanaged tables with the same name.
    - [x] Update features that touch tables (Queries view, Tables view) to rely on ownership-aware helpers rather than making assumptions about table names (e.g., prefer `WorkbookService.getManagedTablesForQuery(query.id)` for navigation and surface ownership in the Tables view via `getOwnership`).
  - [ ] Testing:
    - [ ] In Excel, verify that running queries creates or updates tables marked as extension-managed and that these tables are discoverable via the ownership APIs.
    - [ ] Manually create user tables with conflicting names and confirm that the extension does not silently overwrite or delete them, but instead follows the configured safe behavior (new table, prompt, or skip).
    - Add unit tests for `WorkbookService` ownership helpers and any higher-level flows that depend on them (e.g., Go-to-table, rerun strategies).
  - [ ] Documentation:
    - [ ] Extend `CONTEXT-SESSION.md` with a "Workbook ownership" section that explains how managed vs unmanaged tables are identified, what guarantees the extension makes, and how contributors should interact with the ownership helpers.
    - [ ] Reference this model in `README.md` under Excel/queries to make it clear that all table/tab management must respect ownership boundaries and avoid destructive actions on user-managed content.

- [ ] **Provide a clean-slate reset for extension-managed workbook content**
  - [ ] Implementation:
    - [x] Add `ExcelService.purgeExtensionManagedContent()` that:
      - [x] Reads the `_Extension_Ownership` sheet and identifies tables marked as extension-managed.
      - [x] Deletes those tables and any now-empty worksheets that only contained extension-managed tables.
      - [x] Deletes the `_Extension_Ownership` sheet itself to fully reset ownership metadata.
    - [ ] Expose a dev-only entry point (e.g., button or command) that invokes `purgeExtensionManagedContent` so developers can easily reset a workbook during local testing.
  - [ ] Testing:
    - [ ] In Excel, seed a workbook with several extension-managed tables across multiple sheets, plus user-created tables, then run the purge helper and verify that only extension-managed tables/sheets and the ownership sheet are removed.
    - [ ] Confirm that subsequent query runs recreate tables and ownership metadata correctly on a freshly purged workbook.
  - [ ] Documentation:
    - [ ] Add a short "Resetting extension-managed tables" subsection to `CONTEXT-SESSION.md` explaining when and how to use the purge helper and its safety guarantees.
    - [ ] Mention the reset capability in `README.md` under the Excel/queries or troubleshooting section so contributors know how to get back to a clean workbook state during development.

- [ ] **Harden Go-to-Table behavior using workbook state and ownership**
  - [ ] Capture what exists today:
    - [ ] `QueryHomeComponent` primes workbook state on init via `WorkbookService.getTables()` when `excel.isExcel` is true.
    - [ ] `goToLastRun` currently prefers `QueryStateService.getLastRun(query.id)` and falls back to a simple `defaultTableName` match.
  - [ ] Implementation plan:
    - [ ] Extend `goToLastRun` to use ownership-aware workbook inspection when no last-run `location` exists:
      - [ ] Prefer a managed table associated with the query (via `WorkbookService.getManagedTablesForQuery(query.id)`) over raw `defaultTableName` string matches.
      - [ ] If no managed table exists, fall back to searching `WorkbookService.getTables()` for a table whose `name` matches `query.defaultTableName`, logging that a heuristic was used.
      - [ ] When a table is found, construct a `QueryRunLocation` on the fly and call `ExcelService.activateQueryLocation`.
    - [ ] Store this inferred location (and ownership info when present) back into `QueryStateService.setLastRun` so subsequent navigations use the same path as a freshly run query.
  - [ ] Testing:
    - [ ] In Excel, for a workbook that already has an extension-managed table for a query, verify that "Go to table" navigates correctly even before running the query in the current session.
    - [ ] For workbooks that contain a `tbl_*` matching a query's `defaultTableName` but no ownership info, verify that navigation still works and that ownership is initialized on first successful navigation.
    - [ ] Confirm behavior when no table exists (or names don't match): the message remains accurate and user-friendly.
  - [ ] Documentation:
    - [ ] Update `CONTEXT-SESSION.md` to describe the two-level behavior for "Go to table" (prefer last-run state and managed tables, then fall back to workbook tables by convention).
    - [ ] Note the dependency on `defaultTableName` conventions so future queries are defined with predictable table names.

- [ ] **Strengthen typing and TSDoc for workbook models and helpers**
  - [ ] Move workbook-related interfaces (`WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`) into `src/app/types` with full TSDoc, and update `WorkbookService`, `ExcelService`, and feature components to consume them.
  - [ ] Clearly document the boundary where Office.js types remain `any` or loosely typed, and where they are mapped into strongly typed models for use in the rest of the app.
  - [ ] Ensure new helpers like `getManagedTablesForQuery` and `getOrCreateManagedTable` are fully documented and exported via a predictable API surface.

- [ ] **Centralize Excel error and telemetry handling**
  - [ ] Introduce a small result model (e.g., `ExcelOperationResult` or `ExcelError`) returned by `ExcelService`/`WorkbookService` helpers instead of throwing raw errors into components.
  - [ ] Add an `ExcelTelemetryService` (or extend the planned logging service) to record failures and successes, including operation name, table/query identifiers, and host context, to a log table and/or console.
  - [ ] Update UI code (`QueryHomeComponent`, Tables view) to interpret these result types and show tailored messages via `StatusBannerComponent`, keeping component logic slim and strongly typed.

- [ ] **Improve Excel error handling and UX for query execution**
  - [ ] Enhance `ExcelService.upsertQueryTable` (and any ownership-aware wrappers) to catch and log common Excel API errors (e.g., table name conflicts, load/sync issues) when creating or updating query result tables.
  - [ ] Surface user-friendly error messages in `QueryHomeComponent` when query execution fails due to Excel issues, using `StatusBannerComponent` to show the error context and possible remediation steps.
  - [ ] Implement retry logic or alternative flows (e.g., prompt to choose a different table name) for recoverable errors during query execution, improving the overall robustness of the experience.
  - [ ] Update `CONTEXT-SESSION.md` with a section on Excel error handling during query execution, describing common failure modes and how the app responds to them.
  - [ ] Review original notes
    - [ ] Revisit the query list/detail UI to ensure each executable query has an explicit, accessible "Run" button rather than relying on clicking the row/title; make sure the click handler is attached to a `button` element wired through the UI primitives (`ButtonComponent`) instead of generic containers.
    - [ ] Track down and fix the `rowCount` error (`The property 'rowCount' is not available. Before reading the property's value, call the load method on the containing object and call "context.sync()" on the associated request context.`) that occurs when clicking an existing query/table: ensure any use of `table.rows.getCount()` or similar is correctly `load`-ed and `ctx.sync()` is awaited before accessing the value.
    - [ ] Verify in Excel that running a query via its button creates or updates the table without errors (including when the table already exists), and that clicking on the query name does not trigger hidden side-effects; update `CONTEXT-SESSION.md` with a brief note on the intended UX (buttons for execution, optional navigation affordances) and the Excel API pattern used to avoid `rowCount`/load/sync issues.

- [ ] **Add component for logging execution/usage into a worksheet table**
  - [ ] Create a shared logging component/service pair that can append log entries (e.g., query runs, navigation events, errors) into an Excel worksheet table for in-workbook debugging.
  - [ ] Integrate it with `WorkbookService`/`ExcelService` so that, when `isExcel` is true, logs are written to a configurable sheet/table (with sensible defaults) and can be filtered/cleared from the UI.
  - [ ] Verify that logging is no-op outside Excel, and that logs persist within the workbook session for troubleshooting.

- [ ] **Harden query rerun behavior and table data management**
  - [ ] Fix the `rowCount` error by ensuring all table-related properties are properly `load`-ed and `context.sync()` is called before reading them in `ExcelService.upsertQueryTable` and any rerun-related helpers.
  - [ ] Define a clear overwrite vs append strategy at the config level (e.g., per `QueryDefinition` flags like `writeMode: 'overwrite' | 'append' | 'append-or-overwrite'`) and implement it inside ownership-aware helpers so reruns behave predictably.
  - [ ] Introduce optional key column metadata on `QueryDefinition` (e.g., `primaryKeyColumns: string[]`) to enable smarter upserts (update vs insert) instead of always deleting/rewriting the table when needed.
  - [ ] Surface simple, scalable user options for rerun behavior in the query UI (e.g., “Overwrite existing table”, “Append rows”, “Clear before write”) with sensible defaults driven by configuration.
  - [ ] Ensure the logging component captures rerun decisions and outcomes (rows written, mode used, any conflicts) for later troubleshooting.

- [ ] **Implement robust query parameter management (global + per-query)**
  - [ ] Extend the query domain model to distinguish between global parameters (applied to multiple queries/reports) and query-specific parameters (e.g., date ranges, regions, customer segments) with clear typing and defaults.
  - [ ] Add a parameter management UI that lets users define, edit, and reset global and per-query parameter sets, with validation and descriptions sourced from the query metadata.
  - [ ] Support “Refresh All” and “Refresh Selected” patterns in the query UI, allowing users to rerun multiple queries with a shared/global parameter context or per-query overrides.
  - [ ] Ensure parameter choices are persisted (e.g., via `QueryStateService` and `localStorage`) so that a user’s preferred filters survive reloads and are visible in the UI before refresh.
  - [ ] Wire parameter changes into the logging and host-status UX so users can see which parameter set was used for each run and be warned when parameters are missing or invalid.

- [ ] **Support saving and loading named query configurations**
  - [ ] Design a `QueryConfiguration` model that captures a named set of query selections, parameter values (global + per-query), and rerun behaviors (overwrite/append) so a “report configuration” can be reused.
  - [ ] Implement local storage of configurations keyed by user and workbook context, leveraging the existing auth state to keep configurations scoped to the signed-in user.
  - [ ] Add UI affordances to create, rename, “save as”, delete, and restore configurations (soft-delete), making it easy to manage multiple report presets.
  - [ ] Prepare the configuration layer for a future backend API by isolating storage concerns behind a service (e.g., `QueryConfigurationService`) with a clear interface that can later be backed by HTTP instead of local storage.
  - [ ] Ensure that loading a configuration updates the query list, parameter panels, and any Excel tables in a predictable, observable way, and that failures are logged and surfaced via the host-status/banner UX.

- [ ] **Quick update to style of Queries so more Mobile/Taskbar Friendly**
  - [ ] List should be easier to view.
  - [ ] Content more organized and easier to work with.
  - [ ] Expand on this concept before you get started (just rough draft notes).

## 13. Research Class Driven Styles

- [ ] **Prepare primitives for Tailwind adoption**
  - [ ] Research and define a Tailwind (or other class-driven) strategy for the UI primitives that keeps feature code using typed variants while mapping variants to class lists inside the primitives.
  - [ ] Plan how to migrate styling from existing CSS files into class-driven definitions in primitive templates with minimal disruption.
  - [ ] Identify and document any build-time changes needed (e.g., Tailwind config, purge paths) without implementing them on this branch.

- [ ] **Verify integrity of Migration Guidelines**
  - [ ] After each migration of a view to primitives or class-driven styles, verify behavior, responsiveness, and accessibility (focus order, keyboard interaction) to avoid UX regressions and adjust config/text as needed.
