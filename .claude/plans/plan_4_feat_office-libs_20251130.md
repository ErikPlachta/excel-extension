# Phase 4: Migrate Office Libraries

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
>
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 3 completed
> 4. Exit plan mode only when ready to execute

## Metadata

- **Branch:** `refactor/office-libs`
- **Depends On:** Phase 3 (Core Libs)
- **Estimated Effort:** 1 day (8 hours)
- **Created:** 2025-11-30
- **Status:** ✅ Completed (PR #33, 2025-12-01)
- **Note:** Migrated to `libs/core/excel/` instead of `libs/office/excel/`

---

## Objective

Migrate Office.js integration services (excel, workbook, formula-scanner) and common Office utilities to their respective Nx libraries. These services wrap Office.js APIs and provide the core Excel integration.

---

## Pre-Conditions

- [ ] Phase 3 completed: Core libraries migrated and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] `@excel-platform/core/*` aliases resolve correctly
- [ ] All tests passing: `npm run test:ci`
- [ ] Working directory clean: `git status`

---

## Success Criteria

- [ ] ExcelService migrated to `libs/office/excel/`
- [ ] WorkbookService migrated to `libs/office/excel/`
- [ ] FormulaScannerService migrated to `libs/office/excel/`
- [ ] WINDOW token migrated to `libs/office/common/`
- [ ] All imports updated to use `@excel-platform/office/*` aliases
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] Office.js integration works in Excel

---

## Detailed Steps

### Step 1: Create Branch for Phase 4

**Action:** Create dedicated branch for office libs migration
**Commands:**

```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/office-libs
```

**Validation:**

```bash
git branch --show-current
# Should return: refactor/office-libs
```

---

### Step 2: Analyze Office Service Dependencies

**Action:** Map dependencies before migration
**Dependency Analysis:**

| Service               | Lines | Dependencies                      |
| --------------------- | ----- | --------------------------------- |
| ExcelService          | 1174  | TelemetryService, SettingsService |
| WorkbookService       | 267   | ExcelService                      |
| FormulaScannerService | 382   | ExcelService, TelemetryService    |
| WINDOW token          | 10    | None (pure token)                 |

**Migration Order:**

1. WINDOW token (no deps)
2. ExcelService (depends on core/telemetry, core/settings)
3. WorkbookService (depends on ExcelService)
4. FormulaScannerService (depends on ExcelService, core/telemetry)

---

### Step 3: Migrate WINDOW Token to libs/office/common

**Action:** Move the window injection token
**Files to Move:**

| Source                         | Destination                                  |
| ------------------------------ | -------------------------------------------- |
| `src/app/core/window.token.ts` | `libs/office/common/src/lib/window.token.ts` |

**Commands:**

```bash
cp src/app/core/window.token.ts libs/office/common/src/lib/
```

**Validation:**

```bash
ls libs/office/common/src/lib/
# Should show window.token.ts
```

---

### Step 4: Create Barrel Export for Common Library

**Action:** Update index.ts to export common utilities
**Commands:**

```bash
cat > libs/office/common/src/index.ts << 'EOF'
// @excel-platform/office/common
// Common Office.js utilities and tokens

export * from './lib/window.token';
EOF
```

**Validation:**

```bash
cat libs/office/common/src/index.ts
```

---

### Step 5: Create tsconfig.json Files for Common Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/office/common/tsconfig.json << 'EOF'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    }
  ]
}
EOF

cat > libs/office/common/tsconfig.lib.json << 'EOF'
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
```

**Validation:**

```bash
ls libs/office/common/tsconfig*.json
```

---

### Step 6: Migrate ExcelService to libs/office/excel

**Action:** Move the main Excel integration service
**Files to Move:**

| Source                               | Destination                                       |
| ------------------------------------ | ------------------------------------------------- |
| `src/app/core/excel.service.ts`      | `libs/office/excel/src/lib/excel.service.ts`      |
| `src/app/core/excel.service.spec.ts` | `libs/office/excel/src/lib/excel.service.spec.ts` |

**Commands:**

```bash
cp src/app/core/excel.service.ts libs/office/excel/src/lib/
cp src/app/core/excel.service.spec.ts libs/office/excel/src/lib/
```

**Manual Edit Required:**

```typescript
// libs/office/excel/src/lib/excel.service.ts
// Before
import { ExcelOperationResult } from "../types/excel.types";
import { TelemetryService } from "./telemetry.service";
import { SettingsService } from "./settings.service";

// After
import { ExcelOperationResult } from "@excel-platform/shared/types";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { SettingsService } from "@excel-platform/core/settings";
```

**Validation:**

```bash
ls libs/office/excel/src/lib/excel*
# Should show service and spec files
```

---

### Step 7: Migrate WorkbookService to libs/office/excel

**Action:** Move the workbook abstraction service
**Files to Move:**

| Source                                  | Destination                                          |
| --------------------------------------- | ---------------------------------------------------- |
| `src/app/core/workbook.service.ts`      | `libs/office/excel/src/lib/workbook.service.ts`      |
| `src/app/core/workbook.service.spec.ts` | `libs/office/excel/src/lib/workbook.service.spec.ts` |

**Commands:**

```bash
cp src/app/core/workbook.service.ts libs/office/excel/src/lib/
cp src/app/core/workbook.service.spec.ts libs/office/excel/src/lib/
```

**Manual Edit Required:**

```typescript
// libs/office/excel/src/lib/workbook.service.ts
// Before
import { WorkbookInfo, SheetInfo } from "../types/workbook.types";
import { ExcelService } from "./excel.service";

// After
import { WorkbookInfo, SheetInfo } from "@excel-platform/shared/types";
import { ExcelService } from "./excel.service"; // Same library, relative OK
```

**Validation:**

```bash
ls libs/office/excel/src/lib/workbook*
```

---

### Step 8: Migrate FormulaScannerService to libs/office/excel

**Action:** Move the formula scanning service
**Files to Move:**

| Source                                         | Destination                                                 |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `src/app/core/formula-scanner.service.ts`      | `libs/office/excel/src/lib/formula-scanner.service.ts`      |
| `src/app/core/formula-scanner.service.spec.ts` | `libs/office/excel/src/lib/formula-scanner.service.spec.ts` |

**Commands:**

```bash
cp src/app/core/formula-scanner.service.ts libs/office/excel/src/lib/
cp src/app/core/formula-scanner.service.spec.ts libs/office/excel/src/lib/
```

**Manual Edit Required:**

```typescript
// libs/office/excel/src/lib/formula-scanner.service.ts
// Before
import { FormulaReference, ImpactAssessment } from "../types/formula.types";
import { ExcelService } from "./excel.service";
import { TelemetryService } from "./telemetry.service";

// After
import { FormulaReference, ImpactAssessment } from "@excel-platform/shared/types";
import { ExcelService } from "./excel.service"; // Same library
import { TelemetryService } from "@excel-platform/core/telemetry";
```

**Validation:**

```bash
ls libs/office/excel/src/lib/formula-scanner*
```

---

### Step 9: Create Barrel Export for Excel Library

**Action:** Update index.ts to export all Excel services
**Commands:**

```bash
cat > libs/office/excel/src/index.ts << 'EOF'
// @excel-platform/office/excel
// Excel integration services

export * from './lib/excel.service';
export * from './lib/workbook.service';
export * from './lib/formula-scanner.service';
EOF
```

**Validation:**

```bash
cat libs/office/excel/src/index.ts
```

---

### Step 10: Create tsconfig.json Files for Excel Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/office/excel/tsconfig.json << 'EOF'
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

cat > libs/office/excel/tsconfig.lib.json << 'EOF'
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

cat > libs/office/excel/tsconfig.spec.json << 'EOF'
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

**Validation:**

```bash
ls libs/office/excel/tsconfig*.json | wc -l
# Should return: 3
```

---

### Step 11: Update App Imports to Use Office Aliases

**Action:** Find and replace all imports from old locations

**Import Path Changes:**

| Old Import                               | New Import                             |
| ---------------------------------------- | -------------------------------------- |
| `from './excel.service'`                 | `from '@excel-platform/office/excel'`  |
| `from '../core/excel.service'`           | `from '@excel-platform/office/excel'`  |
| `from './workbook.service'`              | `from '@excel-platform/office/excel'`  |
| `from '../core/workbook.service'`        | `from '@excel-platform/office/excel'`  |
| `from './formula-scanner.service'`       | `from '@excel-platform/office/excel'`  |
| `from '../core/formula-scanner.service'` | `from '@excel-platform/office/excel'`  |
| `from './window.token'`                  | `from '@excel-platform/office/common'` |

**Commands:**

```bash
# Find all files importing these services
grep -rl "from '.*excel.service'" src/app/
grep -rl "from '.*workbook.service'" src/app/
grep -rl "from '.*formula-scanner.service'" src/app/
grep -rl "from '.*window.token'" src/app/
```

---

### Step 12: Delete Original Office Service Files

**Action:** Remove original files after confirming build works
**Commands:**

```bash
# Only after build succeeds!
rm src/app/core/excel.service.ts
rm src/app/core/excel.service.spec.ts
rm src/app/core/workbook.service.ts
rm src/app/core/workbook.service.spec.ts
rm src/app/core/formula-scanner.service.ts
rm src/app/core/formula-scanner.service.spec.ts
rm src/app/core/window.token.ts
```

**Validation:**

```bash
ls src/app/core/*service*.ts 2>/dev/null
# Should only show app-config.service.ts and config-validator.service.ts
```

---

### Step 13: Verify Build and Tests

**Action:** Ensure everything still works after migration
**Commands:**

```bash
npm run lint
npm run build
npm run test:ci
```

**Expected Output:**

- All commands pass
- No Office.js related errors

---

### Step 14: Commit Phase 4 Changes

**Action:** Commit all office library migration changes
**Commands:**

```bash
git add .
git status

git commit -m "$(cat <<'EOF'
feat: migrate office libraries to Nx workspace

Migrate Office.js integration to Nx libraries:

## libs/office/excel (1823 lines total)
- ExcelService (1174 lines) - Core Excel.run() wrapper
- WorkbookService (267 lines) - Workbook abstraction
- FormulaScannerService (382 lines) - Formula dependency scanning

## libs/office/common
- WINDOW token - Window injection for SSR safety

All imports updated to use @excel-platform/office/* aliases.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 15: Create PR for Phase 4

**Action:** Push branch and create pull request
**Commands:**

```bash
git push -u origin refactor/office-libs

gh pr create --title "[Phase 4] Migrate office libraries" --body "$(cat <<'EOF'
## Summary
Migrate Office.js integration services to Nx libraries.

## Changes
- Move ExcelService, WorkbookService, FormulaScannerService to `libs/office/excel/`
- Move WINDOW token to `libs/office/common/`
- Update all imports to use `@excel-platform/office/*` aliases
- Remove original files from `src/app/core/`

## Libraries Created
- `@excel-platform/office/excel` - Excel integration services
- `@excel-platform/office/common` - Common Office utilities

## Dependencies
- `office/excel` → `shared/types`, `core/telemetry`, `core/settings`
- `office/common` → (none)

## Testing
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run test:ci` passes
- [x] Office.js integration verified

## Next Steps
Phase 5: Migrate data libraries (query, api, storage)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## File Migration Map

### libs/office/excel

| Source                                         | Destination                                                 | Notes                          |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| `src/app/core/excel.service.ts`                | `libs/office/excel/src/lib/excel.service.ts`                | 1174 lines, core Excel wrapper |
| `src/app/core/excel.service.spec.ts`           | `libs/office/excel/src/lib/excel.service.spec.ts`           | Tests                          |
| `src/app/core/workbook.service.ts`             | `libs/office/excel/src/lib/workbook.service.ts`             | 267 lines                      |
| `src/app/core/workbook.service.spec.ts`        | `libs/office/excel/src/lib/workbook.service.spec.ts`        | Tests                          |
| `src/app/core/formula-scanner.service.ts`      | `libs/office/excel/src/lib/formula-scanner.service.ts`      | 382 lines                      |
| `src/app/core/formula-scanner.service.spec.ts` | `libs/office/excel/src/lib/formula-scanner.service.spec.ts` | Tests                          |

### libs/office/common

| Source                         | Destination                                  | Notes                 |
| ------------------------------ | -------------------------------------------- | --------------------- |
| `src/app/core/window.token.ts` | `libs/office/common/src/lib/window.token.ts` | SSR-safe window token |

---

## Import Path Changes

| Old Import                               | New Import                             |
| ---------------------------------------- | -------------------------------------- |
| `from '../core/excel.service'`           | `from '@excel-platform/office/excel'`  |
| `from './excel.service'`                 | `from '@excel-platform/office/excel'`  |
| `from '../core/workbook.service'`        | `from '@excel-platform/office/excel'`  |
| `from './workbook.service'`              | `from '@excel-platform/office/excel'`  |
| `from '../core/formula-scanner.service'` | `from '@excel-platform/office/excel'`  |
| `from './formula-scanner.service'`       | `from '@excel-platform/office/excel'`  |
| `from './window.token'`                  | `from '@excel-platform/office/common'` |
| `from '../core/window.token'`            | `from '@excel-platform/office/common'` |

---

## Integrity Checks

Run ALL before marking complete:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:ci` passes
- [ ] `libs/office/excel/src/lib/` contains 3 services + specs
- [ ] `libs/office/common/src/lib/` contains window.token.ts
- [ ] No original files remain in `src/app/core/` for migrated services
- [ ] `import { ExcelService } from '@excel-platform/office/excel'` compiles
- [ ] `import { WINDOW } from '@excel-platform/office/common'` compiles

---

## Gap Identification

- **Risk 1:** Office.js globals undefined in tests → **Mitigation:** Existing isExcel guards handle this
- **Risk 2:** ExcelService is large (1174 lines) → **Mitigation:** Move as-is, refactoring is separate concern
- **Risk 3:** Chunked write patterns may break → **Mitigation:** Thorough testing of query execution
- **Risk 4:** Feature components break → **Mitigation:** Update all feature imports before deleting originals

---

## Rollback Procedure

If this phase fails:

```bash
# Restore original files
git checkout HEAD -- src/app/core/excel.service.ts
git checkout HEAD -- src/app/core/excel.service.spec.ts
git checkout HEAD -- src/app/core/workbook.service.ts
git checkout HEAD -- src/app/core/workbook.service.spec.ts
git checkout HEAD -- src/app/core/formula-scanner.service.ts
git checkout HEAD -- src/app/core/formula-scanner.service.spec.ts
git checkout HEAD -- src/app/core/window.token.ts

# Clear library files
rm -rf libs/office/excel/src/lib/*.ts
rm -rf libs/office/common/src/lib/*.ts

# Reset index files
echo "// Placeholder" > libs/office/excel/src/index.ts
echo "// Placeholder" > libs/office/common/src/index.ts

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D refactor/office-libs
```

---

## Exit Criteria

- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 5

---

## Notes

- ExcelService is the largest service (1174 lines) - critical to migration
- Office.js interactions should continue to work unchanged
- Tests rely on isExcel guards - no Office mock needed
- WorkbookService and FormulaScannerService depend on ExcelService
