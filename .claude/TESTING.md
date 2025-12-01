# Testing Strategy

## Commands

```bash
npm test                                          # Interactive (Karma + Chrome)
npm run test:ci                                   # Headless (ChromeHeadless, single run)
npm run test:ci > test-results.log 2>&1          # Capture output for debugging
```

## Configuration

- **Angular test config:** `angular.json` → `test` target
- **Karma config:** `karma.conf.cjs`
- **Test bootstrap:** `src/test.ts`
- **Spec files:** `**/*.spec.ts`

## Office.js Constraints

Office/Excel globals undefined in Karma. Code paths gated behind `ExcelService.isExcel`.

### Mocking Pattern

```typescript
describe("QueryHomeComponent", () => {
  let component: QueryHomeComponent;
  let fixture: ComponentFixture<QueryHomeComponent>;
  let excelServiceSpy: jasmine.SpyObj<ExcelService>;

  beforeEach(async () => {
    const excelSpy = jasmine.createSpyObj("ExcelService", [
      "upsertQueryTable",
      "activateQueryLocation",
    ]);
    excelSpy.isExcel = false; // or true for Excel-specific tests

    await TestBed.configureTestingModule({
      imports: [QueryHomeComponent],
      providers: [{ provide: ExcelService, useValue: excelSpy }],
    }).compileComponents();

    excelServiceSpy = TestBed.inject(ExcelService) as jasmine.SpyObj<ExcelService>;
    fixture = TestBed.createComponent(QueryHomeComponent);
    component = fixture.componentInstance;
  });

  it("should short-circuit when not in Excel", () => {
    excelServiceSpy.isExcel = false;
    component.runQuery(mockQuery);
    expect(excelServiceSpy.upsertQueryTable).not.toHaveBeenCalled();
  });
});
```

## Test Coverage Areas

### Core Services

#### ExcelService

- `isExcel` guard behavior
- Typed error returns (`ExcelOperationResult`)
- Host guard short-circuits
- Ownership integration (via stubs)

#### WorkbookService

- Sheet/table listing
- Ownership checks
- Managed table filtering
- User table conflict handling

#### AuthService

- Sign-in/out flows
- Role checks (`hasRole`, `hasAnyRole`)
- `localStorage` persistence
- Auth state hydration

#### TelemetryService

- Console logging
- Event enrichment (session, host, auth)
- Error normalization
- Workbook logging (gated by host)

#### QueryStateService

- Parameter management (global + per-query)
- Effective params calculation
- Run flag state
- Last run tracking
- Storage persistence via StorageHelperService

#### StorageHelperService
- Type-safe localStorage operations
- IndexedDB integration (async operations)
- Error handling with telemetry
- Default value fallback
- Cache cleanup operations

#### IndexedDBService
- Database initialization
- Cache write/read operations
- TTL expiration logic
- clearExpiredCache removes only expired entries
- Multiple caches per queryId (timestamp-based)

#### BackupRestoreService
- Export creates valid JSON
- Import validates version compatibility
- Version compatibility rules (major/minor/patch)
- Restore overwrites storage correctly
- Window reload triggered after import

#### QueryValidationService
- Configuration structure validation
- API existence checks
- Required parameter validation
- Parameter type validation (date, number, string, boolean)
- Detailed error messages

### Feature Components

#### QueryHomeComponent

- Query list rendering
- Run button enabled/disabled state
- Role-based visibility
- Excel guard behavior
- Batch run flows
- Parameter UI

#### WorksheetsComponent / TablesComponent

- List rendering
- Excel guard
- Empty states

#### SsoHomeComponent / UserComponent

- Auth state display
- Sign-in/out buttons
- Role display

### UI Primitives

#### ButtonComponent

- Variant/size classes
- Disabled state
- Click emission
- Icon rendering

#### TableComponent

- Column rendering
- Row binding
- Empty state

#### ListComponent

- Item rendering
- Selection
- Icons/badges

## Testing Patterns

### Host Guard

```typescript
it("should no-op when not in Excel", () => {
  excelService.isExcel = false;
  component.runQuery(mockQuery);
  expect(excelService.upsertQueryTable).not.toHaveBeenCalled();
});
```

### Role Check

```typescript
it("should disable admin query for analyst", () => {
  authService.hasRole.and.returnValue(false);
  const canRun = component.canRunQuery(adminOnlyQuery);
  expect(canRun).toBe(false);
});
```

### Error Handling

```typescript
it("should handle Excel write failure", async () => {
  const errorResult: ExcelOperationResult<QueryRunLocation> = {
    ok: false,
    error: { message: "Table exists", code: "CONFLICT" },
  };
  excelService.upsertQueryTable.and.returnValue(Promise.resolve(errorResult));

  await component.runQuery(mockQuery);

  expect(component.errorMessage).toContain("Table exists");
});
```

### localStorage

```typescript
it("should hydrate auth state from storage", () => {
  spyOn(localStorage, "getItem").and.returnValue(
    JSON.stringify({
      user: mockUser,
      isAuthenticated: true,
      roles: ["analyst"],
    })
  );

  const service = new AuthService();

  expect(service.isAuthenticated).toBe(true);
  expect(service.roles).toEqual(["analyst"]);
});
```

### IndexedDB Testing (Phase 4)
```typescript
it('should cache and retrieve query result', async () => {
  const rows = [{ id: 1, name: 'Test' }];
  await service.cacheQueryResult('test-query', rows, 3600000);

  const cached = await service.getCachedQueryResult('test-query');
  expect(cached).toEqual(rows);
});

it('should return null for expired cache', async () => {
  await service.cacheQueryResult('test-query', rows, -1000); // Already expired
  const cached = await service.getCachedQueryResult('test-query');
  expect(cached).toBeNull();
});

it('should clear only expired entries', async () => {
  // Cache with different TTLs
  await service.cacheQueryResult('fresh', [{ id: 1 }], 3600000); // 1 hour
  await service.cacheQueryResult('stale', [{ id: 2 }], -1000); // Expired

  await service.clearExpiredCache();

  expect(await service.getCachedQueryResult('fresh')).toBeTruthy();
  expect(await service.getCachedQueryResult('stale')).toBeNull();
});
```

### Backup/Restore Testing (Phase 4)
```typescript
it('should export valid backup JSON', () => {
  const downloadSpy = spyOn(window.document, 'createElement');
  service.exportBackup();

  expect(downloadSpy).toHaveBeenCalledWith('a');
  // Verify backup structure includes version, timestamp, etc.
});

it('should reject incompatible major version', async () => {
  const file = new File([JSON.stringify({
    version: '2.0.0', // Major version mismatch
    timestamp: new Date().toISOString(),
    authState: null,
    settings: null,
    queryConfigs: [],
    queryState: null
  })], 'backup.json');

  await expectAsync(service.importBackup(file)).toBeRejected();
});

it('should restore all storage keys', async () => {
  const backup = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    authState: { user: mockUser },
    settings: mockSettings,
    queryConfigs: [mockConfig],
    queryState: mockState
  };
  const file = new File([JSON.stringify(backup)], 'backup.json');

  spyOn(storage, 'setItem');
  await service.importBackup(file);

  expect(storage.setItem).toHaveBeenCalledWith('auth-state', backup.authState);
  expect(storage.setItem).toHaveBeenCalledWith('settings', backup.settings);
});
```

### Validation Testing (Phase 4)
```typescript
it('should validate required parameters', () => {
  const config = {
    id: 'test',
    name: 'Test Config',
    items: [{
      id: 'item-1',
      apiId: 'api-with-required-params',
      parameters: {} // Missing required params
    }]
  };

  const result = validator.validateConfiguration(config);
  expect(result.valid).toBeFalse();
  expect(result.errors.length).toBeGreaterThan(0);
});

it('should validate parameter types', () => {
  const result = validator.validateParameters(api, {
    date: 'not-a-date',
    count: 'not-a-number'
  });

  expect(result.valid).toBeFalse();
  expect(result.errors).toContain(jasmine.stringContaining('date'));
  expect(result.errors).toContain(jasmine.stringContaining('count'));
});
```

## CI Integration

`.github/workflows/ci.yml` runs:

```bash
npm ci
npm run lint
npm run build
npm run test:ci
```

Headless Chrome, single pass, exits with test status code.

## Known Issues

- Office.js globals must be mocked/gated
- Some specs assume old shell structure (migrate to data-driven)
- Workbook ownership specs need explicit stubs (no nullable targets)

## TSDoc for Test Helpers

```typescript
/**
 * Creates a mock QueryDefinition for testing.
 *
 * @param overrides - Partial QueryDefinition to override defaults
 * @returns Complete QueryDefinition with test-safe defaults
 */
function createMockQuery(overrides?: Partial<QueryDefinition>): QueryDefinition {
  return {
    id: "test-query",
    name: "Test Query",
    description: "Test description",
    parameters: [],
    defaultSheetName: "TestSheet",
    defaultTableName: "tbl_Test",
    ...overrides,
  };
}
```
