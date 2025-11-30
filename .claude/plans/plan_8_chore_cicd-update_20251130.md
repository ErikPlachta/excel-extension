# Phase 8: CI/CD Update

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 7 completed
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `refactor/cicd-nx`
- **Depends On:** Phase 7 (Jest Migration)
- **Estimated Effort:** 0.5 days (4 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective
Update GitHub Actions workflows to use Nx commands, leverage affected commands for faster CI, and add Nx caching for improved build performance.

---

## Pre-Conditions
- [ ] Phase 7 completed: Jest migration done and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] All tests passing: `nx run-many --target=test --all`
- [ ] Build succeeds: `nx build excel-addin`
- [ ] Working directory clean: `git status`

---

## Success Criteria
- [ ] CI workflow updated with Nx commands
- [ ] CD workflow updated for Nx build
- [ ] Affected commands used for PR validation
- [ ] Nx caching configured
- [ ] GitHub Actions cache for node_modules and .nx/cache
- [ ] CI passes on pull requests
- [ ] CD deploys successfully on main push

---

## Detailed Steps

### Step 1: Create Branch for Phase 8
**Action:** Create dedicated branch for CI/CD updates
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/cicd-nx
```
**Validation:**
```bash
git branch --show-current
# Should return: refactor/cicd-nx
```

---

### Step 2: Update CI Workflow
**Action:** Update .github/workflows/ci.yml for Nx
**Commands:**
```bash
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  main:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Derive appropriate SHAs for base and head
        uses: nrwl/nx-set-shas@v4

      - name: Install dependencies
        run: npm ci

      - name: Cache Nx
        uses: actions/cache@v4
        with:
          path: .nx/cache
          key: ${{ runner.os }}-nx-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-nx-${{ hashFiles('**/package-lock.json') }}-
            ${{ runner.os }}-nx-

      - name: Lint affected
        run: npx nx affected --target=lint --parallel=3

      - name: Test affected
        run: npx nx affected --target=test --parallel=3 --ci --coverage

      - name: Build affected
        run: npx nx affected --target=build --parallel=3

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: success()
        with:
          directory: ./coverage
          fail_ci_if_error: false
EOF
```
**Validation:**
```bash
cat .github/workflows/ci.yml
```

---

### Step 3: Update CD Workflow
**Action:** Update .github/workflows/deploy.yml for Nx build
**Commands:**
```bash
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache Nx
        uses: actions/cache@v4
        with:
          path: .nx/cache
          key: ${{ runner.os }}-nx-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-nx-${{ hashFiles('**/package-lock.json') }}-
            ${{ runner.os }}-nx-

      - name: Build
        run: npx nx build excel-addin --configuration=production --base-href=/excel-extension/

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist/apps/excel-addin/browser'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF
```
**Validation:**
```bash
cat .github/workflows/deploy.yml
```

---

### Step 4: Create nx.json CI Configuration
**Action:** Add CI-specific settings to nx.json
**Commands:**
```bash
# Update nx.json to add CI configuration
# This should already have targetDefaults, add:
# "useDaemonProcess": false for CI environments
```

**Manual Edit Required (nx.json):**
Add the following to nx.json:
```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test"]
      }
    }
  }
}
```

---

### Step 5: Update nx.json for Better Caching
**Action:** Configure Nx caching settings
**Commands:**
```bash
# Verify caching is properly configured
npx nx show projects

# Test affected commands
npx nx affected --target=lint --dry-run
npx nx affected --target=test --dry-run
npx nx affected --target=build --dry-run
```

---

### Step 6: Verify CI Locally
**Action:** Run CI-like commands locally to verify
**Commands:**
```bash
# Simulate what CI will run
NX_BASE=origin/main
NX_HEAD=HEAD

# Lint affected
npx nx affected --target=lint --base=$NX_BASE --head=$NX_HEAD

# Test affected
npx nx affected --target=test --base=$NX_BASE --head=$NX_HEAD --ci

# Build affected
npx nx affected --target=build --base=$NX_BASE --head=$NX_HEAD
```
**Expected Output:**
- All commands succeed
- Only affected projects are processed

---

### Step 7: Add GitHub Actions Validation Script
**Action:** Create script to validate workflows locally
**Commands:**
```bash
mkdir -p tools/scripts

cat > tools/scripts/validate-ci.sh << 'EOF'
#!/bin/bash
# Validate CI workflow locally

echo "🔍 Checking Nx affected..."
npx nx show projects --affected

echo ""
echo "🧹 Running lint on affected..."
npx nx affected --target=lint --parallel=3

echo ""
echo "🧪 Running tests on affected..."
npx nx affected --target=test --parallel=3 --ci

echo ""
echo "🏗️ Building affected..."
npx nx affected --target=build --parallel=3

echo ""
echo "✅ All CI checks passed!"
EOF

chmod +x tools/scripts/validate-ci.sh
```
**Validation:**
```bash
./tools/scripts/validate-ci.sh
```

---

### Step 8: Update Package.json Scripts
**Action:** Add CI-related npm scripts
**Commands:**
```bash
npm pkg set scripts.ci="npx nx affected --target=lint && npx nx affected --target=test --ci && npx nx affected --target=build"
npm pkg set scripts.ci:all="npx nx run-many --target=lint --all && npx nx run-many --target=test --all --ci && npx nx run-many --target=build --all"
npm pkg set scripts.affected="npx nx affected"
npm pkg set scripts.affected:lint="npx nx affected --target=lint"
npm pkg set scripts.affected:test="npx nx affected --target=test"
npm pkg set scripts.affected:build="npx nx affected --target=build"
```

---

### Step 9: Create Dependabot Configuration
**Action:** Configure Dependabot for dependency updates
**Commands:**
```bash
mkdir -p .github

cat > .github/dependabot.yml << 'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      angular:
        patterns:
          - "@angular*"
          - "zone.js"
      nx:
        patterns:
          - "@nx*"
          - "nx"
      testing:
        patterns:
          - "jest*"
          - "@types/jest"
          - "ts-jest"
          - "jest-preset-angular"
      dev-dependencies:
        dependency-type: "development"
        exclude-patterns:
          - "@angular*"
          - "@nx*"
          - "jest*"
EOF
```

---

### Step 10: Verify Workflows Syntax
**Action:** Validate GitHub Actions workflow syntax
**Commands:**
```bash
# Install act if not present (optional, for local testing)
# brew install act

# Or use GitHub CLI to validate
gh workflow list

# Check for syntax issues
cat .github/workflows/ci.yml | head -20
cat .github/workflows/deploy.yml | head -20
```

---

### Step 11: Commit Phase 8 Changes
**Action:** Commit all CI/CD updates
**Commands:**
```bash
git add .
git status

git commit -m "$(cat <<'EOF'
chore: update CI/CD for Nx monorepo

Update GitHub Actions workflows for Nx:

## CI Workflow (.github/workflows/ci.yml)
- Use `nx affected` for lint, test, build
- Add Nx cache for faster subsequent runs
- Add nrwl/nx-set-shas for proper base/head SHAs
- Run affected commands in parallel
- Upload coverage to Codecov

## CD Workflow (.github/workflows/deploy.yml)
- Use `nx build excel-addin` for production build
- Configure base-href for GitHub Pages
- Cache Nx for deployment builds

## Added
- tools/scripts/validate-ci.sh - Local CI validation
- .github/dependabot.yml - Dependency updates

## Package Scripts
- npm run ci - Run affected checks
- npm run ci:all - Run all checks
- npm run affected:* - Individual affected commands

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 12: Create PR for Phase 8
**Action:** Push branch and create pull request
**Commands:**
```bash
git push -u origin refactor/cicd-nx

gh pr create --title "[Phase 8] Update CI/CD for Nx" --body "$(cat <<'EOF'
## Summary
Update GitHub Actions workflows to use Nx commands for better performance.

## Changes

### CI Workflow
- Use `nx affected` instead of running all targets
- Add Nx cache action for faster builds
- Use `nrwl/nx-set-shas` for proper affected calculation
- Run lint, test, build in parallel
- Add coverage upload to Codecov

### CD Workflow
- Use `nx build excel-addin` for production
- Configure proper base-href for GitHub Pages
- Add Nx caching

### Added
- `tools/scripts/validate-ci.sh` - Local CI validation
- `.github/dependabot.yml` - Automated dependency updates
- Package.json scripts for CI commands

## Benefits
- Faster CI with affected commands (only changed projects)
- Nx caching reduces rebuild time
- Better parallelization
- Improved developer experience

## CI Commands
```bash
npm run ci           # Run affected lint, test, build
npm run ci:all       # Run all projects
npm run affected     # Run any affected target
```

## Testing
- [x] CI workflow passes
- [x] CD workflow passes
- [x] Affected commands work correctly
- [x] Caching is effective

## Next Steps
Phase 9: Add Compodoc for API documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Integrity Checks
Run ALL before marking complete:
- [ ] `.github/workflows/ci.yml` is valid YAML
- [ ] `.github/workflows/deploy.yml` is valid YAML
- [ ] `nx affected --target=lint` works locally
- [ ] `nx affected --target=test` works locally
- [ ] `nx affected --target=build` works locally
- [ ] CI workflow passes on PR
- [ ] CD workflow passes on main push
- [ ] Nx cache is created and used

---

## Gap Identification
- **Risk 1:** Affected commands may run nothing → **Mitigation:** Use proper base SHA via nrwl/nx-set-shas
- **Risk 2:** Cache key collisions → **Mitigation:** Include hash of package-lock.json
- **Risk 3:** Build path different → **Mitigation:** Update dist path in deploy workflow
- **Risk 4:** Parallel execution issues → **Mitigation:** Limit parallelism to 3

---

## Rollback Procedure
If this phase fails:
```bash
# Restore original workflows
git checkout HEAD -- .github/workflows/ci.yml
git checkout HEAD -- .github/workflows/deploy.yml

# Remove added files
rm -f tools/scripts/validate-ci.sh
rm -f .github/dependabot.yml

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D refactor/cicd-nx
```

---

## Exit Criteria
- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 9

---

## Notes
- Affected commands significantly speed up CI for large monorepos
- Nx caching can save 50-80% of CI time on repeat runs
- The nrwl/nx-set-shas action is critical for proper affected calculation
- Deploy workflow targets apps/excel-addin output path
