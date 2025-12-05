# Plan: H4 - Config Architecture Refactor

**Date**: 2025-12-03
**Branch**: `fix/h4-config-architecture`
**Objective**: Separate default config from demo/test data, make auth data-driven

---

## Problem

Current `app-config.default.ts` mixes:

- Structural defaults (nav layout, roles structure)
- Demo/test data (API catalog, test sign-in buttons)
- App-specific config

This violates separation of concerns and makes the config hard to maintain.

Additionally:

- Sign-in buttons are nav items (should be on SSO view)
- Auth methods in AppComponent are hardcoded to deprecated methods
- Minimal TSDoc throughout config-related code

---

## Solution

### Architecture

```
libs/data/api/src/lib/
├── app-config.default.ts     # Minimal structural defaults only
├── app-config.demo.ts        # Demo/test overrides (APIs, test nav, mock users)
├── app-config.ts             # Exports and type re-exports
└── app-config.service.ts     # Merges configs based on environment
```

### Config Separation

**app-config.default.ts** (minimal):

- Empty `navItems` array (or just structural items)
- Empty `apiCatalog` array
- Empty `roles` array
- Base `ui` settings
- Base `text` structure

**app-config.demo.ts** (demo/dev):

- Test API catalog entries
- Demo roles (analyst, admin)
- Demo text entries
- Sign-in buttons moved to SSO component config

### Auth Refactor

1. Remove `sign-in-analyst` and `sign-in-admin` from `NavActionType`
2. SSO component gets sign-in buttons from config (not nav items)
3. Single `signIn(email, role)` method using `signInWithJwt()`
4. Remove deprecated auth method calls

---

## Pre-conditions

- [ ] On `develop` branch
- [ ] H1, H2, M1, M2 merged

---

## Steps

### Phase 1: Config Separation

1. Create `app-config.demo.ts` with current demo data
2. Slim down `app-config.default.ts` to structural defaults
3. Update `AppConfigService` to merge demo config in dev mode
4. Add environment detection for config loading

### Phase 2: Auth Refactor

1. Remove deprecated NavActionTypes (`sign-in-analyst`, `sign-in-admin`)
2. Add sign-in config to SSO component (buttons with role/email from config)
3. Refactor AppComponent to single `signIn(email, role)` method
4. Update SSO component to use new auth pattern

### Phase 3: TSDoc Enhancement

1. Add comprehensive TSDoc to all config types
2. Add TSDoc to AppConfigService methods
3. Add TSDoc to SSO component

### Phase 4: Test Updates

1. Update unit tests for new config structure
2. Add tests for config merging logic

---

## Files to Create

- `libs/data/api/src/lib/app-config.demo.ts`

## Files to Modify

- `libs/shared/types/src/lib/app-config.types.ts` (NavActionType, add SsoConfig)
- `libs/data/api/src/lib/app-config.default.ts` (slim down)
- `libs/data/api/src/lib/app-config.service.ts` (merge logic)
- `apps/excel-addin/src/app/app.component.ts` (auth refactor)
- `apps/excel-addin/src/app/features/sso/sso-home.component.ts` (sign-in buttons)

---

## Success Criteria

- [x] Default config is minimal/structural only
- [x] Demo config is separate and clearly identified
- [x] No hardcoded auth values in components
- [x] Sign-in buttons on SSO view, not nav
- [x] All new code has TSDoc
- [x] Tests pass (133 tests)

---

## Rollback

```bash
git checkout develop -- libs/data/api/src/lib/
git checkout develop -- libs/shared/types/src/lib/app-config.types.ts
git checkout develop -- apps/excel-addin/src/app/
```

---

## Notes

This plan supersedes H3 (deprecated auth methods) - the auth fix is included here
as it requires the config architecture changes to be done properly.

---

## Implementation Summary (2025-12-03)

### Files Created
- `libs/data/api/src/lib/app-config.demo.ts` - Demo config with DEMO_ROLES, DEMO_AUTH_USERS, DEMO_API_CATALOG

### Files Modified
- `libs/shared/types/src/lib/auth.types.ts` - Added `AuthUserConfig` interface for data-driven auth
- `libs/shared/types/src/lib/app-config.types.ts` - Removed deprecated sign-in NavActionTypes
- `libs/data/api/src/lib/app-config.default.ts` - Slimmed to structural defaults only (empty roles/APIs)
- `libs/data/api/src/lib/app-config.service.ts` - Added demo config merge in dev mode
- `libs/data/api/src/index.ts` - Export app-config.demo
- `apps/excel-addin/src/app/app.component.ts` - Removed deprecated auth handlers
- `apps/excel-addin/src/app/app.component.spec.ts` - Updated tests for new auth pattern
- `apps/excel-addin/src/app/features/sso/sso-home.component.ts` - Added signInAs() with AuthUserConfig
- `apps/excel-addin/src/app/features/sso/sso-home.component.html` - Added quick sign-in buttons
- `apps/excel-addin/src/app/features/sso/sso-home.component.spec.ts` - Updated tests

### Key Design Decisions
1. **Shared AuthUserConfig type** - Reusable auth configuration type in shared/types, not demo-specific
2. **No demo-specific methods in services** - AppConfigService just merges config, no getDemoAuthUsers()
3. **isDevMode() in component** - SSO component uses Angular's isDevMode() directly
4. **Same signInWithJwt() flow** - Quick sign-in buttons use same auth flow as manual form
