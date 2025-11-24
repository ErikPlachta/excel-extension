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

- [ ] **Refactor Queries feature into API-centric configuration model without breaking existing behavior** (Section 12 in `TODO.md`)

### Goals

- Preserve the current Queries behavior during the refactor by cloning it into a `queries-old` surface that can be exercised via an internal route without impacting end users.
- Clarify terminology in the query domain so that **APIs** (catalog entries) and **queries** (invocations) are clearly distinguished in types, TSDoc, and mock services, while avoiding breaking changes to public APIs in the early phases.
- Establish a phased path (Phase 0–4) for moving from the current flat Queries list to an API catalog + per-workbook selected queries + named configurations, with clear exit criteria for retiring `queries-old`.
- Keep all changes aligned with existing patterns: strict typing in `src/app/types`, `QueryStateService` as the state hub, and query/Excel behavior guarded via `AuthService` and `ExcelService.isExcel`.

### Current implementation snapshot (what already exists)

- **Query domain and state**
  - `QueryDefinition`, `QueryParameter`, `QueryRun`, and `QueryRunLocation` are defined in `src/app/types` and re-exported via `shared/query-model.ts`.
  - `QueryApiMockService` exposes `getQueries()`, `getQueryById()`, and `executeQuery(queryId, params)` with a set of mock definitions that currently use the term "query" for both the catalog entry and the invocation.
  - `QueryStateService` maintains an in-memory snapshot with query definitions, global and per-query parameters, run flags, and last runs, backed by `localStorage`.

- **Query UI / Queries view**
  - `QueryHomeComponent` lists queries and supports actions via `QueryUiConfig`/`QueryUiActionConfig` (e.g., `run-query`, `go-to-table`, `show-details`).
  - Role-based visibility is enforced using `AuthService` (queries require analyst/admin roles, with some admin-only queries).
  - Host-based guards use `ExcelService.isExcel` to disable query execution and navigation outside Excel.
  - `runQuery` and the newer batch flows already use the effective parameter model and integrated telemetry; this behavior should be preserved in `queries-old`.

- **UI primitives and config**
  - UI primitives (`ButtonComponent`, `DropdownComponent`, `SectionComponent`, `TableComponent`/`ListComponent`) exist under `src/app/shared/ui` and are already used by query and shell views.
  - Text and labels are centralized via `APP_TEXT`.
  - Shell layout and nav behavior are driven by `AppConfig` and UI config types (`NavItemConfig`, layout hints), and query UI behavior is driven by `QueryUiConfig`.

- **Telemetry and persistence patterns**
  - `TelemetryService` provides app-wide telemetry (`AppTelemetryEvent`, `WorkflowTelemetryEvent`, etc.), including `createWorkflowEvent` and `logEvent`, with an optional workbook log sink.
  - `AuthService` demonstrates a pattern for persisting auth state across reloads via `localStorage` with a clear, typed abstraction.

### Active refinement work (what this focus will change)

- **Phase 0: Terminology and documentation alignment**
  - Review `src/app/types/query.types.ts`, `src/app/shared/query-model.ts`, and `src/app/shared/query-api-mock.service.ts` to clarify in TSDoc and comments that APIs are catalog entries and queries are invocations, without yet renaming public types.
  - Add a concise "Current Queries behavior" section to `CONTEXT-SESSION.md` that describes the existing flat Queries view, parameter model, and telemetry events for use as a regression baseline.

- **Phase 1: Safety copy of existing Queries feature**
  - Create a `QueryHomeOldComponent` (or similarly named component) by copying the current `QueryHomeComponent` and its HTML/CSS/spec into a `queries-old` subfolder under `src/app/features/queries`.
  - Duplicate any local view-model helpers or config objects needed so `queries-old` compiles independently of the new refactor while continuing to rely on shared services like `QueryStateService` and `QueryApiMockService`.
  - Add an internal-only route in `src/app/core/app.routes.ts` (e.g., `/queries-old`) pointing to `QueryHomeOldComponent` but do not expose it in the main navigation.
  - Run the Angular test suite (`npm test -- --watch=false --browsers=ChromeHeadless`) and perform basic Excel smoke tests to confirm that the primary Queries view remains unchanged and that the `/queries-old` route renders the copied experience correctly.

### Manual validation scenarios (for this focus)

- Start the dev server and sideload the add-in into Excel.
- Navigate to the existing Queries view and confirm:
  - The list of queries, parameter behavior, and telemetry appear unchanged compared to the previous branch.
- Manually browse to the internal `/queries-old` route (once added) and verify:
  - The UI matches the existing Queries view closely enough to serve as a reference.
  - Running a query from `queries-old` still writes data into Excel tables and logs telemetry as expected.
- After creating `queries-old`, run:

  ```bash
  npm test -- --watch=false --browsers=ChromeHeadless
  ```

  and confirm that tests still execute and any failures are unrelated to the new safety copy.

<!-- END:CURRENT-FOCUS -->
