# Gap Analysis & Integrity Audit - Master Plan

**Date**: 2025-12-02
**Scope**: Full codebase scan for integrity issues, missing features, incomplete concepts
**Workflow**: Individual plan + branch per issue

---

## Executive Summary

Codebase is **production-ready** with strong architecture. Found **12 actionable items** across 3 severity levels. No critical blockers.

---

## Execution Strategy

**Workflow per issue:**
1. Create full plan file: `.claude/plans/plan_12_fix_<id>_<desc>_20251202.md`
   - Metadata (date, branch, objective)
   - Pre-conditions
   - Detailed steps with files + changes
   - Success criteria
   - Rollback procedure
2. Create branch from `develop`: `fix/<id>-<short-desc>`
3. Implement fix following plan
4. Run tests: `npm run test:ci && npm run lint && npm run build`
5. Create PR to `develop`
6. **Merge immediately** (sequential merge strategy)
7. Pull latest `develop` before next fix

### Branch/Plan Matrix

| ID | Branch | Plan File |
|----|--------|-----------|
| H1 | `fix/h1-text-catalog-keys` | `plan_12_fix_h1_text-catalog-keys_20251202.md` |
| H2 | `fix/h2-prod-manifest` | `plan_12_fix_h2_prod-manifest_20251202.md` |
| H3 | `fix/h3-deprecated-auth` | `plan_12_fix_h3_deprecated-auth_20251202.md` |
| M1 | `fix/m1-query-definition-migration` | `plan_12_fix_m1_query-def-migration_20251202.md` |
| M2 | `fix/m2-type-consolidation` | `plan_12_fix_m2_type-consolidation_20251202.md` |
| M3 | `fix/m3-workbook-tsdoc` | `plan_12_fix_m3_workbook-tsdoc_20251202.md` |
| M4 | `fix/m4-middletier-docs` | `plan_12_fix_m4_middletier-docs_20251202.md` |
| M5 | `fix/m5-type-safety` | `plan_12_fix_m5_type-safety_20251202.md` |
| L1 | `fix/l1-unused-viewid` | `plan_12_fix_l1_unused-viewid_20251202.md` |
| L2 | `fix/l2-home-spec` | `plan_12_fix_l2_home-spec_20251202.md` |
| L3 | `fix/l3-primitives-todo` | `plan_12_fix_l3_primitives-todo_20251202.md` |
| L4 | `fix/l4-query-params-todo` | `plan_12_fix_l4_query-params-todo_20251202.md` |

### Execution Order (with dependencies)

```
Group 1 (Independent - can run parallel):
  H2 - prod-manifest (standalone)
  H3 - deprecated-auth (standalone)
  M3 - workbook-tsdoc (docs only)
  M4 - middletier-docs (docs only)
  L1 - unused-viewid (standalone)
  L2 - home-spec (test only)
  L3 - primitives-todo (docs only)
  L4 - query-params-todo (docs only)

Group 2 (Depends on M2):
  M1 - query-definition-migration (needs type consolidation first)

Group 3 (Type work):
  H1 - text-catalog-keys (type/config alignment)
  M2 - type-consolidation (QueryDefinition → ApiDefinition)
  M5 - type-safety (any cast fix)
```

**Recommended order**: H1 → M2 → M1 → H2 → H3 → M3 → M4 → M5 → L1 → L2 → L3 → L4

---

## Findings by Severity

### HIGH Priority (3 items)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| H1 | **Role description text key mismatch** | `app-config.default.ts:110-120` | Config uses `descriptionKey: "role.analyst.description"` but text catalog uses nested objects, causing lookup failures |
| H2 | **Missing prod-manifest.xml** | Root directory | No production manifest for GitHub Pages deployment |
| H3 | **Deprecated auth methods in use** | `app.component.ts:146,151` | Using `signInAsAnalyst()`/`signInAsAdmin()` instead of `signInWithJwt()` |

### MEDIUM Priority (5 items)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| M1 | **Deprecated QueryDefinition still used** | `workbook.service.ts:4,133` | Should use `ApiDefinition` per migration docs |
| M2 | **Duplicate type hierarchies** | `api.types.ts` vs `query.types.ts` | QueryDefinition/ApiDefinition overlap causes confusion |
| M3 | **Missing TSDoc for WorkbookService** | `workbook.service.ts` | All public methods need documentation |
| M4 | **Mock middle-tier stubs** | `middle-tier.ts:6,18` | `fetchTokenFromMiddleTier()` and `getUserProfileFromGraph()` need real impl for prod |
| M5 | **Type safety: any cast** | `app.component.ts:137` | `(this.text as any)[section]` loses type safety |

### LOW Priority (4 items)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| L1 | **Unused ViewId "queriesOld"** | `app-config.types.ts:25` | Dead code in type definition |
| L2 | **Missing home.component.spec.ts** | `features/home/` | Only component without tests |
| L3 | **Incomplete type docs** | `primitives.types.ts:84` | TODO for additional types |
| L4 | **Query params hardcoded** | `query-params.types.ts:6` | TODO for metadata-driven system |

---

## Recommended Fix Plan

### Phase 1: High Priority Fixes

**H1 - Fix text catalog structure**
```
File: libs/data/api/src/lib/app-text.ts
Action: Flatten role text keys to match config expectations
  - Change nested `role.analyst.description` to flat key lookup
  - OR change config to use direct values instead of keys
```

**H2 - Create prod-manifest.xml**
```
File: /prod-manifest.xml (new)
Action: Copy dev-manifest.xml, update URLs to:
  - SourceLocation: https://erikplachta.github.io/excel-extension/
  - All icon URLs to production paths
```

**H3 - Replace deprecated auth methods**
```
File: apps/excel-addin/src/app/app.component.ts
Action: Replace signInAsAnalyst()/signInAsAdmin() with signInWithJwt()
  - Update lines 146, 151
  - Use proper JWT-based authentication flow
```

### Phase 2: Medium Priority Fixes

**M1/M2 - Consolidate type hierarchies**
```
Files:
  - libs/core/excel/src/lib/workbook.service.ts
  - libs/shared/types/src/lib/query.types.ts
Action:
  - Update getManagedTablesForQuery() to accept ApiDefinition
  - Remove deprecated QueryDefinition once all usages migrated
```

**M3 - Add WorkbookService TSDoc**
```
File: libs/core/excel/src/lib/workbook.service.ts
Action: Add TSDoc for all public methods:
  - getSheets(), getTables(), getTableByName()
  - getOwnership(), isExtensionManagedTable(), getManagedTablesForQuery()
```

**M4 - Document middle-tier stubs**
```
File: libs/shared/util/src/lib/middle-tier.ts
Action: Add clear documentation that these are demo stubs
  - Mark as @experimental or @mock
  - Document what real implementation requires
```

**M5 - Fix type safety**
```
File: apps/excel-addin/src/app/app.component.ts
Action: Define proper interface for text catalog sections
  - Create TextSection type
  - Replace `any` cast with typed accessor
```

### Phase 3: Low Priority Fixes

**L1** - Remove `"queriesOld"` from ViewId union
**L2** - Add basic home.component.spec.ts
**L3/L4** - Complete TODO comments or remove if not planned

---

## Files to Modify

### High Priority
- `libs/data/api/src/lib/app-text.ts` (H1)
- `libs/data/api/src/lib/app-config.default.ts` (H1 - if changing config approach)
- `/prod-manifest.xml` (H2 - new file)
- `apps/excel-addin/src/app/app.component.ts` (H3, M5)

### Medium Priority
- `libs/core/excel/src/lib/workbook.service.ts` (M1, M3)
- `libs/shared/types/src/lib/query.types.ts` (M2)
- `libs/shared/util/src/lib/middle-tier.ts` (M4)

### Low Priority
- `libs/shared/types/src/lib/app-config.types.ts` (L1)
- `apps/excel-addin/src/app/features/home/home.component.spec.ts` (L2 - new)

---

## What's NOT Broken

- Test coverage: 100% services tested, no placeholder tests
- Service dependencies: Clean architecture, no circular deps
- Office.js boundary: Properly enforced through ExcelService/WorkbookService
- Error handling: Typed ExcelOperationResult pattern used consistently
- Navigation: All items properly configured
- Storage: Correct tiered architecture (localStorage + IndexedDB)
- Console logging: Intentional and controlled via settings

---

## Metrics

| Category | Status |
|----------|--------|
| Critical Issues | 0 |
| High Priority | 3 |
| Medium Priority | 5 |
| Low Priority | 4 |
| Services with Tests | 20/20 (100%) |
| Components with Tests | 6/7 (86%) |
| Deprecated Code Usage | 2 locations |
