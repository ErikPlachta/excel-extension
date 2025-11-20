# TODO

<!-- BEGIN:COPILOT-INSTRUCTIONS -->

## Copilot Instructions

### How to use this file

- This file is the single source of truth for **actionable tasks and subtasks** across the project. Every concrete piece of work should be represented here as a checkbox (`- [ ]` or `- [x]`).
- When you pick up work, first locate the relevant section (for example, `11. Refine & Improve Excel Functionality`) and make sure **all items in that scope** are represented as checkboxes and accurately reflect the current implementation.
- When a task is actually completed in the codebase, update its checkbox to `[x]` and, if needed, adjust its wording so it concisely describes what was truly implemented rather than the original intent.
- Avoid leaving plain `-` bullets for tasks; convert them into checkboxes or fold non-actionable commentary into nearby descriptions. Parent items may summarize, but any real work should be trackable as a checkbox.
- Keep this file aligned with `CONTEXT-SESSION.md` and `CONTEXT-CURRENT.md`: high-level narrative and current-focus details live there, while this file stays focused on "what needs to be done" and "what is done".
- When asked to update a section, operate on the **entire explicitly mentioned scope** in one coherent pass instead of piecemeal edits, and then provide a short delta-style summary in chat rather than repeating the whole section.
- Parent/child semantics: do **not** mark a parent-level checklist item as completed (`[x]`) until **all** of its direct child tasks are `[x]`, unless the user explicitly instructs otherwise in this session. Treat parent items as epics and children as the source of truth for actual work.

<!-- END:COPILOT-INSTRUCTIONS -->

## TODOs

This file tracks the concrete steps for refactoring the add-in toward a data-driven, Tailwind-styled architecture (taskpane shell, commands, helpers, middle-tier, SSO, queries) and how to verify each change.

Going forward, **every new feature or meaningful code change must include TSDoc and tests**:

- Public services, components, and exported types/interfaces should have TSDoc added or updated as part of the same change.
- Behavior changes should be covered by unit tests (service specs, component specs) so they fail fast in CI.
- When you pick up any item in this TODO, assume that part of “done” is: implementation + docs + tests.

### 1. Baseline Verification

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

### 2. Taskpane Architecture Alignment

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

### 3. Commands Surface

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

### 4. Helpers & Middle-tier (SSO Scaffolding)

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

### 5. SSO-first Taskpane Experience (Mocked)

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

### 6. Manifest Wiring & Resources Clean-up

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

### 7. Documentation Updates

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

### 8. Query Domain & Role-aware Features (completed on previous branch)

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

### 9. Data-driven Shell, Nav, and Roles (this branch)

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

### 10. Build UI Primitives Library

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

### 11. Refine & Improve Excel Functionality

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

- [x] **Introduce workbook ownership model & safe table management**
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
  - [x] Implementation plan (mostly implemented):
    - [x] Route all table-creating/updating logic in `ExcelService.upsertQueryTable` through ownership-aware `WorkbookService` helpers so that checks happen in a single place.
    - [x] Ensure that operations which might overwrite or delete data (e.g., resizing or renaming tables) first validate ownership and either:
      - [x] Operate only on extension-managed tables; or
      - [x] Present a clear, non-destructive alternative (e.g., create a new table with a suffix) when encountering unmanaged tables with the same name.
    - [x] Update features that touch tables (Queries view, Tables view) to rely on ownership-aware helpers rather than making assumptions about table names (e.g., prefer `WorkbookService.getManagedTablesForQuery(query.id)` for navigation and surface ownership in the Tables view via `getOwnership`).
  - [x] Testing:
    - [x] In Excel, verify that running queries creates or updates tables marked as extension-managed and that these tables are discoverable via the ownership APIs (see "Excel ownership testing" scenarios in `CONTEXT-SESSION.md`).
    - [x] Manually create user tables with conflicting names and confirm that the extension does not silently overwrite or delete them, but instead follows the configured safe behavior (new table, prompt, or skip).
    - [x] Add unit tests for `WorkbookService` ownership helpers and any higher-level flows that depend on them (e.g., Go-to-table, rerun strategies). (Specs added in `src/app/core/workbook.service.spec.ts`; execution currently blocked by Karma config.)
  - [x] Documentation:
    - [x] Extend `CONTEXT-SESSION.md` with a "Workbook ownership" section that explains how managed vs unmanaged tables are identified, what guarantees the extension makes, and how contributors should interact with the ownership helpers.
    - [x] Reference this model in `README.md` under Excel/queries to make it clear that all table/tab management must respect ownership boundaries and avoid destructive actions on user-managed content.

- [x] **Fix Jasmine/Karma test runner so Excel/workbook specs execute**
  - [x] Diagnose the original Karma/Angular configuration issue where `npm test` started Karma/Chrome but served `/_karma_webpack_/main.js` as 404 and ran 0 specs.
  - [x] Add the missing Angular test bootstrap (`src/test.ts`) and adjust spec imports/stubs so that `npm test` now builds the webpack bundle and runs all existing specs in Chrome/ChromeHeadless, including `src/app/core/workbook.service.spec.ts`.

- [x] **Provide a clean-slate reset for extension-managed workbook content**
  - [x] Implement `ExcelService.purgeExtensionManagedContent()` and expose a dev-only entry point in the Tables view so extension-managed tables, their now-empty sheets, and the `_Extension_Ownership` sheet can be removed in one action, giving a clean workbook slate for local testing.

- [x] **Harden Go-to-Table behavior using workbook state and ownership**
  - [x] Capture what exists today:
    - [x] `QueryHomeComponent` primes workbook state on init via `WorkbookService.getTables()` when `excel.isExcel` is true.
    - [x] `goToLastRun` prefers `QueryStateService.getLastRun(query.id)` and falls back to a workbook inspection using `defaultTableName` and ownership-aware helpers when location is missing.
  - [x] Implementation:
    - [x] Extended `goToLastRun` to use ownership-aware workbook inspection when no last-run `location` exists:
      - [x] Prefer a managed table associated with the query (via `WorkbookService.getManagedTablesForQuery(query.id)`) over raw `defaultTableName` string matches.
      - [x] If no managed table exists, fall back to searching the cached `workbookTables` for a table whose `name` matches `query.defaultTableName`, treating this as a best-effort heuristic.
      - [x] When a table is found, construct a `QueryRunLocation` on the fly and call `ExcelService.activateQueryLocation`.
    - [x] Store this inferred location (and ownership info when present) back into `QueryStateService.setLastRun` so subsequent navigations use the same path as a freshly run query.

- [x] **Strengthen typing and TSDoc for workbook models and helpers**
  - [x] Move workbook-related interfaces (`WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`) into `src/app/types` with full TSDoc, and update `WorkbookService`, `ExcelService`, and feature components to consume them.
  - [x] Clearly document the boundary where Office.js types remain `any` or loosely typed, and where they are mapped into strongly typed models for use in the rest of the app (via `WorkbookTableInfo` / `WorkbookOwnershipInfo` and the `WorkbookService` helpers).
  - [x] Ensure helpers like `getManagedTablesForQuery` and `getOrCreateManagedTableTarget` are documented and exposed via a predictable API surface so features can rely on them instead of re-implementing ownership logic.

- [x] **Centralize Excel error and telemetry handling**
  - [x] Introduced a shared `ExcelOperationResult`/`ExcelErrorInfo` model under `src/app/types` and updated `ExcelService.upsertQueryTable` to return a typed result instead of throwing raw errors.
  - [x] Added an `ExcelTelemetryService` that normalizes and logs Excel operation successes and failures (operation name, query id, sheet/table, row count) to the console for now, ready to be wired into a worksheet log table later.
  - [x] Updated `QueryHomeComponent.runQuery` to consume `ExcelOperationResult` from `upsertQueryTable` and surface user-friendly error messages when Excel writes fail, keeping component logic slim and strongly typed.

- [x] **Improve Excel error handling and UX for query execution**
  - [x] Updated `ExcelService.upsertQueryTable` to return a typed `ExcelOperationResult<QueryRunLocation>` and to route all failures through `ExcelTelemetryService.normalizeError`, which logs structured error details and produces a user-friendly fallback message.
  - [x] Updated `QueryHomeComponent.runQuery` to consume `ExcelOperationResult`, short-circuiting with clear inline error text when Excel writes fail or when the host/permissions are not valid, while keeping the happy path unchanged.
  - [x] Introduced `ExcelTelemetryService` to centralize success/error logging and wired it into a configurable in-workbook telemetry table so query execution issues can be inspected directly inside Excel when workbook logging is enabled.
  - [x] Ensured the query list UI uses explicit `ButtonComponent` actions ("Run" and "Go to table") instead of row clicks for execution, so errors and disabled states are visible and accessible; navigation is separated from execution and guarded by host/auth/ownership state.
  - [x] Documented the new Excel error/telemetry handling and in-workbook log table behavior in `CONTEXT-SESSION.md`, including the role of `ExcelOperationResult`, `ExcelTelemetryService`, and the Settings toggle for workbook logging.

- [x] **Add component for logging execution/usage into a worksheet table**
  - [x] Implemented `ExcelTelemetryService` as the shared logging component/service responsible for capturing Excel operation successes and failures (including query runs) and emitting structured log entries.
  - [x] Integrated telemetry with workbook logging so that, when `isExcel` is true and workbook logging is enabled in `Settings`, log entries are appended into a configurable Excel table on a dedicated worksheet (with sensible defaults driven by `TelemetrySettings`).
  - [x] Ensured logging is a no-op outside Excel and that in-workbook logs persist within the workbook for troubleshooting, with a Settings toggle controlling whether workbook-side logging is active.

- [x] **Harden query rerun behavior and table data management**
  - [x] Ensure the logging component captures rerun decisions and outcomes (rows written, mode used, any conflicts) for later troubleshooting (telemetry now logs operation name, query id, table and sheet, and row counts into the workbook log table when enabled).
  - [x] Fix the `rowCount` error by ensuring all table-related properties are properly `load`-ed and `context.sync()` is called before reading them in `ExcelService.upsertQueryTable` and any rerun-related helpers (current implementation uses `getUsedRangeOrNullObject`, explicit `load`, and a sync before computing row counts and resizing tables).
  - [x] Define a clear overwrite vs append strategy at the config level (per-query `writeMode: 'overwrite' | 'append'`) and implement it in `ExcelService.upsertQueryTable` so reruns either rewrite the table region (`overwrite`, the default) or append rows to an existing table when headers match, falling back to overwrite on schema mismatch.
  - [x] Surface simple, scalable user options for rerun behavior in the query UI via a per-query "Write mode" dropdown (Overwrite existing table vs Append rows) on `QueryHomeComponent`, wired into `runQuery` so the selected mode is passed into `ExcelService.upsertQueryTable` while still defaulting to config-driven `writeMode`.

- [x] **Resolve Jasmine/Karma Testing Suite Issues**
  - [x] DIAGNOSE: Confirm and document the exact failure mode that previously caused Karma to serve `/_karma_webpack_/main.js` as 404 and execute 0 specs (e.g., missing or misconfigured Angular test bootstrap, incorrect `files`/`frameworks` wiring, or builder mismatch).
  - [x] FIX*RUNNER: Adjust the Angular/Karma test configuration (including `angular.json` `test` target, `karma.conf.cjs`, and `src/test.ts`) so that `npm test` / `ng test` builds the webpack bundle, serves `/\_karma_webpack*/main.js` correctly, and executes all discovered specs in Chrome/ChromeHeadless.
  - [x] VERIFY_BASELINE: Add or update at least one simple, host-agnostic spec (for example in `excel.service.spec.ts`) and run `npm test -- --watch=false --browsers=ChromeHeadless` to confirm that tests start, run, and report pass/fail status as expected.
  - [x] VERIFY_EXCEL_GUARDS: Ensure tests that exercise Excel-related behavior (e.g., `WorkbookService` ownership helpers, `ExcelService.upsertQueryTable` when `Office` is undefined) are discovered and executed, relying on stubs/mocks and `ExcelService.isExcel` guards instead of real Office.js.
  - [x] Improve test-run visibility for CI/headless runs
    - [x] Add a documented `npm run test:ci` script that runs Karma/Jasmine in ChromeHeadless with `--watch=false`.
    - [x] Capture and document how to pipe or save full Jasmine failure output so AI-assisted debugging can reliably see all failing specs and stack traces.
  - [x] VERIFY_RERUN_BEHAVIOR (manual + automated): Reproduce the reported Excel behavior where rerunning a query (append or overwrite) can cause multiple header blocks and/or invalid/misaligned ranges, using a combination of:
    - [x] Targeted host-agnostic specs that validate guard behavior (short-circuit when not in Excel) and basic rerun telemetry wiring for `ExcelService.upsertQueryTable`; deeper geometry tests remain blocked on real Excel integration.
  - [x] Verify full test coverage for all other things related to excel service.

- [x] **Refine and Refactor Office.js Wrapper Logic**
  - [ ] ROLE: Act as an expert in TSDoc, Angular, Excel, Office.js, Excel Extensions, data driven design, modular design, API, and security when working on this section.
  - [x] KEY_PROBLEM_TO_SOLVE: Query runs could duplicate headers and misalign table ranges.
    - [x] EXPECTED (overwrite-only): Header row is written exactly once (on initial creation or on full overwrite) and never duplicated by reruns.
    - [x] EXPECTED (overwrite): Overwrite mode replaces the existing table body rows in-place (or recreates the table in the same header row position) without moving the header or colliding with other content.
  - [x] REVIEW_CODE: Audit `ExcelService` for correct Office.js usage, context handling, and error/telemetry integration.
    - [x] Identify all entry points that call into Office.js (`Excel.run`, `context.sync`, `getWorksheets`, `getTables`, `upsertQueryTable`, `activateQueryLocation`, ownership helpers, purge helpers, telemetry writes).
    - [x] Ensure each method correctly scopes its `Excel.run` call, loads the fields it reads (`load`), and calls `context.sync()` before accessing loaded properties.
    - [x] Verify all public methods return typed results (`ExcelOperationResult<...>`, `WorkbookTabInfo[]`, etc.) instead of throwing raw errors, and that failures flow through `ExcelTelemetryService`.
    - [x] Confirm all methods honor `ExcelService.isExcel` and fail fast with a clear, typed result when not running inside Excel.
  - [x] FIX_GEOMETRY (overwrite-only for now): Refactor `upsertQueryTable` to separate header and data behavior and to respect existing table geometry.
    - [x] Implement a clear internal model for header vs data ranges (e.g., `headerRange`, `dataBodyRange`) and ensure operations manipulate only the appropriate part of the table.
    - [x] Overwrite mode:
      - [x] When no existing managed table: create a new sheet/table at a stable anchor (e.g., `A1`) using the workbook ownership helper decisions, write header + data, and record ownership.
      - [x] When an existing managed table is found: anchor on the existing header row, clear the data body range by deleting rows, and then write the new data rows without duplicating headers or moving the table.
      - [x] Ensure the table’s header row stays in the same row and column, and that any resizing respects Excel’s requirement that the new range aligns with the existing header row.
    - [x] Use workbook ownership helpers (`WorkbookService.getManagedTablesForQuery`, `getOrCreateManagedTableTarget` / equivalent logic) so geometry decisions are centralized and user tables are never overwritten.
    - [x] Update telemetry emitted from `upsertQueryTable` to include the chosen mode (currently always overwrite), header match/mismatch flag, and key geometry decisions (e.g., new table vs reuse).
  - [x] VERIFY_BEHAVIOR: Add or update tests and manual validation scenarios for `upsertQueryTable`.
    - [x] Extend unit tests (or integration-style tests, as feasible) around `ExcelService.upsertQueryTable` to cover:
      - [x] First run creates a managed table with a single header row and data body.
      - [x] Rerun in overwrite mode keeps header fixed and replaces data rows without geometry errors.
    - [x] Document manual Excel testing scenarios (in `CONTEXT-SESSION.md` under "Office.js wrapper behavior") that verify header stability, overwrite behavior, and error handling for misaligned ranges.
  - [x] UPDATE_TSDOC: Ensure all methods in `ExcelService` have comprehensive TSDoc comments and reflect the new behavior.
    - [x] Add or update file-level and class-level TSDoc for `ExcelService` describing its role as the low-level Office.js wrapper and how it relates to `WorkbookService` and `ExcelTelemetryService`.
    - [x] Add method-level TSDoc for all public methods (`upsertQueryTable`, `activateQueryLocation`, ownership helpers, purge helpers, telemetry helpers) documenting parameters, return types, Office.js side effects, and error/telemetry behavior.
    - [x] Explicitly document where Office.js types remain `any` and where they are mapped into strongly typed models (e.g., `WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`).
    - [x] Look for opportunities to extract reusable helpers (e.g., header comparison, data row projection, safe resize operations, ownership-aware target selection) into private methods with clear TSDoc so they can be reused across query flows and future Excel features.
  - [x] REVIEW_DEPENDENCIES: Evaluate `@types/office-runtime` and related Office typings.
    - [x] Confirm what `@types/office-runtime` is designed to cover (Office.js runtime host APIs) and how it is used (if at all) in the current codebase.
    - [x] Inspect `/Users/erikplachta/repo/excel-extension/_ARCHIVE/_TEMPLATES/React_TS` to see how these types were used in the original template.
    - [x] Decide whether to keep, upgrade, or remove `@types/office-runtime` in this Angular app; if kept, document where and how it should be used in `ExcelService` and related wrappers.
  - [x] PLAN / WHAT'S NEXT:
    - [x] Finish TSDoc and dependency review so the Office.js wrapper surface is fully documented and strongly typed at the boundaries.
    - [x] Add a short "Office.js wrapper behavior" section to `CONTEXT-SESSION.md` describing overwrite-only semantics, ownership expectations, and how to safely evolve the geometry logic.

- [x] **Refactor excel-telemetry.service.ts and Update to application-telemetry**
  - [x] Act as an expert in TSDoc, Angular, Excel, Office.js, Excel Extensions, data driven design, modular design, API, and security
  - [x] REVIEW_CODE: Examine all methods in `TelemetryService` for proper Office.js usage and telemetry handling.
    - [x] Ensure each method correctly initializes and syncs the Office.js context.
    - [x] Validate that error handling is robust and provides meaningful feedback.
  - [x] UPDATE_TSDOC: Ensure all methods in `TelemetryService` have comprehensive TSDoc comments.
    - [x] Review `/Users/erikplachta/repo/excel-extension/src/app/core/excel-telemetry.service.ts`, and update with complete TSDoc comments at the File, Class, and Method levels. Complete documentation, no exception.
    - [x] Verify this class is a proper Angular service wrapper around Office.js telemetry functionality.
    - [x] Look for opportunities to extract logic and functionality that should be moved into helpers, like sorting, filtering, and general helper functions that can/should be used by the application as a whole.
  - [x] PLAN: Determine how this can be converted to manage logging for the whole app
    - [x] REMEMBER: Data driven design from CONFIG files.
    - [x] REMEMBER: TSDoc is critical for all new and existing code.
    - [x] What needs to be refactored and why?
      - [x] Generalize `TelemetryService` responsibilities from Excel-only operations to application-wide events, keeping Office.js usage behind host guards but allowing non-Excel callers to log via the same API.
      - [x] Ensure all features (queries, worksheets, settings, auth) call into `TelemetryService` instead of writing directly to `console` or ad-hoc log helpers, so logging behavior is centralized.
      - [x] Keep Office/Excel-specific logging paths isolated inside `TelemetryService` (and potentially small helpers) so that app-wide logging does not leak Office.js types into the rest of the app.
    - [x] What steps will you take?
      - [x] Treat `TelemetryService` as the single app-wide telemetry entry point and keep its public API host-agnostic (e.g., `logDebug`, `logSuccess`, `logError`, `normalizeError`), with Excel-specific log sinks remaining optional and guarded.
      - [x] Drive workbook logging configuration from `SettingsService`/config models (e.g., log sheet/table names, column labels, enable/disable flag) so telemetry destinations are fully data driven instead of hard-coded.
      - [x] Expand usage of `TelemetryService` incrementally across the app (beyond Excel operations) by refactoring components/services that currently log directly to the console to call the shared service instead, adding TSDoc for any new telemetry helpers or event shapes.

- [x] **Implement application-wide telemetry using TelemetryService and SettingsService**
  - [x] Design the app-wide telemetry event model
    - [x] Define a small set of event types/interfaces (e.g., `AppTelemetryEvent`, `WorkflowTelemetryEvent`, `FeatureTelemetryEvent`) in `src/app/types` with clear TSDoc and fields for category, name, context, and severity.
    - [ ] Decide which events should be emitted where (queries, worksheets, settings changes, auth flows) and document examples in `CONTEXT-SESSION.md`.
  - [x] Extend configuration and SettingsService for telemetry
    - [x] Add telemetry-related settings (enable console logging, enable workbook logging, session strategy, worksheet/table/column names) to `AppSettings`/`TelemetrySettings` in `src/app/types`.
    - [x] Ensure `SettingsService` continues to load/merge defaults correctly and that new settings are documented with TSDoc.
  - [x] Refactor core services/components to use `TelemetryService`
    - [x] Replace direct `console.*` calls in core Excel paths with `TelemetryService.logEvent` so logging is centralized and enriched with app context.
    - [x] Add helper methods on `TelemetryService` to represent common app-level events (e.g., `createWorkflowEvent`, `createFeatureEvent`), keeping Office.js-specific logic internal.
  - [x] Verify telemetry behavior and configuration
    - [x] Add or update unit tests around `TelemetryService` and `SettingsService` to cover new settings, event shapes, and behavior (no-op outside Excel, host-guarded workbook logging, config-driven names/columns).
    - [x] Manually validate in Excel that enabling workbook logging via Settings results in appropriate rows being appended to the log table for key operations, and that disabling it reverts to console-only logging.
  - [x] Document the telemetry model and usage
    - [x] Update `CONTEXT-SESSION.md` with a short "Application telemetry" section describing `TelemetryService`'s role, event types, and config knobs, and how it relates to Excel-specific logging.
    - [x] Add a brief note in `README.md` under a telemetry/logging subsection pointing contributors to `TelemetryService`, `SettingsService`, and the telemetry settings for adding new telemetry events.

- [x] **Implement data driven and modular query parameter management (global + per-query)**
  - [x] Extend query types to support a shared parameter set
    - [x] Define a typed parameter key/value model in `src/app/types` (e.g., `QueryParameterKey` and `QueryParameterValues` for `StartDate`, `EndDate`, `Group`, `SubGroup`).
    - [x] Extend `QueryDefinition` to declare which parameters it participates in (e.g., `parameterKeys?: QueryParameterKey[]`) so behavior stays data driven.
  - [x] Extend `QueryStateService` for global + per-query parameters and run-selection flags
    - [x] Add `globalParams`, `queryParams`, and `queryRunFlags` to `QueryStateSnapshot` with strict typing.
    - [x] Add helpers to get/set global params, per-query overrides, and per-query `Run` checkbox state.
    - [x] Add a helper to compute effective parameters for a query in a given mode (`global` vs `unique`) and map them into `ExecuteQueryParams`.
  - [x] Persist parameter state per user + workbook
    - [x] Back the new `QueryStateService` fields with `localStorage` using stable, documented keys, hydrating on construction and persisting on change.
    - [x] Keep storage access encapsulated so it can later be swapped for workbook-level metadata without touching callers.
  - [x] Implement global parameter UI on the Queries view
    - [x] Add a top-of-view section in `QueryHomeComponent` to edit global `StartDate`/`EndDate` (date inputs) and `Group`/`SubGroup` (dropdowns with placeholder options).
    - [x] Bind this UI to `QueryStateService.getGlobalParams()`/`setGlobalParams()` so values persist and reload correctly.
  - [x] Implement per-query Run checkbox and override/details panel
    - [x] Add a `Run` checkbox to each query row, bound to `queryRunFlags[query.id]` and disabled when Excel is not detected or the user lacks permission.
    - [x] Reuse the existing `show-details` action to open a per-query details panel in `QueryHomeComponent` that edits per-query overrides using the same parameter model.
    - [x] Persist per-query overrides via `QueryStateService.setQueryParams()` and ensure they load correctly on refresh.
  - [x] Add batch Run flows for global vs unique parameters
    - [x] Add two top-level Run buttons to `QueryHomeComponent`: "Run – Use Global Params" and "Run – Use Unique Parameters".
    - [x] Implement handlers that collect selected queries (via `Run` checkboxes), compute effective parameters per query (`global` vs `unique`), and call a shared `runSingle` helper that wraps existing `runQuery` behavior.
    - [x] Ensure per-row Run actions (if kept) also invoke the shared helper so telemetry and error handling are consistent.
  - [x] Integrate parameters into telemetry
    - [x] Emit batch-level telemetry events (e.g., `query.batch.run.requested/completed/failed`) including mode (`global`/`unique`), query ids, and a summarized parameter snapshot.
    - [x] Extend existing single-query events (`query.run.*`) to include mode and effective parameters in their context payload.
    - [x] Verify that telemetry respects Settings (console vs workbook logging) and that parameter payloads remain compact and safe to log.
  - [x] Add tests and TSDoc for new behavior
    - [x] Extend `QueryStateService` specs to cover new fields, effective parameter calculation, and `localStorage` hydration/persistence.
    - [x] Extend `QueryHomeComponent` specs to cover Run checkbox behavior, new Run buttons, host/role guards for these flows, and telemetry invocations.
    - [x] Add or update TSDoc on all new types and public methods introduced for parameter management so they align with the repo’s strict typing and documentation standards.

- [x] **Quick update to style of Queries so more Mobile/Taskbar Friendly**
  - [x] List should be easier to view.
  - [x] Content more organized and easier to work with.
  - [x] Expand on this concept before you get started (just rough draft notes).

- [ ] **Add new Query feature Where all Available Queries exist, User Can Select which Queries to Add to Workbook, and Users Can Save/Edit/Load Configurations**
  - [ ] This will be a sub-feature within queries itself
  - [ ] Queries Page no longer shows a list of all available queries, it's instead of a list of Queries User wants to have within the workbook based on the master list of available queries.
  - [ ] The same query can be loaded more than once and have different parameters
  - [ ] When a new query is added, a mini-form appears to allow user to define 1. Source Query, 2. Parameters, Target Tab name, Target Table Name
  - [ ] Once a query is added to the workbook, it appears in the list of queries for that workbook.
  - [ ] When users want to modify the query config, they can click on details and make the approriate change(s)
  - [ ] User can Name, Save, Rename, Modify and Delete Query Configuration(s), which are a collection of queries against existing API Endpoints that are customized based on user's need.
  - [ ] We'll need to design a `QueryConfiguration` model that captures a named set of query selections, parameter values (global + per-query), and rerun behaviors (overwrite) so a “report configuration” can be reused.
  - [ ] Implement local storage of configurations keyed by user and workbook context, leveraging the existing auth state to keep configurations scoped to the signed-in user.
  - [ ] Add UI affordance's to create, rename, “save as”, delete, and restore configurations (soft-delete), making it easy to manage multiple report presets.
  - [ ] Prepare the configuration layer for a future backend API by isolating storage concerns behind a service (e.g., `QueryConfigurationService`) with a clear interface that can later be backed by HTTP instead of local storage.
  - [ ] Ensure that loading a configuration updates the query list, parameter panels, and any Excel tables in a predictable, observable way, and that failures are logged and surfaced via the host-status/banner UX.
  - [ ] Use existing UI Components for this design, like Cards, Buttons, List, status-banner, table, etc. We may need to make like for the form.

### 12. Resolve NPM I Issues

- [ ] **Run NPM I, Verify Issue, and Help Resolve**
  - [ ] Run `npm install` locally and capture the full console output (including any warnings or errors) so we have an exact record of the current failure/success state.
  - [ ] Identify and document any dependency, peer dependency, or engine/version mismatches reported by npm (for example, Node version incompatibilities or deprecated packages).
  - [ ] Cross-check `package.json` and lockfile (`package-lock.json` if present) against the reported issues to determine whether they stem from outdated constraints, missing fields, or conflicting versions.
  - [ ] Propose and implement a minimal, safe fix for the identified `npm install` issues (such as adjusting a version range, adding a missing dependency, or updating a script), keeping changes focused and consistent with the existing toolchain.
  - [ ] Re-run `npm install` after applying fixes to confirm a clean install, then summarize the root cause and resolution steps in `CONTEXT-SESSION.md` under a short "NPM install issues" subsection.

### 13. Refine UI and UX

This section needs to be built out more. The goal is to start polishing and solidifying the design so we can continue with the concept.

> Everything should stay data-driven, modular, etc.

- [ ] **UI: Update content visibility based on Auth**
  - [ ] Hide content that current user doesn't have auth to use
    - [ ] NAV buttons
    - [ ] Some queries or settings that require admin
    - [ ] Anything else you see

- [ ] **UX: Redesign User Component**
  - [ ] GOALS:
    - [ ] User Design Refinement
      - [ ] UI: Profile Information Section
        - [ ] Display user's name, email, and role prominently
        - [ ] Add profile picture placeholder
    - [ ] UI: Location is top-right corner in nav
    - [ ] UI: Sign Out Button
      - [ ] Clear and accessible sign-out button within User component
      - [ ] Confirmation dialog on sign-out

- [ ] **UX: Redesign Settings Component**
  - [ ] GOALS:
    - [ ] Settings Design Refinement
      - [ ] UI: General Settings Section
        - [ ] Options for theme selection (light/dark)
      - [ ] UI: Data Management Section
        - [ ] Clear cache option
        - [ ] Export data option
      - [ ] UI: Debug Section
        - [ ] FEAT: Enable Logging to table, control table name, tab name, tab visibility, etc.
        - [ ] UI: App State Component in nav so can verify all current details
      - [ ] UI: Add Section for Export & Submit Logs
        - Capture current state of user session and application state
        - Provide a button to send logs via api endpoint

- [ ] **UX: Redesign Queries View for Better Organization**
  - [ ] GOALS:
    - [ ] Queries Design Refinement
      - [ ] QUERIES: Top Level Queries Component
        - [ ] Navigation should continue to drive to this top level Queries
        - [ ] UI: Filters should exist and work. (doesn't seem to affect the list/table below at this time.)
        - [ ] FEAT: Users should be able to RUN ALL queries from a button above the table
        - [ ] FEAT: Parameters should exist here that are related to all queries.
          - [ ] This will be a feature within Queries and Query and should be fully data-driven.
          - [ ] It should be fully data-driven from the config, but for example: Start Date, End Date, and Group
        - [ ] UI: This Component should just list all visible queries as a table.
          - [ ] Each row should have buttons to RUN, GO TO TABLE, and DETAILS
          - [ ] Each row should show status of last run (time, success/failure)
          - [ ] Each row should show if admin only or not (badge or icon)
          - [ ] Each query should have a high-level Category and SubCategory defined. These should be shown in the table as well. (maybe doesn't exist yet.)
        - [ ] FEAT: Table of Queries
      - [ ] QUERY: New Query Component
        - [ ] USAGE: Users navigate here from Queries to individual query via Details button
        - [ ] UI: Back button exists on top of component followed by BreadCrumb for easy location awareness and navigation back up
        - [ ] FEAT: Includes Parameters feature for the query itself, so possibly more parameters than on top level
        - [ ] TODO: ADD MORE DETAILS HERE

- [ ] **UI: Update Styling for Better Usability**
  - [ ] Improve spacing and alignment for better readability.
  - [ ] Use consistent font sizes and colors to enhance visual hierarchy.
  - [ ] Ensure buttons and interactive elements are easily tappable on mobile devices.

- [ ] **UX: Improve Navigation Flow**
  - [ ] Simplify navigation to frequently used features.
  - [ ] Add breadcrumbs or indicators to help users understand their location within the app.
  - [ ] Ensure smooth transitions between views.

### 14. Building out Authentication

- [ ] **Update UI for Authentication**
  - [ ] Refine homepage

- [ ] **Review Current Mock configuration**
  - [ ] Examine existing mock authentication setup in `AuthService` and `AuthApiMockService`.
  - [ ] Identify gaps and areas for improvement in simulating real-world authentication flows.

- [ ] **Integrate `office-addin-sso` package into AuthService**
  - [ ] Research and understand the `office-addin-sso` package and its capabilities for handling SSO in Office Add-ins.
    - [ ] See `/Users/erikplachta/repo/excel-extension/_ARCHIVE/_TEMPLATES/SSO` for reference
    - [ ] Identify how it can be integrated into the existing `AuthService`.
    - [ ] Determine how we could

## 15. Review and Finalize Jasmine/Karma Testing

- [ ] **Confirm baseline test runner behavior is stable**
  - [x] Fix the Angular/Karma wiring so `npm test` (via `ng test`) builds the webpack bundle (no more `404: /_karma_webpack_/main.js`) and actually executes specs in Chrome/ChromeHeadless.
  - [x] Verify that all existing spec files under `src/**.spec.ts` are discovered and run, including `src/app/core/workbook.service.spec.ts` for workbook ownership helpers.
  - [ ] Periodically re-run `npm test -- --watch=false --browsers=ChromeHeadless` after major refactors (shell, features, Excel helpers) to confirm the runner still starts cleanly and Chrome is captured without manual intervention.

- [ ] **Align legacy specs with the current data-driven design**
  - [ ] Update specs that assume the old shell/SSO behavior (e.g., `AppComponent`, `SsoHomeComponent`) so they assert against the current data-driven banners, auth state, and host-status messages instead of outdated DOM selectors.
  - [ ] Ensure feature specs (`QueryHomeComponent`, workbook-related tests) stub `ExcelService.isExcel` and `AuthService` role helpers appropriately so tests exercise the right guard paths (Excel vs non-Excel, permission vs no-permission) without depending on real Office.js or localStorage.
  - [ ] Remove or refactor any brittle expectations that couple tests too tightly to specific CSS classes or layout details that are now driven by `AppConfig`/UI primitives.

- [ ] **Stabilize workbook ownership and Excel interaction tests**
  - [ ] Finish cleaning up `WorkbookService` ownership specs so they cover happy paths and edge cases (managed table exists, conflicting user table, no table) without relying on nullable targets or implementation details; prefer explicit stubs for `getWorkbookTables`/`getWorkbookOwnership`.
  - [ ] Add or refine tests that exercise the Excel guard behavior (queries and navigation) in a deterministic way, keeping Office.js calls behind `ExcelService`/`WorkbookService` boundaries and using stubs/mocks instead of real Excel.
  - [ ] Once specs are stable, revisit the "Fix Jasmine/Karma test runner so Excel/workbook specs execute" checklist under Section 12 and mark it fully complete.

- [ ] **Document the testing strategy in CONTEXT-SESSION.md**
  - [ ] Add a "Jasmine/Karma testing" subsection summarizing how the test runner is wired (Angular 20 + `karma.conf.cjs` + `src/test.ts` bootstrap), the expected `npm test` command(s), and known constraints (e.g., Office.js calls must be guarded or mocked).
  - [ ] Briefly describe the layering of specs (core services, features, helpers) and how to add new tests in a way that respects strict typing and the data-driven design (use shared types, avoid `any` outside Office boundaries).
  - [ ] Capture any recurring patterns or pitfalls discovered during the current round of test fixes (e.g., host/role guards firing before deeper logic) so future changes can avoid re-introducing similar issues.

## 15. Research Class Driven Styles

This section still needs to be built out, but the goal is to make it flexible for Class Driven Style systems like TailwindCSS

- [ ] **Prepare primitives for Tailwind adoption**
  - [ ] Research and define a Tailwind (or other class-driven) strategy for the UI primitives that keeps feature code using typed variants while mapping variants to class lists inside the primitives.
  - [ ] Plan how to migrate styling from existing CSS files into class-driven definitions in primitive templates with minimal disruption.
  - [ ] Identify and document any build-time changes needed (e.g., Tailwind config, purge paths) without implementing them on this branch.

- [ ] **Verify integrity of Migration Guidelines**
  - [ ] After each migration of a view to primitives or class-driven styles, verify behavior, responsiveness, and accessibility (focus order, keyboard interaction) to avoid UX regressions and adjust config/text as needed.
