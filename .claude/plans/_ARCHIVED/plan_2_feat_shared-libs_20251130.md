# Phase 2: Migrate Shared Libraries

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
>
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 1 completed
> 4. Exit plan mode only when ready to execute

## Metadata

- **Branch:** `refactor/shared-libs`
- **Depends On:** Phase 1 (Nx Init)
- **Estimated Effort:** 1 day (8 hours)
- **Created:** 2025-11-30
- **Status:** ✅ Completed (PR #31, 2025-12-01)

---

## Objective

Migrate the shared types, UI components, and utility functions to their respective Nx libraries. These have zero dependencies on other app code, making them the ideal starting point.

---

## Pre-Conditions

- [ ] Phase 1 completed: PR merged to migration branch
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] `npx nx show projects` shows 11 library placeholders
- [ ] All tests passing: `npm run test:ci`
- [ ] Working directory clean: `git status`

---

## Success Criteria

- [ ] All 11 type files migrated to `libs/shared/types/`
- [ ] All 9 UI components migrated to `libs/shared/ui/`
- [ ] Utility functions migrated to `libs/shared/util/`
- [ ] All imports updated to use `@excel-platform/shared/*` aliases
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] No lint errors

---

## Detailed Steps

### Step 1: Create Branch for Phase 2

**Action:** Create dedicated branch for shared libs migration
**Commands:**

```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/shared-libs
```

**Validation:**

```bash
git branch --show-current
# Should return: refactor/shared-libs
```

---

### Step 2: Migrate Type Files to libs/shared/types

**Action:** Move all type definition files to the types library
**Files to Move:**

| Source                                       | Destination                                              |
| -------------------------------------------- | -------------------------------------------------------- |
| `src/app/types/auth.types.ts`                | `libs/shared/types/src/lib/auth.types.ts`                |
| `src/app/types/jwt.types.ts`                 | `libs/shared/types/src/lib/jwt.types.ts`                 |
| `src/app/types/api.types.ts`                 | `libs/shared/types/src/lib/api.types.ts`                 |
| `src/app/types/query.types.ts`               | `libs/shared/types/src/lib/query.types.ts`               |
| `src/app/types/query-configuration.types.ts` | `libs/shared/types/src/lib/query-configuration.types.ts` |
| `src/app/types/query-params.types.ts`        | `libs/shared/types/src/lib/query-params.types.ts`        |
| `src/app/types/workbook.types.ts`            | `libs/shared/types/src/lib/workbook.types.ts`            |
| `src/app/types/excel.types.ts`               | `libs/shared/types/src/lib/excel.types.ts`               |
| `src/app/types/settings.types.ts`            | `libs/shared/types/src/lib/settings.types.ts`            |
| `src/app/types/telemetry.types.ts`           | `libs/shared/types/src/lib/telemetry.types.ts`           |
| `src/app/types/formula.types.ts`             | `libs/shared/types/src/lib/formula.types.ts`             |

**Commands:**

```bash
# Move type files
cp src/app/types/auth.types.ts libs/shared/types/src/lib/
cp src/app/types/jwt.types.ts libs/shared/types/src/lib/
cp src/app/types/api.types.ts libs/shared/types/src/lib/
cp src/app/types/query.types.ts libs/shared/types/src/lib/
cp src/app/types/query-configuration.types.ts libs/shared/types/src/lib/
cp src/app/types/query-params.types.ts libs/shared/types/src/lib/
cp src/app/types/workbook.types.ts libs/shared/types/src/lib/
cp src/app/types/excel.types.ts libs/shared/types/src/lib/
cp src/app/types/settings.types.ts libs/shared/types/src/lib/
cp src/app/types/telemetry.types.ts libs/shared/types/src/lib/
cp src/app/types/formula.types.ts libs/shared/types/src/lib/
```

**Validation:**

```bash
ls libs/shared/types/src/lib/*.types.ts | wc -l
# Should return: 11
```

---

### Step 3: Create Barrel Export for Types Library

**Action:** Update index.ts to export all types
**Commands:**

```bash
cat > libs/shared/types/src/index.ts << 'EOF'
// @excel-platform/shared/types
// Shared type definitions for the Excel Platform

export * from './lib/auth.types';
export * from './lib/jwt.types';
export * from './lib/api.types';
export * from './lib/query.types';
export * from './lib/query-configuration.types';
export * from './lib/query-params.types';
export * from './lib/workbook.types';
export * from './lib/excel.types';
export * from './lib/settings.types';
export * from './lib/telemetry.types';
export * from './lib/formula.types';
EOF
```

**Validation:**

```bash
cat libs/shared/types/src/index.ts
# Should show all exports
```

---

### Step 4: Create tsconfig.json for Types Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/shared/types/tsconfig.json << 'EOF'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": []
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

cat > libs/shared/types/tsconfig.lib.json << 'EOF'
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
ls libs/shared/types/tsconfig*.json
# Should show tsconfig.json and tsconfig.lib.json
```

---

### Step 5: Migrate UI Components to libs/shared/ui

**Action:** Move all standalone UI components
**Files to Move:**

| Source                                              | Destination                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| `src/app/shared/ui/button.component.ts`             | `libs/shared/ui/src/lib/button.component.ts`             |
| `src/app/shared/ui/card.component.ts`               | `libs/shared/ui/src/lib/card.component.ts`               |
| `src/app/shared/ui/dropdown.component.ts`           | `libs/shared/ui/src/lib/dropdown.component.ts`           |
| `src/app/shared/ui/icon.component.ts`               | `libs/shared/ui/src/lib/icon.component.ts`               |
| `src/app/shared/ui/list.component.ts`               | `libs/shared/ui/src/lib/list.component.ts`               |
| `src/app/shared/ui/progress-indicator.component.ts` | `libs/shared/ui/src/lib/progress-indicator.component.ts` |
| `src/app/shared/ui/section.component.ts`            | `libs/shared/ui/src/lib/section.component.ts`            |
| `src/app/shared/ui/status-banner.component.ts`      | `libs/shared/ui/src/lib/status-banner.component.ts`      |
| `src/app/shared/ui/table.component.ts`              | `libs/shared/ui/src/lib/table.component.ts`              |

**Commands:**

```bash
# Move UI component files
cp src/app/shared/ui/button.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/card.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/dropdown.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/icon.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/list.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/progress-indicator.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/section.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/status-banner.component.ts libs/shared/ui/src/lib/
cp src/app/shared/ui/table.component.ts libs/shared/ui/src/lib/
```

**Validation:**

```bash
ls libs/shared/ui/src/lib/*.component.ts | wc -l
# Should return: 9
```

---

### Step 6: Create Barrel Export for UI Library

**Action:** Update index.ts to export all UI components
**Commands:**

```bash
cat > libs/shared/ui/src/index.ts << 'EOF'
// @excel-platform/shared/ui
// Shared UI components for the Excel Platform

export * from './lib/button.component';
export * from './lib/card.component';
export * from './lib/dropdown.component';
export * from './lib/icon.component';
export * from './lib/list.component';
export * from './lib/progress-indicator.component';
export * from './lib/section.component';
export * from './lib/status-banner.component';
export * from './lib/table.component';
EOF
```

**Validation:**

```bash
cat libs/shared/ui/src/index.ts
# Should show all component exports
```

---

### Step 7: Create tsconfig.json for UI Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/shared/ui/tsconfig.json << 'EOF'
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

cat > libs/shared/ui/tsconfig.lib.json << 'EOF'
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

cat > libs/shared/ui/tsconfig.spec.json << 'EOF'
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
ls libs/shared/ui/tsconfig*.json | wc -l
# Should return: 3
```

---

### Step 8: Migrate Utility Functions to libs/shared/util

**Action:** Move utility files
**Files to Move:**

| Source                   | Destination                        |
| ------------------------ | ---------------------------------- |
| `src/app/shared/util.ts` | `libs/shared/util/src/lib/util.ts` |

**Commands:**

```bash
cp src/app/shared/util.ts libs/shared/util/src/lib/
```

**Validation:**

```bash
ls libs/shared/util/src/lib/
# Should show util.ts
```

---

### Step 9: Create Barrel Export for Util Library

**Action:** Update index.ts to export utilities
**Commands:**

```bash
cat > libs/shared/util/src/index.ts << 'EOF'
// @excel-platform/shared/util
// Shared utility functions for the Excel Platform

export * from './lib/util';
EOF
```

**Validation:**

```bash
cat libs/shared/util/src/index.ts
# Should show export
```

---

### Step 10: Create tsconfig.json for Util Library

**Action:** Create library-specific TypeScript configuration
**Commands:**

```bash
cat > libs/shared/util/tsconfig.json << 'EOF'
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

cat > libs/shared/util/tsconfig.lib.json << 'EOF'
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
ls libs/shared/util/tsconfig*.json
# Should show tsconfig files
```

---

### Step 11: Update Import Paths in Migrated Files

**Action:** Update any internal imports within the shared libraries to use new paths
**Commands:**

```bash
# Check for any internal imports that need updating
grep -r "from '\.\." libs/shared/types/src/
grep -r "from '\.\." libs/shared/ui/src/
grep -r "from '\.\." libs/shared/util/src/

# If any found, update them to use @excel-platform/* aliases
```

**Expected:** Shared libraries should have minimal internal imports. If any type files reference each other, update to:

```typescript
// Old: import { SomeType } from './other.types';
// New: Keep relative for same-library imports (no change needed)
```

---

### Step 12: Update App Imports to Use New Aliases

**Action:** Find and replace all imports from old locations to new library paths

**Import Path Changes:**

| Old Import                                | New Import                            |
| ----------------------------------------- | ------------------------------------- |
| `from '../types/auth.types'`              | `from '@excel-platform/shared/types'` |
| `from '../types/api.types'`               | `from '@excel-platform/shared/types'` |
| `from '../types/query.types'`             | `from '@excel-platform/shared/types'` |
| `from '../shared/ui/button.component'`    | `from '@excel-platform/shared/ui'`    |
| `from '../shared/ui/card.component'`      | `from '@excel-platform/shared/ui'`    |
| `from '../shared/util'`                   | `from '@excel-platform/shared/util'`  |
| (all other relative type/ui/util imports) | (corresponding @excel-platform alias) |

**Commands:**

```bash
# Find all files importing from old locations
grep -rl "from '.*types/" src/app/
grep -rl "from '.*shared/ui/" src/app/
grep -rl "from '.*shared/util" src/app/

# Use sed or manual editing to update imports
# Example for types:
find src/app -name "*.ts" -exec sed -i '' \
  "s|from '\\.\\./types/|from '@excel-platform/shared/types'; // |g" {} \;

# Note: Manual review recommended for complex import patterns
```

**Manual Update Pattern:**

```typescript
// Before
import { AuthState, UserInfo } from "../types/auth.types";
import { ApiDefinition } from "../types/api.types";

// After
import { AuthState, UserInfo, ApiDefinition } from "@excel-platform/shared/types";
```

---

### Step 13: Delete Original Files After Migration

**Action:** Remove the original files from src/app/ after confirming imports work
**Commands:**

```bash
# Only after build succeeds!
rm -rf src/app/types/auth.types.ts
rm -rf src/app/types/jwt.types.ts
rm -rf src/app/types/api.types.ts
rm -rf src/app/types/query.types.ts
rm -rf src/app/types/query-configuration.types.ts
rm -rf src/app/types/query-params.types.ts
rm -rf src/app/types/workbook.types.ts
rm -rf src/app/types/excel.types.ts
rm -rf src/app/types/settings.types.ts
rm -rf src/app/types/telemetry.types.ts
rm -rf src/app/types/formula.types.ts

rm -rf src/app/shared/ui/button.component.ts
rm -rf src/app/shared/ui/card.component.ts
rm -rf src/app/shared/ui/dropdown.component.ts
rm -rf src/app/shared/ui/icon.component.ts
rm -rf src/app/shared/ui/list.component.ts
rm -rf src/app/shared/ui/progress-indicator.component.ts
rm -rf src/app/shared/ui/section.component.ts
rm -rf src/app/shared/ui/status-banner.component.ts
rm -rf src/app/shared/ui/table.component.ts

rm -rf src/app/shared/util.ts
```

**Validation:**

```bash
# Verify original files are gone
ls src/app/types/*.types.ts 2>/dev/null | wc -l
# Should return only app-config.types.ts and ui/primitives.types.ts (stay in app)

ls src/app/shared/ui/*.component.ts 2>/dev/null | wc -l
# Should return: 0
```

---

### Step 14: Verify Build and Tests

**Action:** Ensure everything still works after migration
**Commands:**

```bash
# Run lint
npm run lint

# Run build
npm run build

# Run tests
npm run test:ci

# Verify Nx recognizes the libraries
npx nx show projects
```

**Expected Output:**

- All commands pass
- `nx show projects` shows the 11 libraries

---

### Step 15: Commit Phase 2 Changes

**Action:** Commit all shared library migration changes
**Commands:**

```bash
git add .
git status

git commit -m "$(cat <<'EOF'
feat: migrate shared libraries to Nx workspace

Migrate zero-dependency shared code to Nx libraries:

## libs/shared/types (11 files)
- auth.types, jwt.types, api.types, query.types
- query-configuration.types, query-params.types
- workbook.types, excel.types, settings.types
- telemetry.types, formula.types

## libs/shared/ui (9 components)
- Button, Card, Dropdown, Icon, List
- ProgressIndicator, Section, StatusBanner, Table

## libs/shared/util
- Utility functions

All imports updated to use @excel-platform/shared/* aliases.
Original files removed from src/app/.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Validation:**

```bash
git log --oneline -1
# Should show the commit
```

---

### Step 16: Create PR for Phase 2

**Action:** Push branch and create pull request
**Commands:**

```bash
git push -u origin refactor/shared-libs

gh pr create --title "[Phase 2] Migrate shared libraries" --body "$(cat <<'EOF'
## Summary
Migrate shared types, UI components, and utilities to Nx libraries.

## Changes
- Move 11 type files to `libs/shared/types/`
- Move 9 UI components to `libs/shared/ui/`
- Move utility functions to `libs/shared/util/`
- Update all imports to use `@excel-platform/shared/*` aliases
- Remove original files from `src/app/`

## Libraries Created
- `@excel-platform/shared/types` - Domain type definitions
- `@excel-platform/shared/ui` - Standalone UI components
- `@excel-platform/shared/util` - Utility functions

## Testing
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run test:ci` passes
- [x] All imports resolve correctly

## Next Steps
Phase 3: Migrate core libraries (auth, telemetry, settings)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Validation:**

```bash
gh pr view --web
# Should open the PR in browser
```

---

## File Migration Map

### libs/shared/types

| Source                                       | Destination                                              | Notes                              |
| -------------------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| `src/app/types/auth.types.ts`                | `libs/shared/types/src/lib/auth.types.ts`                | AuthState, UserInfo, Role          |
| `src/app/types/jwt.types.ts`                 | `libs/shared/types/src/lib/jwt.types.ts`                 | JwtPayload, TokenPair              |
| `src/app/types/api.types.ts`                 | `libs/shared/types/src/lib/api.types.ts`                 | ApiDefinition, ApiParameter        |
| `src/app/types/query.types.ts`               | `libs/shared/types/src/lib/query.types.ts`               | QueryInstance, QueryResult         |
| `src/app/types/query-configuration.types.ts` | `libs/shared/types/src/lib/query-configuration.types.ts` | QueryConfiguration                 |
| `src/app/types/query-params.types.ts`        | `libs/shared/types/src/lib/query-params.types.ts`        | QueryParams                        |
| `src/app/types/workbook.types.ts`            | `libs/shared/types/src/lib/workbook.types.ts`            | WorkbookInfo, SheetInfo            |
| `src/app/types/excel.types.ts`               | `libs/shared/types/src/lib/excel.types.ts`               | ExcelOperationResult               |
| `src/app/types/settings.types.ts`            | `libs/shared/types/src/lib/settings.types.ts`            | AppSettings, TelemetrySettings     |
| `src/app/types/telemetry.types.ts`           | `libs/shared/types/src/lib/telemetry.types.ts`           | TelemetryEvent                     |
| `src/app/types/formula.types.ts`             | `libs/shared/types/src/lib/formula.types.ts`             | FormulaReference, ImpactAssessment |

### libs/shared/ui

| Source                                              | Destination                                              | Notes               |
| --------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| `src/app/shared/ui/button.component.ts`             | `libs/shared/ui/src/lib/button.component.ts`             | Standalone button   |
| `src/app/shared/ui/card.component.ts`               | `libs/shared/ui/src/lib/card.component.ts`               | Standalone card     |
| `src/app/shared/ui/dropdown.component.ts`           | `libs/shared/ui/src/lib/dropdown.component.ts`           | Standalone dropdown |
| `src/app/shared/ui/icon.component.ts`               | `libs/shared/ui/src/lib/icon.component.ts`               | Standalone icon     |
| `src/app/shared/ui/list.component.ts`               | `libs/shared/ui/src/lib/list.component.ts`               | Standalone list     |
| `src/app/shared/ui/progress-indicator.component.ts` | `libs/shared/ui/src/lib/progress-indicator.component.ts` | Standalone progress |
| `src/app/shared/ui/section.component.ts`            | `libs/shared/ui/src/lib/section.component.ts`            | Standalone section  |
| `src/app/shared/ui/status-banner.component.ts`      | `libs/shared/ui/src/lib/status-banner.component.ts`      | Standalone banner   |
| `src/app/shared/ui/table.component.ts`              | `libs/shared/ui/src/lib/table.component.ts`              | Standalone table    |

### libs/shared/util

| Source                   | Destination                        | Notes             |
| ------------------------ | ---------------------------------- | ----------------- |
| `src/app/shared/util.ts` | `libs/shared/util/src/lib/util.ts` | Utility functions |

---

## Files NOT Migrated (Stay in App)

These files remain in `src/app/` as they are app-specific:

- `src/app/types/app-config.types.ts` → stays in app (app-specific config)
- `src/app/types/ui/primitives.types.ts` → stays in app (app-specific UI types)

---

## Integrity Checks

Run ALL before marking complete:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:ci` passes
- [ ] All 11 type files exist in `libs/shared/types/src/lib/`
- [ ] All 9 UI components exist in `libs/shared/ui/src/lib/`
- [ ] Utility file exists in `libs/shared/util/src/lib/`
- [ ] No original files remain in `src/app/types/` (except app-config)
- [ ] No original files remain in `src/app/shared/ui/`
- [ ] `import { AuthState } from '@excel-platform/shared/types'` compiles

---

## Gap Identification

- **Risk 1:** Circular type dependencies → **Mitigation:** Types have no dependencies on services; safe to migrate first
- **Risk 2:** UI components may import types → **Mitigation:** Update imports to use `@excel-platform/shared/types`
- **Risk 3:** Missing exports in barrel → **Mitigation:** Verify all types are exported in index.ts
- **Risk 4:** Test files reference old paths → **Mitigation:** Update test imports alongside source files

---

## Rollback Procedure

If this phase fails:

```bash
# Restore original files from git
git checkout HEAD -- src/app/types/
git checkout HEAD -- src/app/shared/ui/
git checkout HEAD -- src/app/shared/util.ts

# Remove migrated libraries
rm -rf libs/shared/types/src/lib/*.ts
rm -rf libs/shared/ui/src/lib/*.ts
rm -rf libs/shared/util/src/lib/*.ts

# Reset index files to placeholders
echo "// Placeholder" > libs/shared/types/src/index.ts
echo "// Placeholder" > libs/shared/ui/src/index.ts
echo "// Placeholder" > libs/shared/util/src/index.ts

# Discard all changes
git checkout -- .
git clean -fd

# Return to migration base
git checkout refactor/nx-monorepo-migration
git branch -D refactor/shared-libs
```

---

## Exit Criteria

- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 3

---

## Notes

- Type files have zero runtime dependencies - purely definition files
- UI components are standalone with no service dependencies
- This phase establishes the pattern for subsequent library migrations
- Import updates must be thorough - search entire codebase
