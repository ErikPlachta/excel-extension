# Master Plan Tracker

**Last Updated**: 2025-12-05 (Plan 17 Dependabot complete)
**Purpose**: High-level tracking of all active plans and gap analysis status

---

## Global Plans Reference

| Plan File                                                 | Description           | Status      |
| --------------------------------------------------------- | --------------------- | ----------- |
| `~/.claude/plans/mossy-chasing-hopcroft.md`               | H5 Auth Guards        | ✅ COMPLETE |
| `~/.claude/plans/elegant-sleeping-kahan.md`               | Gap Analysis Master   | ✅ COMPLETE |
| `.claude/plans/archived/plan_14_type-safety-audit_20251204.md` | Type Safety & Zod | ✅ COMPLETE |
| `.claude/plans/archived/plan_15_local-api-integration_20251204.md` | Local API Integration | ✅ COMPLETE |
| `.claude/plans/archived/plan_16_docusaurus_20251205.md` | Docusaurus Docs Site | ✅ COMPLETE |
| `.claude/plans/archived/plan_17_dependabot_20251205.md` | Dependabot Updates | ✅ COMPLETE |

---

## Issue Status (Verified 2025-12-04)

| ID     | Issue                   | Status   | Plan/Changelog                                                      |
| ------ | ----------------------- | -------- | ------------------------------------------------------------------- |
| **H1** | Role text key mismatch  | ✅ FIXED | —                                                                   |
| **H2** | Prod manifest           | ✅ FIXED | —                                                                   |
| **H3** | Deprecated auth methods | ✅ FIXED | —                                                                   |
| **H4** | Config architecture     | ✅ FIXED | —                                                                   |
| **H5** | Auth guards             | ✅ FIXED | `mossy-chasing-hopcroft.md`, `CHANGELOG_20251204_h5_auth-guards.md` |
| **M1** | QueryDefinition removal | ✅ FIXED | Plan 14 - consolidated query types                                  |
| **M2** | Type hierarchy          | ✅ FIXED | Plan 14 - api.types.ts vs query.types.ts separation                 |
| **M3** | WorkbookService TSDoc   | ✅ FIXED | —                                                                   |
| **M4** | Middle-tier docs        | ✅ FIXED | @mock/@experimental JSDoc added                                     |
| **M5** | Type safety any cast    | ✅ FIXED | `getTextSection()` typed accessor                                   |
| **L1** | Unused queriesOld       | ✅ FIXED | Removed from ViewId                                                 |
| **L2** | Missing home spec       | ✅ FIXED | home.component.spec.ts added                                        |
| **L3** | Type docs TODO          | ✅ FIXED | Replaced with guidance comment                                      |
| **L4** | Query params TODO       | ✅ FIXED | Plan 14 - removed hardcoded QueryParameterKey                       |

---

## Remaining Work

**All gap analysis and planned work complete.** No pending tasks.

| Priority | Task | Plan |
| -------- | ---- | ---- |
| —        | —    | —    |

---

## Completed Plans

| Date       | Plan                | Branch                              | Changelog                                    |
| ---------- | ------------------- | ----------------------------------- | -------------------------------------------- |
| 2025-12-04 | H5 Auth Guards      | `fix/h5-auth-guards`                | `CHANGELOG_20251204_h5_auth-guards.md`       |
| 2025-12-04 | Gap Analysis (all)  | `fix/m1-query-definition-migration` | `CHANGELOG_20251204_gap-analysis-cleanup.md` |
| 2025-12-04 | Plan 14 Type Safety | `feat/type-safety-zod-integration`  | PR #50 merged                                |
| 2025-12-05 | Plan 15 Local API   | `feat/local-api-integration`        | PR #51 merged                                |
| 2025-12-05 | Plan 16 Docusaurus  | `feat/docusaurus-docs`              | PR #63 merged                                |
| 2025-12-05 | Plan 17 Dependabot  | `chore/dependabot-updates`          | PR #64 merged                                |

---

## Baseline Metrics (2025-11-30)

Original snapshot before gap analysis work:

| Metric          | Value                 |
| --------------- | --------------------- |
| Branch          | develop @ 71e06ff     |
| Total .ts files | 101                   |
| Spec files      | 32                    |
| Total tests     | 455                   |
| Pass rate       | 100%                  |
| Build time      | 2.67s                 |
| Angular         | @angular/core@20.3.12 |
| Node            | v25.2.0               |

## Current Metrics (2025-12-05)

Post-Plan 17 snapshot:

| Metric              | Value                 |
| ------------------- | --------------------- |
| Angular             | @angular/core@21.1.0  |
| Zod                 | zod@4.1.13            |
| zone.js             | zone.js@0.16.0        |
| jest-preset-angular | 16.0.0                |
| Pass rate           | 100%                  |
