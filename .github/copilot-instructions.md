# Copilot Instructions: excel-extension

Purpose: Enable AI coding agents to be productive immediately in this Angular-based Excel task pane app.

## Core Guidelines

1. Understand the app is an Angular 20 task pane for Excel using standalone components and Office.js, with Excel integration wrapped in `ExcelService` and guarded by `isExcel`.
2. Focus on manifest compliance with the Office Add-ins Development Kit, prioritizing `dev-manifest.xml` for local development and sideloading in Excel.
3. Use `_TEMPLATES/` Dev Kit sample manifests as canonical references for structure, especially `<Resources>`, icon definitions, and HTTPS requirements.
4. Ensure any changes to `dev-manifest.xml` maintain localhost for `SourceLocation` to facilitate easy local sideloading.
5. Keep `CONTEXT-SESSION.md` updated with the current state snapshot, manifest validation findings, and a focused TODO checklist. You should make the changes there as the source of truth for ongoing work. (Don't ask me to do this; just do it.)
6. You can and should defer to running scripts that require me to provide you the results of the command (e.g., manifest validation) rather than trying to simulate or guess the output yourself.

## Big Picture

- Framework: Angular 20 with standalone components (no NgModules). Entry at `src/main.ts` bootstraps `AppComponent` with `provideRouter(routes)` in `src/app/core/app.config.ts`.
- Excel integration: Office.js is loaded via script tag in `src/index.html` and `public/index.html`. `ExcelService` (`src/app/core/excel.service.ts`) wraps Office JS (`Excel.run`) and exposes an `isExcel` guard to safely detect host.
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
  - `src/app/core/` for the root shell, `ExcelService`, `AuthService`, and app bootstrap/config.
  - `src/app/features/` for views (SSO home, home, worksheets, tables, user, queries).
  - `src/app/shared/` for query domain models/services, utilities, and shared UI/config that support data-driven design.
- Routing & shell:
  - Routes live in `src/app/core/app.routes.ts` and are provided in `app.config.ts`.
  - Inside Excel the shell uses an internal `currentView` state (no URL changes) to switch between feature views; outside Excel the router can be used as needed.
- Office JS access pattern (follow this):
  - Always gate logic on `ExcelService.isExcel` before calling Excel APIs.
  - Use `Excel.run(ctx => { ...; return value; })` and `await ctx.sync()` after `load(...)` calls.
  - Keep Office/Excel globals as declared `any` (see `excel.service.ts`). If you add new API calls, follow the same pattern or introduce types intentionally.
- Data flow: Components call `ExcelService` in `ngOnInit` / lifecycle hooks and bind results to simple tables. Auth and roles flow through `AuthService`; query metadata and last runs flow through `QueryStateService`. No NgRx/HTTP involved; query execution is mocked via `QueryApiMockService`.

## Key Files

- App bootstrap: `src/main.ts`, `src/app/core/app.config.ts`
- Routes: `src/app/core/app.routes.ts`
- Core services/shell: `src/app/core/app.component.*`, `src/app/core/excel.service.ts`, `src/app/core/auth.service.ts`
- Feature views: `src/app/features/**` (sso, home, worksheets, tables, user, queries)
- Query domain: `src/app/shared/query-model.ts`, `src/app/shared/query-api-mock.service.ts`, `src/app/shared/query-state.service.ts`
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
