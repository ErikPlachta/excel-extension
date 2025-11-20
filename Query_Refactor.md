# Queries Refactor: Configuration & Workbook Selection

This document collects decisions for the refactor of the existing Queries experience into a more API-centric, configuration-driven design.

- All available **APIs** (what we previously called "queries" in the mock layer) live in a **master catalog**.
- A **query** is an invocation of one of these APIs with a specific parameter set and target; a configuration may contain multiple queries against the same API.
- Each workbook has its own **selected queries** list, derived from the API catalog.
- Users can **save / load / edit named configurations** consisting of multiple selected queries + parameters + targets.
- The current Queries feature will be preserved as a `queries-old` surface during the refactor to avoid regressions while the new design is built.

Fill in the sections below; once this is stable we can translate it back into a clean TODO epic and phase plan.

---

## 1. Scope & Phasing

### 1.1 Overall phases

phase

- **Question 1.1.1**: How do you want to phase this work?
  - [ ] Phase 0: Terminology and documentation alignment (query vs API) without behavior changes.
  - [ ] Phase 1: Clone current Queries feature into `queries-old` (component + templates + helpers) and wire it behind a hidden/internal route or flag for safety.
  - [ ] Phase 2: Build new API catalog + per-workbook selected queries on top of existing services, keeping telemetry and Excel behavior intact.
  - [ ] Phase 3: Add named configurations, persistence, and configuration UX.
  - [ ] Phase 4: Introduce queued execution and resource-aware behavior (single-query-at-a-time, pagination, and throttling controls).
  - [ ] Phase 5: Cleanup/migrate away from `queries-old` once parity and stability are verified.
  - **Notes / preferences:**
    - Suggested concrete steps for Phase 0:
      - Review `src/app/types/query.types.ts`, `src/app/shared/query-model.ts`, and `src/app/shared/query-api-mock.service.ts` to clarify in TSDoc and comments that APIs are catalog entries and queries are invocations, without renaming public types yet.
      - Add a "Current Queries behavior" subsection to `CONTEXT-SESSION.md` capturing the existing flat Queries view, parameter model, and telemetry events.
    - Suggested concrete steps for Phase 1:
      - Copy the current `QueryHomeComponent` and its HTML/CSS/spec into a `queries-old` subfolder (for example, `QueryHomeOldComponent`) under `src/app/features/queries`.
      - Duplicate any local view-model helpers or UI config objects the component depends on so `queries-old` compiles independently.
      - Add an internal-only route (e.g., `/queries-old`) in `src/app/core/app.routes.ts` pointing to `QueryHomeOldComponent`, without exposing it in the main nav.
      - Run `npm test -- --watch=false --browsers=ChromeHeadless` and a minimal Excel smoke test to ensure behavior of the primary Queries view is unchanged.

- **Question 1.1.2**: If we phase it, which is the **higher priority** to ship first once `queries-old` exists?
  - [ ] A: New catalog + per-workbook selected queries (implicit default configuration; no naming yet).
  - [ ] B: Minimal named configurations on top of current flat list (even if catalog/UX is basic).
  - **Notes / rationale:**

### 1.2 Safety and regression strategy

- **Question 1.2.1**: How do you want to expose `queries-old`?
  - [ ] Internal-only route (e.g., `/queries-old`) not shown in nav.
  - [ ] Feature flag / Settings toggle to switch between old and new views.
  - [ ] Both (route + toggle) during development, then remove before ship.
  - **Notes:**

- **Question 1.2.2**: What must be verified before we can fully switch off `queries-old`?
  - [ ] All existing Queries specs still pass (or are updated) under the new implementation.
  - [ ] Manual Excel smoke tests for key scenarios (single run, batch run, overwrite/append, error surfacing).
  - [ ] Telemetry parity for core events (`query.run.*`, `query.batch.*`, workbook logging).
  - [ ] Other:
  - **Exit criteria for retiring `queries-old`:**

---

## 2. Data Model: Selected Queries & Configurations

### 2.1 Selected query entry

A selected query entry represents one **query** instance (a call against a specific API) inside a workbook/config.

- **Question 2.1.1**: For a single **selected query entry**, which fields are required?
  - [ ] `apiId` of source `ApiDefinition` (formerly `QueryDefinition` in the mock layer)
  - [ ] Display name/label for this query instance (e.g., "Sales Summary – North")
  - [ ] Effective parameter values (resolved global + per-query)
  - [ ] Target worksheet name
  - [ ] Target table name
  - [ ] Write mode (overwrite/append)
  - [ ] Include-in-batch flag
  - [ ] Other:
  - **Notes / decisions:**

### 2.2 Parameter storage strategy

- **Question 2.2.1**: How should a configuration store parameter values?
  - [ ] A: Store **raw parameter values** inside the configuration (self-contained snapshot).
  - [ ] B: Store only references (query ids), and recompute params from current global/per-query state when loading.
  - [ ] C: Hybrid (store snapshot, but allow refresh from current globals on demand).
  - **Preferred approach & why:**

- **Question 2.2.2**: How strict should we be about **schema changes** (added/removed parameters)?
  - [ ] Best-effort: ignore unknown keys; missing keys fall back to defaults.
  - [ ] Strict: detect mismatches and warn the user.
  - **Notes:**

### 2.3 QueryConfiguration shape

- **Question 2.3.1**: For the top-level `QueryConfiguration`, which fields are required?
  - [ ] `id`
  - [ ] `name`
  - [ ] `description`
  - [ ] `createdAt` / `updatedAt`
  - [ ] `ownerUserId` (if needed)
  - [ ] `selectedQueries: QueryConfigurationItem[]`
  - [ ] Workbook identity / hint
  - [ ] Other:
  - **Notes / final field list:**

---

## 3. UI Surfaces & Navigation

### 3.1 Where this lives

- **Question 3.1.1**: Where should the **master catalog vs workbook selection** live in the UI?
  - [ ] Inside the existing Queries view as two tabs/sections:
    - Tab A: Catalog (all available queries)
    - Tab B: Selected queries for this workbook
  - [ ] Separate sub-views under Queries (e.g., "Catalog" and "Workbook queries").
  - [ ] Other:
  - **Preferred structure:**

- **Question 3.1.2**: Where do users **name and switch configurations**?
  - [ ] Dropdown at the top of the Queries view (e.g., select active configuration).
  - [ ] Dedicated "Manage configurations" sub-page.
  - [ ] Both (simple switcher in main view, advanced management page elsewhere).
  - **Preferred UX:**

### 3.2 Add/modify flows

- **Question 3.2.1**: When the user clicks **"Add query"** (i.e., add a query instance) from the API catalog, what happens?
  - [ ] Instantly create an entry with defaults, then open an **inline mini-form** in place.
  - [ ] Open a **modal/wizard mini-form** first, and only add the entry once they save.
  - **Preferred flow & why:**

- **Question 3.2.2**: Multiple instances of the same query
  - How should multiple instances be visually disambiguated?
    - [ ] Auto-label (e.g. `Sales Summary #1`, `Sales Summary #2`).
    - [ ] Require a user-defined display name for each instance.
    - [ ] Combination (auto-name but editable).
  - **Preferred behavior:**

- **Question 3.2.3**: Editing an existing query config entry
  - When users click **Details** on a selected query, what can they edit?
    - [ ] Parameters only.
    - [ ] Parameters + target sheet/table.
    - [ ] Parameters + target + display name.
    - [ ] Other:
  - **Notes:**

---

## 4. Config Load/Save Behavior

### 4.1 Loading configurations

- **Question 4.1.1**: When a user loads a configuration, what should happen?
  - [ ] Only **UI state** changes (selected query list + params in UI), and the user decides when to run.
  - [ ] Additionally offer a **"Run this configuration now"** button after load.
  - [ ] Automatically run all selected queries immediately on load.
  - **Preferred behavior (and any guardrails):**

- **Question 4.1.2**: Should loading a configuration **overwrite** the existing `QueryStateService` global/per-query state?
  - [ ] Yes, replace current global + per-query params with those stored in the configuration.
  - [ ] No, keep configuration params separate and only use them when running.
  - [ ] Hybrid: ask the user whether to sync configuration params into global/per-query state.
  - **Decision:**

### 4.2 Deleting configurations

- **Question 4.2.1**: When a configuration is deleted, what happens to Excel tables?
  - [ ] Do nothing: tables remain; only metadata is removed.
  - [ ] Optionally offer to **purge extension-managed tables** associated with that configuration.
  - **Preferred default & any confirmation requirements:**

---

## 5. Persistence & Identity

### 5.1 Scoping

- **Question 5.1.1**: How should configurations be scoped?
  - [ ] Per **user + workbook** only (recommended for now).
  - [ ] Per user across all workbooks (reusable presets).
  - [ ] Mix: per user + workbook by default, with an option to "export/import" configs.
  - **Preferred scope:**

### 5.2 Storage strategy

- **Question 5.2.1**: For an initial `QueryConfigurationService`, how should we store configs in localStorage?
  - [ ] Single key `excel-ext:query-configs` with `{ [workbookKey]: { [userId]: QueryConfiguration[] } }`.
  - [ ] One key per workbook (e.g., `excel-ext:query-configs:<workbookKey>`).
  - [ ] Other:
  - **Preference & any constraints:**

- **Question 5.2.2**: How do we want to identify the **workbook** in this first iteration?
  - [ ] Simple heuristic (e.g., user-provided workbook name in Settings).
  - [ ] Excel metadata (only if easily accessible via WorkbookService today).
  - [ ] Start with a single-workbook assumption and revisit later.
  - **Decision:**

---

## 6. Telemetry Expectations

- **Question 6.1**: Which configuration-related events should we definitely log?
  - [ ] `query.config.create`
  - [ ] `query.config.update`
  - [ ] `query.config.delete`
  - [ ] `query.config.load`
  - [ ] `query.config.run`
  - **Additional events or required fields (e.g. configId, queryIds, row counts):**

---

## 7. MVP Definition

Use this to mark what must land in the **first shippable version**.

- **MVP checkboxes** (copy/paste into TODO once agreed):
  - [ ] Master **catalog** of all available queries.
  - [ ] Per-workbook **selected queries list** separate from catalog.
  - [ ] Ability to add multiple instances of the same query with independent params/targets.
  - [ ] Inline or modal **mini-form** for Source Query + Parameters + Target sheet/table.
  - [ ] A minimal `QueryConfiguration` model and `QueryConfigurationService` storing configs per user + workbook in localStorage.
  - [ ] Basic **named configuration** support: create, rename, delete, load.
  - [ ] Clear, minimal telemetry for create/load/run of configurations.

- **Non-goals for MVP (explicitly postponed):**
  - (List anything you want to push to Phase 2+.)

---

## 8. Open Questions / Notes

Use this space to jot down any additional constraints, risks, or ideas that should influence the final TODO rewrite.

- **Open question 8.1:**
- **Open question 8.2:**
- **Notes:**
