# TODO: Excel Extension Refactor (feat/add-logic)

This file tracks the concrete steps for refactoring the add-in to a template-aligned architecture (taskpane, commands, helpers, middle-tier, SSO) and how to verify each change.

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

## 9. Query Domain & Role-aware Features

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

- [ ] **Define core query domain model**
  - Introduce `QueryDefinition`, `QueryParameter`, and `QueryRun` types in a shared file.
  - Capture: query id/name/description, parameter definitions, default sheet/table naming, and last-run metadata.

- [ ] **Implement mock query API service**
  - Add a `QueryApiMockService` that returns a fixed list of `QueryDefinition`s and simulates `executeQuery(queryId, params)` with deterministic rows.
  - Keep all behavior in-process (no real HTTP).

- [ ] **Add QueryStateService for parameters and runs**
  - Track available queries, last-used parameters per query, and last-run info (sheet/table names, timestamps).
  - Expose helpers like `getQueries()`, `getLastParams(queryId)`, `setLastParams(queryId, params)`, `getLastRun(queryId)`, and `setLastRun(queryId, runInfo)`.

- [ ] **Extend ExcelService for query tables**
  - Add helpers to create/update tables and sheets for a query run, including default name generation with user overrides.
  - Ensure everything is guarded by `isExcel` and behaves safely when not in Excel (for unit tests).

- [ ] **Build query UI components**
  - Home summary component: list queries, last run time, row counts, and table locations.
  - Global parameters component: define global parameters and provide a "Refresh all" action.
  - Query management component: show/edit `QueryDefinition`, parameters, last run info, and expose Run/Refresh actions.

- [ ] **Wire navigation to Excel artifacts**
  - In query-related views, surface "Go to sheet/table" actions that use `ExcelService` to select/activate the corresponding sheet/table when in Excel.
  - Provide a no-op or helpful message when not running inside Excel.

- [ ] **Apply roles to features**
  - Use roles from `AuthService` to control which features are visible/editable (e.g., only some roles can modify query definitions; all authenticated users can run/refresh).
  - Gate navigation links and actions accordingly in the SPA shell and query components.
