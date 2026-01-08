# Plan 17: Dependabot PR Review & Merge

**Date:** 2025-12-05
**Branch:** `chore/dependabot-updates`
**Status:** ✅ COMPLETE (PR #64 merged)

---

## Summary

Consolidated and merged 11 Dependabot PRs into single PR.

---

## Updates Merged

### GitHub Actions
- actions/configure-pages 4 → 5
- actions/setup-node 4 → 6
- actions/upload-pages-artifact 3 → 4
- actions/checkout 4 → 6

### Dev Dependencies
- eslint-plugin-tsdoc 0.3.0 → 0.5.0
- @typescript-eslint/eslint-plugin 8.47.0 → 8.48.1
- @typescript-eslint/parser 8.47.0 → 8.48.1
- @types/office-js 1.0.558 → 1.0.561

### Runtime Dependencies
- zone.js 0.15.1 → 0.16.0
- jest-preset-angular 15.0.3 → 16.0.0
- Angular group 20.3.12 → 21.1.0

---

## Key Fixes

- **Zod v4 breaking change**: Updated `z.record()` calls to require key type argument
- **Jest config**: Added `transformIgnorePatterns` for Zod ESM modules

---

## PRs

- PR #64: chore(deps): consolidate Dependabot updates
- Closed redundant Dependabot PRs: #52-62
