# Phase 9: Compodoc Documentation

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 8 completed
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `feat/compodoc`
- **Depends On:** Phase 8 (CI/CD Update)
- **Estimated Effort:** 0.5 days (4 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective
Add Compodoc for automated API documentation generation. Compodoc is the de-facto standard for Angular documentation in 2025, providing TSDoc extraction, dependency graphs, and interactive documentation.

---

## Pre-Conditions
- [ ] Phase 8 completed: CI/CD updated and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] All builds passing: `nx build excel-addin`
- [ ] Working directory clean: `git status`

---

## Success Criteria
- [ ] Compodoc installed and configured
- [ ] Documentation generates for all libraries
- [ ] Documentation generates for app
- [ ] Coverage report shows TSDoc coverage
- [ ] Documentation serves locally
- [ ] Documentation build added to CI/CD
- [ ] Documentation deploys to GitHub Pages subdirectory

---

## Detailed Steps

### Step 1: Create Branch for Phase 9
**Action:** Create dedicated branch for Compodoc setup
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b feat/compodoc
```
**Validation:**
```bash
git branch --show-current
# Should return: feat/compodoc
```

---

### Step 2: Install Compodoc
**Action:** Add Compodoc as a dev dependency
**Commands:**
```bash
npm install -D @compodoc/compodoc
```
**Validation:**
```bash
npx compodoc --version
```

---

### Step 3: Create Compodoc Configuration
**Action:** Create compodoc configuration file
**Commands:**
```bash
cat > .compodocrc.json << 'EOF'
{
  "$schema": "./node_modules/@compodoc/compodoc/src/config/schema.json",
  "name": "Excel Platform",
  "output": "dist/docs",
  "theme": "material",
  "hideGenerator": false,
  "disableSourceCode": false,
  "disableDomTree": false,
  "disableGraph": false,
  "disableCoverage": false,
  "disablePrivate": true,
  "disableProtected": false,
  "disableInternal": true,
  "disableLifeCycleHooks": false,
  "disableRoutesGraph": false,
  "disableSearch": false,
  "disableDependencies": false,
  "coverageTest": 70,
  "coverageTestThresholdFail": false,
  "customFavicon": "",
  "includes": "",
  "includesName": "Documentation",
  "toggleMenuItems": ["all"],
  "navTabConfig": [
    { "id": "modules", "label": "Modules" },
    { "id": "components", "label": "Components" },
    { "id": "directives", "label": "Directives" },
    { "id": "classes", "label": "Services" },
    { "id": "injectables", "label": "Injectables" },
    { "id": "interfaces", "label": "Interfaces" },
    { "id": "pipes", "label": "Pipes" },
    { "id": "miscellaneous", "label": "Miscellaneous" }
  ],
  "language": "en-US"
}
EOF
```
**Validation:**
```bash
cat .compodocrc.json
```

---

### Step 4: Create Compodoc tsconfig
**Action:** Create TypeScript configuration for documentation
**Commands:**
```bash
cat > tsconfig.compodoc.json << 'EOF'
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
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
  "include": [
    "libs/**/src/**/*.ts",
    "apps/excel-addin/src/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "**/*.spec.ts",
    "**/test-setup.ts"
  ]
}
EOF
```

---

### Step 5: Add Documentation Scripts
**Action:** Add npm scripts for documentation
**Commands:**
```bash
npm pkg set scripts.docs="npx compodoc -p tsconfig.compodoc.json -c .compodocrc.json"
npm pkg set scripts.docs:serve="npx compodoc -p tsconfig.compodoc.json -c .compodocrc.json -s"
npm pkg set scripts.docs:watch="npx compodoc -p tsconfig.compodoc.json -c .compodocrc.json -s -w"
npm pkg set scripts.docs:coverage="npx compodoc -p tsconfig.compodoc.json -c .compodocrc.json --coverageTest 70"
```

---

### Step 6: Generate Initial Documentation
**Action:** Generate documentation to verify setup
**Commands:**
```bash
npm run docs
```
**Expected Output:**
- Documentation generated in `dist/docs/`
- HTML files for all services, components, types
- Dependency graph generated

**Validation:**
```bash
ls dist/docs/
# Should show index.html and other generated files

# Check coverage
cat dist/docs/documentation.json | grep -A 2 "coverage"
```

---

### Step 7: Serve Documentation Locally
**Action:** View generated documentation
**Commands:**
```bash
npm run docs:serve
```
**Expected:** Browser opens at http://127.0.0.1:8080 showing documentation

---

### Step 8: Create Documentation Landing Page
**Action:** Create custom documentation README
**Commands:**
```bash
mkdir -p docs/api

cat > docs/api/README.md << 'EOF'
# Excel Platform API Documentation

This documentation is auto-generated using [Compodoc](https://compodoc.app/).

## Libraries

### Shared Libraries
- **@excel-platform/shared/types** - Domain type definitions
- **@excel-platform/shared/ui** - Reusable UI components
- **@excel-platform/shared/util** - Utility functions

### Core Libraries
- **@excel-platform/core/auth** - Authentication services
- **@excel-platform/core/telemetry** - Logging and telemetry
- **@excel-platform/core/settings** - User preferences

### Office Libraries
- **@excel-platform/office/excel** - Excel.js integration
- **@excel-platform/office/common** - Shared Office utilities

### Data Libraries
- **@excel-platform/data/storage** - Storage abstraction
- **@excel-platform/data/api** - API catalog and mocks
- **@excel-platform/data/query** - Query management

## Generating Documentation

```bash
npm run docs          # Generate docs
npm run docs:serve    # Generate and serve
npm run docs:watch    # Watch mode with live reload
npm run docs:coverage # Check TSDoc coverage
```

## Coverage Requirements

All public APIs should have TSDoc comments with at least 70% coverage.
EOF
```

---

### Step 9: Update Compodoc to Include README
**Action:** Configure Compodoc to include README files
**Commands:**
```bash
# Update .compodocrc.json to include markdown files
cat > .compodocrc.json << 'EOF'
{
  "$schema": "./node_modules/@compodoc/compodoc/src/config/schema.json",
  "name": "Excel Platform",
  "output": "dist/docs",
  "theme": "material",
  "hideGenerator": false,
  "disableSourceCode": false,
  "disableDomTree": false,
  "disableGraph": false,
  "disableCoverage": false,
  "disablePrivate": true,
  "disableProtected": false,
  "disableInternal": true,
  "disableLifeCycleHooks": false,
  "disableRoutesGraph": false,
  "disableSearch": false,
  "disableDependencies": false,
  "coverageTest": 70,
  "coverageTestThresholdFail": false,
  "includes": "docs/api",
  "includesName": "Guides",
  "toggleMenuItems": ["all"],
  "navTabConfig": [
    { "id": "modules", "label": "Modules" },
    { "id": "components", "label": "Components" },
    { "id": "directives", "label": "Directives" },
    { "id": "classes", "label": "Services" },
    { "id": "injectables", "label": "Injectables" },
    { "id": "interfaces", "label": "Interfaces" },
    { "id": "pipes", "label": "Pipes" },
    { "id": "miscellaneous", "label": "Miscellaneous" }
  ],
  "language": "en-US"
}
EOF
```

---

### Step 10: Add Documentation to CI
**Action:** Add documentation build step to CI workflow
**Commands:**
```bash
# Add to .github/workflows/ci.yml after build step:
# - name: Generate documentation
#   run: npm run docs
#
# - name: Check documentation coverage
#   run: npm run docs:coverage
```

**Manual Edit Required (.github/workflows/ci.yml):**
Add documentation steps after build:
```yaml
      - name: Generate documentation
        run: npm run docs

      - name: Check documentation coverage
        run: npm run docs:coverage
```

---

### Step 11: Add Documentation Deployment
**Action:** Update CD workflow to deploy docs
**Commands:**
```bash
# Optionally deploy docs to /docs subdirectory on GitHub Pages
# This requires additional configuration in deploy.yml
```

**Optional Enhancement:**
Deploy documentation alongside the app:
```yaml
      - name: Generate documentation
        run: npm run docs

      - name: Copy docs to dist
        run: |
          mkdir -p dist/apps/excel-addin/browser/docs
          cp -r dist/docs/* dist/apps/excel-addin/browser/docs/
```

---

### Step 12: Update .gitignore
**Action:** Add documentation output to .gitignore
**Commands:**
```bash
cat >> .gitignore << 'EOF'

# Compodoc
dist/docs
documentation.json
EOF
```

---

### Step 13: Verify Documentation Coverage
**Action:** Run coverage check
**Commands:**
```bash
npm run docs:coverage
```
**Expected Output:**
- Coverage report showing percentage of documented code
- Warning if below 70% threshold

---

### Step 14: Commit Phase 9 Changes
**Action:** Commit all Compodoc setup
**Commands:**
```bash
git add .
git status

git commit -m "$(cat <<'EOF'
feat: add Compodoc for API documentation

Setup Compodoc for automated documentation generation:

## Added
- @compodoc/compodoc dependency
- .compodocrc.json - Compodoc configuration
- tsconfig.compodoc.json - TypeScript config for docs
- docs/api/README.md - Documentation guide

## Scripts
- npm run docs - Generate documentation
- npm run docs:serve - Serve documentation locally
- npm run docs:watch - Watch mode with live reload
- npm run docs:coverage - Check TSDoc coverage

## Features
- Auto-generated API docs from TSDoc
- Dependency graph visualization
- Coverage reporting (70% threshold)
- Material theme
- Search functionality

## CI Integration
- Documentation generates on CI
- Coverage check enforced

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 15: Create PR for Phase 9
**Action:** Push branch and create pull request
**Commands:**
```bash
git push -u origin feat/compodoc

gh pr create --title "[Phase 9] Add Compodoc documentation" --body "$(cat <<'EOF'
## Summary
Add Compodoc for automated API documentation generation.

## Changes
- Install @compodoc/compodoc
- Create Compodoc configuration
- Create tsconfig for documentation
- Add npm scripts for doc generation
- Add documentation guide
- Add docs to CI workflow

## Features
- **Auto-generated docs** from TSDoc comments
- **Dependency graphs** showing relationships
- **Coverage reporting** with 70% threshold
- **Material theme** for modern look
- **Search functionality** across all APIs
- **Interactive navigation** for all modules

## Usage
```bash
npm run docs          # Generate docs
npm run docs:serve    # Generate and serve at localhost:8080
npm run docs:watch    # Watch mode with live reload
npm run docs:coverage # Check documentation coverage
```

## Documentation Structure
- Modules tab: Library modules
- Components tab: Angular components
- Services tab: Injectable services
- Interfaces tab: Type definitions
- Guides: Additional documentation

## Testing
- [x] Documentation generates successfully
- [x] All libraries included
- [x] Dependency graph renders
- [x] Coverage report works

## Next Steps
Phase 10: Documentation reorganization

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Integrity Checks
Run ALL before marking complete:
- [ ] `npm run docs` generates without errors
- [ ] `dist/docs/index.html` exists
- [ ] Documentation serves at localhost:8080
- [ ] All 11 libraries appear in documentation
- [ ] Dependency graph renders correctly
- [ ] Coverage report generates
- [ ] Search works in documentation
- [ ] CI includes docs step

---

## Gap Identification
- **Risk 1:** Missing TSDoc comments → **Mitigation:** Coverage threshold warning
- **Risk 2:** Path aliases not resolved → **Mitigation:** tsconfig.compodoc.json has paths
- **Risk 3:** Large documentation output → **Mitigation:** .gitignore excludes dist/docs
- **Risk 4:** CI takes too long → **Mitigation:** Docs can be skipped for draft PRs

---

## Rollback Procedure
If this phase fails:
```bash
# Remove Compodoc
npm uninstall @compodoc/compodoc

# Remove configuration files
rm .compodocrc.json
rm tsconfig.compodoc.json
rm -rf docs/api

# Remove from package.json scripts
npm pkg delete scripts.docs
npm pkg delete scripts.docs:serve
npm pkg delete scripts.docs:watch
npm pkg delete scripts.docs:coverage

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D feat/compodoc
```

---

## Exit Criteria
- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 10

---

## Notes
- Compodoc is the Angular 2025 standard for documentation
- TSDoc coverage encourages good documentation practices
- Generated docs can be deployed alongside the app
- Watch mode is useful during development
