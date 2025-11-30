# Phase 6: App Migration

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 5 completed
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `refactor/app-migration`
- **Depends On:** Phase 5 (Data Libs)
- **Estimated Effort:** 1.5 days (12 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective
Move the Angular application to `apps/excel-addin/` directory structure. This includes features, components, routing, and all app-specific code. After this phase, `src/` will be empty and all code lives in `apps/` and `libs/`.

---

## Pre-Conditions
- [ ] Phase 5 completed: Data libraries migrated and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] All `@excel-platform/*` library aliases resolve correctly
- [ ] All tests passing: `npm run test:ci`
- [ ] Working directory clean: `git status`

---

## Success Criteria
- [ ] All feature components moved to `apps/excel-addin/src/app/features/`
- [ ] App shell (AppComponent) moved to `apps/excel-addin/src/app/`
- [ ] Routes, config, and bootstrap files moved
- [ ] Entry files (main.ts, index.html, styles.css) moved
- [ ] Commands, helpers, middle-tier moved
- [ ] Public assets moved
- [ ] Angular/build configuration updated
- [ ] All existing tests still pass
- [ ] Build succeeds and app runs
- [ ] `src/` directory can be deleted

---

## Detailed Steps

### Step 1: Create Branch for Phase 6
**Action:** Create dedicated branch for app migration
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/app-migration
```
**Validation:**
```bash
git branch --show-current
# Should return: refactor/app-migration
```

---

### Step 2: Create App Directory Structure
**Action:** Create the full app directory structure
**Commands:**
```bash
# Create app directories
mkdir -p apps/excel-addin/src/app/features
mkdir -p apps/excel-addin/src/app/types
mkdir -p apps/excel-addin/src/commands
mkdir -p apps/excel-addin/src/helpers
mkdir -p apps/excel-addin/src/middle-tier
mkdir -p apps/excel-addin/public
```
**Validation:**
```bash
tree -d apps/excel-addin/
```

---

### Step 3: Move Entry Files
**Action:** Move main.ts, index.html, styles.css
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/main.ts` | `apps/excel-addin/src/main.ts` |
| `src/index.html` | `apps/excel-addin/src/index.html` |
| `src/styles.css` | `apps/excel-addin/src/styles.css` |

**Commands:**
```bash
cp src/main.ts apps/excel-addin/src/
cp src/index.html apps/excel-addin/src/
cp src/styles.css apps/excel-addin/src/
```

**Manual Edit Required (main.ts):**
```typescript
// apps/excel-addin/src/main.ts
// Before
import { appConfig } from './app/core/app.config';
import { AppComponent } from './app/core/app.component';

// After
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
```

---

### Step 4: Move App Shell Components
**Action:** Move AppComponent and related bootstrap files
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/core/app.component.ts` | `apps/excel-addin/src/app/app.component.ts` |
| `src/app/core/app.component.html` | `apps/excel-addin/src/app/app.component.html` |
| `src/app/core/app.component.css` | `apps/excel-addin/src/app/app.component.css` |
| `src/app/core/app.component.spec.ts` | `apps/excel-addin/src/app/app.component.spec.ts` |
| `src/app/core/app.config.ts` | `apps/excel-addin/src/app/app.config.ts` |
| `src/app/core/app.routes.ts` | `apps/excel-addin/src/app/app.routes.ts` |

**Commands:**
```bash
cp src/app/core/app.component.ts apps/excel-addin/src/app/
cp src/app/core/app.component.html apps/excel-addin/src/app/
cp src/app/core/app.component.css apps/excel-addin/src/app/
cp src/app/core/app.component.spec.ts apps/excel-addin/src/app/
cp src/app/core/app.config.ts apps/excel-addin/src/app/
cp src/app/core/app.routes.ts apps/excel-addin/src/app/
```

**Manual Edit Required (app.component.ts):**
```typescript
// apps/excel-addin/src/app/app.component.ts
// Update all service imports to use library aliases
import { AuthService } from '@excel-platform/core/auth';
import { TelemetryService } from '@excel-platform/core/telemetry';
import { SettingsService } from '@excel-platform/core/settings';
import { ExcelService, WorkbookService } from '@excel-platform/office/excel';
// etc.
```

**Manual Edit Required (app.routes.ts):**
```typescript
// apps/excel-addin/src/app/app.routes.ts
// Update feature component imports
import { HomeComponent } from './features/home/home.component';
import { QueriesComponent } from './features/queries/queries.component';
// etc.
```

---

### Step 5: Move Feature Components
**Action:** Move all feature folders
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/features/home/` | `apps/excel-addin/src/app/features/home/` |
| `src/app/features/queries/` | `apps/excel-addin/src/app/features/queries/` |
| `src/app/features/settings/` | `apps/excel-addin/src/app/features/settings/` |
| `src/app/features/worksheets/` | `apps/excel-addin/src/app/features/worksheets/` |
| `src/app/features/tables/` | `apps/excel-addin/src/app/features/tables/` |
| `src/app/features/sso/` | `apps/excel-addin/src/app/features/sso/` |
| `src/app/features/user/` | `apps/excel-addin/src/app/features/user/` |
| `src/app/features/debug/` | `apps/excel-addin/src/app/features/debug/` |

**Commands:**
```bash
cp -r src/app/features/home apps/excel-addin/src/app/features/
cp -r src/app/features/queries apps/excel-addin/src/app/features/
cp -r src/app/features/settings apps/excel-addin/src/app/features/
cp -r src/app/features/worksheets apps/excel-addin/src/app/features/
cp -r src/app/features/tables apps/excel-addin/src/app/features/
cp -r src/app/features/sso apps/excel-addin/src/app/features/
cp -r src/app/features/user apps/excel-addin/src/app/features/
cp -r src/app/features/debug apps/excel-addin/src/app/features/
```

**Manual Edit Required (each feature component):**
Update imports in each component to use library aliases:
```typescript
// Before
import { AuthService } from '../../core/auth.service';
import { ExcelService } from '../../core/excel.service';

// After
import { AuthService } from '@excel-platform/core/auth';
import { ExcelService } from '@excel-platform/office/excel';
```

---

### Step 6: Move App-Specific Types
**Action:** Move types that stay with the app
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/types/app-config.types.ts` | `apps/excel-addin/src/app/types/app-config.types.ts` |
| `src/app/types/ui/primitives.types.ts` | `apps/excel-addin/src/app/types/ui/primitives.types.ts` |

**Commands:**
```bash
mkdir -p apps/excel-addin/src/app/types/ui
cp src/app/types/app-config.types.ts apps/excel-addin/src/app/types/
cp src/app/types/ui/primitives.types.ts apps/excel-addin/src/app/types/ui/
```

---

### Step 7: Move Commands, Helpers, and Middle-Tier
**Action:** Move Office.js command handlers and helpers
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/commands/commands.html` | `apps/excel-addin/src/commands/commands.html` |
| `src/commands/commands.ts` | `apps/excel-addin/src/commands/commands.ts` |
| `src/helpers/` | `apps/excel-addin/src/helpers/` |
| `src/middle-tier/` | `apps/excel-addin/src/middle-tier/` |

**Commands:**
```bash
cp -r src/commands/* apps/excel-addin/src/commands/
cp -r src/helpers/* apps/excel-addin/src/helpers/
cp -r src/middle-tier/* apps/excel-addin/src/middle-tier/
```

---

### Step 8: Move Public Assets
**Action:** Move static assets
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `public/` | `apps/excel-addin/public/` |

**Commands:**
```bash
cp -r public/* apps/excel-addin/public/
```

---

### Step 9: Move App Text File
**Action:** Move centralized UI text
**Files to Move:**

| Source | Destination |
|--------|-------------|
| `src/app/shared/app-text.ts` | `apps/excel-addin/src/app/app-text.ts` |

**Commands:**
```bash
cp src/app/shared/app-text.ts apps/excel-addin/src/app/
```

---

### Step 10: Create App project.json
**Action:** Create Nx project configuration for the app
**Commands:**
```bash
cat > apps/excel-addin/project.json << 'EOF'
{
  "name": "excel-addin",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/excel-addin/src",
  "prefix": "app",
  "tags": ["scope:app", "type:application"],
  "targets": {
    "build": {
      "executor": "@angular-devkit/build-angular:application",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/excel-addin",
        "index": "apps/excel-addin/src/index.html",
        "browser": "apps/excel-addin/src/main.ts",
        "polyfills": ["zone.js"],
        "tsConfig": "apps/excel-addin/tsconfig.app.json",
        "assets": [
          {
            "glob": "**/*",
            "input": "apps/excel-addin/public"
          }
        ],
        "styles": ["apps/excel-addin/src/styles.css"],
        "scripts": []
      },
      "configurations": {
        "production": {
          "budgets": [
            {
              "type": "initial",
              "maximumWarning": "500kB",
              "maximumError": "1MB"
            },
            {
              "type": "anyComponentStyle",
              "maximumWarning": "2kB",
              "maximumError": "4kB"
            }
          ],
          "outputHashing": "all"
        },
        "development": {
          "optimization": false,
          "extractLicenses": false,
          "sourceMap": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "executor": "@angular-devkit/build-angular:dev-server",
      "configurations": {
        "production": {
          "buildTarget": "excel-addin:build:production"
        },
        "development": {
          "buildTarget": "excel-addin:build:development"
        }
      },
      "defaultConfiguration": "development"
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "apps/excel-addin/jest.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
EOF
```

---

### Step 11: Create App tsconfig Files
**Action:** Create TypeScript configurations for the app
**Commands:**
```bash
cat > apps/excel-addin/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc"
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
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

cat > apps/excel-addin/tsconfig.app.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": ["src/**/*.d.ts"]
}
EOF

cat > apps/excel-addin/tsconfig.spec.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": ["jest"]
  },
  "files": [],
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
EOF
```

---

### Step 12: Update Root angular.json
**Action:** Update Angular CLI configuration to point to new app location
**Commands:**
```bash
# Update angular.json to use apps/excel-addin
# This requires careful editing of the existing file
# Key changes:
# - sourceRoot: "apps/excel-addin/src"
# - outputPath: "dist/apps/excel-addin"
# - index: "apps/excel-addin/src/index.html"
# - browser: "apps/excel-addin/src/main.ts"
# - assets: "apps/excel-addin/public"
# - styles: "apps/excel-addin/src/styles.css"
```

**Manual Edit Required (angular.json):**
Update the project paths in angular.json to point to new locations.

---

### Step 13: Update Package.json Scripts
**Action:** Update npm scripts to use Nx commands
**Commands:**
```bash
# Update scripts to use Nx
npm pkg set scripts.start="nx serve excel-addin"
npm pkg set scripts.build="nx build excel-addin"
npm pkg set scripts.test="nx test excel-addin"
npm pkg set scripts.lint="nx lint excel-addin"
npm pkg set scripts.serve="nx serve excel-addin"
```

---

### Step 14: Update All Feature Component Imports
**Action:** Comprehensive import update for all features
**Commands:**
```bash
# Find and update all imports in features
find apps/excel-addin/src/app/features -name "*.ts" -exec grep -l "from '\.\." {} \;

# Each file needs imports updated to library aliases
```

**Pattern for each component:**
```typescript
// Before
import { Component } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { ExcelService } from '../../core/excel.service';
import { TelemetryService } from '../../core/telemetry.service';
import { QueryApiMockService } from '../../shared/query-api-mock.service';

// After
import { Component } from '@angular/core';
import { AuthService } from '@excel-platform/core/auth';
import { ExcelService } from '@excel-platform/office/excel';
import { TelemetryService } from '@excel-platform/core/telemetry';
import { QueryApiMockService } from '@excel-platform/data/api';
```

---

### Step 15: Verify Build and Tests
**Action:** Ensure everything still works after migration
**Commands:**
```bash
# Try Nx commands
npx nx build excel-addin
npx nx test excel-addin
npx nx lint excel-addin

# Also verify old npm scripts still work
npm run build
npm run test:ci
npm run lint
```
**Expected Output:**
- All commands pass
- App builds successfully

---

### Step 16: Delete Original src/ Directory
**Action:** Remove old source directory after confirming everything works
**Commands:**
```bash
# Only after build and tests pass!
rm -rf src/app
rm -rf src/commands
rm -rf src/helpers
rm -rf src/middle-tier
rm src/main.ts
rm src/index.html
rm src/styles.css

# Keep src/ if any other files exist, or remove entirely
rmdir src 2>/dev/null || echo "src/ not empty, check remaining files"
```
**Validation:**
```bash
ls src/ 2>/dev/null || echo "src/ removed"
```

---

### Step 17: Commit Phase 6 Changes
**Action:** Commit all app migration changes
**Commands:**
```bash
git add .
git status

git commit -m "$(cat <<'EOF'
chore: migrate app to apps/excel-addin directory

Move Angular application to Nx apps directory:

## apps/excel-addin/src/
- main.ts, index.html, styles.css (entry files)
- app/app.component.* (shell component)
- app/app.config.ts, app.routes.ts (bootstrap)
- app/app-text.ts (UI copy)
- app/features/** (8 feature modules)
- app/types/** (app-specific types)
- commands/** (Office.js ribbon handlers)
- helpers/** (SSO helpers)
- middle-tier/** (stubbed functions)
- public/** (static assets)

## Updated
- project.json for Nx build/serve/test/lint
- angular.json paths
- package.json scripts to use Nx
- All imports to use @excel-platform/* aliases

Old src/ directory removed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 18: Create PR for Phase 6
**Action:** Push branch and create pull request
**Commands:**
```bash
git push -u origin refactor/app-migration

gh pr create --title "[Phase 6] Migrate app to apps/excel-addin" --body "$(cat <<'EOF'
## Summary
Move Angular application to Nx apps directory structure.

## Changes
- Move all entry files to `apps/excel-addin/src/`
- Move app shell to `apps/excel-addin/src/app/`
- Move 8 feature folders to `apps/excel-addin/src/app/features/`
- Move commands, helpers, middle-tier
- Move public assets
- Create app project.json for Nx
- Update angular.json paths
- Update package.json scripts to use Nx
- Update all imports to use library aliases
- Remove old `src/` directory

## Directory Structure After
```
apps/
  excel-addin/
    src/
      app/
        features/
          home/, queries/, settings/, worksheets/,
          tables/, sso/, user/, debug/
        types/
        app.component.*
        app.config.ts
        app.routes.ts
        app-text.ts
      commands/
      helpers/
      middle-tier/
      main.ts
      index.html
      styles.css
    public/
    project.json
    tsconfig.*.json
```

## Testing
- [x] `nx build excel-addin` succeeds
- [x] `nx serve excel-addin` starts dev server
- [x] `nx test excel-addin` passes
- [x] `nx lint excel-addin` passes
- [x] App works in Excel (manual test)

## Next Steps
Phase 7: Jest migration (replace Karma with Jest)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## File Migration Map

### Entry Files
| Source | Destination |
|--------|-------------|
| `src/main.ts` | `apps/excel-addin/src/main.ts` |
| `src/index.html` | `apps/excel-addin/src/index.html` |
| `src/styles.css` | `apps/excel-addin/src/styles.css` |

### App Shell
| Source | Destination |
|--------|-------------|
| `src/app/core/app.component.ts` | `apps/excel-addin/src/app/app.component.ts` |
| `src/app/core/app.component.html` | `apps/excel-addin/src/app/app.component.html` |
| `src/app/core/app.component.css` | `apps/excel-addin/src/app/app.component.css` |
| `src/app/core/app.component.spec.ts` | `apps/excel-addin/src/app/app.component.spec.ts` |
| `src/app/core/app.config.ts` | `apps/excel-addin/src/app/app.config.ts` |
| `src/app/core/app.routes.ts` | `apps/excel-addin/src/app/app.routes.ts` |
| `src/app/shared/app-text.ts` | `apps/excel-addin/src/app/app-text.ts` |

### Features (8 folders)
| Source | Destination |
|--------|-------------|
| `src/app/features/home/**` | `apps/excel-addin/src/app/features/home/**` |
| `src/app/features/queries/**` | `apps/excel-addin/src/app/features/queries/**` |
| `src/app/features/settings/**` | `apps/excel-addin/src/app/features/settings/**` |
| `src/app/features/worksheets/**` | `apps/excel-addin/src/app/features/worksheets/**` |
| `src/app/features/tables/**` | `apps/excel-addin/src/app/features/tables/**` |
| `src/app/features/sso/**` | `apps/excel-addin/src/app/features/sso/**` |
| `src/app/features/user/**` | `apps/excel-addin/src/app/features/user/**` |
| `src/app/features/debug/**` | `apps/excel-addin/src/app/features/debug/**` |

### App-Specific Types
| Source | Destination |
|--------|-------------|
| `src/app/types/app-config.types.ts` | `apps/excel-addin/src/app/types/app-config.types.ts` |
| `src/app/types/ui/primitives.types.ts` | `apps/excel-addin/src/app/types/ui/primitives.types.ts` |

### Office.js Integration
| Source | Destination |
|--------|-------------|
| `src/commands/**` | `apps/excel-addin/src/commands/**` |
| `src/helpers/**` | `apps/excel-addin/src/helpers/**` |
| `src/middle-tier/**` | `apps/excel-addin/src/middle-tier/**` |

### Assets
| Source | Destination |
|--------|-------------|
| `public/**` | `apps/excel-addin/public/**` |

---

## Integrity Checks
Run ALL before marking complete:
- [ ] `nx build excel-addin` succeeds
- [ ] `nx serve excel-addin` starts and serves app
- [ ] `nx test excel-addin` passes all tests
- [ ] `nx lint excel-addin` passes
- [ ] App loads in browser at localhost:4200
- [ ] All 8 feature views render correctly
- [ ] Navigation between views works
- [ ] `src/` directory is removed
- [ ] No broken imports in any file

---

## Gap Identification
- **Risk 1:** Many import paths to update → **Mitigation:** Systematic find/replace
- **Risk 2:** Angular CLI may need additional config → **Mitigation:** Verify angular.json and project.json
- **Risk 3:** Tests may fail due to path changes → **Mitigation:** Update test imports too
- **Risk 4:** Dev server may not start → **Mitigation:** Verify Nx serve configuration

---

## Rollback Procedure
If this phase fails:
```bash
# Restore src/ from git
git checkout HEAD -- src/

# Remove app files
rm -rf apps/excel-addin/src

# Restore angular.json and package.json
git checkout HEAD -- angular.json
git checkout HEAD -- package.json

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D refactor/app-migration
```

---

## Exit Criteria
- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 7

---

## Notes
- This is the largest migration phase - move entire app
- Import updates are the most time-consuming part
- Test each feature after moving to catch import issues early
- The Nx project.json enables future nx build/serve commands
