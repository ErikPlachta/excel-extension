# Plan: H1 - Fix Role Text Catalog Key Mismatch

**Date**: 2025-12-02
**Branch**: `fix/h1-text-catalog-keys`
**Objective**: Align RoleDefinition type with actual usage pattern

---

## Problem

`RoleDefinition` interface expects text lookup keys (`labelKey`, `descriptionKey`) but:
1. No code resolves these keys from the text catalog
2. `text.role` section has nested objects with direct strings
3. Dead configuration causing confusion

## Solution

Replace key-based lookup with direct strings. Simpler and matches other config patterns.

---

## Pre-conditions

- [ ] On `develop` branch
- [ ] Working directory clean

---

## Steps

### 1. Update RoleDefinition interface
**File**: `libs/shared/types/src/lib/app-config.types.ts`

```typescript
// FROM:
export interface RoleDefinition {
  id: RoleId;
  labelKey: string;
  descriptionKey: string;
}

// TO:
export interface RoleDefinition {
  id: RoleId;
  label: string;
  description: string;
}
```

### 2. Update DEFAULT_APP_CONFIG roles
**File**: `libs/data/api/src/lib/app-config.default.ts`

```typescript
// FROM:
roles: [
  { id: "analyst", labelKey: "role.analyst.label", descriptionKey: "role.analyst.description" },
  { id: "admin", labelKey: "role.admin.label", descriptionKey: "role.admin.description" },
]

// TO:
roles: [
  { id: "analyst", label: "Analyst", description: "Analyst role with query access" },
  { id: "admin", label: "Admin", description: "Administrator role with full access" },
]
```

### 3. Remove redundant text.role section
**File**: `libs/data/api/src/lib/app-config.default.ts`

Delete lines 262-271:
```typescript
role: {
  analyst: { label: "...", description: "..." },
  admin: { label: "...", description: "..." },
},
```

### 4. Update TextCatalog type (optional cleanup)
**File**: `libs/shared/types/src/lib/app-config.types.ts`

Remove or mark `role?` as deprecated since roles now use direct strings.

### 5. Update any tests referencing labelKey/descriptionKey
**File**: `libs/data/api/src/lib/app-config.service.spec.ts` (if needed)

---

## Files to Modify

| File | Change |
|------|--------|
| `libs/shared/types/src/lib/app-config.types.ts` | Update RoleDefinition interface |
| `libs/data/api/src/lib/app-config.default.ts` | Update roles array, remove text.role |

---

## Success Criteria

- [ ] `npm run lint` passes
- [ ] `npm run test:ci` passes
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] RoleDefinition uses direct strings

---

## Rollback

```bash
git checkout develop -- libs/shared/types/src/lib/app-config.types.ts
git checkout develop -- libs/data/api/src/lib/app-config.default.ts
```
