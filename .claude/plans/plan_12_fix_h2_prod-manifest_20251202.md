# Plan: H2 - Create prod-manifest.xml

**Date**: 2025-12-02
**Branch**: `fix/h2-prod-manifest`
**Objective**: Create production manifest for GitHub Pages deployment

---

## Problem

No production manifest exists for deploying to GitHub Pages.
Only `dev-manifest.xml` (localhost:4200) was present.

## Solution

Create `prod-manifest.xml` with URLs pointing to:
- `https://erikplachta.github.io/excel-extension/`

---

## Changes Made

- Created `/prod-manifest.xml` based on dev-manifest.xml
- Updated all URLs from `localhost:4200` to `erikplachta.github.io/excel-extension`
- Updated display name and descriptions to remove dev references

---

## Success Criteria

- [x] prod-manifest.xml created
- [x] All URLs point to GitHub Pages
- [x] File validates (same schema as dev-manifest)
