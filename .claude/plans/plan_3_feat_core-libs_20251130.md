# Phase 3: Migrate Core Libraries

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 2 completed
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `refactor/core-libs`
- **Depends On:** Phase 2 (Shared Libs)
- **Estimated Effort:** 1 day (8 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective
Migrate core services (auth, telemetry, settings) to their respective Nx libraries. These services form the foundation layer that other services depend on.

---

## Pre-Conditions
- [ ] Phase 2 completed: Shared libraries migrated and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] `@excel-platform/shared/types` resolves correctly
- [ ] All tests passing: `npm run test:ci`
- [ ] Working directory clean: `git status`

---

## Success Criteria
- [ ] AuthService and JwtHelperService migrated to `libs/core/auth/`
- [ ] TelemetryService and AppContextService migrated to `libs/core/telemetry/`
- [ ] SettingsService migrated to `libs/core/settings/`
- [ ] All imports updated to use `@excel-platform/core/*` aliases
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] No circular dependencies introduced

---

## Detailed Steps

### Step 1: Create Branch for Phase 3
**Action:** Create dedicated branch for core libs migration
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/core-libs
```
**Validation:**
```bash
git branch --show-current
# Should return: refactor/core-libs
```

---

### Step 2: Analyze Core Service Dependencies
**Action:** Map dependencies before migration to ensure correct order
**Dependency Analysis:**

| Service | Lines | Dependencies |
|---------|-------|--------------|
| JwtHelperService | 302 | None (pure functions) |
| AuthService | 459 | JwtHelperService, StorageHelperService |
| AppContextService | 88 | AuthService |
| TelemetryService | 271 | AppContextService, SettingsService |
| SettingsService | 130 | StorageBaseService |

**Migration Order:**
1. JwtHelperService (no deps)
2. SettingsService (only StorageBaseService - stays in data/storage)
3. AuthService (needs JwtHelper, StorageHelper)
4. AppContextService (needs AuthService)
5. TelemetryService (needs AppContext, Settings)

**Note:** StorageBaseService and StorageHelperService stay until Phase 5 (data/storage)

---

### Step 3: Migrate JwtHelperService to libs/core/auth
**Action:** Move JwtHelperService (pure functions, no dependencies)
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/core/jwt-helper.service.ts` | `libs/core/auth/src/lib/jwt-helper.service.ts` |
| `src/app/core/jwt-helper.service.spec.ts` | `libs/core/auth/src/lib/jwt-helper.service.spec.ts` |

**Commands:**
```bash
# Copy files
cp src/app/core/jwt-helper.service.ts libs/core/auth/src/lib/
cp src/app/core/jwt-helper.service.spec.ts libs/core/auth/src/lib/

# Update imports in the service file to use @excel-platform/shared/types
# The service likely imports from '../types/jwt.types' - update to alias
```

**Manual Edit Required:**
```typescript
// libs/core/auth/src/lib/jwt-helper.service.ts
// Before
import { JwtPayload, TokenPair } from '../types/jwt.types';

// After
import { JwtPayload, TokenPair } from '@excel-platform/shared/types';
```

**Validation:**
```bash
ls libs/core/auth/src/lib/jwt-helper*
# Should show service and spec files
```

---

### Step 4: Migrate AuthService to libs/core/auth
**Action:** Move AuthService with its dependencies
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/core/auth.service.ts` | `libs/core/auth/src/lib/auth.service.ts` |
| `src/app/core/auth.service.spec.ts` | `libs/core/auth/src/lib/auth.service.spec.ts` |

**Commands:**
```bash
cp src/app/core/auth.service.ts libs/core/auth/src/lib/
cp src/app/core/auth.service.spec.ts libs/core/auth/src/lib/
```

**Manual Edit Required:**
```typescript
// libs/core/auth/src/lib/auth.service.ts
// Before
import { AuthState, UserInfo, Role } from '../types/auth.types';
import { JwtHelperService } from './jwt-helper.service';
import { StorageHelperService } from '../shared/storage-helper.service';

// After
import { AuthState, UserInfo, Role } from '@excel-platform/shared/types';
import { JwtHelperService } from './jwt-helper.service'; // Same library, relative OK
// StorageHelperService - temporary relative import until Phase 5
import { StorageHelperService } from '../../../../src/app/shared/storage-helper.service';
```

**Note:** StorageHelperService import will be updated in Phase 5 when data/storage is migrated.

**Validation:**
```bash
ls libs/core/auth/src/lib/auth*
# Should show service and spec files
```

---

### Step 5: Create Barrel Export for Auth Library
**Action:** Update index.ts to export auth services
**Commands:**
```bash
cat > libs/core/auth/src/index.ts << 'EOF'
// @excel-platform/core/auth
// Authentication and JWT services

export * from './lib/jwt-helper.service';
export * from './lib/auth.service';
EOF
```
**Validation:**
```bash
cat libs/core/auth/src/index.ts
# Should show both exports
```

---

### Step 6: Create tsconfig.json Files for Auth Library
**Action:** Create library-specific TypeScript configuration
**Commands:**
```bash
cat > libs/core/auth/tsconfig.json << 'EOF'
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

cat > libs/core/auth/tsconfig.lib.json << 'EOF'
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

cat > libs/core/auth/tsconfig.spec.json << 'EOF'
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
ls libs/core/auth/tsconfig*.json | wc -l
# Should return: 3
```

---

### Step 7: Migrate SettingsService to libs/core/settings
**Action:** Move SettingsService
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/core/settings.service.ts` | `libs/core/settings/src/lib/settings.service.ts` |
| `src/app/core/settings.service.spec.ts` | `libs/core/settings/src/lib/settings.service.spec.ts` |

**Commands:**
```bash
cp src/app/core/settings.service.ts libs/core/settings/src/lib/
cp src/app/core/settings.service.spec.ts libs/core/settings/src/lib/
```

**Manual Edit Required:**
```typescript
// libs/core/settings/src/lib/settings.service.ts
// Before
import { AppSettings, TelemetrySettings } from '../types/settings.types';
import { StorageBaseService } from '../shared/storage-base.service';

// After
import { AppSettings, TelemetrySettings } from '@excel-platform/shared/types';
// StorageBaseService - temporary relative import until Phase 5
import { StorageBaseService } from '../../../../src/app/shared/storage-base.service';
```

**Validation:**
```bash
ls libs/core/settings/src/lib/settings*
# Should show service and spec files
```

---

### Step 8: Create Barrel Export for Settings Library
**Action:** Update index.ts to export settings service
**Commands:**
```bash
cat > libs/core/settings/src/index.ts << 'EOF'
// @excel-platform/core/settings
// Application settings and preferences

export * from './lib/settings.service';
EOF
```
**Validation:**
```bash
cat libs/core/settings/src/index.ts
```

---

### Step 9: Create tsconfig.json Files for Settings Library
**Action:** Create library-specific TypeScript configuration
**Commands:**
```bash
cat > libs/core/settings/tsconfig.json << 'EOF'
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

cat > libs/core/settings/tsconfig.lib.json << 'EOF'
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

cat > libs/core/settings/tsconfig.spec.json << 'EOF'
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
ls libs/core/settings/tsconfig*.json | wc -l
# Should return: 3
```

---

### Step 10: Migrate AppContextService to libs/core/telemetry
**Action:** Move AppContextService
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/core/app-context.service.ts` | `libs/core/telemetry/src/lib/app-context.service.ts` |
| `src/app/core/app-context.service.spec.ts` | `libs/core/telemetry/src/lib/app-context.service.spec.ts` |

**Commands:**
```bash
cp src/app/core/app-context.service.ts libs/core/telemetry/src/lib/
cp src/app/core/app-context.service.spec.ts libs/core/telemetry/src/lib/
```

**Manual Edit Required:**
```typescript
// libs/core/telemetry/src/lib/app-context.service.ts
// Before
import { AuthService } from './auth.service';

// After
import { AuthService } from '@excel-platform/core/auth';
```

**Validation:**
```bash
ls libs/core/telemetry/src/lib/app-context*
```

---

### Step 11: Migrate TelemetryService to libs/core/telemetry
**Action:** Move TelemetryService
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/core/telemetry.service.ts` | `libs/core/telemetry/src/lib/telemetry.service.ts` |
| `src/app/core/telemetry.service.spec.ts` | `libs/core/telemetry/src/lib/telemetry.service.spec.ts` |

**Commands:**
```bash
cp src/app/core/telemetry.service.ts libs/core/telemetry/src/lib/
cp src/app/core/telemetry.service.spec.ts libs/core/telemetry/src/lib/
```

**Manual Edit Required:**
```typescript
// libs/core/telemetry/src/lib/telemetry.service.ts
// Before
import { TelemetryEvent, TelemetrySettings } from '../types/telemetry.types';
import { AppContextService } from './app-context.service';
import { SettingsService } from './settings.service';

// After
import { TelemetryEvent, TelemetrySettings } from '@excel-platform/shared/types';
import { AppContextService } from './app-context.service'; // Same library
import { SettingsService } from '@excel-platform/core/settings';
```

**Validation:**
```bash
ls libs/core/telemetry/src/lib/telemetry*
```

---

### Step 12: Create Barrel Export for Telemetry Library
**Action:** Update index.ts to export telemetry services
**Commands:**
```bash
cat > libs/core/telemetry/src/index.ts << 'EOF'
// @excel-platform/core/telemetry
// Telemetry and application context services

export * from './lib/app-context.service';
export * from './lib/telemetry.service';
EOF
```
**Validation:**
```bash
cat libs/core/telemetry/src/index.ts
```

---

### Step 13: Create tsconfig.json Files for Telemetry Library
**Action:** Create library-specific TypeScript configuration
**Commands:**
```bash
cat > libs/core/telemetry/tsconfig.json << 'EOF'
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

cat > libs/core/telemetry/tsconfig.lib.json << 'EOF'
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

cat > libs/core/telemetry/tsconfig.spec.json << 'EOF'
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
ls libs/core/telemetry/tsconfig*.json | wc -l
# Should return: 3
```

---

### Step 14: Update App Imports to Use Core Aliases
**Action:** Find and replace all imports from old locations

**Import Path Changes:**

| Old Import | New Import |
|------------|------------|
| `from './auth.service'` | `from '@excel-platform/core/auth'` |
| `from '../core/auth.service'` | `from '@excel-platform/core/auth'` |
| `from './jwt-helper.service'` | `from '@excel-platform/core/auth'` |
| `from './settings.service'` | `from '@excel-platform/core/settings'` |
| `from '../core/settings.service'` | `from '@excel-platform/core/settings'` |
| `from './telemetry.service'` | `from '@excel-platform/core/telemetry'` |
| `from '../core/telemetry.service'` | `from '@excel-platform/core/telemetry'` |
| `from './app-context.service'` | `from '@excel-platform/core/telemetry'` |

**Commands:**
```bash
# Find all files importing these services
grep -rl "from '.*auth.service'" src/app/
grep -rl "from '.*jwt-helper.service'" src/app/
grep -rl "from '.*settings.service'" src/app/
grep -rl "from '.*telemetry.service'" src/app/
grep -rl "from '.*app-context.service'" src/app/
```

---

### Step 15: Delete Original Core Service Files
**Action:** Remove original files after confirming build works
**Commands:**
```bash
# Only after build succeeds!
rm src/app/core/auth.service.ts
rm src/app/core/auth.service.spec.ts
rm src/app/core/jwt-helper.service.ts
rm src/app/core/jwt-helper.service.spec.ts
rm src/app/core/settings.service.ts
rm src/app/core/settings.service.spec.ts
rm src/app/core/telemetry.service.ts
rm src/app/core/telemetry.service.spec.ts
rm src/app/core/app-context.service.ts
rm src/app/core/app-context.service.spec.ts
```
**Validation:**
```bash
ls src/app/core/*service*.ts 2>/dev/null
# Should only show services not yet migrated (excel, workbook, formula-scanner, app-config, config-validator)
```

---

### Step 16: Verify Build and Tests
**Action:** Ensure everything still works after migration
**Commands:**
```bash
npm run lint
npm run build
npm run test:ci
```
**Expected Output:**
- All commands pass
- No circular dependency errors

---

### Step 17: Commit Phase 3 Changes
**Action:** Commit all core library migration changes
**Commands:**
```bash
git add .
git status

git commit -m "$(cat <<'EOF'
feat: migrate core libraries to Nx workspace

Migrate core service layer to Nx libraries:

## libs/core/auth
- JwtHelperService (302 lines) - Mock JWT generation
- AuthService (459 lines) - SSO and auth state management

## libs/core/settings
- SettingsService (130 lines) - User preferences

## libs/core/telemetry
- AppContextService (88 lines) - Runtime context aggregation
- TelemetryService (271 lines) - Centralized logging

All imports updated to use @excel-platform/core/* aliases.
Temporary relative imports for StorageBaseService/StorageHelperService
until Phase 5 (data/storage migration).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 18: Create PR for Phase 3
**Action:** Push branch and create pull request
**Commands:**
```bash
git push -u origin refactor/core-libs

gh pr create --title "[Phase 3] Migrate core libraries" --body "$(cat <<'EOF'
## Summary
Migrate core services (auth, settings, telemetry) to Nx libraries.

## Changes
- Move AuthService and JwtHelperService to `libs/core/auth/`
- Move SettingsService to `libs/core/settings/`
- Move TelemetryService and AppContextService to `libs/core/telemetry/`
- Update all imports to use `@excel-platform/core/*` aliases
- Remove original files from `src/app/core/`

## Libraries Created
- `@excel-platform/core/auth` - Authentication services
- `@excel-platform/core/settings` - Application settings
- `@excel-platform/core/telemetry` - Telemetry and context

## Dependencies
- `core/auth` → `shared/types`
- `core/settings` → `shared/types`
- `core/telemetry` → `shared/types`, `core/auth`, `core/settings`

## Testing
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run test:ci` passes
- [x] No circular dependency warnings

## Next Steps
Phase 4: Migrate office libraries (excel, common)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## File Migration Map

### libs/core/auth
| Source | Destination | Notes |
|--------|-------------|-------|
| `src/app/core/jwt-helper.service.ts` | `libs/core/auth/src/lib/jwt-helper.service.ts` | Pure functions, no deps |
| `src/app/core/jwt-helper.service.spec.ts` | `libs/core/auth/src/lib/jwt-helper.service.spec.ts` | Tests |
| `src/app/core/auth.service.ts` | `libs/core/auth/src/lib/auth.service.ts` | Depends on JwtHelper |
| `src/app/core/auth.service.spec.ts` | `libs/core/auth/src/lib/auth.service.spec.ts` | Tests |

### libs/core/settings
| Source | Destination | Notes |
|--------|-------------|-------|
| `src/app/core/settings.service.ts` | `libs/core/settings/src/lib/settings.service.ts` | Depends on StorageBase |
| `src/app/core/settings.service.spec.ts` | `libs/core/settings/src/lib/settings.service.spec.ts` | Tests |

### libs/core/telemetry
| Source | Destination | Notes |
|--------|-------------|-------|
| `src/app/core/app-context.service.ts` | `libs/core/telemetry/src/lib/app-context.service.ts` | Depends on Auth |
| `src/app/core/app-context.service.spec.ts` | `libs/core/telemetry/src/lib/app-context.service.spec.ts` | Tests |
| `src/app/core/telemetry.service.ts` | `libs/core/telemetry/src/lib/telemetry.service.ts` | Depends on AppContext, Settings |
| `src/app/core/telemetry.service.spec.ts` | `libs/core/telemetry/src/lib/telemetry.service.spec.ts` | Tests |

---

## Import Path Changes

| Old Import | New Import |
|------------|------------|
| `from '../core/auth.service'` | `from '@excel-platform/core/auth'` |
| `from '../core/jwt-helper.service'` | `from '@excel-platform/core/auth'` |
| `from './auth.service'` | `from '@excel-platform/core/auth'` |
| `from '../core/settings.service'` | `from '@excel-platform/core/settings'` |
| `from './settings.service'` | `from '@excel-platform/core/settings'` |
| `from '../core/telemetry.service'` | `from '@excel-platform/core/telemetry'` |
| `from './telemetry.service'` | `from '@excel-platform/core/telemetry'` |
| `from '../core/app-context.service'` | `from '@excel-platform/core/telemetry'` |

---

## Integrity Checks
Run ALL before marking complete:
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:ci` passes
- [ ] `libs/core/auth/src/lib/` contains 2 services + specs
- [ ] `libs/core/settings/src/lib/` contains 1 service + spec
- [ ] `libs/core/telemetry/src/lib/` contains 2 services + specs
- [ ] No original files remain in `src/app/core/` for migrated services
- [ ] `import { AuthService } from '@excel-platform/core/auth'` compiles
- [ ] No circular dependency errors from Nx

---

## Gap Identification
- **Risk 1:** Circular dependency between core services → **Mitigation:** Migration order respects dependency graph
- **Risk 2:** StorageHelperService not yet migrated → **Mitigation:** Temporary relative imports, updated in Phase 5
- **Risk 3:** Tests fail due to missing mocks → **Mitigation:** Update test imports and mock paths
- **Risk 4:** Feature components break → **Mitigation:** Update all feature imports before deleting originals

---

## Rollback Procedure
If this phase fails:
```bash
# Restore original files
git checkout HEAD -- src/app/core/auth.service.ts
git checkout HEAD -- src/app/core/auth.service.spec.ts
git checkout HEAD -- src/app/core/jwt-helper.service.ts
git checkout HEAD -- src/app/core/jwt-helper.service.spec.ts
git checkout HEAD -- src/app/core/settings.service.ts
git checkout HEAD -- src/app/core/settings.service.spec.ts
git checkout HEAD -- src/app/core/telemetry.service.ts
git checkout HEAD -- src/app/core/telemetry.service.spec.ts
git checkout HEAD -- src/app/core/app-context.service.ts
git checkout HEAD -- src/app/core/app-context.service.spec.ts

# Clear library files
rm -rf libs/core/auth/src/lib/*.ts
rm -rf libs/core/settings/src/lib/*.ts
rm -rf libs/core/telemetry/src/lib/*.ts

# Reset index files
echo "// Placeholder" > libs/core/auth/src/index.ts
echo "// Placeholder" > libs/core/settings/src/index.ts
echo "// Placeholder" > libs/core/telemetry/src/index.ts

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D refactor/core-libs
```

---

## Exit Criteria
- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 4

---

## Notes
- Core services are foundational - many features depend on them
- Thorough import updates are critical for this phase
- Temporary relative imports for storage services are acceptable
- Test updates may require updating mock providers
