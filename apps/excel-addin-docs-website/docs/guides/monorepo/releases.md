---
sidebar_position: 3
title: Releases
---

# Releases

Versioning and release process for the Excel Platform.

## Versioning

### Semantic Versioning

Follow [SemVer](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Version Location

Root `package.json`:

```json
{
  "name": "excel-extension",
  "version": "0.0.3"
}
```

## Changelog

### Location

Changelogs in `docs/changelog/`:

```
docs/changelog/
├── CHANGELOG_20251126_000000_feat-finalize-concept.md
├── CHANGELOG_20251125_phase8_formula-scanner.md
└── ...
```

### Format

```markdown
# Changelog: [Description]

**Date:** YYYY-MM-DD
**Version:** X.Y.Z
**Type:** Feature | Fix | Refactor

## Summary

Brief description of changes.

## Changes

| Action | File | Description |
|--------|------|-------------|
| Add | path/to/file.ts | Added new feature |
| Update | path/to/file.ts | Modified behavior |
| Delete | path/to/file.ts | Removed deprecated code |

## Breaking Changes

- List any breaking changes

## Migration

Steps to migrate from previous version.
```

## Release Process

### 1. Update Version

Edit `package.json`:

```bash
# Or use npm version
npm version patch  # 0.0.3 → 0.0.4
npm version minor  # 0.0.3 → 0.1.0
npm version major  # 0.0.3 → 1.0.0
```

### 2. Create Changelog

Create `docs/changelog/CHANGELOG_YYYYMMDD_description.md`:

```markdown
# Changelog: v0.0.4 Bug Fixes

**Date:** 2025-01-15
**Version:** 0.0.4
**Type:** Fix

## Summary

Fixed query execution race condition.

## Changes

| Action | File | Description |
|--------|------|-------------|
| Fix | query-queue.service.ts | Prevented concurrent execution |
```

### 3. Commit and Tag

```bash
git add .
git commit -m "chore: release v0.0.4"
git tag v0.0.4
git push origin main --tags
```

### 4. Deploy

Push to `main` triggers automatic GitHub Pages deployment.

## Pre-Release Checklist

Before releasing:

- [ ] All tests pass: `npm run test:ci`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Changelog written
- [ ] Version bumped in `package.json`
- [ ] Documentation updated

## Hotfix Process

For urgent fixes:

### 1. Create Hotfix Branch

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-description
```

### 2. Make Fix

Apply minimal changes to fix the issue.

### 3. Test

```bash
npm run test:ci
npm run build
```

### 4. Merge and Release

```bash
git checkout main
git merge hotfix/fix-description
npm version patch
git tag v0.0.4
git push origin main --tags
```

## GitHub Release

### Create Release

1. Go to repository → Releases → New Release
2. Choose tag (e.g., `v0.0.4`)
3. Title: `v0.0.4`
4. Description: Copy from changelog
5. Publish Release

### Release Notes Template

```markdown
## What's Changed

### Features
- Added feature X (#123)

### Bug Fixes
- Fixed issue Y (#124)

### Documentation
- Updated guide Z

**Full Changelog**: https://github.com/user/repo/compare/v0.0.3...v0.0.4
```

## Branch Strategy

### Main Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |

### Feature Branches

```bash
# Feature branch
git checkout -b feat/feature-name

# Bug fix branch
git checkout -b fix/bug-description

# Hotfix branch (from main)
git checkout -b hotfix/critical-fix
```

### Merge Flow

```
feat/feature → develop → main
fix/bug → develop → main
hotfix/critical → main
```

## Manifest Versions

Update manifests when releasing:

### dev-manifest.xml

```xml
<Version>0.0.4.0</Version>
```

### prod-manifest.xml

```xml
<Version>0.0.4.0</Version>
```

## Next Steps

- [CI/CD](ci-cd) – Automated deployment
- [Nx Commands](nx-commands) – Build commands
- [Changelog](/category/changelog) – View past releases
