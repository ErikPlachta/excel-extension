# Context & Session Plan

Date: 2025-11-16  
Repository: excel-extension

## Overview

Angular 19 task-pane app for Excel using standalone components and Office.js. Excel integration is wrapped by `ExcelService` with an `isExcel` guard. The current focus is making our Office add-in manifest compliant using the Office Add-ins Development Kit and cleanly separating local/dev versus deployed manifests.

## Current State Snapshot

- Dev server: runs with live reload via `npm start` at <http://localhost:4200/>.
- **Primary focus:** `dev-manifest.xml` for local development and sideloading in Excel.
- Manifests:
  - `dev-manifest.xml` points to localhost and is the only manifest that matters until dev sideloading is working reliably.
  - `prod-manifest.xml` exists but is explicitly out of scope for now; it will be revisited only after the dev manifest is solid.
- Office Add-ins Dev Kit: installed in VS Code; manifest validation is wired via `office-addin-manifest validate` (e.g., `npm run validate:dev-manifest`).
- Resources: `resources.md` tracks key Microsoft docs for Office add-in development, sideloading, and the Dev Kit.
- Templates: `_TEMPLATES/` contains Dev Kit sample manifests (e.g., Taskpane, ManifestOnly) to use as canonical structural references.

## Manifest Validation Findings (from `dev-manifest.xml`)

- **Schema placement**: `IconUrl` and `HighResolutionIconUrl` are defined as top-level children of `OfficeApp`, which is invalid for schema `1.1`. Icons should be declared under a `<Resources>` section and referenced from settings, as in Dev Kit templates.
- **HTTPS requirement**: Dev Kit requires HTTPS for `SourceLocation` and icon URLs. Our localhost-based dev manifest uses `http://localhost:4200/...` and fails these checks.
- **Icon format**: Icon URLs currently end in `.svg` (`favicon.svg`, `icon-512.svg`), but Dev Kit requires bitmap formats such as `.png`.
- **Other checks**: ID, version, support URL, and basic structure validate successfully.

## Focused TODO Checklist (dev manifest first)

- [ ] Inspect Dev Kit template manifests under `_TEMPLATES/Taskpane` (or similar) to confirm the correct manifest structure, including `<Resources>`, icon definitions, and how `SourceLocation` is wired.
- [ ] Refactor **`dev-manifest.xml`** to:
  - Use the correct schema structure (no top-level `IconUrl` / `HighResolutionIconUrl`; define icons via `<Resources>`).
  - Keep pointing to localhost for `SourceLocation` so it remains convenient for dev sideloading.
  - Use supported icon file formats (e.g., `.png`) even in dev.
- [ ] Decide how strictly we want `dev-manifest.xml` to satisfy Dev Kit HTTPS checks:
  - Option A: Serve Angular over HTTPS localhost and make `dev-manifest.xml` fully compliant.
  - Option B: Accept that HTTP localhost may cause HTTPS-related warnings but is acceptable for local sideload testing, as long as schema errors are resolved.
- [ ] Update `README.md` and/or `resources.md` with a **dev-first flow**:
  - How to run `npm run validate:dev-manifest` and interpret results.
  - How to sideload `dev-manifest.xml` into Excel for testing.
  - A note that `prod-manifest.xml` is intentionally deferred until dev is solid.
- [ ] Only after `dev-manifest.xml` is working and reasonably validated, revisit `prod-manifest.xml` to align it with the final dev structure and HTTPS/icon expectations.

## Next Steps (high-level)

1. Use Dev Kit sample manifests in `_TEMPLATES` as the source of truth for structure (especially `<Resources>`, HTTPS rules, and supported icon formats).
2. Refactor `prod-manifest.xml` into a fully compliant, HTTPS, PNG-based manifest pointing at the GitHub Pages deployment.
3. Implement the chosen `dev-manifest.xml` strategy so that local sideloading remains simple but structurally aligned with the validated manifest.
4. Document the manifest flows (dev vs prod) and validation commands in `README.md` / `resources.md` so future work stays aligned with Office add-in best practices.

## Reference Commands

```bash
# Validate manifests via Dev Kit
npm run validate:dev-manifest

# Develop Angular task pane
npm ci
npm start  # http://localhost:4200/

# Build Angular app
npm run build  # dist/excel-extension/browser
```
