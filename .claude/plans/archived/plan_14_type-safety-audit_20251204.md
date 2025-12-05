# Plan 14: Type Safety Audit & Zod Integration

**Date**: 2025-12-04
**Branch**: `feat/type-safety-zod-integration`
**Priority**: HIGH
**Scope**: Codebase-wide type safety improvements

---

## Executive Summary

Comprehensive audit found:
- **`any` usage**: ~65 occurrences (mostly intentional at Office.js boundary)
- **Zod**: Installed but NOT USED - critical validation gaps exist
- **TSDoc**: 95%+ coverage - excellent
- **Query types**: 3 files should consolidate to 2

---

## Objectives

1. **L4 Fix**: Consolidate query type files (query-params + query-configuration → query.types.ts)
2. **Zod Integration**: Add runtime validation at trust boundaries
3. **`any` Cleanup**: Review and fix non-boundary `any` usage
4. **Type Consolidation**: Move shared types to api.types.ts

---

## Phase 1: Query Type Consolidation

### 1.1 Architecture

```
api.types.ts (SHARED - used across app)
├── ApiDefinition, ApiParameter, ApiColumnDefinition
├── RoleId
├── ExecuteQueryParams (move from query.types.ts)
└── ExecuteQueryResultRow (move from query.types.ts)

query.types.ts (FEATURE - Query UI only)
├── QueryInstance, QueryConfiguration, QueryConfigurationItem
├── QueryRun, QueryRunLocation, QueryWriteMode
├── QueryParameterValues (from query-params.types.ts)
├── QueryParameterBinding (from query-params.types.ts)
└── QueryDefinition (@deprecated)
```

### 1.2 Files to Modify

| File | Action |
|------|--------|
| `libs/shared/types/src/lib/api.types.ts` | Add ExecuteQueryParams, ExecuteQueryResultRow |
| `libs/shared/types/src/lib/query.types.ts` | Merge params + config, remove hardcoded QueryParameterKey |
| `libs/shared/types/src/lib/query-params.types.ts` | DELETE |
| `libs/shared/types/src/lib/query-configuration.types.ts` | DELETE |
| `libs/shared/types/src/index.ts` | Update exports |
| `libs/data/api/src/lib/query-api-mock.service.ts` | Import from barrel, delete local defs |

### 1.3 Remove Hardcoded QueryParameterKey

```typescript
// OLD (query-params.types.ts:8)
export type QueryParameterKey = "StartDate" | "EndDate" | "Group" | "SubGroup";

// NEW - Dynamic from ApiDefinition.parameters
export interface QueryParameterValues {
  [key: string]: string | undefined;  // Keys come from ApiParameter.key
}
```

---

## Phase 2: Zod Schema Integration

### 2.1 Create Schema File

**New File**: `libs/shared/types/src/lib/schemas/index.ts`

```typescript
import { z } from 'zod';

// API Response Schemas
export const ExecuteQueryResultRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.date(), z.null()])
);

export const ExecutionResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.object({
    rows: z.array(z.record(z.unknown())),
    metrics: z.object({
      row_count: z.number(),
      duration_ms: z.number(),
    }),
  }),
  meta: z.object({
    execution_id: z.string(),
    operation: z.string(),
    timestamp_utc: z.string(),
    integrity_hash: z.string(),
  }),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }).optional(),
});

// Settings Schema
export const AppSettingsSchema = z.object({
  telemetry: z.object({
    consoleLevel: z.enum(['none', 'error', 'warn', 'info', 'verbose']),
    enableWorkbookLogging: z.boolean(),
    workbookLogTableName: z.string(),
  }),
  queryExecution: z.object({
    maxRowsPerQuery: z.number(),
    chunkSize: z.number(),
    enableProgressiveLoading: z.boolean(),
    apiPageSize: z.number(),
    chunkBackoffMs: z.number(),
  }),
});

// Backup Schema
export const AppStateBackupSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  authState: z.unknown().optional(),
  settings: AppSettingsSchema.optional(),
  queryConfigs: z.array(z.unknown()).optional(),
  queryState: z.unknown().optional(),
});

// External API Response Schemas (for mock service)
export const JsonPlaceholderUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  address: z.object({
    city: z.string(),
    zipcode: z.string(),
  }).optional(),
  company: z.object({
    name: z.string(),
  }).optional(),
});

export const RandomUserSchema = z.object({
  name: z.object({
    first: z.string(),
    last: z.string(),
  }),
  email: z.string(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
  }),
  dob: z.object({
    age: z.number(),
  }),
});
```

### 2.2 Integration Points

| File | Current | With Zod |
|------|---------|----------|
| `storage-base.service.ts:34` | `JSON.parse(item) as T` | `schema?.parse(parsed) ?? parsed` |
| `settings.service.ts:112` | Trust parsed data | `AppSettingsSchema.safeParse()` |
| `backup-restore.service.ts:81` | Manual validation | `AppStateBackupSchema.parse()` |
| `query-api-mock.service.ts:377` | `(u: any) =>` | `RandomUserSchema.array().parse()` |
| `operations-api.service.ts:68` | Trust HTTP response | `ExecutionResponseSchema.parse()` |

### 2.3 Storage Service Enhancement

```typescript
// storage-base.service.ts
import { ZodSchema } from 'zod';

getItem<T>(key: string, defaultValue: T, schema?: ZodSchema<T>): T {
  const item = localStorage.getItem(this.prefixKey(key));
  if (item === null) return defaultValue;

  try {
    const parsed = JSON.parse(item);
    return schema ? schema.parse(parsed) : parsed as T;
  } catch {
    return defaultValue;
  }
}
```

---

## Phase 3: `any` Usage Review

### 3.1 Intentional (Keep)

| Location | Reason |
|----------|--------|
| Office.js boundary (`Excel: any`, `Office: any`) | External API, no types |
| Test files (`as any` for mocking) | Test infrastructure |
| `api.types.ts:73` (`defaultValue?: any`) | Polymorphic by design |

### 3.2 Fix Required

| File | Line | Current | Fix |
|------|------|---------|-----|
| `query-api-mock.service.ts:377` | `(u: any) =>` | Add Zod schema |
| `query-api-mock.service.ts:425` | `(p: any) =>` | Add Zod schema |
| `auth.types.ts:11` | `user: any \| null` | Define UserProfile type |
| `query.types.ts:195` | `parameterValues: Record<string, any>` | Use `Record<string, unknown>` |

---

## Phase 4: Update Documentation

### 4.1 CLAUDE.md Updates

Add to Code Standards:
```markdown
## Runtime Validation

- Use Zod schemas for all external data boundaries:
  - API responses
  - localStorage/IndexedDB reads
  - User input
  - Configuration parsing
- Import schemas from `@excel-platform/shared/types/schemas`
- Prefer `safeParse()` for graceful error handling
```

### 4.2 Architecture Doc

Create: `docs/architecture/TYPE-SAFETY.md`
- Zod schema patterns
- Trust boundary identification
- `any` usage policy

---

## Files to Create

| File | Purpose |
|------|---------|
| `libs/shared/types/src/lib/schemas/index.ts` | Zod schemas |
| `libs/shared/types/src/lib/schemas/api.schemas.ts` | API response schemas |
| `libs/shared/types/src/lib/schemas/storage.schemas.ts` | Storage/backup schemas |
| `libs/shared/types/src/lib/schemas/external.schemas.ts` | External API schemas |
| `docs/architecture/TYPE-SAFETY.md` | Type safety guidelines |

## Files to Modify

| File | Changes |
|------|---------|
| `libs/shared/types/src/lib/api.types.ts` | Add ExecuteQueryParams/ResultRow |
| `libs/shared/types/src/lib/query.types.ts` | Merge params+config types |
| `libs/shared/types/src/index.ts` | Export schemas |
| `libs/data/storage/src/lib/storage-base.service.ts` | Add Zod integration |
| `libs/data/storage/src/lib/backup-restore.service.ts` | Use backup schema |
| `libs/core/settings/src/lib/settings.service.ts` | Use settings schema |
| `libs/data/api/src/lib/query-api-mock.service.ts` | Use external API schemas |
| `libs/data/api/src/lib/operations-api.service.ts` | Use response schema |

## Files to Delete

| File | Reason |
|------|--------|
| `libs/shared/types/src/lib/query-params.types.ts` | Merged into query.types.ts |
| `libs/shared/types/src/lib/query-configuration.types.ts` | Merged into query.types.ts |

---

## Success Criteria

- [x] Only 2 query-related type files: `api.types.ts` + `query.types.ts`
- [x] No hardcoded `QueryParameterKey`
- [x] Zod schemas for all trust boundaries
- [x] No non-boundary `any` in production code
- [x] `npm run build` passes
- [x] `npm run test:ci` passes (137 tests)
- [ ] `npm run lint` passes
- [x] Documentation updated (CLAUDE.md)

---

## Rollback

```bash
git checkout develop -- libs/shared/types/
git checkout develop -- libs/data/
git checkout develop -- libs/core/settings/
```

---

## Estimated Scope

- **Phase 1**: Query type consolidation (~1 hour)
- **Phase 2**: Zod integration (~2 hours)
- **Phase 3**: `any` cleanup (~30 min)
- **Phase 4**: Documentation (~30 min)

**Total**: ~4 hours implementation
