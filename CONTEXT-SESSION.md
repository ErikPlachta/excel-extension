Date: 2025-11-16  
Repository: excel-extension

## Overview

Angular 20 task-pane app for Excel using standalone components and Office.js. Excel integration is wrapped by `ExcelService` with an `isExcel` guard. We now have:

- A validated `dev-manifest.xml` for local sideloading.
- A modern lint/test stack (ESLint 9, Angular + Office add-in tooling).
- CI for all PRs and CD to GitHub Pages from `main`.

The current big-picture focus is: **running and testing the extension locally in Excel** with a predictable dev flow.

## Current State Snapshot

- **Dev server:** `npm start` → `ng serve` at <http://localhost:4200/>.
- **HTTPS dev (optional):**
  - `npm run dev-certs` (calls `scripts/install-dev-certs.mjs` using `office-addin-dev-certs`).
  - `npm run start:dev` → `ng serve --configuration development --ssl true --ssl-cert ~/.office-addin-dev-certs/localhost.crt --ssl-key ~/.office-addin-dev-certs/localhost.key`.
- **Excel integration:** `ExcelService.isExcel` guards Office JS calls so the app can run outside Excel safely. Inside Excel, `AppComponent` bypasses the Angular router and renders `SsoHomeComponent` directly; outside Excel, the router/nav are enabled and `/`, `/worksheets`, `/tables` routes work normally.
- **Manifests:**
  - `dev-manifest.xml` points to localhost (Angular dev server) and is used for sideloading during development.
  - `prod-manifest.xml` points at the GitHub Pages deployment and is aligned with the Dev Kit structure.
- **Manifest validation:**
  - Dev Kit installed; `npm run validate:dev-manifest` uses `office-addin-manifest` to validate `dev-manifest.xml`.
- **Linting/formatting:**
  - ESLint 9 flat config in `eslint.config.mjs` using `@typescript-eslint` and `@angular-eslint` plus `eslint-plugin-office-addins`.
  - HTML templates linted via Angular template parser; static `public/` HTML ignored.
  - Prettier config via `.prettierrc.js` → `office-addin-prettier-config`.
- **Testing:**
  - Unit tests via Karma + Jasmine using `ChromeHeadless`.
  - Local: `npm test -- --watch=false --browsers=ChromeHeadless`.

## CI/CD Snapshot

- **CI (`.github/workflows/ci.yml`):**
  - Trigger: `pull_request` on all branches.
  - Steps: `npm ci` → `npm run lint` → `npm run build` → `npm run test -- --watch=false --browsers=ChromeHeadless`.
  - Purpose: gate all PRs with lint, build, and tests.
- **CD (`.github/workflows/deploy.yml`):**
  - Trigger: `push` to `main` (typically merging `develop` → `main`).
  - Steps: `npm ci` → lint → tests (headless) → `npm run build -- --base-href /excel-extension/` → deploy via `peaceiris/actions-gh-pages` to `gh-pages`.
  - Effect: updates GitHub Pages only after tests pass on `main`.

## Local Dev & Testing Flows

### 1. Run the Angular app (outside Excel)

```bash
npm ci
npm start        # http://localhost:4200/
```

Use this for quick UI changes and basic behavior; Excel-specific features remain guarded by `ExcelService.isExcel` and will no-op outside Excel.

### 2. Run the Angular app over HTTPS (recommended for add-in testing)

```bash
npm run dev-certs   # install/trust dev certs (one-time per machine)
npm run start:dev   # ng serve with HTTPS and dev certs
```

This serves the app at an HTTPS localhost origin, which plays nicer with Office add-in requirements.

### 3. Sideload the add-in into Excel (local testing)

1. Ensure the dev server is running (HTTP or HTTPS):
   - HTTP: `npm start` → `http://localhost:4200/`
   - HTTPS: `npm run start:dev` → `https://localhost:4200/` (certs installed via `dev-certs`).
2. Validate the manifest if desired:

   ```bash
   npm run validate:dev-manifest
   ```

3. In Excel (desktop):
   - Go to **Insert → My Add-ins → Shared Folder / Upload My Add-in**.
   - Choose `dev-manifest.xml` from the repo.
   - Excel loads the task pane pointing to the Angular dev server.
4. Interact with the extension in Excel; Office JS calls go through `ExcelService`.

### 4. Run lint and tests locally

```bash
# Lint TypeScript + templates
npm run lint

# Office add-in–specific lint/format
npm run lint:office
npm run lint:office:fix
npm run prettier

# Unit tests (headless Chrome, CI-style)
npm test -- --watch=false --browsers=ChromeHeadless
```

## Focused TODO Checklist (testing the extension locally)

- [ ] Refine local testing docs in `README.md`:
  - Add a "Run in Excel (dev)" section that mirrors the steps above.
  - Clarify HTTP vs HTTPS dev options and when to use each.
- [ ] Add a short "Testing" section to `README.md` documenting `npm run lint`, `npm test`, and `lint:office` commands.
- [ ] Consider adding a simple e2e-style smoke test (manual or scripted) for "open task pane, read worksheets" to document expected behavior when `ExcelService.isExcel` is true.
- [ ] Keep `CONTEXT-SESSION.md` updated as workflows or manifests change, so it remains the live source of truth for:
  - Dev server behavior
  - Sideloading flows
  - CI/CD expectations

## Reference Commands (summary)

```bash
# Install deps
npm ci

# Dev server (HTTP)
npm run build  # dist/excel-extension/browser

# Dev server (HTTPS with Office dev certs)
```

npm run start:dev

# Validate dev manifest

npm run validate:dev-manifest

# Lint & test

npm run lint
npm test -- --watch=false --browsers=ChromeHeadless

```

```
