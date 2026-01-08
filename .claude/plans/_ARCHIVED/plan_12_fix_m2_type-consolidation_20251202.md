# Plan: M2 - Type Consolidation (QueryDefinition → ApiDefinition)

**Date**: 2025-12-02
**Branch**: `fix/m2-type-consolidation`
**Objective**: Clarify type hierarchy and reduce confusion between QueryDefinition and ApiDefinition

---

## Problem

Two overlapping types exist:
- `ApiDefinition` (api.types.ts) - Modern catalog entry type
- `QueryDefinition` (query.types.ts) - Legacy type with execution-specific fields

Developers don't know which to use. QueryDefinition has @deprecated tag but documentation is unclear.

## Solution

1. Enhance QueryDefinition deprecation with clear migration guidance
2. Add module-level docs explaining type relationships
3. Update index exports to prioritize ApiDefinition

---

## Pre-conditions

- [ ] On `develop` branch
- [ ] Working directory clean
- [ ] H1 merged

---

## Steps

### 1. Enhance QueryDefinition deprecation notice
**File**: `libs/shared/types/src/lib/query.types.ts`

Add comprehensive migration guidance:
```typescript
/**
 * @deprecated **MIGRATION REQUIRED**
 *
 * Use these types instead:
 * - **Catalog entries**: Use `ApiDefinition` from api.types.ts
 * - **Query instances**: Use `QueryInstance` from this file
 *
 * QueryDefinition conflates catalog metadata (id, name, parameters) with
 * execution config (defaultSheetName, writeMode). The new model separates these:
 * - ApiDefinition: What APIs are available (catalog)
 * - QueryInstance: Configured query with target location and parameters
 *
 * Migration example:
 * ```typescript
 * // OLD:
 * const query: QueryDefinition = { id: 'sales', defaultSheetName: 'Sales', ... };
 *
 * // NEW:
 * const api: ApiDefinition = { id: 'sales', ... };  // catalog entry
 * const instance: QueryInstance = { apiId: 'sales', targetSheetName: 'Sales', ... };
 * ```
 */
```

### 2. Add module-level documentation
**File**: `libs/shared/types/src/lib/query.types.ts`

Add @packageDocumentation explaining the type hierarchy.

### 3. Update type index exports
**File**: `libs/shared/types/src/index.ts`

Ensure ApiDefinition is exported before QueryDefinition in barrel file.

---

## Files to Modify

| File | Change |
|------|--------|
| `libs/shared/types/src/lib/query.types.ts` | Enhance deprecation docs |
| `libs/shared/types/src/index.ts` | Verify export order |

---

## Success Criteria

- [ ] `npm run lint` passes
- [ ] `npm run test:ci` passes
- [ ] `npm run build` passes
- [ ] QueryDefinition has clear migration docs

---

## Rollback

```bash
git checkout develop -- libs/shared/types/src/lib/query.types.ts
```
