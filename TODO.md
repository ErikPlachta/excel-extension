# TODO: Excel Extension Refactor (feat/add-logic)

This file tracks the concrete steps for refactoring the add-in to a template-aligned architecture (taskpane, commands, helpers, middle-tier, SSO) and how to verify each change.

## 1. Baseline Verification

- [ ] **Run Angular dev server**
  - Command:
    - `npm ci`
    - `npm start` (or `npm run start:dev` for HTTPS)
  - Verify:
    - `http://localhost:4200/` loads without console errors.
    - Outside Excel, the UI shows a sensible "not in Excel" or equivalent state when `ExcelService.isExcel` is false (already true for `Home`, `Worksheets`, and `Tables` routes).

- [ ] **Validate manifest**
  - Command:
    - `npm run validate:dev-manifest`
  - Verify:
    - No schema errors.
    - Only expected HTTPS/localhost warnings, if any.

- [ ] **Sideload in Excel**
  - Steps:
    - Start dev server.
    - Upload `dev-manifest.xml` into Excel (Insert → My Add-ins → Upload).
  - Verify:
    - Taskpane opens and loads the Angular page.
    - No runtime errors reported by Excel or in the browser dev tools.

## 2. Taskpane Architecture Alignment

- [x] **Clarify/decide folder layout for taskpane**
  - Decision:
    - Keep Angular code in `src/app` and treat it as the taskpane module for now.
    - Revisit a physical rename to `src/taskpane` only after helpers/middle-tier/SSO wiring is stable.
  - Verify:
    - `npm start` and tests continue to run with the current layout.

- [ ] **Ensure Angular bootstrap matches template expectations**
  - Goal:
    - `src/main.ts` and the root component behave like the templates' `taskpane.ts` (Office `onReady`, initialization) while using Angular.
  - Verify:
    - When run inside Excel, initialization path is correct (no Office.js timing errors).
    - When run outside Excel, initialization is guarded via `ExcelService.isExcel` and does not crash.

## 3. Commands Surface

- [x] **Scaffold `src/commands`**
  - Create files:
    - `src/commands/commands.html`
    - `src/commands/commands.ts`
  - Use `_TEMPLATES/React_TS/src/commands` or `_TEMPLATES/Taskpane/src/commands` as reference:
    - Minimal `Office.actions.associate` handlers.
    - HTML that loads the compiled JS.
  - Verify:
    - `npm start` still works (Angular CLI serves `commands.html` or static asset depending on setup).
    - `npm test -- --watch=false --browsers=ChromeHeadless` passes with the new commands spec.

- [x] **Wire `Commands.Url` in manifests**
  - Update `dev-manifest.xml` (and later `prod-manifest.xml`):
    - Set `Commands.Url` to the correct URL (e.g., `https://localhost:4200/commands.html`).
    - Ensure `<ExtensionPoint xsi:type="PrimaryCommandSurface">` references the right resources.
  - Verify:
    - `npm run validate:dev-manifest` passes.
    - In Excel, the commands appear in the ribbon and invoking them triggers the handlers in `commands.ts` (check via console log or a simple alert for now).
    - Unit tests for `onShowTaskpane` continue to pass.

## 4. Helpers & Middle-tier (SSO Scaffolding)

- [ ] **Create `src/helpers` based on SSO template**
  - Add minimal copies/adaptations of:
    - `sso-helper.ts`
    - `middle-tier-calls.ts`
    - `message-helper.ts`
    - `error-handler.ts`
    - `fallbackauthdialog.*` (HTML/TS) as needed
  - Initial behavior:
    - Implement **mocked auth** (return fake user + token) instead of calling real SSO.
  - Verify:
    - Helpers compile and can be imported from the taskpane without TypeScript errors.
    - Running tests still works or is updated to mock any new global interactions.

- [ ] **Create `src/middle-tier` (placeholder)**
  - Mirror structure of `_TEMPLATES/SSO/src/middle-tier`:
    - Add stub `app.ts` and helper files (`msgraph-helper.ts`, etc.) as appropriate.
  - For now:
    - Keep the middle-tier logic minimal or mocked (no real network calls).
  - Verify:
    - Builds and tests succeed.
    - Any Node/server-specific code is not accidentally bundled into the browser build.

## 5. SSO-first Taskpane Experience (Mocked)

- [x] **Add SSO-focused route/view in Angular**
  - `SsoHomeComponent` shows mocked SSO user info with sign-in/sign-out.
  - In Excel (`excel.isExcel === true`), `AppComponent` renders `SsoHomeComponent` directly and bypasses the router.
  - Outside Excel, the router and nav are enabled and `SsoHomeComponent` is the default route.
  - Verify:
    - In Excel, opening the taskpane shows the SSO-like homepage (with fake user data).
    - Outside Excel, the app still behaves gracefully and the `/`, `/worksheets`, and `/tables` routes are reachable via nav when `excel.isExcel` is false.

- [ ] **Wire mocked SSO into helpers**
  - Behavior:
    - For local dev, `getAccessToken`/equivalent returns a static or deterministic fake token.
    - Expose fake user profile data to the Angular taskpane.
  - Verify:
    - Taskpane can render the mock SSO user with no network dependency.
    - There is a clear TODO comment or mechanism indicating where real SSO will plug in later.

## 6. Manifest Wiring & Resources Clean-up

- [ ] **Align `Taskpane.Url` with Angular entry**
  - Decide on final entry:
    - Keep `index.html` as the taskpane entry; or
    - Introduce `taskpane.html` that bootstraps Angular and point `Taskpane.Url` there.
  - Verify:
    - Sideloading in Excel opens the correct page.
    - Refreshing the taskpane does not break routing.

- [ ] **Review `<Resources>` and icons**
  - Ensure `<bt:Images>` and `<bt:Urls>` entries match real files:
    - Icon PNGs exist and are served by the dev server.
    - `Taskpane.Url`, `Commands.Url`, and any SSO dialog URLs are correct.
  - Verify:
    - `npm run validate:dev-manifest` clean.
    - Icons appear properly in the ribbon/taskpane.

## 7. Tooling & Config Adjustments

- [ ] **Update Angular and tooling configs if folders move**
  - If `src/app` is renamed to `src/taskpane`:
    - Update `angular.json` paths (`sourceRoot`, test/build options).
    - Update any path globs in `eslint.config.mjs` and Karma config.
    - Fix imports in TS/HTML.
  - Verify:
    - `npm start`, `npm run build`, `npm run lint`, and `npm test` all succeed.

- [ ] **Keep CI green**
  - When significant refactors land, ensure:
    - PR CI (`ci.yml`) passes lint + build + tests.
    - `deploy.yml` remains compatible (no path changes that break the build output `dist/excel-extension/browser`).

## 8. Documentation Updates

- [ ] **Update CONTEXT-SESSION.md**
  - Reflect the actual structure and decisions as they are implemented (not just planned).
  - Remove any stale assumptions.

- [ ] **Update README.md**
  - Document:
    - New folder layout: `taskpane`, `commands`, `helpers`, `middle-tier`.
    - How to run locally and sideload into Excel.
    - How mocked SSO behaves and where real SSO will plug in.
  - Verify:
    - A new contributor can follow README to run dev server, sideload, and understand high-level architecture.

## 9. Testing Strategy & Suite Onboarding

- [ ] **Clarify test scope and layering**
  - Define three layers:
    - Angular **unit/component tests** (Karma/Jasmine).
    - **Office/command script tests** (functions in `commands.ts`, helpers).
    - Optional **end-to-end/manual flows** for Excel + taskpane + commands.
  - Verify:
    - A short TESTING section in `README.md` lists these layers and how to run them.

- [ ] **Strengthen Angular test coverage**
  - Add/extend specs for:
    - Root taskpane shell (AppComponent / future Taskpane shell).
    - SSO-focused component (mocked SSO user + token).
    - Any components that interact with `ExcelService` (using `isExcel` guards and mocks).
  - Verify:
    - `npm test -- --watch=false --browsers=ChromeHeadless` passes.
    - New tests do not require Office globals (they use mocks or `isExcel` false).

- [ ] **Add unit tests for commands and helpers**
  - For `src/commands/commands.ts`:
    - Extract command handlers into testable functions.
    - Write Jasmine tests that call handlers with mocked `Office`/`Office.actions` objects.
  - For `src/helpers` (SSO, middle-tier calls, messaging):
    - Write tests that assert:
      - Mocked SSO returns deterministic fake tokens/user.
      - Middle-tier callers handle success/failure paths correctly (using spies/mocks, not real network).
  - Verify:
    - Command/helper tests run under Karma/Jasmine without needing a real Excel host.
    - Failing tests clearly indicate which script behavior broke.

- [ ] **Introduce lightweight integration checks for Office wiring (optional)**
  - Add a small suite (or a dedicated spec file) that:
    - Verifies `Office.onReady` handlers don’t throw when `Office` is mocked.
    - Confirms `Office.actions.associate` is called with expected IDs.
  - Verify:
    - These tests can run in CI (no real Office runtime), using simple JS mocks for `Office`.

- [ ] **Document how to run and interpret tests**
  - Update `README.md` and/or `CONTEXT-SESSION.md`:
    - Commands:
      - `npm test -- --watch=false --browsers=ChromeHeadless`
      - Any special command/helper test entry points if separated.
    - What each suite covers (Angular vs Office/commands vs SSO helpers).
  - Verify:
    - A new contributor can run tests and understand whether a failure is in Angular UI, Office wiring, or SSO/middle-tier mocks.

```

This `TODO.md` captures the steps plus their verification points. As we implement each chunk of work, we can check items off and refine any remaining gotchas. If you’d like, next I can propose the concrete code changes for the first couple of items (e.g., scaffolding `src/commands` and updating `dev-manifest.xml`).
```
