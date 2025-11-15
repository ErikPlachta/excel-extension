# Context & Session Plan

Date: 2025-11-15
Repository: excel-extension

## Overview

Angular 19 task-pane app for Excel using standalone components and Office.js. Routing provided in `app.config.ts`; Excel integration wrapped by `ExcelService` with safe `isExcel` gating. Deployed to GitHub Pages; manifests split for dev vs prod.

## Current State Snapshot

- Dev server: runs with live reload via `npm start` at <http://localhost:4200/>.
- Tests: fixed (3/3 passing). Provided router in TestBed and updated expectation to `.status` element.
- Manifests: `dev-manifest.xml` points to localhost (updated); `prod-manifest.xml` points to GitHub Pages (added).
- Build: `npm run build` produces `dist/excel-extension/browser`. GH Actions deploys on push to `main` with `--base-href /excel-extension/`.
- CI: `ci.yml` runs lint → build → test on PRs and pushes to `develop`; deploy composite action also lints before build.
- Key integration: Office.js script tag in `src/index.html` and `public/index.html`; `ExcelService` uses `Excel.run(...)` + `ctx.sync()` and `isExcel` guard.

## Dependencies Audit

- Angular: `@angular/*` aligned to `^19.2.7`; builder/CLI also `^19.2.7`.
- TypeScript: `~5.7.2` (compatible with Angular 19).
- RxJS: `~7.8.0` (OK). zone.js: `~0.15.0` (OK).
- tslib: `^2.6.2`.
- Test stack: Karma/Jasmine versions are fine for Angular 19 defaults.
- Node: Standardized via `.nvmrc` to 20 and `engines` set to `>=20 <23`.

## Integrity Findings

- Working:
  - Dev server, routing, and standalone components work as expected.
  - Excel integration follows safe pattern (gate on `isExcel`, `Excel.run`, `ctx.sync()`).
- Issues:
  - Unit tests failing (router not provided in TestBed; spec expects `<h1>` that doesn’t exist).
  - `public/index.html` duplicates the app shell; as an asset it can override the built `index.html` and cause subtle bugs. Risk to correctness.
  - PWA bits (manifest, `sw.js`) are present but not wired (no `<link rel="manifest">`, no SW registration).
  - No ESLint configuration; missing static checks.
  - No test/build CI on PRs/branches (only deploy on `main`).

## Risks & Considerations

- Duplicate `public/index.html` may override Angular’s `index.html` in output, causing broken base href and Office.js load order issues.
  - Constraint: do not modify `public/` (per project requirement). Accept current setup and monitor; if conflicts appear, prefer build configuration adjustments rather than file removal.
- Office.js is an external dependency; offline or network-limited environments won’t have Excel APIs—current guards mitigate this.

## TODO Checklist (ordered; completed items first)

- [x] Create `.github/copilot-instructions.md` (accelerates agent productivity).
  - Completed: Added concise architecture, workflows, Excel patterns, and gotchas.
- [x] Split manifests: `dev-manifest.xml` (localhost) and `prod-manifest.xml` (GH Pages).
  - Completed: `dev` points to `http://localhost:4200/`; `prod` points to GitHub Pages.
- [x] Update `README.md` with real workflows and sideload steps.
  - Completed: Start, watch, test, build, manifest usage documented.
- [x] Fix unit tests in `app.component.spec.ts` (restore CI signal).
  - Completed: Provided router via `provideRouter([])` and asserted `.status` element.
- [x] Standardize Node via `.nvmrc` and add `engines` in `package.json`.
  - Completed: `.nvmrc` set to 20; engines `>=20 <23`.
- [x] Add CI workflow to run `npm ci`, `npm run lint`, `npm run build`, and `npm test`.
  - Completed: `ci.yml` added; sequence lint → build → test.
- [x] Add ESLint and `npm run lint`.
  - Completed: Minimal `@angular-eslint` config and script added.
- [x] Align Angular packages to `^19.2.7` and bump `tslib` to `^2.6.2`.
  - Completed: All core/runtime Angular packages updated; build verified earlier.
- [x] Lint on deploy workflow.

  - Completed: Composite deploy action lints before building.

- [ ] Keep `public/` untouched (project requirement).
  - Priority: High (ongoing). Address any asset conflicts via build configuration, not file changes.
- [ ] Optional: Wire PWA (link manifest in `src/index.html`, add guarded SW registration) or leave inert.
  - Priority: Medium. Recommend gating SW registration to production only to avoid Excel add-in caching surprises.
- [ ] Optional: Add `@types/office-js` for dev ergonomics while keeping runtime `any`.
  - Priority: Low. Consider only if you want intellisense; avoid enforcing types in service.

## Verification Steps

- Tests fixed:
  - Run `npm test` → expect all specs passing.
- Asset behavior:
  - Build and serve; confirm `src/index.html` shell is preserved and Office.js loads once. Monitor for any duplication due to `public/index.html` (do not modify `public/`).
- Linting:
  - Run `npm run lint` → no errors at baseline (or actionable list).
- CI:
  - New workflow runs on PR with green checks for lint/build/test.
- Version pinning:
  - `nvm use` picks Node 20; `node -v` matches CI.
- Manifests:
  - Sideload `dev-manifest.xml` → task pane loads from localhost.
  - Use `prod-manifest.xml` after deploy → loads from GitHub Pages.

## Reference Commands

```bash
# Develop
npm ci
npm start  # http://localhost:4200/

# Watch build (no server)
npm run watch

# Test
npm test

# Build
npm run build  # dist/excel-extension/browser
```

## Suggested Patch Snippet (Tests)

```ts
// src/app/app.component.spec.ts
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have the 'excel-extension' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.title).toEqual("excel-extension");
  });

  it("should render nav status element", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector(".status")).toBeTruthy();
  });
});
```
