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

- [ ] **Implement data driven and modular query parameter management (global + per-query)** (subset of [11. Refine & Improve Excel Functionality](TODO.md#11-refine--improve-excel-functionality))

### Goals

- Support a data-driven query parameter model with **global defaults** plus **per-query overrides**, starting with a shared parameter set: `StartDate` (date), `EndDate` (date), `Group` (string), `SubGroup` (string).
- Provide a clear UX where:
  - Global parameters are edited on the main Queries view.
  - Per-query overrides are edited in a details view/panel.
  - Two top-level Run buttons exist: "Run – Use Global Params" (batch across selected queries) and "Run – Use Unique Parameters" (batch using per-query overrides).
  - Each query row has a `Run` checkbox controlling whether it participates in global runs.
- Persist parameter choices and run-selection flags **per user + workbook**, using `QueryStateService` backed by `localStorage` (with a clear abstraction ready for future workbook-level metadata storage).
- Ensure all query executions (single or batch, global or unique) use the **effective parameter set** (global defaults merged with per-query overrides) and pass the correct values into `QueryApiMockService.executeQuery`.
- Emit **telemetry events** for query runs that capture:
  - Which mode was used (`global` vs `unique`).
  - Which queries were executed.
  - The effective parameter values per query (within reasonable limits for logging).
- Keep the implementation consistent with the existing data-driven patterns (types in `src/app/types`, state via `QueryStateService`, UI via primitives and config), with strict typing and TSDoc.

### Current implementation snapshot (what already exists)

- **Query domain and state**
  - `QueryDefinition`, `QueryParameter`, `QueryRun`, and `QueryRunLocation` are defined in `src/app/types` and re-exported via `shared/query-model.ts`.
  - `QueryApiMockService` exposes `getQueries()`, `getQueryById()`, and `executeQuery(queryId, params)` with a small set of mock queries (sales summary, top customers, inventory, user audit, JSONPlaceholder users).
  - `QueryStateService` maintains an in-memory snapshot with:
    - `queries: QueryDefinition[]` (loaded from `QueryApiMockService`).
    - `lastParams: Record<string, ExecuteQueryParams>` per query id.
    - `lastRuns: Record<string, QueryRun | undefined>` per query id.
  - `QueryStateService` provides helpers to get/set last-used params and last run info per query.

- **Query UI / Queries view**
  - `QueryHomeComponent` lists queries and supports actions via `QueryUiConfig`/`QueryUiActionConfig` (e.g., `run-query`, `go-to-table`, `show-details`).
  - Role-based visibility is enforced using `AuthService` (queries require analyst/admin roles, with some admin-only queries).
  - Host-based guards use `ExcelService.isExcel` to disable query execution and navigation outside Excel.
  - `runQuery(query)` currently:
    - Verifies Excel host and permissions.
    - Uses `QueryStateService.getLastParams(query.id) ?? {}` as parameters.
    - Calls `QueryApiMockService.executeQuery` and passes rows to `ExcelService.upsertQueryTable` (overwrite-only for now).
    - Records last run info (time, row count, location) via `QueryStateService.setLastRun`.
    - Emits telemetry events (`query.run.requested`, `query.run.completed`, `query.run.failed`).
  - `goToLastRun(query)` navigates to the last run’s table (or best-guess table) using `WorkbookService`/`ExcelService`.

- **UI primitives and config**
  - UI primitives (`ButtonComponent`, `DropdownComponent`, `SectionComponent`, `TableComponent`/`ListComponent`) exist under `src/app/shared/ui` and are already used by query and shell views.
  - Text and labels are centralized via `APP_TEXT`.
  - Shell layout and nav behavior are driven by `AppConfig` and UI config types (`NavItemConfig`, layout hints), and query UI behavior is driven by `QueryUiConfig`.

- **Telemetry and persistence patterns**
  - `TelemetryService` provides app-wide telemetry (`AppTelemetryEvent`, `WorkflowTelemetryEvent`, etc.), including `createWorkflowEvent` and `logEvent`, with an optional workbook log sink.
  - `AuthService` demonstrates a pattern for persisting auth state across reloads via `localStorage` with a clear, typed abstraction.

### Active refinement work (what this focus will change)

- **Extend types for parameters**
  - Introduce a small, shared parameter key/value model in `src/app/types`, for example:
    - `type QueryParameterKey = "StartDate" | "EndDate" | "Group" | "SubGroup";`
    - `interface QueryParameterValues { StartDate?: string; EndDate?: string; Group?: string; SubGroup?: string; }`
  - Extend `QueryDefinition` with optional metadata such as `parameterKeys?: QueryParameterKey[]` to indicate which of the global set a given query uses.
  - Keep values as strings (e.g., ISO dates) initially to avoid Date vs JSON issues and keep execution mock-friendly.

- **Extend QueryStateService for global + per-query params**
  - Extend `QueryStateSnapshot` to include:
    - `globalParams: QueryParameterValues` (defaults for all queries).
    - `queryParams: Record<string, QueryParameterValues>` (per-query overrides).
    - `queryRunFlags: Record<string, boolean>` (per-query `Run` checkbox state for batch runs).
  - Add helpers:
    - `getGlobalParams() / setGlobalParams(values: QueryParameterValues)`.
    - `getQueryParams(queryId) / setQueryParams(queryId, values)`.
    - `getQueryRunFlag(queryId) / setQueryRunFlag(queryId, value)`.
    - `getEffectiveParams(query, mode: "global" | "unique"): ExecuteQueryParams` that maps `QueryParameterValues` into the existing `ExecuteQueryParams` shape.

- **Persist per user + workbook**
  - Add a light-weight persistence layer inside `QueryStateService` using `localStorage` keys such as:
    - `excel-ext:queries:globalParams`.
    - `excel-ext:queries:queryParams`.
    - `excel-ext:queries:runFlags`.
  - On service construction, hydrate from storage with defensive parsing.
  - Whenever global/query params or run flags are updated, write the updated slice back to storage.
  - Keep the storage access encapsulated so it can later be swapped for workbook-level metadata (e.g., a dedicated worksheet or custom properties).

- **Global parameter UI on Queries view**
  - In `QueryHomeComponent`, introduce a `globalParams: QueryParameterValues` property bound to `QueryStateService.getGlobalParams()`.
  - Add a top-of-view UI section (using `SectionComponent`, `DropdownComponent`, and standard inputs) to edit:
    - `StartDate` / `EndDate`: date inputs bound to ISO strings.
    - `Group` / `SubGroup`: dropdowns backed by placeholder `UiDropdownItem[]` options (to be replaced later by real, data-driven lists).
  - On change, call `setGlobalParams` so the state and storage are updated immediately.

- **Per-query Run checkbox and details/overrides**
  - Add a `Run` checkbox to each query row:
    - Bound to `getQueryRunFlag(query.id)`.
    - Disabled when the user cannot run that query or when `!excel.isExcel`.
    - Toggle handler calls `setQueryRunFlag`.
  - Reuse the existing `show-details` action in `QueryUiConfig` to open a per-query details panel within `QueryHomeComponent` (for now):
    - Track `selectedQuery: QueryDefinition | null` and `selectedQueryParams: QueryParameterValues`.
    - Load overrides via `getQueryParams(query.id)` when opening details.
    - Render editors for the same parameter set, scoped to the selected query.
    - Persist changes via `setQueryParams(selectedQuery.id, values)`.

- **New Run flows (global vs unique)**
  - Add two top-level Run buttons in `QueryHomeComponent`:
    - `onRunAllGlobal()`:
      - Collect all queries where `queryRunFlags[query.id]` is true and `canRun(query)`.
      - For each, compute `params = getEffectiveParams(query, "global")`.
      - Call a shared `runSingle(query, params, "global")` helper that wraps the existing `runQuery` logic.
    - `onRunAllUnique()`:
      - Same as above, but use `getEffectiveParams(query, "unique")` based on per-query overrides.
  - Refactor the existing per-row Run behavior to go through the same helper (likely with `mode: "unique"` and query-specific params), so telemetry and error handling are consistent.

- **Telemetry integration**
  - For each run path (per-row and batch/global/unique), emit enriched telemetry events via `TelemetryService`:
    - Batch events: `query.batch.run.requested/completed/failed` with context including:
      - `mode: "global" | "unique"`.
      - `queryIds: string[]`.
      - Optionally, a summarized parameter snapshot.
    - Single-query events: continue to use `query.run.*` events, but extend context to include `mode` and the effective parameters for that query.
  - Ensure telemetry respects existing settings (console vs workbook logging) and keeps parameter payloads reasonably compact.

- **Tests and TSDoc**
  - Extend or add specs for `QueryStateService`:
    - Verify default/empty state for new fields.
    - Verify set/get behavior for global and per-query parameters and run flags.
    - Verify effective param resolution for both modes.
    - Verify localStorage hydration and persistence logic.
  - Extend `QueryHomeComponent` specs to cover:
    - Guard behavior when Excel is not detected or user lacks roles (existing patterns).
    - New Run buttons and run-checkbox behaviors (which queries are included).
    - That telemetry is invoked with correct `mode`, `queryIds`, and parameter snapshots.
  - Add or refine TSDoc for new types and methods introduced as part of this work so they align with the repo’s strict typing and documentation standards.

### Manual validation scenarios (for this focus)

- Start the dev server and sideload the add-in into Excel.
- On the Queries view:
  - Set global `StartDate`/`EndDate` and `Group`/`SubGroup` values; reload the page and confirm they persist.
  - For a given query, open the details panel and set per-query overrides; reload and confirm they persist separately from global defaults.
  - Use the `Run` checkbox to select a subset of queries and click "Run – Use Global Params"; confirm only selected queries run and that they use the global parameters.
  - Click "Run – Use Unique Parameters" and confirm that per-query overrides are respected (e.g., by inspecting written tables or telemetry logs).
  - Inspect the telemetry console and/or workbook log table to confirm that each run records mode, query ids, and parameter snapshots.
- Toggle Excel/host state (e.g., run outside Excel) and confirm that Run buttons and checkboxes are disabled or guarded appropriately.

<!-- END:CURRENT-FOCUS -->
