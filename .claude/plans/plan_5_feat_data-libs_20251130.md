# Phase 5: Migrate Data Libraries

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
>
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 4 completed
> 4. Exit plan mode only when ready to execute

## Metadata

- **Branch:** `refactor/data-libs`
- **Depends On:** Phase 4 (Office Libs)
- **Estimated Effort:** 1 day (8 hours)
- **Created:** 2025-11-30
- **Status:** 🟡 In Progress (Storage complete - PR #35, 2025-12-01)

---

## Objective

Migrate data services (query management, API catalog, storage) to their respective Nx libraries. This phase also resolves temporary relative imports from Phases 3-4 by providing the final storage library paths.

---

## Pre-Conditions

- [ ] Phase 4 completed: Office libraries migrated and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] `@excel-platform/office/*` aliases resolve correctly
- [ ] All tests passing: `npm run test:ci`
- [ ] Working directory clean: `git status`

---

## Success Criteria

- [ ] Storage services migrated to `libs/data/storage/`
- [ ] API services migrated to `libs/data/api/`
- [ ] Query services migrated to `libs/data/query/`
- [ ] Temporary relative imports in core libs updated to use aliases
- [ ] All imports updated to use `@excel-platform/data/*` aliases
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] No circular dependencies

---

## Detailed Steps

### Step 1: Create Branch for Phase 5

**Action:** Create dedicated branch for data libs migration
**Commands:**

```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/data-libs
```

**Validation:**

```bash
git branch --show-current
# Should return: refactor/data-libs
```

---

### Step 2: Analyze Data Service Dependencies

**Action:** Map dependencies before migration
**Dependency Analysis:**

| Service                   | Lines | Dependencies                                                           |
| ------------------------- | ----- | ---------------------------------------------------------------------- |
| StorageBaseService        | 73    | None (pure)                                                            |
| IndexedDBService          | 199   | None (pure)                                                            |
| StorageHelperService      | 176   | TelemetryService, StorageBaseService, IndexedDBService                 |
| BackupRestoreService      | 277   | TelemetryService, StorageHelperService                                 |
| ConfigValidatorService    | 121   | None (pure)                                                            |
| ApiCatalogService         | 209   | AppConfigService                                                       |
| QueryValidationService    | 236   | ApiCatalogService                                                      |
| AppConfigService          | 234   | ConfigValidatorService, AuthService (lazy)                             |
| QueryApiMockService       | 606   | SettingsService, TelemetryService, ApiCatalogService, IndexedDBService |
| QueryStateService         | 227   | ApiCatalogService, StorageHelperService                                |
| QueryConfigurationService | 89    | AuthService, ApiCatalogService, StorageHelperService                   |
| QueryQueueService         | 191   | TelemetryService                                                       |
| app-config.default.ts     | ~50   | None (data)                                                            |
| app-config.ts             | ~30   | None (data)                                                            |
| query-model.ts            | ~20   | None (data)                                                            |

**Migration Order:**

1. Storage services first (they're dependencies for others)
2. Config services (AppConfig, ConfigValidator)
3. API services (ApiCatalog, QueryValidation, QueryApiMock)
4. Query services (QueryState, QueryConfiguration, QueryQueue)

---

### Step 3: Migrate Storage Services to libs/data/storage

**Action:** Move all storage-related services
**Files to Move:**

| Source                                          | Destination                                                |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `src/app/shared/storage-base.service.ts`        | `libs/data/storage/src/lib/storage-base.service.ts`        |
| `src/app/shared/storage-base.service.spec.ts`   | `libs/data/storage/src/lib/storage-base.service.spec.ts`   |
| `src/app/shared/storage-helper.service.ts`      | `libs/data/storage/src/lib/storage-helper.service.ts`      |
| `src/app/shared/storage-helper.service.spec.ts` | `libs/data/storage/src/lib/storage-helper.service.spec.ts` |
| `src/app/shared/indexeddb.service.ts`           | `libs/data/storage/src/lib/indexeddb.service.ts`           |
| `src/app/shared/indexeddb.service.spec.ts`      | `libs/data/storage/src/lib/indexeddb.service.spec.ts`      |
| `src/app/shared/backup-restore.service.ts`      | `libs/data/storage/src/lib/backup-restore.service.ts`      |
| `src/app/shared/backup-restore.service.spec.ts` | `libs/data/storage/src/lib/backup-restore.service.spec.ts` |

**Commands:**

```bash
# Copy storage service files
cp src/app/shared/storage-base.service.ts libs/data/storage/src/lib/
cp src/app/shared/storage-base.service.spec.ts libs/data/storage/src/lib/
cp src/app/shared/storage-helper.service.ts libs/data/storage/src/lib/
cp src/app/shared/storage-helper.service.spec.ts libs/data/storage/src/lib/
cp src/app/shared/indexeddb.service.ts libs/data/storage/src/lib/
cp src/app/shared/indexeddb.service.spec.ts libs/data/storage/src/lib/
cp src/app/shared/backup-restore.service.ts libs/data/storage/src/lib/
cp src/app/shared/backup-restore.service.spec.ts libs/data/storage/src/lib/
```

**Manual Edit Required:**

```typescript
// libs/data/storage/src/lib/storage-helper.service.ts
// Before
import { TelemetryService } from "../core/telemetry.service";
import { StorageBaseService } from "./storage-base.service";
import { IndexedDBService } from "./indexeddb.service";

// After
import { TelemetryService } from "@excel-platform/core/telemetry";
import { StorageBaseService } from "./storage-base.service"; // Same library
import { IndexedDBService } from "./indexeddb.service"; // Same library
```

```typescript
// libs/data/storage/src/lib/backup-restore.service.ts
// Before
import { TelemetryService } from "../core/telemetry.service";
import { StorageHelperService } from "./storage-helper.service";

// After
import { TelemetryService } from "@excel-platform/core/telemetry";
import { StorageHelperService } from "./storage-helper.service"; // Same library
```

**Validation:**

```bash
ls libs/data/storage/src/lib/*.service.ts | wc -l
# Should return: 4
```

---

### Step 4: Create Barrel Export for Storage Library

**Action:** Update index.ts to export storage services
**Commands:**

```bash
cat > libs/data/storage/src/index.ts << 'EOF'
// @excel-platform/data/storage
// Data storage services (localStorage, IndexedDB)

export * from './lib/storage-base.service';
export * from './lib/storage-helper.service';
export * from './lib/indexeddb.service';
export * from './lib/backup-restore.service';
EOF
```

**Validation:**

```bash
cat libs/data/storage/src/index.ts
```

---

### Step 5: Create tsconfig.json Files for Storage Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/data/storage/tsconfig.json << 'EOF'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc"
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ],
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
EOF

cat > libs/data/storage/tsconfig.lib.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "jest.config.ts"]
}
EOF

cat > libs/data/storage/tsconfig.spec.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "types": ["jest"]
  },
  "files": [],
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
EOF
```

---

### Step 6: Update Core Libs to Use Storage Aliases

**Action:** Replace temporary relative imports with proper aliases
**Files to Update:**

```typescript
// libs/core/settings/src/lib/settings.service.ts
// Before (temporary from Phase 3)
import { StorageBaseService } from "../../../../src/app/shared/storage-base.service";

// After
import { StorageBaseService } from "@excel-platform/data/storage";
```

```typescript
// libs/core/auth/src/lib/auth.service.ts
// Before (temporary from Phase 3)
import { StorageHelperService } from "../../../../src/app/shared/storage-helper.service";

// After
import { StorageHelperService } from "@excel-platform/data/storage";
```

---

### Step 7: Migrate API Services to libs/data/api

**Action:** Move API-related services and configs
**Files to Move:**

| Source                                            | Destination                                              |
| ------------------------------------------------- | -------------------------------------------------------- |
| `src/app/core/config-validator.service.ts`        | `libs/data/api/src/lib/config-validator.service.ts`      |
| `src/app/core/config-validator.service.spec.ts`   | `libs/data/api/src/lib/config-validator.service.spec.ts` |
| `src/app/core/app-config.service.ts`              | `libs/data/api/src/lib/app-config.service.ts`            |
| `src/app/core/app-config.service.spec.ts`         | `libs/data/api/src/lib/app-config.service.spec.ts`       |
| `src/app/shared/api-catalog.service.ts`           | `libs/data/api/src/lib/api-catalog.service.ts`           |
| `src/app/shared/api-catalog.service.spec.ts`      | `libs/data/api/src/lib/api-catalog.service.spec.ts`      |
| `src/app/shared/query-api-mock.service.ts`        | `libs/data/api/src/lib/query-api-mock.service.ts`        |
| `src/app/shared/query-api-mock.service.spec.ts`   | `libs/data/api/src/lib/query-api-mock.service.spec.ts`   |
| `src/app/shared/query-validation.service.ts`      | `libs/data/api/src/lib/query-validation.service.ts`      |
| `src/app/shared/query-validation.service.spec.ts` | `libs/data/api/src/lib/query-validation.service.spec.ts` |
| `src/app/shared/app-config.default.ts`            | `libs/data/api/src/lib/app-config.default.ts`            |
| `src/app/shared/app-config.ts`                    | `libs/data/api/src/lib/app-config.ts`                    |
| `src/app/shared/query-model.ts`                   | `libs/data/api/src/lib/query-model.ts`                   |

**Commands:**

```bash
# Copy API service files
cp src/app/core/config-validator.service.ts libs/data/api/src/lib/
cp src/app/core/config-validator.service.spec.ts libs/data/api/src/lib/
cp src/app/core/app-config.service.ts libs/data/api/src/lib/
cp src/app/core/app-config.service.spec.ts libs/data/api/src/lib/
cp src/app/shared/api-catalog.service.ts libs/data/api/src/lib/
cp src/app/shared/api-catalog.service.spec.ts libs/data/api/src/lib/
cp src/app/shared/query-api-mock.service.ts libs/data/api/src/lib/
cp src/app/shared/query-api-mock.service.spec.ts libs/data/api/src/lib/
cp src/app/shared/query-validation.service.ts libs/data/api/src/lib/
cp src/app/shared/query-validation.service.spec.ts libs/data/api/src/lib/
cp src/app/shared/app-config.default.ts libs/data/api/src/lib/
cp src/app/shared/app-config.ts libs/data/api/src/lib/
cp src/app/shared/query-model.ts libs/data/api/src/lib/
```

**Manual Edit Required - Handle Circular Dependency:**

```typescript
// libs/data/api/src/lib/app-config.service.ts
// KNOWN CIRCULAR: AppConfigService ↔ AuthService
// Keep using Injector.get() pattern for lazy injection

// Before
import { AuthService } from "./auth.service";
import { ConfigValidatorService } from "./config-validator.service";

// After
import { AuthService } from "@excel-platform/core/auth";
import { ConfigValidatorService } from "./config-validator.service"; // Same library
// Note: AuthService is injected lazily via Injector.get() - no change to pattern
```

**Validation:**

```bash
ls libs/data/api/src/lib/*.service.ts | wc -l
# Should return: 5 (config-validator, app-config, api-catalog, query-api-mock, query-validation)
```

---

### Step 8: Create Barrel Export for API Library

**Action:** Update index.ts to export API services
**Commands:**

```bash
cat > libs/data/api/src/index.ts << 'EOF'
// @excel-platform/data/api
// API services, catalog, and configuration

export * from './lib/config-validator.service';
export * from './lib/app-config.service';
export * from './lib/api-catalog.service';
export * from './lib/query-api-mock.service';
export * from './lib/query-validation.service';
export * from './lib/app-config.default';
export * from './lib/app-config';
export * from './lib/query-model';
EOF
```

---

### Step 9: Create tsconfig.json Files for API Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/data/api/tsconfig.json << 'EOF'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc"
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ],
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
EOF

cat > libs/data/api/tsconfig.lib.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "jest.config.ts"]
}
EOF

cat > libs/data/api/tsconfig.spec.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "types": ["jest"]
  },
  "files": [],
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
EOF
```

---

### Step 10: Migrate Query Services to libs/data/query

**Action:** Move query management services
**Files to Move:**

| Source                                               | Destination                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `src/app/shared/query-state.service.ts`              | `libs/data/query/src/lib/query-state.service.ts`              |
| `src/app/shared/query-state.service.spec.ts`         | `libs/data/query/src/lib/query-state.service.spec.ts`         |
| `src/app/shared/query-configuration.service.ts`      | `libs/data/query/src/lib/query-configuration.service.ts`      |
| `src/app/shared/query-configuration.service.spec.ts` | `libs/data/query/src/lib/query-configuration.service.spec.ts` |
| `src/app/shared/query-queue.service.ts`              | `libs/data/query/src/lib/query-queue.service.ts`              |
| `src/app/shared/query-queue.service.spec.ts`         | `libs/data/query/src/lib/query-queue.service.spec.ts`         |

**Commands:**

```bash
cp src/app/shared/query-state.service.ts libs/data/query/src/lib/
cp src/app/shared/query-state.service.spec.ts libs/data/query/src/lib/
cp src/app/shared/query-configuration.service.ts libs/data/query/src/lib/
cp src/app/shared/query-configuration.service.spec.ts libs/data/query/src/lib/
cp src/app/shared/query-queue.service.ts libs/data/query/src/lib/
cp src/app/shared/query-queue.service.spec.ts libs/data/query/src/lib/
```

**Manual Edit Required:**

```typescript
// libs/data/query/src/lib/query-state.service.ts
// Before
import { ApiCatalogService } from "./api-catalog.service";
import { StorageHelperService } from "./storage-helper.service";

// After
import { ApiCatalogService } from "@excel-platform/data/api";
import { StorageHelperService } from "@excel-platform/data/storage";
```

**Validation:**

```bash
ls libs/data/query/src/lib/*.service.ts | wc -l
# Should return: 3
```

---

### Step 11: Create Barrel Export for Query Library

**Action:** Update index.ts to export query services
**Commands:**

```bash
cat > libs/data/query/src/index.ts << 'EOF'
// @excel-platform/data/query
// Query management services

export * from './lib/query-state.service';
export * from './lib/query-configuration.service';
export * from './lib/query-queue.service';
EOF
```

---

### Step 12: Create tsconfig.json Files for Query Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/data/query/tsconfig.json << 'EOF'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc"
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ],
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
EOF

cat > libs/data/query/tsconfig.lib.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "jest.config.ts"]
}
EOF

cat > libs/data/query/tsconfig.spec.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "types": ["jest"]
  },
  "files": [],
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
EOF
```

---

### Step 13: Update All Remaining App Imports

**Action:** Find and replace all imports from old locations

**Import Path Changes:**

| Old Import                                     | New Import                            |
| ---------------------------------------------- | ------------------------------------- |
| `from '../shared/storage-base.service'`        | `from '@excel-platform/data/storage'` |
| `from '../shared/storage-helper.service'`      | `from '@excel-platform/data/storage'` |
| `from '../shared/indexeddb.service'`           | `from '@excel-platform/data/storage'` |
| `from '../shared/backup-restore.service'`      | `from '@excel-platform/data/storage'` |
| `from '../shared/api-catalog.service'`         | `from '@excel-platform/data/api'`     |
| `from '../shared/query-api-mock.service'`      | `from '@excel-platform/data/api'`     |
| `from '../shared/query-validation.service'`    | `from '@excel-platform/data/api'`     |
| `from '../core/app-config.service'`            | `from '@excel-platform/data/api'`     |
| `from '../core/config-validator.service'`      | `from '@excel-platform/data/api'`     |
| `from '../shared/query-state.service'`         | `from '@excel-platform/data/query'`   |
| `from '../shared/query-configuration.service'` | `from '@excel-platform/data/query'`   |
| `from '../shared/query-queue.service'`         | `from '@excel-platform/data/query'`   |

**Commands:**

```bash
# Find all remaining imports
grep -rl "from '.*storage-" src/app/
grep -rl "from '.*indexeddb" src/app/
grep -rl "from '.*backup-restore" src/app/
grep -rl "from '.*api-catalog" src/app/
grep -rl "from '.*query-" src/app/
grep -rl "from '.*app-config" src/app/
```

---

### Step 14: Delete Original Data Service Files

**Action:** Remove original files after confirming build works
**Commands:**

```bash
# Storage services
rm src/app/shared/storage-base.service.ts
rm src/app/shared/storage-base.service.spec.ts
rm src/app/shared/storage-helper.service.ts
rm src/app/shared/storage-helper.service.spec.ts
rm src/app/shared/indexeddb.service.ts
rm src/app/shared/indexeddb.service.spec.ts
rm src/app/shared/backup-restore.service.ts
rm src/app/shared/backup-restore.service.spec.ts

# API services
rm src/app/core/config-validator.service.ts
rm src/app/core/config-validator.service.spec.ts
rm src/app/core/app-config.service.ts
rm src/app/core/app-config.service.spec.ts
rm src/app/shared/api-catalog.service.ts
rm src/app/shared/api-catalog.service.spec.ts
rm src/app/shared/query-api-mock.service.ts
rm src/app/shared/query-api-mock.service.spec.ts
rm src/app/shared/query-validation.service.ts
rm src/app/shared/query-validation.service.spec.ts
rm src/app/shared/app-config.default.ts
rm src/app/shared/app-config.ts
rm src/app/shared/query-model.ts

# Query services
rm src/app/shared/query-state.service.ts
rm src/app/shared/query-state.service.spec.ts
rm src/app/shared/query-configuration.service.ts
rm src/app/shared/query-configuration.service.spec.ts
rm src/app/shared/query-queue.service.ts
rm src/app/shared/query-queue.service.spec.ts
```

---

### Step 15: Verify Build and Tests

**Action:** Ensure everything still works after migration
**Commands:**

```bash
npm run lint
npm run build
npm run test:ci

# Verify Nx dependency graph
npx nx graph
```

**Expected Output:**

- All commands pass
- Graph shows correct library dependencies

---

### Step 16: Commit Phase 5 Changes

**Action:** Commit all data library migration changes
**Commands:**

```bash
git add .
git status

git commit -m "$(cat <<'EOF'
feat: migrate data libraries to Nx workspace

Migrate data services to Nx libraries:

## libs/data/storage (725 lines total)
- StorageBaseService (73 lines) - Zero-dep localStorage wrapper
- StorageHelperService (176 lines) - Multi-backend abstraction
- IndexedDBService (199 lines) - Large dataset storage
- BackupRestoreService (277 lines) - State export/import

## libs/data/api (1401 lines total)
- ConfigValidatorService (121 lines) - Config validation
- AppConfigService (234 lines) - App configuration
- ApiCatalogService (209 lines) - API definitions
- QueryApiMockService (606 lines) - Mock API execution
- QueryValidationService (236 lines) - Query validation
- app-config.default.ts, app-config.ts, query-model.ts

## libs/data/query (507 lines total)
- QueryStateService (227 lines) - Query state management
- QueryConfigurationService (89 lines) - Query CRUD
- QueryQueueService (191 lines) - Batch execution

Also updates temporary relative imports in core libs
to use proper @excel-platform/data/* aliases.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 17: Create PR for Phase 5

**Action:** Push branch and create pull request
**Commands:**

```bash
git push -u origin refactor/data-libs

gh pr create --title "[Phase 5] Migrate data libraries" --body "$(cat <<'EOF'
## Summary
Migrate data services (storage, API, query) to Nx libraries.

## Changes
- Move storage services to `libs/data/storage/`
- Move API services to `libs/data/api/`
- Move query services to `libs/data/query/`
- Update temporary imports in core libs to use aliases
- Remove original files from `src/app/shared/` and `src/app/core/`

## Libraries Created
- `@excel-platform/data/storage` - Storage abstraction
- `@excel-platform/data/api` - API catalog and mock services
- `@excel-platform/data/query` - Query management

## Dependencies
- `data/storage` → `core/telemetry`
- `data/api` → `shared/types`, `core/auth`, `core/settings`, `data/storage`
- `data/query` → `data/api`, `data/storage`, `core/auth`

## Known Circular Dependency
- AppConfigService ↔ AuthService - Handled via Injector.get() lazy injection

## Testing
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run test:ci` passes
- [x] `npx nx graph` shows correct dependencies

## Next Steps
Phase 6: App migration (move features to apps/excel-addin)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## File Migration Map

### libs/data/storage

| Source                                     | Destination                                           | Notes            |
| ------------------------------------------ | ----------------------------------------------------- | ---------------- |
| `src/app/shared/storage-base.service.ts`   | `libs/data/storage/src/lib/storage-base.service.ts`   | Zero-dep wrapper |
| `src/app/shared/storage-helper.service.ts` | `libs/data/storage/src/lib/storage-helper.service.ts` | Multi-backend    |
| `src/app/shared/indexeddb.service.ts`      | `libs/data/storage/src/lib/indexeddb.service.ts`      | Large data       |
| `src/app/shared/backup-restore.service.ts` | `libs/data/storage/src/lib/backup-restore.service.ts` | State backup     |

### libs/data/api

| Source                                       | Destination                                         | Notes            |
| -------------------------------------------- | --------------------------------------------------- | ---------------- |
| `src/app/core/config-validator.service.ts`   | `libs/data/api/src/lib/config-validator.service.ts` | Pure validation  |
| `src/app/core/app-config.service.ts`         | `libs/data/api/src/lib/app-config.service.ts`       | Lazy AuthService |
| `src/app/shared/api-catalog.service.ts`      | `libs/data/api/src/lib/api-catalog.service.ts`      | API definitions  |
| `src/app/shared/query-api-mock.service.ts`   | `libs/data/api/src/lib/query-api-mock.service.ts`   | Mock execution   |
| `src/app/shared/query-validation.service.ts` | `libs/data/api/src/lib/query-validation.service.ts` | Query validation |
| `src/app/shared/app-config.default.ts`       | `libs/data/api/src/lib/app-config.default.ts`       | Default config   |
| `src/app/shared/app-config.ts`               | `libs/data/api/src/lib/app-config.ts`               | Config export    |
| `src/app/shared/query-model.ts`              | `libs/data/api/src/lib/query-model.ts`              | Query model      |

### libs/data/query

| Source                                          | Destination                                              | Notes           |
| ----------------------------------------------- | -------------------------------------------------------- | --------------- |
| `src/app/shared/query-state.service.ts`         | `libs/data/query/src/lib/query-state.service.ts`         | State tracking  |
| `src/app/shared/query-configuration.service.ts` | `libs/data/query/src/lib/query-configuration.service.ts` | CRUD ops        |
| `src/app/shared/query-queue.service.ts`         | `libs/data/query/src/lib/query-queue.service.ts`         | Batch execution |

---

## Integrity Checks

Run ALL before marking complete:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:ci` passes
- [ ] `libs/data/storage/src/lib/` contains 4 services + specs
- [ ] `libs/data/api/src/lib/` contains 5 services + 3 data files
- [ ] `libs/data/query/src/lib/` contains 3 services + specs
- [ ] No temporary relative imports remain in core libs
- [ ] `import { StorageHelperService } from '@excel-platform/data/storage'` compiles
- [ ] `npx nx graph` shows no circular dependencies (except known AppConfig ↔ Auth)

---

## Gap Identification

- **Risk 1:** AppConfigService ↔ AuthService circular → **Mitigation:** Keep Injector.get() pattern
- **Risk 2:** QueryApiMockService is large (606 lines) → **Mitigation:** Move as-is
- **Risk 3:** Many cross-library dependencies → **Mitigation:** Graph verification after migration
- **Risk 4:** Temporary imports break → **Mitigation:** Update core libs in same phase

---

## Rollback Procedure

If this phase fails:

```bash
# Restore original files
git checkout HEAD -- src/app/shared/
git checkout HEAD -- src/app/core/config-validator.service.ts
git checkout HEAD -- src/app/core/app-config.service.ts

# Restore temporary imports in core libs
git checkout HEAD -- libs/core/settings/src/lib/settings.service.ts
git checkout HEAD -- libs/core/auth/src/lib/auth.service.ts

# Clear library files
rm -rf libs/data/storage/src/lib/*.ts
rm -rf libs/data/api/src/lib/*.ts
rm -rf libs/data/query/src/lib/*.ts

# Reset index files
echo "// Placeholder" > libs/data/storage/src/index.ts
echo "// Placeholder" > libs/data/api/src/index.ts
echo "// Placeholder" > libs/data/query/src/index.ts

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D refactor/data-libs
```

---

## Exit Criteria

- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 6

---

## Notes

- This phase completes all service migrations to libraries
- After Phase 5, only feature components and app shell remain in src/app/
- The AppConfig ↔ Auth circular dependency is acceptable and documented
- Query services depend on both API and storage libraries
