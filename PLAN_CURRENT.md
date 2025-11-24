# Current Phase: Phase 2 - Config-Driven Completion

**Sub-Branch:** `feat/config-finalization` (from `feat/finalize-concept`)
**Status:** In Progress
**Estimated:** 2-3 days
**Priority:** HIGH (enables dynamic content)
**Depends On:** Phase 1 (API/Query Separation) ✅

---

## Goals

1. Move API catalog into config system (load from AppConfig, not hardcoded)
2. Unify text catalog with app-config (single source of truth)
3. Add remote config loading with fallback to defaults
4. Implement config validation layer
5. Make config hot-reloadable

---

## Exit Criteria

- [ ] API catalog loadable from `AppConfig.apiCatalog`
- [ ] Text merged into `AppConfig.text` structure
- [ ] `app-text.ts` deleted (merged into config)
- [ ] `ConfigValidatorService` validates configs
- [ ] Remote config loading works with fallback to defaults
- [ ] Config hot-reload updates UI without restart
- [ ] All components use `AppConfigService.getConfig()` for text
- [ ] Tests pass (100% for new services)
- [ ] Documentation updated

---

## Implementation Steps

### Step 1: Update AppConfig Types

- Add `apiCatalog?: ApiDefinition[]` to AppConfig interface
- Add `text?: TextCatalog` to AppConfig interface
- Define TextCatalog structure

### Step 2: Move API Catalog to Config

- Read app-text.ts to extract all API definitions
- Add apiCatalog array to app-config.default.ts
- Move all 9 API definitions from ApiCatalogService

### Step 3: Merge Text Catalog

- Read app-text.ts to extract all text strings
- Add text object to app-config.default.ts
- Delete app-text.ts

### Step 4: Refactor ApiCatalogService

- Inject AppConfigService
- Subscribe to config.apiCatalog
- Update methods to use observable pattern
- Keep synchronous snapshot methods for compatibility

### Step 5: Create ConfigValidatorService

- Validate required fields (navItems, defaultViewId)
- Validate apiCatalog structure
- Validate text catalog structure
- Return ValidationResult with errors array

### Step 6: Add Remote Config Loading

- Add HttpClient to AppConfigService
- Implement loadRemoteConfig() with try/catch
- Implement mergeConfigs() for deep merge
- Add reloadConfig() for hot-reload
- Mock endpoint will fail, falls back to defaults

### Step 7: Update Components Using APP_TEXT

- Find all imports of app-text.ts
- Replace with AppConfigService injection
- Update to subscribe to config.text

### Step 8: Update Tests

- ApiCatalogService.spec - handle observable APIs
- Create ConfigValidatorService.spec
- Update AppConfigService.spec for remote loading

### Step 9: Update Documentation

- .claude/ARCHITECTURE.md - add config loading flow

---

## File Changes

### New

- `src/app/core/config-validator.service.ts`
- `src/app/core/config-validator.service.spec.ts`

### Modified

- `src/app/types/app-config.types.ts`
- `src/app/shared/app-config.default.ts`
- `src/app/core/config.services.ts`
- `src/app/shared/api-catalog.service.ts`
- `src/app/shared/api-catalog.service.spec.ts`
- All components using APP_TEXT
- `.claude/ARCHITECTURE.md`

### Deleted

- `src/app/shared/app-text.ts`

---

## Next Phase

Phase 3: Excel/Workbook Refactor (clear service boundaries)
