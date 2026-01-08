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

### Phase 1: Add TSDoc to library index files

Add `@packageDocumentation` blocks to each lib's `src/index.ts`:

```ts
/**
 * @packageDocumentation
 * Authentication service with JWT token handling and SSO mock support.
 */
export * from "./lib/auth.service";
```

**Files to update (12 total):**

| Library        | Path                               |
| -------------- | ---------------------------------- |
| core/auth      | `libs/core/auth/src/index.ts`      |
| core/settings  | `libs/core/settings/src/index.ts`  |
| core/telemetry | `libs/core/telemetry/src/index.ts` |
| core/excel     | `libs/core/excel/src/index.ts`     |
| shared/types   | `libs/shared/types/src/index.ts`   |
| shared/ui      | `libs/shared/ui/src/index.ts`      |
| shared/util    | `libs/shared/util/src/index.ts`    |
| data/api       | `libs/data/api/src/index.ts`       |
| data/query     | `libs/data/query/src/index.ts`     |
| data/storage   | `libs/data/storage/src/index.ts`   |
| office/common  | `libs/office/common/src/index.ts`  |
| office/excel   | `libs/office/excel/src/index.ts`   |

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

Extend intro.md with new markers:

```md
<!-- DIRECTORY_START -->
```

apps/
├── excel-addin/ # Main Angular application
└── excel-addin-docs-website/ # Documentation site
libs/
├── core/ # Core services
├── data/ # Data layer
├── office/ # Office.js integration
└── shared/ # Shared utilities

```
<!-- DIRECTORY_END -->

<!-- SERVICES_START -->
| Service | Library | Description |
|---------|---------|-------------|
| AuthService | core/auth | JWT authentication |
| ExcelService | core/excel | Office.js wrapper |
...
<!-- SERVICES_END -->
```

**Done when:** New sections auto-populate from source.

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
| `libs/*/src/index.ts` (12 files) | Add TSDoc `@packageDocumentation`  |
| `scripts/generate-docs.mjs`      | Rewrite for dynamic extraction     |
| `scripts/validate-docs.mjs`      | **Create** - validation script     |
| `apps/.../docs/intro.md`         | Add DIRECTORY and SERVICES markers |
| `.claude/CLAUDE.md`              | Add marker sections                |
| `.github/workflows/ci.yml`       | Add validation step                |
| `package.json`                   | Add `docs:validate` script         |

---

## Verification

1. **Unit test:** Run `npm run docs:generate` - updates all marker sections
2. **Build test:** Run `npm run docs` - Docusaurus builds without errors
3. **Accuracy test:** Compare generated library list to `ls libs/` - should match
4. **Change test:** Modify a lib's TSDoc, regenerate - docs update
5. **CI test:** Make docs stale, push PR - CI warns/fails

---

## Risk & Mitigation

**Risk:** TSDoc parsing edge cases
**Mitigation:** Simple regex extraction, fallback to "No description"

**Risk:** Script breaks if lib structure changes
**Mitigation:** Graceful degradation, CI catches issues

---

## Out of Scope

- Auto-generating conceptual architecture docs
- Auto-generating getting-started guides
- Changelog automation (separate effort)
