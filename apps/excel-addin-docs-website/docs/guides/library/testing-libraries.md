---
sidebar_position: 2
title: Testing Libraries
---

# Testing Libraries

Testing strategies for Nx libraries.

## Test Framework

Libraries use Jest with Angular testing utilities:

- **Jest** – Test runner and assertions
- **jest-preset-angular** – Angular compilation
- **TestBed** – Angular dependency injection

## Running Tests

```bash
# Test specific library
npx nx test core-auth

# Test with watch mode
npx nx test core-auth --watch

# Test with coverage
npx nx test core-auth --coverage

# Test all libraries
npx nx run-many --target=test --all

# Test affected by changes
npx nx affected --target=test
```

## Test Structure

### File Naming

Test files sit alongside implementations:

```
libs/core/auth/src/lib/
├── auth.service.ts
├── auth.service.spec.ts    # Tests here
├── auth.types.ts
└── auth.types.spec.ts      # Type tests if needed
```

### Basic Test Template

```typescript
import { TestBed } from "@angular/core/testing";
import { MyService } from "./my.service";

describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService],
    });
    service = TestBed.inject(MyService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
```

## Testing Patterns

### Testing Services

```typescript
describe("AuthService", () => {
  let service: AuthService;
  let storageSpy: jasmine.SpyObj<StorageHelperService>;

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj("StorageHelperService", [
      "getItem",
      "setItem",
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: StorageHelperService, useValue: storageSpy },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it("should hydrate from storage on init", () => {
    storageSpy.getItem.and.returnValue({
      user: { id: "1", email: "test@example.com" },
      isAuthenticated: true,
    });

    service.initialize();

    expect(service.isAuthenticated).toBe(true);
  });
});
```

### Testing Async Operations

```typescript
it("should handle async operation", async () => {
  const mockData = [{ id: 1 }, { id: 2 }];
  apiSpy.fetchData.and.returnValue(Promise.resolve(mockData));

  const result = await service.getData();

  expect(result).toEqual(mockData);
});

it("should handle errors", async () => {
  apiSpy.fetchData.and.rejectWith(new Error("Network error"));

  await expectAsync(service.getData()).toBeRejectedWithError("Network error");
});
```

### Testing Observables

```typescript
import { firstValueFrom } from "rxjs";

it("should emit state changes", async () => {
  service.setState({ count: 1 });

  const state = await firstValueFrom(service.state$);

  expect(state.count).toBe(1);
});
```

### Testing with localStorage

```typescript
it("should persist to storage", () => {
  spyOn(localStorage, "setItem");

  service.saveSettings({ theme: "dark" });

  expect(localStorage.setItem).toHaveBeenCalledWith(
    "app-settings",
    jasmine.any(String)
  );
});

it("should read from storage", () => {
  spyOn(localStorage, "getItem").and.returnValue(
    JSON.stringify({ theme: "dark" })
  );

  const settings = service.loadSettings();

  expect(settings.theme).toBe("dark");
});
```

## Mocking Dependencies

### Jasmine Spies

```typescript
const mockService = jasmine.createSpyObj("MyService", [
  "method1",
  "method2",
]);

// Set return values
mockService.method1.and.returnValue("value");
mockService.method2.and.returnValue(Promise.resolve("async"));

// Verify calls
expect(mockService.method1).toHaveBeenCalled();
expect(mockService.method1).toHaveBeenCalledWith("arg1", "arg2");
```

### Mock Classes

For complex mocks, create mock classes:

```typescript
class MockExcelService {
  isExcel = false;
  upsertQueryTable = jasmine
    .createSpy()
    .and.returnValue(Promise.resolve({ ok: true, value: {} }));
}

TestBed.configureTestingModule({
  providers: [{ provide: ExcelService, useClass: MockExcelService }],
});
```

### Mock Data Factories

Create reusable test data:

```typescript
// test-helpers/mock-data.ts
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "test-user-1",
    email: "test@example.com",
    displayName: "Test User",
    roles: ["analyst"],
    ...overrides,
  };
}

export function createMockQuery(
  overrides?: Partial<QueryDefinition>
): QueryDefinition {
  return {
    id: "test-query",
    name: "Test Query",
    parameters: [],
    defaultSheetName: "TestSheet",
    defaultTableName: "tbl_Test",
    ...overrides,
  };
}
```

## Office.js Testing

### Host Guard Pattern

Office.js globals are undefined in Jest. Test with guards:

```typescript
describe("when not in Excel", () => {
  beforeEach(() => {
    excelSpy.isExcel = false;
  });

  it("should skip Excel operations", async () => {
    await component.runQuery(mockQuery);

    expect(excelSpy.upsertQueryTable).not.toHaveBeenCalled();
  });
});

describe("when in Excel", () => {
  beforeEach(() => {
    excelSpy.isExcel = true;
  });

  it("should execute query", async () => {
    await component.runQuery(mockQuery);

    expect(excelSpy.upsertQueryTable).toHaveBeenCalled();
  });
});
```

### Result Type Testing

```typescript
it("should handle success result", async () => {
  excelSpy.upsertQueryTable.and.returnValue(
    Promise.resolve({
      ok: true,
      value: { sheetName: "Sheet1", tableName: "tbl_Data" },
    })
  );

  await component.runQuery(mockQuery);

  expect(component.lastLocation).toEqual({
    sheetName: "Sheet1",
    tableName: "tbl_Data",
  });
});

it("should handle error result", async () => {
  excelSpy.upsertQueryTable.and.returnValue(
    Promise.resolve({
      ok: false,
      error: { message: "Table exists", code: "CONFLICT" },
    })
  );

  await component.runQuery(mockQuery);

  expect(component.errorMessage).toContain("Table exists");
});
```

## Coverage

### Generate Coverage Report

```bash
npx nx test core-auth --coverage
```

Coverage output in `coverage/libs/core/auth/`.

### Coverage Thresholds

Set in `jest.config.ts`:

```typescript
export default {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## CI Integration

Tests run automatically in CI:

```yaml
# .github/workflows/ci.yml
- name: Test
  run: npx nx run-many --target=test --all --ci
```

## Debugging Tests

### Run Single Test

```bash
npx nx test core-auth --testNamePattern="should authenticate"
```

### Verbose Output

```bash
npx nx test core-auth --verbose
```

### Debug in IDE

Add to `launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest",
  "program": "${workspaceFolder}/node_modules/jest/bin/jest.js",
  "args": ["--runInBand", "--testPathPattern=core-auth"],
  "console": "integratedTerminal"
}
```

## Next Steps

- [API Conventions](api-conventions) – Export patterns
- [Creating a Library](creating-a-library) – Library setup
- [Common Patterns](../app/patterns) – Testing in app context
