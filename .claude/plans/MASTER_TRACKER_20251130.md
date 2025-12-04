# Master Plan Tracker

**Last Updated**: 2025-12-04 (cleanup commit ccc3681)
**Purpose**: High-level tracking of all active plans and gap analysis status

---

## Global Plans Reference

| Plan File | Description | Status |
|-----------|-------------|--------|
| `~/.claude/plans/mossy-chasing-hopcroft.md` | H5 Auth Guards | ✅ COMPLETE |
| `~/.claude/plans/elegant-sleeping-kahan.md` | Gap Analysis Master | ⚠️ Active (L1-L3 remain) |

---

## Issue Status (Verified 2025-12-04)

| ID | Issue | Status | Plan/Changelog |
|----|-------|--------|----------------|
| **H1** | Role text key mismatch | ✅ FIXED | — |
| **H2** | Prod manifest | ✅ FIXED | — |
| **H3** | Deprecated auth methods | ✅ FIXED | — |
| **H4** | Config architecture | ✅ FIXED | — |
| **H5** | Auth guards | ✅ FIXED | `mossy-chasing-hopcroft.md`, `CHANGELOG_20251204_h5_auth-guards.md` |
| **M1** | QueryDefinition removal | ✅ FIXED | — |
| **M2** | Type hierarchy | ✅ FIXED | QueryDefinition deprecated |
| **M3** | WorkbookService TSDoc | ✅ FIXED | — |
| **M4** | Middle-tier docs | ✅ FIXED | @mock/@experimental JSDoc added |
| **M5** | Type safety any cast | ⚠️ INTENTIONAL | Dynamic key access pattern |
| **L1** | Unused queriesOld | ✅ FIXED | Removed from ViewId |
| **L2** | Missing home spec | ✅ FIXED | home.component.spec.ts added |
| **L3** | Type docs TODO | ✅ FIXED | Replaced with guidance comment |
| **L4** | Query params TODO | ❓ N/A | Could not locate |

---

## Remaining Work

**All identified issues resolved.** Only M5 remains as an intentional pattern (dynamic key access).

No blocking work remaining from gap analysis.

---

## Completed Plans

| Date | Plan | Branch | Changelog |
|------|------|--------|-----------|
| 2025-12-04 | H5 Auth Guards | `fix/h5-auth-guards` | `CHANGELOG_20251204_h5_auth-guards.md` |

---

## Baseline Metrics (2025-11-30)

Original snapshot before gap analysis work:

| Metric | Value |
|--------|-------|
| Branch | develop @ 71e06ff |
| Total .ts files | 101 |
| Spec files | 32 |
| Total tests | 455 |
| Pass rate | 100% |
| Build time | 2.67s |
| Angular | @angular/core@20.3.12 |
| Node | v25.2.0 |
