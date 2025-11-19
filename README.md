# ExcelExtension

Task pane add-in for Excel built with Angular 20 and standalone components. The Angular app runs inside the Office task pane and integrates with Excel via `ExcelService` and the Office.js runtime.

## Development server

Install dependencies and start the local dev server:

```bash
npm ci
npm start
```

`npm start` is an alias for `ng serve`. Once running, open <http://localhost:4200/>. The app reloads on file changes.

To build in watch mode:

```bash
npm run watch
```

## Building

Create a production build:

```bash
npm run build
```

Artifacts are emitted to `dist/excel-extension/browser` (Angular application builder). Production is the default configuration.

## Architecture

- `src/app` – Angular task pane shell and views
  - `app.component.*` – SPA shell with state-based navigation (SSO, Worksheets, Tables)
  - `sso-home.component.*` – mocked SSO experience (sign-in/out, fake user)
  - `worksheets.component.*` / `tables.component.*` – Excel data views using `ExcelService`
  - `excel.service.ts` – wrapper around Office.js (`Excel.run`) exposing `isExcel` and helpers
- `src/commands`
  - `commands.html` – entry page for ribbon commands, loads Office.js and `commands.js`
  - `commands.ts` – basic command handlers wired with `Office.actions.associate("showTaskpane", onShowTaskpane)`
- `src/helpers`
  - `sso-helper.ts` – helper for mocked SSO: returns fake auth result, access token, and user profile
- `src/middle-tier`
  - `app.ts` – stubbed middle-tier functions (`fetchTokenFromMiddleTier`, `getUserProfileFromGraph`) used by the SSO helper
- `dev-manifest.xml` / `prod-manifest.xml` – Office add-in manifests for local dev and GitHub Pages deployment

## Deployment

This repository includes a GitHub Actions workflow that builds the project and deploys the generated files to **GitHub Pages**. Any push to the `main` branch triggers the workflow. The workflow uses a custom composite action located in `.github/actions/deploy` to install dependencies, build the Angular application (with `--base-href /excel-extension/`), and publish the contents of `dist/excel-extension/browser` to the `gh-pages` branch.

No additional configuration is required; the workflow uses the built-in `GITHUB_TOKEN` to authenticate.

## Testing

Run unit tests with Karma/Jasmine in interactive/watch mode:

```bash
npm test
```

For CI/headless runs (single pass, no watch) use:

```bash
npm run test:ci
```

To capture full Jasmine failure output for later inspection or AI-assisted debugging, you can pipe the CI run to a log file:

```bash
npm run test:ci > test-results.log 2>&1
```

Linters and formatters:

```bash
npm run lint
npm run lint:office
npm run lint:office:fix
npm run prettier
```

Note: Office/Excel globals are undefined in Karma. Code paths are guarded behind `ExcelService.isExcel` (and the Office checks in `main.ts`) so tests can run outside Excel.

## Excel integration and sideloading

- Office.js is included via script tag in `src/index.html` and `public/index.html`.
- The `ExcelService` (`src/app/excel.service.ts`) wraps `Excel.run(...)` and exposes `isExcel` to safely detect the Excel host.
- Manifests:
  - `dev-manifest.xml` — local development against `https://localhost:4200/` (Angular dev server).
  - `prod-manifest.xml` — production/deployed site at `https://Erikplachta.github.io/excel-extension/`.

Local dev & sideload (recommended HTTPS flow):

```bash
npm ci
npm run dev-certs   # one-time per machine
npm run start:dev   # HTTPS dev server at https://localhost:4200/
```

Then, in Excel (desktop):

1. Ensure the dev server is running (`npm start` for HTTP or `npm run start:dev` for HTTPS).
2. Go to **Insert → My Add-ins → Upload My Add-in**.
3. Select `dev-manifest.xml` from this repo.
4. The task pane loads the Angular app from the dev server; Office.js calls go through `ExcelService`.

You can validate the dev manifest at any time with:

```bash
npm run validate:dev-manifest
```

For GitHub Pages, use `prod-manifest.xml`, which points to the deployed site. The deploy workflow already sets `--base-href /excel-extension/` at build time.

## Telemetry and logging

Telemetry for this extension is centralized in `TelemetryService` under `src/app/core/telemetry.service.ts` and configured via `TelemetrySettings` on `AppSettings` (see `SettingsService`).

- **Console logging:** When `enableConsoleLogging` is true in settings, application events (queries, workbook operations, and other features) are logged to the browser/Excel console with enriched context (session id, host status, auth summary).
- **In-workbook log table:** When `enableWorkbookLogging` is enabled and the host is Excel, a best-effort log of key operations is appended to a configurable worksheet/table (default `_Extension_Log` / `_Extension_Log_Table`). This is primarily useful for troubleshooting query runs and workbook ownership behavior directly inside Excel.
- **Error normalization:** Excel/Office.js operations return a typed `ExcelOperationResult`/`ExcelErrorInfo` instead of throwing raw errors, making it easier for components to show clear error messages while telemetry records structured details.

For a deeper description of event shapes, sinks, and where telemetry is emitted, see the "Application telemetry" section in `CONTEXT-SESSION.md`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
