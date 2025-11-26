# Phase 2: Config-Driven Completion

**Sub-Branch:** `feat/config-finalization`
**Depends On:** Phase 1 (API/Query separation)
**Priority:** HIGH (enables dynamic content)
**Status:** PENDING

---

## Goals

1. Move API definitions into config system (load from config, not hardcoded)
2. Unify text catalog with app-config (single source of truth)
3. Add remote config loading capability (mock, but designed for real server)
4. Implement config validation layer
5. Make config hot-reloadable (update without restart)

## Success Criteria

- [ ] API catalog loadable from config file/endpoint
- [ ] Text merged into `AppConfig.text` structure
- [ ] Remote config fetching works (with fallback to defaults)
- [ ] Config validation catches malformed configs
- [ ] Zero hardcoded content in services (except defaults)
- [ ] TSDoc updated for config loading

---

## Technical Approach

### 2.1: Config-Loadable API Catalog

**Update:** `src/app/shared/app-config.default.ts`

```typescript
export const DEFAULT_APP_CONFIG: AppConfig = {
  // ... existing nav, roles, ui

  apiCatalog: [
    {
      id: "sales-summary-api",
      name: "Sales Summary API",
      description: "Aggregated sales data",
      allowedRoles: ["analyst", "admin"],
      parameters: [
        { key: "StartDate", type: "date", required: true },
        { key: "EndDate", type: "date", required: true },
      ],
      responseSchema: [
        { key: "region", name: "Region", dataType: "string" },
        { key: "totalSales", name: "Total Sales", dataType: "number" },
      ],
    },
    // ... all APIs from ApiCatalogService
  ],

  text: {
    nav: {
      ssoHome: "SSO Home",
      queries: "Queries",
      // ... merged from app-text.ts
    },
    query: {
      addFromApi: "Add Query",
      run: "Run",
    },
  },
};
```

**Update:** `src/app/core/config.services.ts`

```typescript
@Injectable({ providedIn: "root" })
export class AppConfigService {
  private config$ = new BehaviorSubject<AppConfig>(DEFAULT_APP_CONFIG);

  constructor(private http: HttpClient) {
    this.loadRemoteConfig();
  }

  private async loadRemoteConfig(): Promise<void> {
    try {
      const remoteConfig = await this.http.get<AppConfig>("/api/config").toPromise();
      const validated = this.validateConfig(remoteConfig);
      const merged = this.mergeConfigs(DEFAULT_APP_CONFIG, validated);
      this.config$.next(merged);
    } catch (error) {
      console.warn("Failed to load remote config, using defaults", error);
    }
  }

  private validateConfig(config: any): AppConfig {
    if (!config.navItems || !Array.isArray(config.navItems)) {
      throw new Error("Invalid config: navItems required");
    }
    if (config.apiCatalog) {
      for (const api of config.apiCatalog) {
        if (!api.id || !api.name) {
          throw new Error(`Invalid API definition: ${JSON.stringify(api)}`);
        }
      }
    }
    return config as AppConfig;
  }

  private mergeConfigs(defaults: AppConfig, remote: Partial<AppConfig>): AppConfig {
    return { ...defaults, ...remote };
  }

  getConfig(): Observable<AppConfig> {
    return this.config$.asObservable();
  }

  reloadConfig(): Promise<void> {
    return this.loadRemoteConfig();
  }
}
```

**Update:** `src/app/shared/api-catalog.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class ApiCatalogService {
  private apis$ = new BehaviorSubject<ApiDefinition[]>([]);

  constructor(private configService: AppConfigService) {
    this.configService.getConfig().subscribe((config) => {
      this.apis$.next(config.apiCatalog || []);
    });
  }

  getApis(): Observable<ApiDefinition[]> {
    return this.apis$.asObservable();
  }
}
```

### 2.2: Unified Text Catalog

**Migrate:** `src/app/shared/app-text.ts` → `src/app/shared/app-config.default.ts`

**Delete:** `src/app/shared/app-text.ts`

**Update Components:**

```typescript
// Before
import { APP_TEXT } from '../../shared/app-text';
this.buttonLabel = APP_TEXT.query.run;

// After
constructor(private configService: AppConfigService) {}
ngOnInit() {
  this.configService.getConfig().subscribe(config => {
    this.buttonLabel = config.text.query.run;
  });
}
```

### 2.3: Config Validation Layer

**Create:** `src/app/core/config-validator.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class ConfigValidatorService {
  validate(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.navItems) errors.push("navItems is required");
    if (!config.defaultViewId) errors.push("defaultViewId is required");

    if (config.navItems) {
      for (const item of config.navItems) {
        if (!item.id) errors.push(`Nav item missing id`);
        if (!item.labelKey) errors.push(`Nav item missing labelKey: ${item.id}`);
      }
    }

    if (config.apiCatalog) {
      for (const api of config.apiCatalog) {
        if (!api.id) errors.push(`API missing id`);
        if (!api.name) errors.push(`API missing name: ${api.id}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## File Changes

**New Files:**
- `src/app/core/config-validator.service.ts`
- `src/app/core/config-validator.service.spec.ts`

**Modified Files:**
- `src/app/shared/app-config.default.ts` (add `apiCatalog`, `text`)
- `src/app/types/app-config.types.ts` (add types)
- `src/app/core/config.services.ts` (remote loading, validation)
- `src/app/shared/api-catalog.service.ts` (load from config)
- All components using `APP_TEXT`

**Deleted Files:**
- `src/app/shared/app-text.ts`

---

## Testing Strategy

**Unit Tests:**
- `ConfigValidatorService.spec.ts` - valid/invalid configs
- `AppConfigService.spec.ts` - remote loading, merge, validation
- `ApiCatalogService.spec.ts` - observable APIs

**Integration Tests:**
- Mock HTTP config endpoint, verify app loads
- Invalid config → falls back to defaults
- Config hot-reload updates UI

---

## Exit Criteria

- [ ] API catalog loaded from `AppConfig.apiCatalog`
- [ ] Text catalog merged into `AppConfig.text`
- [ ] `app-text.ts` deleted
- [ ] `ConfigValidatorService` validates configs
- [ ] Remote config loading works with fallback
- [ ] All components use `AppConfigService` for text
- [ ] Tests pass (100% for new services)
