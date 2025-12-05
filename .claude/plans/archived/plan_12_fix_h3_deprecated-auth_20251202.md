# Plan: H3 - Replace Deprecated Auth Methods

**Date**: 2025-12-02
**Branch**: `fix/h3-deprecated-auth`
**Objective**: Replace deprecated signInAsAnalyst/signInAsAdmin with signInWithJwt

---

## Problem

AppComponent uses deprecated auth methods:

- `signInAsAnalyst()` - deprecated, uses legacy mock SSO
- `signInAsAdmin()` - deprecated, uses legacy mock SSO

These should use `signInWithJwt()` which uses proper JWT-based auth.

## Solution

Replace deprecated method calls with `signInWithJwt(email, password, roles)`.

---

## Changes Made

### app.component.ts

- `signInAnalyst()` now calls `signInWithJwt("analyst@example.com", "", ["analyst"])`
- `signInAdmin()` now calls `signInWithJwt("admin@example.com", "", ["admin"])`
- `signIn()` now calls `signInWithJwt("user@example.com", "", ["analyst"])`

### app.component.spec.ts

- Updated mock to include `signInWithJwt` instead of deprecated methods
- Updated test assertions to verify correct signInWithJwt calls

---

## Success Criteria

- [x] No more calls to deprecated signInAsAnalyst/signInAsAdmin
- [x] Tests pass (138 tests)
- [x] Lint passes
