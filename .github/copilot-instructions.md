# Copilot Instructions: excel-extension

Purpose: Enable AI coding agents to be productive immediately in this Angular-based Excel task pane app, with an emphasis on doing complete, end-to-end passes over requested work instead of partial or piecemeal edits, while avoiding redundant restatements or unnecessary narration.

## Core Guidelines

1. Understand the app is an Angular 20 task pane for Excel using standalone components and Office.js, with Excel integration wrapped in `ExcelService` and guarded by `isExcel`, and workbook-level access exposed through a shared `WorkbookService` instead of ad hoc calls in individual components.
2. Focus on manifest compliance with the Office Add-ins Development Kit, prioritizing `dev-manifest.xml` for local development and sideloading in Excel.
3. Use `_TEMPLATES/` Dev Kit sample manifests as canonical references for structure, especially `<Resources>`, icon definitions, and HTTPS requirements.
4. Ensure any changes to `dev-manifest.xml` maintain localhost for `SourceLocation` to facilitate easy local sideloading.
5. Treat the three planning files as follows, and keep them in sync:
   - `TODO.md` → the single source of truth for **actionable tasks and subtasks** (every concrete piece of work is a checkbox, and completed work is marked `[x]` with wording updated to reflect reality).
   - `CONTEXT-SESSION.md` → the **branch/session-level narrative**, describing overall goals, architecture, and how major features fit together; no granular task tracking here.
   - `CONTEXT-CURRENT.md` → the **current-focus sandbox**, a zoomed-in view for the active subset of work (goals, snapshot, active refinement notes, manual validation scenarios) tied to one or more unchecked TODOs.
   - When asked to update planning/checklist docs (like `TODO.md`, `CONTEXT-SESSION.md`, or `CONTEXT-CURRENT.md`), prefer a single comprehensive pass over the requested scope (e.g., an entire section) rather than touching only the immediately-adjacent bullets.
   - Parent/child semantics for checklists: do **not** mark a parent-level checklist item as completed (`[x]`) until **all** of its direct child tasks are `[x]`, unless the user explicitly says otherwise in the current session. Treat parent items as epics and child items as the source of truth for actual work.
6. You can and should defer to running scripts that require me to provide you the results of the command (e.g., manifest validation) rather than trying to simulate or guess the output yourself.
7. Do not re-explain or re-summarize content that was already clearly stated in the immediately preceding turn unless the user explicitly asks for a recap or clarification.
8. When the user says "proceed", "continue", or "next" after you have proposed a plan or options, treat that as approval to **execute the previously proposed next steps immediately**, without asking again.

## Big Picture

- Framework: Angular 20 with standalone components (no NgModules). Entry at `src/main.ts` bootstraps `AppComponent` with `provideRouter(routes)` in `src/app/core/app.config.ts`.
- Excel integration: Office.js is loaded via script tag in `src/index.html` and `public/index.html`. `ExcelService` (`src/app/core/excel.service.ts`) wraps Office JS (`Excel.run`) and exposes an `isExcel` guard to safely detect host. `WorkbookService` (`src/app/core/workbook.service.ts`) provides shared, strongly typed helpers for getting tabs/sheets and tables so all features use a common, data-driven workbook abstraction.
- UI/Routes: SPA shell in `AppComponent` under `src/app/core/` with feature views under `src/app/features/` (SSO home, home, worksheets, tables, user, queries). Routes are defined in `src/app/core/app.routes.ts` but in Excel we typically render the shell directly instead of navigating by URL.
- Deployment: GitHub Pages via workflow `.github/workflows/deploy.yml` and composite action `.github/actions/deploy/action.yml`. Build output published from `dist/excel-extension/browser` with base href `/excel-extension/`.
- Add-in manifest: `dev-manifest.xml` points the Office task pane to the dev server (localhost) during development, and `prod-manifest.xml` points to the deployed site on GitHub Pages.

## Developer Workflows

- Install deps:
  - `npm ci`
- Local dev server (Angular):
  - `npm start` (alias for `ng serve`) → <http://localhost:4200/>
  - Watch build: `npm run watch` (note: `npm run watch`, not `npm watch`)
- Unit tests (Karma/Jasmine):
  - `npm test` (alias for `ng test`)
- Production build:
  - `npm run build` (alias for `ng build`)
- Deploy (GitHub Actions):
  - Push to `main` triggers `.github/workflows/deploy.yml`. It runs the composite action to build with `--base-href /excel-extension/` and publishes to `gh-pages`.

## Running Inside Excel (sideloading)

- The add-in manifest `dev-manifest.xml` is configured for the GitHub Pages URL. To use a different host (e.g., local dev), update:
  - `<SourceLocation DefaultValue="http(s)://host/index.html"/>`
  - Add corresponding `<AppDomain>` entries for the host.
- Components and templates already guard on `excel.isExcel`; outside Excel the UI shows "Excel not detected" and service calls return empty arrays.

## Copilot Mindset & Checklist Strategy

- When the user asks for updates to checklists, TODOs, or planning sections (like `TODO.md` section 12), interpret the request as applying to the **entire explicitly mentioned scope**, not just the lines the user quoted.
- Prefer doing **one full, consistent pass** over that scope (for example: “all items in section 12”) so there are no leftover bullets that silently violate the requested pattern (e.g., plain `-` bullets when the user asked for `- [ ]` / `- [x]`).
- If the scope is ambiguous (e.g., "some of the Excel TODOs"), ask for clarification once; if the scope is explicit ("all items in section 12"), do not narrow it—treat it as exhaustive.
- When converting narrative bullets into checkboxes, ensure **every discrete actionable task** is a checkbox, and that completion state (`[x]` vs `[ ]`) matches the actual codebase, not assumptions.
- Avoid repeated micro-edits across many turns; instead, plan the full transformation, apply it in one or a small number of coherent edits, and then summarize what changed.
- Do not repeat the same analysis, recap, or file-by-file description across consecutive answers; default to short delta-style updates that focus only on what changed since the last turn.

## Decision-Making & "Proceed" Semantics

- When the user says "proceed", "continue", or "next" after you have proposed a plan or options, treat that as approval to **execute the previously proposed next steps immediately**, without asking again.
- When a real choice is needed, present it explicitly and compactly, for example:
  - Option A: brief description.
  - Option B: brief description.
  - Option A+B: brief description if combining is viable.
- If the user does not pick an option but then says "proceed" or similar, choose the **safest, most incremental option** that keeps the checklist moving forward and clearly state which option you are executing.
- Keep decision prompts rare and high-signal; do not pause for choices on trivial or obviously reversible details.

## When the user must take action

- Whenever the user needs to perform manual steps (e.g., run a command locally, test behavior in Excel, or change a setting), describe them in a dedicated section using this exact pattern:

  ```markdown
  ### Steps For User to Take

  1. Do X (exact command or action), expect Y (what they should see), then report back any deviations or errors.
  2. Do Z (next concrete step), expect W, report if different.
  ```

- Steps must be:
  - Numbered, concrete, and copy-pastable where relevant (commands in fenced code blocks).
  - Explicit about what to expect after each step and what to report back if the expectation is not met.
  - Minimal and ordered—only the steps strictly necessary for the current diagnostic or verification.

### Local Excel sideload (localhost)

To run the task pane against your local dev server:

```xml
<!-- dev-manifest.xml -->
<DefaultSettings>
  <SourceLocation DefaultValue="http://localhost:4200/index.html"/>
  <!-- Revert to GitHub Pages value for deployment -->
</DefaultSettings>
<AppDomains>
  <AppDomain>http://localhost:4200</AppDomain>
  <AppDomain>http://127.0.0.1:4200</AppDomain>
</AppDomains>
```

## Conventions & Patterns

- Standalone components import `CommonModule` and use `styleUrl`/`templateUrl` sidecar files.
- Core/feature/shared structure:
  - `src/app/core/` for the root shell, `ExcelService`, `WorkbookService`, `AuthService`, and app bootstrap/config.
  - `src/app/features/` for views (SSO home, home, worksheets, tables, user, queries).
  - `src/app/shared/` for query domain models/services, utilities, and shared UI/config that support data-driven design.
- Routing & shell:
  - Routes live in `src/app/core/app.routes.ts` and are provided in `app.config.ts`.
  - Inside Excel the shell uses an internal `currentView` state (no URL changes) to switch between feature views; outside Excel the router can be used as needed.
- Office JS access pattern (follow this):
  - Always gate logic on `ExcelService.isExcel` before calling Excel APIs.
  - Prefer using `WorkbookService` for workbook-level operations (get tabs/sheets, get tables) in features instead of calling `ExcelService` or Office.js directly.
  - Use `Excel.run(ctx => { ...; return value; })` and `await ctx.sync()` after `load(...)` calls.
  - Keep Office/Excel globals as declared `any` (see `excel.service.ts`). If you add new API calls, follow the same pattern or introduce types intentionally.
- Data flow: Components call `ExcelService` in `ngOnInit` / lifecycle hooks and bind results to simple tables. Auth and roles flow through `AuthService`; query metadata and last runs flow through `QueryStateService`. No NgRx/HTTP involved; query execution is mocked via `QueryApiMockService`.

## Documentation & Tests Expectations

- Treat TSDoc and tests as non-optional for new work:
  - When you add or materially change a service, component, or exported type/interface under `src/app/**`, also add or update TSDoc so intent and usage are clear.
  - When you add or change behavior, extend or create matching unit tests (Karma/Jasmine) to exercise the new paths.
- Prefer updating existing specs alongside code changes (e.g., `*.spec.ts` next to the file you’re touching) rather than adding untested behavior.
- Avoid introducing `any` except at well-documented Office.js boundaries; keep types strict in app code and reflect that strictness in tests.

## Key Files

- App bootstrap: `src/main.ts`, `src/app/core/app.config.ts`
- Routes: `src/app/core/app.routes.ts`
- Core services/shell: `src/app/core/app.component.*`, `src/app/core/excel.service.ts`, `src/app/core/auth.service.ts`
- Feature views: `src/app/features/**` (sso, home, worksheets, tables, user, queries)
- Query domain: `src/app/shared/query-model.ts`, `src/app/shared/query-api-mock.service.ts`, `src/app/shared/query-state.service.ts`
- Workbook helpers: `src/app/core/workbook.service.ts` centralizes workbook/tab/table access for all features.
- Add-in manifest: `dev-manifest.xml`, `prod-manifest.xml`
- CI/CD: `.github/workflows/deploy.yml`, `.github/actions/deploy/action.yml`

## Practical Examples

- Guarding Excel usage in a component:

  ```ts
  async ngOnInit() {
    if (!this.excel.isExcel) return;
    this.tables = await this.excel.getTables();
  }
  ```

- Adding a new routed view:
  - Create `foo.component.ts` as standalone with `templateUrl/styleUrl`.
  - Add `{ path: 'foo', component: FooComponent }` to `routes` in `src/app/app.routes.ts`.
  - Link via `<a routerLink="/foo">Foo</a>` in `app.component.html`.

## Gotchas

- NPM scripts: use `npm run watch` (running `npm watch` will fail).
- Base href: GH Pages requires `--base-href /excel-extension/`. The workflow already sets this; match it if running the action locally.
- Tests: Office/Excel globals are undefined in Karma. The current pattern avoids calls when not in Excel; keep using `isExcel` guards or mock the globals if you add Office interactions in tests.
