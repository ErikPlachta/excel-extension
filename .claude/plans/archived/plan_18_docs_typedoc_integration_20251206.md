# Plan: Integrate API Docs into Docusaurus + Move Website to apps/

**Created:** 2025-12-06
**Type:** Documentation Pipeline Update
**Status:** Completed

## Objective

1. Move `website/` to `apps/website/` for monorepo consistency
2. Replace Compodoc with TypeDoc + docusaurus-plugin-typedoc
3. Embed API docs at `/api` path with auto-generation on every build

## Current State

- `website/` at root (should be in `apps/`)
- Compodoc generates standalone HTML to `dist/docs/`
- Root-level config: `tsconfig.compodoc.json`, `.compodocrc.json`
- Scripts: `docs:api` and `docs:api:serve` run Compodoc separately

## Decision Summary

- **Tool:** TypeDoc with docusaurus-plugin-typedoc (native Docusaurus integration)
- **Build:** Generate API docs on every Docusaurus build
- **Location:** Move website to `apps/website/`

## Implementation Steps

### Phase 0: Create Feature Branch
- [x] Create branch `feat/docs-typedoc-integration` from develop

### Phase 1: Move website to apps/
- [x] Move `website/` → `apps/excel-addin-docs-website/`
- [x] Update root `package.json` docs scripts to use new path
- [x] Verify Docusaurus still builds from new location

### Phase 2: Setup TypeDoc + Plugin
- [x] Install in apps/website/: `typedoc`, `typedoc-plugin-markdown`, `docusaurus-plugin-typedoc`
- [x] Create `apps/excel-addin-docs-website/typedoc.json` with library entryPoints
- [x] Update `apps/excel-addin-docs-website/docusaurus.config.ts` with plugin config

### Phase 3: Configure TypeDoc for Monorepo
- [x] Set entryPoints to all `../../libs/*/src/index.ts` files
- [x] Configure tsconfig path for TypeDoc to resolve aliases
- [x] Output generated markdown to `docs/api/` (auto-generated on build)

### Phase 4: Update Sidebar & Navigation
- [x] Update `apps/excel-addin-docs-website/sidebars.ts` for API section
- [x] Update `apps/excel-addin-docs-website/docs/api/index.md` as API landing page
- [x] Ensure auto-generated docs appear in sidebar

### Phase 5: Clean Up Root
- [x] Delete `tsconfig.compodoc.json`
- [x] Delete `.compodocrc.json`
- [x] Remove `docs:api` and `docs:api:serve` scripts from root package.json
- [x] Remove `@compodoc/compodoc` from devDependencies (optional)
- [x] Clean up `dist/docs/` directory

## Files to Modify

**Move:**
- `website/` → `apps/website/`

**Create:**
- `apps/website/typedoc.json`

**Modify:**
- `apps/website/package.json` - add TypeDoc deps
- `apps/website/docusaurus.config.ts` - add plugin
- `apps/website/sidebars.ts` - API section config
- `apps/website/docs/api/index.md` - update landing page
- `package.json` (root) - update docs script paths

**Delete:**
- `tsconfig.compodoc.json`
- `.compodocrc.json`
- `dist/docs/` (old Compodoc output)

## Success Criteria

- `npm run docs` builds site from `apps/website/` with embedded API docs
- API docs accessible at `/excel-extension/api/`
- All 12 libraries documented with TypeDoc
- Consistent styling, searchable within Docusaurus
- No Compodoc artifacts remaining
