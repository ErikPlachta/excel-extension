# Changelog: Gap Analysis Cleanup

**Date**: 2025-12-04
**Branch**: Various (merged to develop)
**Source**: `.claude/plans/elegant-sleeping-kahan.md` (global gap analysis plan)

## Summary

Resolved 12 issues identified in gap analysis audit. All HIGH (H1-H5), MEDIUM (M1-M4), and LOW (L1-L3) priority items addressed. L4 marked N/A (file not found).

## Issues Resolved

| ID  | Issue                   | Resolution                                       |
| --- | ----------------------- | ------------------------------------------------ |
| H1  | Role text key mismatch  | RoleDefinition uses direct strings, not text keys |
| H2  | Missing prod-manifest   | `prod-manifest.xml` created in repo root         |
| H3  | Deprecated auth methods | Removed from `app.component.ts`                  |
| H4  | Config architecture     | Separated default/demo configs                   |
| H5  | Auth guards             | Full implementation (see dedicated changelog)    |
| M1  | QueryDefinition import  | Removed from `workbook.service.ts`               |
| M2  | Type hierarchy          | `QueryDefinition` deprecated with TSDoc guidance |
| M3  | WorkbookService TSDoc   | All public methods documented                    |
| M4  | Middle-tier docs        | `@mock`/`@experimental` TSDoc tags added         |
| L1  | Unused queriesOld       | Removed from `ViewId` type                       |
| L2  | Missing home spec       | `home.component.spec.ts` added (5 tests)         |
| L3  | Primitives TODO         | Replaced with TSDoc guidance comment             |

## Remaining/Intentional

| ID  | Issue              | Status         | Notes                       |
| --- | ------------------ | -------------- | --------------------------- |
| M5  | Type safety `any`  | INTENTIONAL    | Dynamic key access pattern  |
| L4  | Query params TODO  | N/A            | File does not exist         |

## Key Files Modified

| File                                                | Change                          |
| --------------------------------------------------- | ------------------------------- |
| `libs/shared/types/src/lib/app-config.types.ts`     | Removed `queriesOld` from ViewId |
| `libs/shared/types/src/lib/ui/primitives.types.ts`  | TSDoc guidance for QueryUiActionType |
| `apps/excel-addin/src/helpers/middle-tier-mock.ts`  | `@mock`/`@experimental` TSDoc   |
| `apps/excel-addin/src/middle-tier/app.ts`           | `@mock`/`@experimental` TSDoc   |
| `apps/excel-addin/src/app/features/home/home.component.spec.ts` | NEW - 5 tests |

## Related Changelogs

- **H5 Auth Guards**: `docs/changelog/CHANGELOG_20251204_h5_auth-guards.md`

## Test Results

- Total tests: 137 passing
- Build: Clean
- Lint: Clean

## Commits

- `7313439` - fix: complete gap analysis minor items (M4, L1-L3)
- PR #49: Gap Analysis Cleanup (develop → main)
