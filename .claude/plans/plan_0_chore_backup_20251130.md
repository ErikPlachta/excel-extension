# Phase 0: Backup Current State

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure develop branch is clean
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `backup/pre-nx-migration-20251130`
- **Depends On:** None (first phase)
- **Estimated Effort:** 0.25 days (2 hours)
- **Created:** 2025-11-30
- **Status:** 🟢 Complete
- **Completed:** 2025-11-30

---

## Objective
Create a complete backup of the current codebase state before beginning the Nx monorepo migration. This ensures we have a safe rollback point if the migration encounters issues.

---

## Pre-Conditions
- [ ] Working directory is clean: `git status` shows no uncommitted changes
- [ ] On develop branch: `git branch --show-current` returns `develop`
- [ ] Develop is up to date: `git pull origin develop`
- [ ] All tests passing: `npm run test:ci`
- [ ] Build succeeds: `npm run build`
- [ ] No lint errors: `npm run lint`

---

## Success Criteria
- [ ] Backup branch `backup/pre-nx-migration-20251130` created
- [ ] Backup branch pushed to remote origin
- [ ] Baseline metrics documented (test count, build time, file counts)
- [ ] Migration branch `refactor/nx-monorepo-migration` created
- [ ] README updated with backup reference

---

## Detailed Steps

### Step 1: Verify Clean State
**Action:** Ensure working directory is clean and on develop branch
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git status
git branch --show-current
```
**Expected Output:**
- `git status` shows "nothing to commit, working tree clean"
- `git branch --show-current` returns "develop"

**If not clean:**
```bash
# Stash any uncommitted changes
git stash push -m "pre-backup stash $(date +%Y%m%d)"

# Or commit them
git add .
git commit -m "chore: save work before backup"
```

**Validation:**
```bash
git status
# Should show: nothing to commit, working tree clean
```

---

### Step 2: Pull Latest Changes
**Action:** Ensure develop branch has all remote changes
**Commands:**
```bash
git checkout develop
git pull origin develop
```
**Validation:**
```bash
git log --oneline -5
# Should show latest commits including any recent merges
```

---

### Step 3: Run Full Verification Suite
**Action:** Verify current codebase is in good state
**Commands:**
```bash
# Run lint
npm run lint

# Run build
npm run build

# Run tests
npm run test:ci
```
**Expected Output:**
- Lint: No errors (warnings OK)
- Build: Successful, outputs to `dist/`
- Tests: All passing (currently ~32 spec files, ~160 tests)

**Document Baseline:**
```bash
# Count test files
find src -name "*.spec.ts" | wc -l

# Count source files
find src/app -name "*.ts" ! -name "*.spec.ts" | wc -l

# Build size
du -sh dist/
```

**Validation:**
```bash
# Verify build output exists
ls -la dist/excel-extension/browser/
```

---

### Step 4: Create Backup Branch
**Action:** Create timestamped backup branch from current develop
**Commands:**
```bash
git checkout -b backup/pre-nx-migration-20251130
```
**Validation:**
```bash
git branch --show-current
# Should return: backup/pre-nx-migration-20251130

git log --oneline -1
# Should show same commit as develop
```

---

### Step 5: Push Backup to Remote
**Action:** Push backup branch to origin for safekeeping
**Commands:**
```bash
git push -u origin backup/pre-nx-migration-20251130
```
**Validation:**
```bash
git branch -r | grep backup
# Should show: origin/backup/pre-nx-migration-20251130

# Verify on GitHub
gh browse -b backup/pre-nx-migration-20251130
```

---

### Step 6: Create Migration Branch
**Action:** Create the main migration branch from develop
**Commands:**
```bash
git checkout develop
git checkout -b refactor/nx-monorepo-migration
```
**Validation:**
```bash
git branch --show-current
# Should return: refactor/nx-monorepo-migration

git log --oneline -1
# Should show same commit as backup branch
```

---

### Step 7: Document Baseline Metrics
**Action:** Create baseline documentation for comparison after migration
**Commands:**
```bash
# Create baseline metrics file
cat > .claude/plans/baseline_metrics_20251130.md << 'EOF'
# Baseline Metrics - Pre-Migration

## Date: 2025-11-30

## Git State
- **Branch:** develop
- **Commit:** $(git rev-parse --short HEAD)
- **Backup Branch:** backup/pre-nx-migration-20251130

## File Counts
- **Total .ts files:** $(find src -name "*.ts" | wc -l | tr -d ' ')
- **Spec files:** $(find src -name "*.spec.ts" | wc -l | tr -d ' ')
- **Source files:** $(find src/app -name "*.ts" ! -name "*.spec.ts" | wc -l | tr -d ' ')
- **Component files:** $(find src -name "*.component.ts" | wc -l | tr -d ' ')
- **Service files:** $(find src -name "*.service.ts" | wc -l | tr -d ' ')

## Build Metrics
- **Build output size:** $(du -sh dist/ | cut -f1)
- **Build time:** [measure during Step 3]

## Test Metrics
- **Test files:** [count from test run]
- **Total tests:** [count from test run]
- **Pass rate:** 100%

## Dependencies
- **Angular version:** $(npm list @angular/core --depth=0 | grep @angular/core)
- **Node version:** $(node --version)
- **npm version:** $(npm --version)
EOF
```

**Validation:**
```bash
cat .claude/plans/baseline_metrics_20251130.md
```

---

### Step 8: Commit Baseline Documentation
**Action:** Commit the baseline metrics file
**Commands:**
```bash
git add .claude/plans/baseline_metrics_20251130.md
git commit -m "$(cat <<'EOF'
chore: add baseline metrics before Nx migration

Documents current state for comparison after migration:
- File counts
- Build metrics
- Test metrics
- Dependency versions

Backup branch: backup/pre-nx-migration-20251130

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```
**Validation:**
```bash
git log --oneline -1
# Should show the baseline metrics commit
```

---

## Integrity Checks
Run ALL before marking complete:
- [ ] Backup branch exists locally: `git branch | grep backup`
- [ ] Backup branch exists on remote: `git branch -r | grep backup`
- [ ] Migration branch created: `git branch | grep refactor/nx`
- [ ] Baseline metrics file created and committed
- [ ] Both branches point to same base commit

---

## Gap Identification
- **Risk 1:** Uncommitted changes lost → **Mitigation:** Step 1 stashes or commits any changes
- **Risk 2:** Remote push fails → **Mitigation:** Verify network, check GitHub permissions
- **Risk 3:** Baseline metrics incomplete → **Mitigation:** Re-run Step 7 with actual values

---

## Rollback Procedure
If this phase fails:
```bash
# Delete local backup branch if created
git branch -D backup/pre-nx-migration-20251130

# Delete remote backup branch if pushed
git push origin --delete backup/pre-nx-migration-20251130

# Delete migration branch if created
git branch -D refactor/nx-monorepo-migration

# Return to develop
git checkout develop
```

---

## Exit Criteria
- [ ] Backup branch `backup/pre-nx-migration-20251130` exists on remote
- [ ] Migration branch `refactor/nx-monorepo-migration` created locally
- [ ] Baseline metrics documented in `.claude/plans/baseline_metrics_20251130.md`
- [ ] Commit created with baseline documentation
- [ ] Ready to proceed to Phase 1

---

## Notes
- This phase does NOT create a PR - it's just creating safety branches
- The migration branch will be used for all subsequent phases
- Each phase will create commits on the migration branch
- Final PR will merge all migration work to develop
