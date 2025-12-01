# Phase 11: Dependency Security Audit

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
>
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 10 completed
> 4. Exit plan mode only when ready to execute

## Metadata

- **Branch:** `chore/dependency-audit`
- **Depends On:** Phase 10 (Doc Reorg) - or can run independently
- **Estimated Effort:** 0.5 days (4 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective

Audit and fix npm dependency security vulnerabilities. Update outdated packages, resolve known CVEs, and establish a dependency maintenance strategy.

---

## Pre-Conditions

- [ ] On develop branch or migration branch
- [ ] Working directory clean: `git status`
- [ ] All tests passing: `npm run test:ci`
- [ ] Build succeeds: `npm run build`

---

## Success Criteria

- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] All Angular packages updated to latest patch
- [ ] Transitive vulnerabilities addressed where possible
- [ ] Dependabot configured for ongoing monitoring
- [ ] All tests still pass after updates
- [ ] Build succeeds after updates

---

## Current Vulnerability Summary

As of 2025-11-30:

```
12 vulnerabilities (7 low, 5 high)
```

### High Severity Issues

| Package                           | Issue                                    | Fix            |
| --------------------------------- | ---------------------------------------- | -------------- |
| @angular/common 20.0.0-20.3.13    | XSRF Token Leakage (GHSA-58c5-g7wp-6w37) | Update Angular |
| @angular/forms                    | Depends on vulnerable @angular/common    | Update Angular |
| @angular/platform-browser         | Depends on vulnerable @angular/common    | Update Angular |
| @angular/platform-browser-dynamic | Depends on vulnerable @angular/common    | Update Angular |
| @angular/router                   | Depends on vulnerable @angular/common    | Update Angular |

### Low Severity Issues

| Package                          | Issue                                           | Fix                      |
| -------------------------------- | ----------------------------------------------- | ------------------------ |
| tmp <=0.2.3                      | Arbitrary file write via symlink                | Update or override       |
| external-editor                  | Depends on vulnerable tmp                       | Transitive - limited fix |
| @inquirer/editor                 | Depends on vulnerable external-editor           | Transitive               |
| @inquirer/prompts                | Depends on vulnerable @inquirer/editor          | Transitive               |
| @microsoft/m365agentstoolkit-cli | Depends on vulnerable @inquirer/prompts         | Transitive               |
| office-addin-dev-settings        | Depends on vulnerable m365agentstoolkit-cli     | Transitive               |
| office-addin-debugging           | Depends on vulnerable office-addin-dev-settings | Transitive               |

---

## Detailed Steps

### Step 1: Create Branch for Phase 11

**Action:** Create dedicated branch for dependency updates
**Commands:**

```bash
cd /Users/erikplachta/repo/excel-extension
git checkout develop
git pull origin develop
git checkout -b chore/dependency-audit
```

**Validation:**

```bash
git branch --show-current
# Should return: chore/dependency-audit
```

---

### Step 2: Run Initial Audit

**Action:** Document current state
**Commands:**

```bash
# Full audit report
npm audit > audit-report-before.txt

# Summary
npm audit 2>&1 | tail -5
```

**Expected Output:**

- Document showing 12 vulnerabilities

---

### Step 3: Update Angular Packages

**Action:** Update Angular to latest patch version
**Commands:**

```bash
# Check current Angular version
npm list @angular/core --depth=0

# Update all Angular packages
npm update @angular/core @angular/common @angular/forms @angular/platform-browser @angular/platform-browser-dynamic @angular/router @angular/compiler @angular/compiler-cli @angular/animations

# Or use ng update for controlled upgrade
npx ng update @angular/core @angular/cli
```

**Validation:**

```bash
npm list @angular/core --depth=0
# Should show updated version

npm audit 2>&1 | grep -i angular
# Should show fewer Angular vulnerabilities
```

---

### Step 4: Run npm audit fix

**Action:** Apply automatic fixes where safe
**Commands:**

```bash
# Dry run first
npm audit fix --dry-run

# Apply fixes
npm audit fix

# Check results
npm audit
```

**Expected:** Some vulnerabilities auto-fixed

---

### Step 5: Address Transitive Dependencies

**Action:** Handle dependencies that can't be directly updated
**Commands:**

```bash
# Check for overrides needed
npm ls tmp
npm ls external-editor

# If needed, add overrides to package.json
```

**Manual Edit (package.json):**
If transitive deps can't be updated, add overrides:

```json
{
  "overrides": {
    "tmp": "^0.2.4",
    "external-editor": {
      "tmp": "^0.2.4"
    }
  }
}
```

**Note:** Overrides may cause compatibility issues - test thoroughly.

---

### Step 6: Update Office Add-in Tooling

**Action:** Check for Office tooling updates
**Commands:**

```bash
# Check current versions
npm list office-addin-debugging office-addin-dev-settings --depth=0

# Check for updates
npm outdated | grep office

# Update if available
npm update office-addin-debugging office-addin-dev-settings
```

**Note:** Office add-in tools are dev dependencies - vulnerabilities in dev deps are lower risk but should still be addressed.

---

### Step 7: Update Other Outdated Packages

**Action:** Check and update all outdated packages
**Commands:**

```bash
# List all outdated packages
npm outdated

# Update non-breaking changes
npm update

# For major updates, review changelogs first
```

---

### Step 8: Verify Build and Tests

**Action:** Ensure updates don't break anything
**Commands:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Verify lint
npm run lint

# Verify build
npm run build

# Verify tests
npm run test:ci
```

**Expected:**

- All commands pass
- Same test count as baseline (455)

---

### Step 9: Run Final Audit

**Action:** Verify vulnerabilities are resolved
**Commands:**

```bash
# Final audit
npm audit > audit-report-after.txt

# Compare
diff audit-report-before.txt audit-report-after.txt

# Summary
npm audit
```

**Expected:**

- 0 high/critical vulnerabilities
- Ideally 0 total, but some low-severity transitive deps may remain

---

### Step 10: Document Remaining Issues

**Action:** If any vulnerabilities can't be fixed, document them
**Commands:**

```bash
cat > .github/SECURITY.md << 'EOF'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities via GitHub Security Advisories.

## Known Issues

### Transitive Dependencies
Some dev dependencies have transitive vulnerabilities that cannot be resolved
without upstream fixes:

- `office-addin-*` packages depend on `@microsoft/m365agentstoolkit-cli`
  which has nested dependencies with known issues.
- These are **dev dependencies only** and do not affect production builds.

### Mitigation
- These packages are only used during development
- Production builds do not include dev dependencies
- We monitor for upstream fixes via Dependabot
EOF
```

---

### Step 11: Configure Dependabot (if not done in Phase 8)

**Action:** Ensure Dependabot is configured for ongoing monitoring
**Commands:**

```bash
# Verify .github/dependabot.yml exists
cat .github/dependabot.yml

# If not, create it (should exist from Phase 8)
```

---

### Step 12: Commit Phase 11 Changes

**Action:** Commit dependency updates
**Commands:**

```bash
git add .
git status

git commit -m "$(cat <<'EOF'
chore: audit and update npm dependencies

Security audit and dependency updates:

## Fixed
- Update Angular packages to address XSRF vulnerability (GHSA-58c5-g7wp-6w37)
- Run npm audit fix for automatic fixes
- Update outdated packages

## Remaining (dev dependencies only)
- Transitive vulnerabilities in office-addin-* tooling
- Documented in .github/SECURITY.md
- No production impact

## Audit Results
- Before: 12 vulnerabilities (7 low, 5 high)
- After: [X] vulnerabilities ([X] low)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 13: Create PR for Phase 11

**Action:** Push and create pull request
**Commands:**

```bash
git push -u origin chore/dependency-audit

gh pr create --title "[Phase 11] Dependency security audit" --body "$(cat <<'EOF'
## Summary
Audit and fix npm dependency security vulnerabilities.

## Changes
- Update Angular packages to latest patch (fixes XSRF vulnerability)
- Run `npm audit fix` for automatic fixes
- Update outdated packages
- Document remaining transitive issues in SECURITY.md

## Security Audit
| Metric | Before | After |
|--------|--------|-------|
| Total vulnerabilities | 12 | [X] |
| High severity | 5 | 0 |
| Low severity | 7 | [X] |

## Remaining Issues
Transitive vulnerabilities in dev dependencies (office-addin-* tooling)
cannot be resolved without upstream fixes. These do not affect production.

## Testing
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run test:ci` passes (455 tests)
- [x] `npm audit` shows no high/critical

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Integrity Checks

Run ALL before marking complete:

- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:ci` passes (455 tests)
- [ ] `.github/SECURITY.md` documents any remaining issues
- [ ] Dependabot is configured
- [ ] PR created

---

## Gap Identification

- **Risk 1:** Angular update breaks app → **Mitigation:** Use ng update for safe migration
- **Risk 2:** Transitive deps can't be fixed → **Mitigation:** Document, use overrides if safe
- **Risk 3:** Office tooling requires old deps → **Mitigation:** Accept dev-only risk, monitor upstream
- **Risk 4:** Tests fail after updates → **Mitigation:** Revert to pinned versions if needed

---

## Rollback Procedure

If this phase fails:

```bash
# Restore package files
git checkout HEAD -- package.json package-lock.json

# Reinstall original dependencies
npm ci

# Verify
npm run test:ci

# Delete branch
git checkout develop
git branch -D chore/dependency-audit
```

---

## Exit Criteria

- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged
- [ ] Security posture improved

---

## Notes

- Dev dependency vulnerabilities are lower risk than production deps
- Some transitive deps may require waiting for upstream fixes
- Dependabot will alert on new vulnerabilities going forward
- This phase can run independently or as part of migration sequence
