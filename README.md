# ExcelExtension

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.7.

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

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

Create a production build:

```bash
npm run build
```

Artifacts are emitted to `dist/excel-extension/browser` (Angular application builder). Production is the default configuration.

## Deployment

This repository includes a GitHub Actions workflow that builds the project and deploys the generated files to **GitHub Pages**. Any push to the `main` branch triggers the workflow. The workflow uses a custom composite action located in `.github/actions/deploy` to install dependencies, build the Angular application (with `--base-href /excel-extension/`), and publish the contents of `dist/excel-extension/browser` to the `gh-pages` branch.

No additional configuration is required; the workflow uses the built-in `GITHUB_TOKEN` to authenticate.

## Running unit tests

Run unit tests with Karma/Jasmine:

```bash
npm test
```

Note: Office/Excel globals are undefined in Karma. Code paths are guarded behind `ExcelService.isExcel` to keep tests passing.

## Running end-to-end tests

This template does not include an e2e framework by default. Choose and configure one as needed.

## Excel integration and sideloading

- Office.js is included via script tag in `src/index.html` and `public/index.html`.
- The `ExcelService` (`src/app/excel.service.ts`) wraps `Excel.run(...)` and exposes `isExcel` to safely detect the Excel host.
- Manifests:
  - `dev-manifest.xml` — local development against `<http://localhost:4200/>`.
  - `prod-manifest.xml` — production/deployed site at `<https://Erikplachta.github.io/excel-extension/>`.

To sideload against the local dev server, edit `dev-manifest.xml`:

```xml
<DefaultSettings>
  <SourceLocation DefaultValue="http://localhost:4200/index.html"/>
</DefaultSettings>
<AppDomains>
  <AppDomain>http://localhost:4200</AppDomain>
  <AppDomain>http://127.0.0.1:4200</AppDomain>
</AppDomains>
```

For GitHub Pages deployment, use `prod-manifest.xml` which points to the deployed site. If needed, confirm `SourceLocation`:

```xml
<SourceLocation DefaultValue="https://Erikplachta.github.io/excel-extension/index.html"/>
```

The deploy workflow already sets the required `--base-href /excel-extension/` at build time.

Sideload steps in Excel (Mac/Windows):

1. Start the dev server: `npm start`
2. Excel → Insert → My Add-ins → Upload My Add-in → select `dev-manifest.xml` (for prod testing, use `prod-manifest.xml`).
3. The task pane will load from the specified `SourceLocation`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
