---
sidebar_position: 4
title: Testing Strategy
---

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

- **ExcelService** – `isExcel` guard, typed error returns, ownership integration
- **WorkbookService** – Sheet/table listing, ownership checks, managed table filtering
- **AuthService** – Sign-in/out flows, role checks, localStorage persistence
- **TelemetryService** – Console logging, event enrichment, error normalization
- **QueryStateService** – Parameter management, effective params, run flags

### Feature Components

- **QueryHomeComponent** – Query list, run buttons, batch flows, parameter UI
- **WorksheetsComponent / TablesComponent** – List rendering, Excel guard, empty states
- **SsoHomeComponent / UserComponent** – Auth state display, sign-in/out buttons

### UI Primitives

- **ButtonComponent** – Variant/size classes, disabled state, click emission
- **TableComponent** – Column rendering, row binding, empty state
- **ListComponent** – Item rendering, selection, icons/badges

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
