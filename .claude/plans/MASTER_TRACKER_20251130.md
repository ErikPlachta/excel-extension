# Master Plan Tracker

**Last Updated**: 2025-12-04 (Plan 14 Type Safety complete)
**Purpose**: High-level tracking of all active plans and gap analysis status

---

## Global Plans Reference

| Plan File                                   | Description           | Status      |
| ------------------------------------------- | --------------------- | ----------- |
| `~/.claude/plans/mossy-chasing-hopcroft.md` | H5 Auth Guards        | ✅ COMPLETE |
| `~/.claude/plans/elegant-sleeping-kahan.md` | Gap Analysis Master   | ✅ COMPLETE |
| `.claude/plans/plan_14_type-safety-audit_20251204.md` | Type Safety & Zod | ✅ COMPLETE |
| `.claude/plans/plan_15_local-api-integration_20251204.md` | Local API Integration | 🔲 PENDING |

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

**Gap analysis issues all resolved.** Next: Plan 15 Local API Integration.

| Priority | Task                  | Plan                                |
| -------- | --------------------- | ----------------------------------- |
| MEDIUM   | Local API integration | `plan_15_local-api-integration.md`  |

---

## Completed Plans

| Date       | Plan                  | Branch                           | Changelog                                    |
| ---------- | --------------------- | -------------------------------- | -------------------------------------------- |
| 2025-12-04 | H5 Auth Guards        | `fix/h5-auth-guards`             | `CHANGELOG_20251204_h5_auth-guards.md`       |
| 2025-12-04 | Gap Analysis (all)    | `fix/m1-query-definition-migration` | `CHANGELOG_20251204_gap-analysis-cleanup.md` |
| 2025-12-04 | Plan 14 Type Safety   | `feat/type-safety-zod-integration` | — (in progress)                              |

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
