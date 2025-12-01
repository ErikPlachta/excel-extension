# Phase 1: Initialize Nx Workspace

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 0 completed
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `refactor/nx-workspace-init`
- **Depends On:** Phase 0 (Backup)
- **Estimated Effort:** 0.5 days (4 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective
Initialize an Nx workspace structure within the existing repository. This creates the foundational monorepo structure (`apps/`, `libs/`, `tools/`) without moving any code yet.

---

## Pre-Conditions
- [ ] Phase 0 completed: Backup branch exists on remote
- [ ] On migration branch: `git branch --show-current` returns `refactor/nx-monorepo-migration`
- [ ] Working directory clean: `git status`
- [ ] All tests passing: `npm run test:ci`
- [ ] Node version compatible: `node --version` shows v20.x or v22.x

---

## Success Criteria
- [ ] Nx workspace initialized with `nx.json`
- [ ] `apps/` directory created with `excel-addin/` placeholder
- [ ] `libs/` directory created with placeholder structure
- [ ] `tools/` directory created
- [ ] `tsconfig.base.json` created with path aliases
- [ ] Nx dependencies installed
- [ ] `nx graph` command works
- [ ] Existing Angular app still builds and tests pass

---

## Detailed Steps

### Step 1: Create Branch for Phase 1
**Action:** Create dedicated branch for Nx initialization
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git checkout -b refactor/nx-workspace-init
```
**Validation:**
```bash
git branch --show-current
# Should return: refactor/nx-workspace-init
```

---

### Step 2: Install Nx Dependencies
**Action:** Add Nx packages to the project
**Commands:**
```bash
npm install -D nx @nx/angular @nx/workspace @nx/eslint @nx/jest
```
**Files Affected:**
- `package.json` - devDependencies updated
- `package-lock.json` - lockfile updated

**Validation:**
```bash
npx nx --version
# Should show Nx version (e.g., 20.x.x)

npm list nx @nx/angular @nx/workspace
# Should show installed versions
```

---

### Step 3: Create nx.json Configuration
**Action:** Create Nx workspace configuration file
**Commands:**
```bash
cat > nx.json << 'EOF'
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/eslint.config.js",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/src/test-setup.[jt]s"
    ],
    "sharedGlobals": []
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json", "{workspaceRoot}/eslint.config.js"],
      "cache": true
    }
  },
  "nxCloudAccessToken": "",
  "defaultBase": "develop",
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    }
  ],
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "libs"
  }
}
EOF
```
**Validation:**
```bash
cat nx.json | head -20
# Should show the configuration
```

---

### Step 4: Create Workspace tsconfig.base.json
**Action:** Create base TypeScript configuration with path aliases
**Commands:**
```bash
cat > tsconfig.base.json << 'EOF'
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "bundler",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@excel-platform/shared/types": ["libs/shared/types/src/index.ts"],
      "@excel-platform/shared/ui": ["libs/shared/ui/src/index.ts"],
      "@excel-platform/shared/util": ["libs/shared/util/src/index.ts"],
      "@excel-platform/core/auth": ["libs/core/auth/src/index.ts"],
      "@excel-platform/core/telemetry": ["libs/core/telemetry/src/index.ts"],
      "@excel-platform/core/settings": ["libs/core/settings/src/index.ts"],
      "@excel-platform/office/excel": ["libs/office/excel/src/index.ts"],
      "@excel-platform/office/common": ["libs/office/common/src/index.ts"],
      "@excel-platform/data/query": ["libs/data/query/src/index.ts"],
      "@excel-platform/data/api": ["libs/data/api/src/index.ts"],
      "@excel-platform/data/storage": ["libs/data/storage/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
EOF
```
**Validation:**
```bash
cat tsconfig.base.json | grep -A 5 "paths"
# Should show the path aliases
```

---

### Step 5: Create Directory Structure
**Action:** Create the monorepo directory structure
**Commands:**
```bash
# Create apps directory
mkdir -p apps/excel-addin/src/app

# Create libs directory structure
mkdir -p libs/shared/types/src/lib
mkdir -p libs/shared/ui/src/lib
mkdir -p libs/shared/util/src/lib
mkdir -p libs/core/auth/src/lib
mkdir -p libs/core/telemetry/src/lib
mkdir -p libs/core/settings/src/lib
mkdir -p libs/office/excel/src/lib
mkdir -p libs/office/common/src/lib
mkdir -p libs/data/query/src/lib
mkdir -p libs/data/api/src/lib
mkdir -p libs/data/storage/src/lib

# Create tools directory
mkdir -p tools/scripts

# Create docs directory
mkdir -p docs/architecture
mkdir -p docs/guides
mkdir -p docs/api
mkdir -p docs/changelog
```
**Validation:**
```bash
tree -d -L 3 apps libs tools docs
# Should show the directory structure
```

---

### Step 6: Create Placeholder index.ts Files for Libraries
**Action:** Create barrel export files for each library
**Commands:**
```bash
# Shared libs
echo "// @excel-platform/shared/types - Placeholder" > libs/shared/types/src/index.ts
echo "// @excel-platform/shared/ui - Placeholder" > libs/shared/ui/src/index.ts
echo "// @excel-platform/shared/util - Placeholder" > libs/shared/util/src/index.ts

# Core libs
echo "// @excel-platform/core/auth - Placeholder" > libs/core/auth/src/index.ts
echo "// @excel-platform/core/telemetry - Placeholder" > libs/core/telemetry/src/index.ts
echo "// @excel-platform/core/settings - Placeholder" > libs/core/settings/src/index.ts

# Office libs
echo "// @excel-platform/office/excel - Placeholder" > libs/office/excel/src/index.ts
echo "// @excel-platform/office/common - Placeholder" > libs/office/common/src/index.ts

# Data libs
echo "// @excel-platform/data/query - Placeholder" > libs/data/query/src/index.ts
echo "// @excel-platform/data/api - Placeholder" > libs/data/api/src/index.ts
echo "// @excel-platform/data/storage - Placeholder" > libs/data/storage/src/index.ts
```
**Validation:**
```bash
find libs -name "index.ts" | wc -l
# Should return: 11
```

---

### Step 7: Create Library project.json Files
**Action:** Create Nx project configuration for each library
**Commands:**
```bash
# Create project.json for shared/types
cat > libs/shared/types/project.json << 'EOF'
{
  "name": "shared-types",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/shared/types/src",
  "projectType": "library",
  "tags": ["scope:shared", "type:types"]
}
EOF

# Create project.json for shared/ui
cat > libs/shared/ui/project.json << 'EOF'
{
  "name": "shared-ui",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/shared/ui/src",
  "projectType": "library",
  "tags": ["scope:shared", "type:ui"]
}
EOF

# Create project.json for shared/util
cat > libs/shared/util/project.json << 'EOF'
{
  "name": "shared-util",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/shared/util/src",
  "projectType": "library",
  "tags": ["scope:shared", "type:util"]
}
EOF

# Create project.json for core/auth
cat > libs/core/auth/project.json << 'EOF'
{
  "name": "core-auth",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/core/auth/src",
  "projectType": "library",
  "tags": ["scope:core", "type:feature"]
}
EOF

# Create project.json for core/telemetry
cat > libs/core/telemetry/project.json << 'EOF'
{
  "name": "core-telemetry",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/core/telemetry/src",
  "projectType": "library",
  "tags": ["scope:core", "type:feature"]
}
EOF

# Create project.json for core/settings
cat > libs/core/settings/project.json << 'EOF'
{
  "name": "core-settings",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/core/settings/src",
  "projectType": "library",
  "tags": ["scope:core", "type:feature"]
}
EOF

# Create project.json for office/excel
cat > libs/office/excel/project.json << 'EOF'
{
  "name": "office-excel",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/office/excel/src",
  "projectType": "library",
  "tags": ["scope:office", "type:feature"]
}
EOF

# Create project.json for office/common
cat > libs/office/common/project.json << 'EOF'
{
  "name": "office-common",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/office/common/src",
  "projectType": "library",
  "tags": ["scope:office", "type:util"]
}
EOF

# Create project.json for data/query
cat > libs/data/query/project.json << 'EOF'
{
  "name": "data-query",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/data/query/src",
  "projectType": "library",
  "tags": ["scope:data", "type:feature"]
}
EOF

# Create project.json for data/api
cat > libs/data/api/project.json << 'EOF'
{
  "name": "data-api",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/data/api/src",
  "projectType": "library",
  "tags": ["scope:data", "type:feature"]
}
EOF

# Create project.json for data/storage
cat > libs/data/storage/project.json << 'EOF'
{
  "name": "data-storage",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/data/storage/src",
  "projectType": "library",
  "tags": ["scope:data", "type:feature"]
}
EOF
```
**Validation:**
```bash
find libs -name "project.json" | wc -l
# Should return: 11
```

---

### Step 8: Update package.json with Nx Scripts
**Action:** Add Nx-specific scripts to package.json
**Commands:**
```bash
# Add scripts using npm pkg (or manually edit)
npm pkg set scripts.nx="nx"
npm pkg set scripts.graph="nx graph"
npm pkg set scripts.affected="nx affected"
npm pkg set scripts.affected:lint="nx affected --target=lint"
npm pkg set scripts.affected:test="nx affected --target=test"
npm pkg set scripts.affected:build="nx affected --target=build"
```
**Files Affected:**
- `package.json` - scripts section updated

**Validation:**
```bash
npm run graph
# Should open browser with empty graph (no dependencies yet)
```

---

### Step 9: Update .gitignore for Nx
**Action:** Add Nx-specific entries to .gitignore
**Commands:**
```bash
cat >> .gitignore << 'EOF'

# Nx
.nx/cache
.nx/workspace-data
dist/
tmp/
EOF
```
**Validation:**
```bash
grep -A 5 "# Nx" .gitignore
# Should show the Nx entries
```

---

### Step 10: Verify Existing App Still Works
**Action:** Ensure the existing Angular app still builds and tests pass
**Commands:**
```bash
# Verify lint still works
npm run lint

# Verify build still works
npm run build

# Verify tests still pass
npm run test:ci
```
**Expected Output:**
- All commands should succeed
- Same results as baseline from Phase 0

**Validation:**
```bash
ls -la dist/
# Should still have the Angular build output
```

---

### Step 11: Verify Nx Commands Work
**Action:** Test Nx CLI functionality
**Commands:**
```bash
# List all projects
npx nx show projects

# Show project graph
npx nx graph

# Check workspace
npx nx report
```
**Expected Output:**
- `nx show projects` lists the 11 library projects
- `nx graph` opens browser showing projects (no deps yet)
- `nx report` shows Nx version and workspace info

**Validation:**
```bash
npx nx show projects | wc -l
# Should return: 11 (one per library)
```

---

### Step 12: Commit Phase 1 Changes
**Action:** Commit all Nx workspace initialization changes
**Commands:**
```bash
git add .
git status

git commit -m "$(cat <<'EOF'
chore: initialize Nx workspace structure

- Add Nx dependencies (@nx/angular, @nx/workspace, @nx/eslint, @nx/jest)
- Create nx.json workspace configuration
- Create tsconfig.base.json with library path aliases
- Create apps/, libs/, tools/, docs/ directory structure
- Add project.json for all 11 planned libraries
- Add Nx scripts to package.json
- Update .gitignore for Nx cache

Libraries scaffolded (empty placeholders):
- @excel-platform/shared/types
- @excel-platform/shared/ui
- @excel-platform/shared/util
- @excel-platform/core/auth
- @excel-platform/core/telemetry
- @excel-platform/core/settings
- @excel-platform/office/excel
- @excel-platform/office/common
- @excel-platform/data/query
- @excel-platform/data/api
- @excel-platform/data/storage

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

### Step 13: Create PR for Phase 1
**Action:** Push branch and create pull request
**Commands:**
```bash
git push -u origin refactor/nx-workspace-init

gh pr create --title "[Phase 1] Initialize Nx workspace structure" --body "$(cat <<'EOF'
## Summary
Initialize Nx monorepo workspace structure as foundation for migration.

## Changes
- Add Nx dependencies
- Create `nx.json` workspace configuration
- Create `tsconfig.base.json` with path aliases for 11 libraries
- Scaffold `apps/`, `libs/`, `tools/`, `docs/` directories
- Add `project.json` for each planned library

## Testing
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run test:ci` passes
- [x] `npx nx show projects` lists 11 libraries
- [x] `npx nx graph` displays project graph

## Next Steps
Phase 2: Migrate shared libraries (types, ui, util)

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

## Integrity Checks
Run ALL before marking complete:
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:ci` passes
- [ ] `npx nx show projects` lists 11 projects
- [ ] `npx nx graph` opens and displays projects
- [ ] All library index.ts files exist
- [ ] All library project.json files exist
- [ ] PR created and CI passes

---

## Gap Identification
- **Risk 1:** Nx version incompatible with Angular 20 → **Mitigation:** Use latest Nx v20.x which supports Angular 20
- **Risk 2:** Path aliases break existing imports → **Mitigation:** Existing code unchanged, aliases only for new structure
- **Risk 3:** CI fails with Nx → **Mitigation:** Nx commands are additive, existing npm scripts unchanged

---

## Rollback Procedure
If this phase fails:
```bash
# Discard all changes
git checkout -- .
git clean -fd

# Remove Nx packages
npm uninstall nx @nx/angular @nx/workspace @nx/eslint @nx/jest

# Delete created directories
rm -rf apps libs tools docs

# Delete Nx config files
rm -f nx.json tsconfig.base.json

# Return to migration base
git checkout refactor/nx-monorepo-migration
git branch -D refactor/nx-workspace-init
```

---

## Exit Criteria
- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created: `gh pr create --title "[Phase 1] Initialize Nx workspace structure"`
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 2

---

## Notes
- Existing Angular build/test/lint commands continue to work unchanged
- Nx is purely additive at this stage - no code has moved yet
- Path aliases are defined but not used until libraries are populated
- PR should merge to `refactor/nx-monorepo-migration`, not `develop`
