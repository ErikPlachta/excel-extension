# Plan: M1 - Remove Deprecated QueryDefinition from WorkbookService

**Date**: 2025-12-02
**Branch**: `fix/m1-query-definition-migration`
**Objective**: Remove deprecated QueryDefinition usage from WorkbookService

---

## Problem

WorkbookService imports and uses deprecated `QueryDefinition` type:
- Line 4: Import statement
- Lines 132-165: `getOrCreateManagedTableTarget(query: QueryDefinition)` method

The new method `resolveTableTarget(apiId, target)` exists and takes primitives.

## Solution

1. Remove deprecated `getOrCreateManagedTableTarget` method
2. Update tests to use `resolveTableTarget` instead
3. Remove `QueryDefinition` import

---

## Pre-conditions

- [ ] On `develop` branch
- [ ] M2 merged

---

## Steps

### 1. Update tests to use resolveTableTarget
**File**: `libs/core/excel/src/lib/workbook.service.spec.ts`

Replace test cases using `getOrCreateManagedTableTarget` with `resolveTableTarget`.

### 2. Remove deprecated method
**File**: `libs/core/excel/src/lib/workbook.service.ts`

Delete lines 128-165 (deprecated method + TSDoc).

### 3. Remove QueryDefinition import
**File**: `libs/core/excel/src/lib/workbook.service.ts`

Update import to remove QueryDefinition.

---

## Files to Modify

| File | Change |
|------|--------|
| `libs/core/excel/src/lib/workbook.service.ts` | Remove deprecated method + import |
| `libs/core/excel/src/lib/workbook.service.spec.ts` | Update tests |

---

## Success Criteria

- [ ] `npm run lint` passes
- [ ] `npm run test:ci` passes
- [ ] `npm run build` passes
- [ ] No QueryDefinition import in WorkbookService

---

## Rollback

```bash
git checkout develop -- libs/core/excel/src/lib/workbook.service.ts
git checkout develop -- libs/core/excel/src/lib/workbook.service.spec.ts
```
