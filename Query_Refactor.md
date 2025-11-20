# Queries Refactor: Configuration & Workbook Selection

This document collects decisions for the new Queries experience where:

- All available queries live in a **master catalog**.
- Each workbook has its own **selected queries** list.
- Users can **save / load / edit named configurations** consisting of multiple selected queries + parameters + targets.

Fill in the sections below; once this is stable we can translate it back into a clean TODO epic.

---

## 1. Scope & Phasing

### 1.1 Overall phases

- **Question 1.1.1**: How do you want to phase this work?
  - [ ] Single big feature (master catalog + selected queries + named configurations all at once)
  - [ ] Phase 1: Per-workbook selected queries (no named configurations yet)
  - [ ] Phase 2: Add named configurations on top of Phase 1
  - **Notes / preferences:**

- **Question 1.1.2**: If we phase it, which is the **higher priority** to ship first?
  - [ ] A: Per-workbook selected queries (implicit default configuration only)
  - [ ] B: Named configurations (save/load sets of queries) even if catalog/UX is basic
  - **Notes / rationale:**

---

## 2. Data Model: Selected Queries & Configurations

### 2.1 Selected query entry

A selected query entry represents one query instance inside a workbook/config.

- **Question 2.1.1**: For a single **selected query entry**, which fields are required?
  - [ ] `id` of source `QueryDefinition`
  - [ ] Display name/label for this instance (e.g., "Sales Summary – North")
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

- **Question 3.2.1**: When the user clicks **"Add query"** from the catalog, what happens?
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
