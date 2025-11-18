# Context Current

<!-- BEGIN:COPILOT-INSTRUCTIONS -->

## Copilot Instructions (CONTEXT-CURRENT.md)

### How to use this file

- This file represents the **current focus** for the active chat/work session. It is a zoomed-in view on one subset of the broader branch context described in `CONTEXT-SESSION.md`.
- Do **not** track TODOs or checkboxes here—that is the responsibility of `TODO.md`. Instead, capture goals, implementation snapshots, active refinement notes, and manual validation scenarios for the currently selected focus.
- Do **not** track overall project or branch narrative here—that belongs in `CONTEXT-SESSION.md`. Keep this file tightly scoped to the immediate work at hand.
- Treat this file as a **scratchpad and sandbox** for the current focus: it should contain enough detail for the next few steps of work, but can be aggressively pruned or rewritten as the focus changes.
- At the start of a new focus, purge or replace the current-focus section so it reflects only the new work (usually tied to a specific unchecked item in `TODO.md` under the current Session Context heading).
- When updating this file, prefer short, structured sections (Goals, Snapshot, Active work, Manual scenarios) that stay in sync with the corresponding TODO items and the higher-level narrative in `CONTEXT-SESSION.md`.

## Understanding Session Context vs Current Focus vs Actionable Tasks

Task Management and Focus is managed by using 3 key files/documents with very precise rules and roles to prevent drift:

### 1. `SESSION-CONTEXT` = [CONTEXT-SESSION.md](CONTEXT-SESSION.md)

- High Level.
- Defines the overall context for the current branch.
- This is defined by an H2 in [TODO.md](TODO.md), and it encompasses all related tasks and subtasks.
- The current branch will be aligned to this.
- At the beginning of a new branch, the `## Current Focus` section in the file is updated with precise details about the branch focus.
  - User asks Copilot to review section in TODO, review full codebase, make sure file is up-to-date, and update Current Focus with required details based on it's understanding of our new focus.

### 2. `CURRENT-FOCUS` = [CONTEXT-CURRENT.md](CONTEXT-CURRENT.md)

- The Current Focus, this file, is a subset of the Session Context.
- It defines the specific current focus within the overall Session Context.
- It is more granular and specific.
- It is used to track the immediate focus of work.
- Each Current Focus in [CONTEXT-CURRENT.md](CONTEXT-CURRENT.md) should directly relate to a collection of TODOs in [TODO.md](TODO.md), under a category.
- A completed `Current Focus` looks like this:
  - `- [x] **Handle unreachable dev server / blank taskpane experience**` in [TODO.md](TODO.md#handle-unreachable-dev-server-blank-taskpane-experience).
  - It's technically not "current" because it's completed, but before it was checked `[x]` it was considered current.
  - So the current focus, then, is the next child-level list within the Session Context (header) that is not yet checked.
  - An active/current Current Focus example at time of writing this: `- [ ] **Improve Office.js Wrapper Logic**`
    - We know this because it's the next unchecked item in the list underneath the `SESSION-CONTEXT` H3 `### 11. Refine & Improve Excel Functionality`.

### 3. `ACTIONABLE-TASKS` = [TODO.md](TODO.md)

- TODO: Add notes here
- `ACTIONABLE-TASKS` = [TODO.md](TODO.md)
  - Our actionable tasks/todo and subtasks.
  - Each Current Focus in [CONTEXT-CURRENT.md](CONTEXT-CURRENT.md) should directly relate to a collection of TODOs in [TODO.md](TODO.md), under a category.
  - These are actionable steps, managed top-down, to be completed.
  - Example of Current Focus
    - Example: [11. Refine & Improve Excel Functionality](TODO.md#11-refine--improve-excel-functionality)

<!-- END:COPILOT-INSTRUCTIONS -->
<!-- BEGIN:CURRENT-FOCUS -->

## Current Focus

- [ ] **Resolve Jasmine/Karma Testing Suite Issues** (subset of [11. Refine & Improve Excel Functionality](TODO.md#11-refine--improve-excel-functionality))
- [ ] **Refine and Refactor Office.js Wrapper Logic** (subset of [11. Refine & Improve Excel Functionality](TODO.md#11-refine--improve-excel-functionality))

### Goals

- Restore and harden the Jasmine/Karma test runner so that `npm test` / `ng test` builds the bundle, serves `/_karma_webpack_/main.js` correctly, and executes all specs (including Excel/workbook-related ones) in Chrome/ChromeHeadless.
- Exercise Excel-related behavior in a host-agnostic way via specs (e.g., Excel guards, ownership helpers, `upsertQueryTable` when `Office` is undefined) while leaving real Office.js interaction to manual Excel validation.
- Ensure query reruns (overwrite and append) behave predictably and are verifiable:
  - Header rows are written exactly once (initial creation or full overwrite) and never duplicated by append.
  - Overwrite mode replaces table data body rows without moving headers or causing range-alignment errors.
  - Append mode appends data rows only, after verifying header compatibility, and falls back to safe overwrite behavior when headers differ.
- Keep all Excel interactions ownership-aware and safe for user tables by routing decisions through `WorkbookService` helpers.
- Maintain strong typing and TSDoc across `ExcelService`, workbook models, telemetry helpers, and their accompanying specs.
- Centralize success/error reporting for Excel operations via `ExcelTelemetryService` and `ExcelOperationResult`, and reflect this behavior in tests.

### Current implementation snapshot (what already exists)

- **Test runner wiring**
  - Angular 20 test target is configured in `angular.json` to use `@angular-devkit/build-angular:karma` with `tsconfig.spec.json` and polyfills (`zone.js`, `zone.js/testing`).
  - `karma.conf.cjs` is wired with the Angular Karma plugin, Jasmine, and Chrome/ChromeHeadless.
  - `src/test.ts` bootstraps Angular testing via `getTestBed().initTestEnvironment(...)` and imports the correct Zone.js testing patches.
  - `npm test` / `ng test` was recently observed to start Karma/Chrome but previously served `/_karma_webpack_/main.js` as 404 and ran 0 specs; this needs to be revalidated and fixed.

- **Existing Excel-related specs**
  - `src/app/core/workbook.service.spec.ts` tests workbook ownership helpers using spies/stubs over `ExcelService` to avoid real Office.js calls.
  - `src/app/core/excel.service.spec.ts` (new) verifies that `ExcelService.upsertQueryTable` returns a failure result and does not log success when `Office` is undefined (host-agnostic guard behavior).
  - Other feature specs (e.g., `QueryHomeComponent`) rely on stubbing `ExcelService.isExcel` and `AuthService` to exercise guard paths.

- **Workbook ownership model**
  - Ownership metadata is stored in a dedicated hidden worksheet (e.g., `_Extension_Ownership`) with rows keyed by `sheetName`, `tableName`, and `queryId`, plus flags like `isManaged` and `lastTouchedUtc`.
  - `WorkbookService` exposes typed helpers (`WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`) and operations such as:
    - `getSheets()`, `getTables()`, `getTableByName(name)`.
    - `getOwnership()`, `isExtensionManagedTable(table)`, `getManagedTablesForQuery(queryId)`.
    - `getOrCreateManagedTableTarget(query)` to choose safe sheet/table targets for query runs.
  - Excel features (Queries view, Tables view) rely on these helpers instead of making assumptions about table names.

- **ExcelService / query table behavior**
  - `ExcelService` is the low-level Office.js wrapper responsible for:
    - Creating/updating tables for query runs via `upsertQueryTable`.
    - Navigating to query tables via `activateQueryLocation`.
    - Reading/writing workbook ownership metadata.
    - Purging extension-managed tables and ownership metadata via `purgeExtensionManagedContent` (dev-only reset path).
    - Routing successes/failures through `ExcelTelemetryService` and returning `ExcelOperationResult` values.
  - `upsertQueryTable` currently honors a per-query `writeMode: 'overwrite' | 'append'` and returns a typed `ExcelOperationResult<QueryRunLocation>`; it also logs operation name, query id, target sheet/table, and row counts.
  - Query UI (`QueryHomeComponent`) provides a per-query "Write mode" dropdown (Overwrite vs Append) that feeds into `runQuery`, which in turn passes the selected `writeMode` into `ExcelService.upsertQueryTable`.

- **Telemetry and logging**
  - `ExcelTelemetryService` normalizes Office errors and successes into structured `ExcelOperationResult` values and writes to:
    - The console (always, when `isExcel` is true).
    - An optional in-workbook telemetry table when workbook logging is enabled via Settings (`TelemetrySettings` + `SettingsComponent`).
  - Logs include operation name, query id, sheet/table names, row counts, and normalized error details.

### Active refinement work (what this focus will change)

- **Karma/Angular runner diagnosis and fix**
  - Reproduce the previous failure where `npm test` started Karma/Chrome but reported `404: /_karma_webpack_/main.js` and executed 0 specs, capturing logs and exact configuration state.
  - Inspect and, if necessary, adjust the `angular.json` `test` target, `karma.conf.cjs`, and `src/test.ts` wiring so that the webpack bundle is built and served correctly for tests.
  - Ensure at least one trivial spec (for example in `excel.service.spec.ts`) runs and reports pass/fail to confirm the pipeline is healthy before relying on more complex specs.

- **Stubbing and guard patterns for Excel-related specs**
  - Standardize on host-agnostic patterns in unit tests: always rely on `ExcelService.isExcel` and stubs/mocks instead of real Office.js or a browser `Office` global.
  - Tighten `WorkbookService` and `ExcelService` specs so they exercise ownership and rerun decision logic through plain TypeScript types, avoiding `Excel.run` calls in tests.
  - Use these patterns to validate rerun decision logic (append vs overwrite, header match vs mismatch) even though actual header duplication/misaligned ranges are still verified manually in Excel.

- **Office.js usage review**
  - Audit all `ExcelService` methods that use `Excel.run` / `context.sync` to ensure:
    - Only required fields are loaded via `load`.
    - `context.sync()` is called before reading loaded properties.
    - `ExcelService.isExcel` is respected for all entry points and failure paths are typed.

- **Geometry and header behavior in `upsertQueryTable`**
  - Separate header and data behavior:
    - Establish clear internal helpers for working with header vs data ranges (e.g., `headerRange`, `dataBodyRange`).
    - Ensure overwrite/append operations manipulate only the appropriate range and keep header rows anchored.
  - Overwrite mode:
    - Create a new managed table (header + data) when no existing table is found for a query.
    - When a managed table exists, keep the header in place and clear/replace only the data body rows.
    - Avoid resizing the table in ways that misalign the header row with the new range.
  - Append mode:
    - Require an existing managed table; otherwise fall back to the overwrite path.
    - Load and compare existing vs new headers; append data rows only when headers match.
    - On mismatch, route through a safe overwrite strategy (e.g., new suffixed managed table) instead of forcing an unsafe resize.

- **Telemetry and observability**
  - Extend telemetry from `upsertQueryTable` and related helpers to log:
    - Selected `writeMode` (overwrite vs append).
    - Header match vs mismatch.
    - Geometry decisions (reuse existing table vs create new vs create suffixed table).
    - Any Office.js errors or range-alignment issues.
  - Keep logs consistent with the `ExcelOperationResult` model so query UI can display user-friendly error messages.

- **TSDoc and helper extraction**
  - Add file-, class-, and method-level TSDoc for `ExcelService`, explicitly documenting:
    - How it collaborates with `WorkbookService` and `ExcelTelemetryService`.
    - How ownership-aware behaviors work and when operations can safely mutate tables.
    - How callers should interpret `ExcelOperationResult` results.
  - Extract reusable private helpers for tasks such as:
    - Header comparison.
    - Data row projection.
    - Ownership-aware target resolution.
    - Safe table resizing and data clearing.

- **Type dependencies and Office typings**
  - Review `@types/office-runtime` and any related Office typings:
    - Understand what they cover and how they are (or are not) used in this Angular app versus archived templates.
    - Decide whether to keep, upgrade, or remove these type packages.
    - If kept, document preferred usage patterns in `ExcelService` and related wrappers.

### Manual validation scenarios (for this focus)

- **Baseline Karma/Chrome run**
  - Run `npm test -- --watch=false --browsers=ChromeHeadless`.
  - Confirm that Karma serves `/_karma_webpack_/main.js` without 404, Chrome launches, and at least one spec executes and reports.

- **Excel guard specs**
  - In `excel.service.spec.ts`, keep `Office` undefined and verify that `upsertQueryTable` returns a failure result and that `ExcelTelemetryService.logSuccess` is not called.
  - In `workbook.service.spec.ts`, verify that ownership helpers and table selection logic work correctly using stubs/mocks for `ExcelService` and workbook data.

- **Header duplication check (manual Excel)**
  - Run a query in overwrite mode; observe that a table with a single header row and data is created.
  - Rerun the same query in overwrite mode and verify that:
    - The header row remains in the same position.
    - Data rows are replaced but not duplicated.
    - No Excel errors about invalid ranges appear.

- **Append behavior check (manual Excel)**
  - Run a query in overwrite mode once to create the table.
  - Switch the query to append mode and run it again.
  - Verify that:
    - Header rows are not duplicated.
    - Data rows are appended to the existing table body.
    - Ownership metadata still points to the same managed table.

- **Header mismatch safety (manual Excel)**
  - Modify a query definition so the output schema changes (e.g., add/remove/rename a column) and run it against a workbook where a previous schema exists.
  - Verify that append mode:
    - Detects header mismatch.
    - Does not force a dangerous resize on the existing table.
    - Chooses a safe strategy (new suffixed table) and records ownership appropriately.

- **Purge and rerun (manual Excel)**
  - Use the dev-only purge action wired to `ExcelService.purgeExtensionManagedContent` to clear extension-managed tables and ownership metadata.
  - Rerun queries and confirm that tables and ownership records are recreated from a clean state with no stale geometry.

<!-- END:CURRENT-FOCUS -->
