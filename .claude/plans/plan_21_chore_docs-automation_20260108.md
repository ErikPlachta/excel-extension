---
## Markdown Frontmatter Metadata
title: "Plan 21 - Documentation Automation"
description: Auto-generate docs from source code to prevent documentation drift

## Metadata Related to Github Repository Management
semantic_title: "chore(docs): automate documentation generation"
tags: [plan, chore, docs, automation]
assignees: ClaudeAI
reviewers: @ErikPlachta
approvers: @ErikPlachta
Branch: chore/docs-automation
Base Branch: develop
pull_request:
issues:
milestone:
release:
version: 0.0.3

## Metadata Related to Planning and Execution
status: 🔲 Not Started
effort: 4-6h
priority: P2-Medium
risk: Low
impact: High

# Documentation of additional metadata for tracking and management
Created: 2026-01-08 14:00:00
Updated: 2026-01-08 14:00:00
Author: ClaudeAI
Co-Authors: [@ErikPlachta]
changelog:
---

## Table of Contents

- [Session State](#session-state)
- [Problem Statement](#problem-statement)
- [Implementation Plan](#implementation-plan)
- [Files to Modify](#files-to-modify)
- [Verification](#verification)

## Session State

| Field         | Value         |
| ------------- | ------------- |
| Last Action   | Plan created  |
| Next Action   | User approval |
| Current Phase | Planning      |
| Blockers      | None          |

## Problem Statement

### Problem

Hard-coded docs in `apps/excel-addin-docs-website/docs/` drift from actual code:

- ~20k lines of documentation
- `api/` is auto-generated via TypeDoc ✓
- `intro.md` uses markers but hardcoded arrays in script
- Architecture, guides are fully manual
- CLAUDE.md had 5 inaccuracies found in integrity check

### User Requirements

- **Automation level:** Full generation from source
- **Description source:** TSDoc comments in source code
- **Priority:** All derivable content (libs, structure, scripts)

### Acceptance Criteria

- [ ] Library descriptions extracted from TSDoc in source
- [ ] NPM scripts read from package.json dynamically
- [ ] Directory structure generated from filesystem
- [ ] Service list generated from \*.service.ts files
- [ ] CI validates docs match source
- [ ] Regenerating docs updates all marker sections

---

## Implementation Plan

### Phase 1: Convert existing comments to TSDoc

All index.ts files already have `// description` comments. Convert to `@packageDocumentation` TSDoc format:

**Before:**
```ts
// @excel-platform/core/auth
// Core authentication services for JWT and SSO management

export * from './lib/auth.service';
```

**After:**
```ts
/**
 * @packageDocumentation
 * Core authentication services for JWT and SSO management.
 */
export * from './lib/auth.service';
```

**Files to update (12 total):**

| Library        | Path                               | Current Description |
| -------------- | ---------------------------------- | ------------------- |
| core/auth      | `libs/core/auth/src/index.ts`      | Core authentication services for JWT and SSO management |
| core/excel     | `libs/core/excel/src/index.ts`     | Excel service library for Office.js operations |
| core/settings  | `libs/core/settings/src/index.ts`  | Core settings service for application configuration |
| core/telemetry | `libs/core/telemetry/src/index.ts` | Core telemetry and app context services |
| shared/types   | `libs/shared/types/src/index.ts`   | Shared type definitions for the Excel Platform |
| shared/ui      | `libs/shared/ui/src/index.ts`      | Shared UI components for the Excel Platform |
| shared/util    | `libs/shared/util/src/index.ts`    | Shared utility functions for the Excel Platform |
| data/api       | `libs/data/api/src/index.ts`       | API services, catalog, and configuration |
| data/query     | `libs/data/query/src/index.ts`     | Query management services |
| data/storage   | `libs/data/storage/src/index.ts`   | Storage services for localStorage and IndexedDB |
| office/common  | `libs/office/common/src/index.ts`  | ⚠️ Placeholder - empty scaffold |
| office/excel   | `libs/office/excel/src/index.ts`   | ⚠️ Placeholder - empty scaffold |

**Note:** Placeholder libs (office/common, office/excel) will be marked as "Placeholder library" in generated docs.

**Done when:** Each index.ts has a `@packageDocumentation` comment with description.

---

### Phase 2: Rewrite generate-docs.mjs

Replace hardcoded arrays with dynamic extraction:

```js
// Libraries: scan libs/, parse TSDoc from index.ts
function getLibraries() {
  const libs = [];
  for (const category of ["core", "shared", "data", "office"]) {
    const categoryPath = path.join(LIBS_DIR, category);
    for (const lib of fs.readdirSync(categoryPath)) {
      const indexPath = path.join(categoryPath, lib, "src/index.ts");
      const description = extractTSDocDescription(indexPath);
      libs.push({
        path: `@excel-platform/${category}/${lib}`,
        description,
      });
    }
  }
  return libs;
}

// Scripts: read from package.json
function getScripts() {
  const pkg = JSON.parse(fs.readFileSync("package.json"));
  // Filter to commonly used scripts, infer descriptions
  return relevantScripts.map(([name, cmd]) => ({
    command: `npm run ${name}`,
    description: inferDescription(name, cmd),
  }));
}

// Directory structure: scan filesystem
function getDirectoryStructure() {
  // Generate tree from apps/ and libs/
}

// Services: scan *.service.ts files
function getServices() {
  // Extract class names and TSDoc from service files
}
```

**Done when:** Running `npm run docs:generate` reads from actual source files.

---

### Phase 3: Add more generated sections

Extend intro.md and architecture docs with new markers.

**3a. Directory structure in intro.md:**

```md
<!-- DIRECTORY_START -->
apps/
├── excel-addin/              # Main Angular application
└── excel-addin-docs-website/ # Documentation site
libs/
├── core/                     # Core services (auth, excel, settings, telemetry)
├── data/                     # Data layer (api, query, storage)
├── office/                   # Office.js integration (common, excel)
└── shared/                   # Shared utilities (types, ui, util)
<!-- DIRECTORY_END -->
```

**3b. Services section (25 services discovered):**

```md
<!-- SERVICES_START -->
| Service | Library | Description |
|---------|---------|-------------|
| AuthService | core/auth | JWT authentication and token management |
| JwtHelperService | core/auth | JWT token parsing and validation |
| AuthApiService | core/auth | Authentication API calls |
| AuthApiMockService | core/auth | Mock authentication for development |
| ExcelService | core/excel | Office.js Excel operations wrapper |
| WorkbookService | core/excel | Workbook and worksheet management |
| FormulaScannerService | core/excel | Formula detection in ranges |
| SettingsService | core/settings | Application preferences |
| TelemetryService | core/telemetry | Logging and analytics |
| AppContextService | core/telemetry | Application context tracking |
| ApiCatalogService | data/api | API endpoint catalog |
| ApiConfigService | data/api | API configuration |
| AppConfigService | data/api | Application configuration |
| ConfigValidatorService | data/api | Configuration validation |
| OperationsApiService | data/api | Operations API calls |
| OperationsApiMockService | data/api | Mock operations API |
| QueryApiMockService | data/api | Mock query API |
| QueryValidationService | data/api | Query parameter validation |
| QueryConfigurationService | data/query | Query configuration management |
| QueryQueueService | data/query | Query execution queue |
| QueryStateService | data/query | Query state management |
| StorageHelperService | data/storage | Storage abstraction (localStorage/IndexedDB) |
| StorageBaseService | data/storage | Base localStorage operations |
| IndexedDBService | data/storage | IndexedDB operations |
| UserKeyedStorageService | data/storage | User-scoped storage |
| BackupRestoreService | data/storage | Data backup and restore |
<!-- SERVICES_END -->
```

**3c. Update architecture/services.md and architecture/overview.md:**

Add same markers to pull from source instead of hardcoded content.

**Done when:** New sections auto-populate from source in all target files.

---

### Phase 4: Add CI validation

Create `scripts/validate-docs.mjs`:

```js
// Checks:
// 1. All file paths referenced in docs exist
// 2. Generated sections match what would be generated
// 3. Warns if manual docs significantly older than source

function validateDocs() {
  const issues = [];

  // Check generated sections are current
  const currentContent = fs.readFileSync(INTRO_PATH);
  const expectedContent = generateAllSections();
  if (currentContent !== expectedContent) {
    issues.push("Generated sections out of date. Run npm run docs:generate");
  }

  // Check referenced paths exist
  const paths = extractReferencedPaths(currentContent);
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      issues.push(`Referenced path does not exist: ${p}`);
    }
  }

  return issues;
}
```

Add to `.github/workflows/ci.yml`:

```yaml
- name: Validate docs freshness
  run: node scripts/validate-docs.mjs
```

**Done when:** CI fails if docs are stale.

---

### Phase 5: Update CLAUDE.md

Add generated sections to `.claude/CLAUDE.md`:

```md
<!-- LIBS_START -->

## Libraries

(auto-generated from libs/)

<!-- LIBS_END -->

<!-- SCRIPTS_START -->

## Commands

(auto-generated from package.json)

<!-- SCRIPTS_END -->
```

**Done when:** CLAUDE.md has marker sections that regenerate.

---

## Files to Modify

| File                             | Action                             |
| -------------------------------- | ---------------------------------- |
| `libs/*/src/index.ts` (12 files) | Convert `//` comments to TSDoc `@packageDocumentation` |
| `scripts/generate-docs.mjs`      | Rewrite for dynamic extraction from source |
| `scripts/validate-docs.mjs`      | **Create** - validation script |
| `apps/.../docs/intro.md`         | Add DIRECTORY and SERVICES markers |
| `apps/.../docs/architecture/services.md` | Add SERVICES marker section |
| `apps/.../docs/architecture/overview.md` | Add DIRECTORY marker section |
| `.claude/CLAUDE.md`              | Add LIBS and SCRIPTS marker sections |
| `.github/workflows/ci.yml`       | Add `Validate docs freshness` step |
| `package.json`                   | Add `docs:validate` script |

---

## Verification

1. **Unit test:** Run `npm run docs:generate` - updates all marker sections
2. **Build test:** Run `npm run docs` - Docusaurus builds without errors
3. **Accuracy test:** Compare generated library list to `ls libs/` - should match
4. **Change test:** Modify a lib's TSDoc, regenerate - docs update
5. **CI test:** Make docs stale, push PR - CI warns/fails

---

## Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TSDoc parsing edge cases | Low | Low | Simple regex extraction, fallback to "No description" |
| Script breaks if lib structure changes | Medium | Low | Graceful degradation, CI catches issues |
| Generated docs don't match expected format | Low | Medium | Test on branch before merging |
| CI validation too strict | Medium | Low | Start with warnings, not failures |

---

## Rollback Plan

If issues arise after merge:

1. **Revert generate-docs.mjs:** `git revert` the script changes
2. **Restore hardcoded arrays:** Keep backup of original LIBRARY_DEFINITIONS and SCRIPT_DEFINITIONS
3. **Remove CI step:** Comment out validation step in ci.yml
4. **TSDoc comments are safe:** They don't affect runtime, can stay even if generation reverts

**Backup before modifying:**
```bash
cp scripts/generate-docs.mjs scripts/generate-docs.mjs.backup
```

---

## Out of Scope

- Auto-generating conceptual architecture docs
- Auto-generating getting-started guides
- Changelog automation (separate effort)
