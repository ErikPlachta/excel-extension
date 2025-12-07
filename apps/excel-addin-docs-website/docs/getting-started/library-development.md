---
sidebar_position: 3
title: Library Development Tutorial
---

# Library Development Tutorial

Create and extend shared libraries in the Nx monorepo.

## Prerequisites

- Completed [Quick Start](quick-start) setup
- Familiarity with Angular services
- Understanding of Nx workspace structure

## Library Structure

```
libs/
├── core/               # Core services (auth, settings, telemetry)
│   ├── auth/
│   ├── settings/
│   └── telemetry/
├── data/               # Data layer (storage, API, query)
│   ├── api/
│   ├── query/
│   └── storage/
├── office/             # Office.js integration
│   ├── excel/
│   └── common/
└── shared/             # Shared utilities
    ├── types/
    ├── ui/
    └── util/
```

## Tutorial: Create a New Library

We'll create a utility library for date formatting.

### Step 1: Generate Library

```bash
npx nx generate @nx/angular:library \
  --name=date-utils \
  --directory=libs/shared/date-utils \
  --importPath=@excel-platform/shared/date-utils \
  --tags=scope:shared,type:util \
  --standalone
```

### Step 2: Create the Service

Edit `libs/shared/date-utils/src/lib/date-utils.service.ts`:

```typescript
import { Injectable } from "@angular/core";

/**
 * Date formatting utilities for consistent date display.
 *
 * @remarks
 * All methods return strings safe for Excel cell values.
 */
@Injectable({ providedIn: "root" })
export class DateUtilsService {
  /**
   * Format date as ISO date string (YYYY-MM-DD).
   *
   * @param date - Date to format
   * @returns ISO date string
   */
  toIsoDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Format date for Excel serial number.
   *
   * @param date - Date to format
   * @returns Excel serial number
   */
  toExcelSerial(date: Date): number {
    const epoch = new Date(1899, 11, 30);
    const diff = date.getTime() - epoch.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Parse ISO date string to Date object.
   *
   * @param isoString - ISO date string
   * @returns Date object or null if invalid
   */
  fromIsoDate(isoString: string): Date | null {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  }
}
```

### Step 3: Export from Library

Edit `libs/shared/date-utils/src/index.ts`:

```typescript
export * from "./lib/date-utils.service";
```

### Step 4: Add Tests

Create `libs/shared/date-utils/src/lib/date-utils.service.spec.ts`:

```typescript
import { TestBed } from "@angular/core/testing";
import { DateUtilsService } from "./date-utils.service";

describe("DateUtilsService", () => {
  let service: DateUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateUtilsService);
  });

  it("should format date as ISO", () => {
    const date = new Date("2025-06-15T10:30:00Z");
    expect(service.toIsoDate(date)).toBe("2025-06-15");
  });

  it("should convert to Excel serial number", () => {
    const date = new Date("2025-01-01");
    expect(service.toExcelSerial(date)).toBeGreaterThan(45000);
  });

  it("should parse valid ISO date", () => {
    const result = service.fromIsoDate("2025-06-15");
    expect(result).toBeInstanceOf(Date);
  });

  it("should return null for invalid date", () => {
    const result = service.fromIsoDate("invalid");
    expect(result).toBeNull();
  });
});
```

### Step 5: Use in App

In any component or service:

```typescript
import { DateUtilsService } from "@excel-platform/shared/date-utils";

@Component({...})
export class MyComponent {
  private dateUtils = inject(DateUtilsService);

  formatDate(date: Date): string {
    return this.dateUtils.toIsoDate(date);
  }
}
```

### Step 6: Run Tests

```bash
npx nx test shared-date-utils
```

## Library Guidelines

### Naming Conventions

- **Library name:** `kebab-case` (e.g., `date-utils`)
- **Import path:** `@excel-platform/{scope}/{name}` (e.g., `@excel-platform/shared/date-utils`)
- **Service suffix:** `Service` (e.g., `DateUtilsService`)

### TSDoc Required

All public APIs must have TSDoc comments:

```typescript
/**
 * Brief description of what this does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 *
 * @remarks
 * Additional context or warnings
 *
 * @example
 * ```typescript
 * const result = service.method(value);
 * ```
 */
```

### Scope Tags

Use Nx tags for dependency constraints:

- `scope:core` – Core services
- `scope:data` – Data layer
- `scope:office` – Office.js integration
- `scope:shared` – Shared utilities
- `type:feature` – Feature library
- `type:util` – Utility library
- `type:ui` – UI components

## Next Steps

- [Creating Libraries](../guides/library/creating-a-library) – Detailed library creation
- [Testing Libraries](../guides/library/testing-libraries) – Testing strategies
- [API Conventions](../guides/library/api-conventions) – Export patterns
- [Nx Commands](../guides/monorepo/nx-commands) – Useful Nx commands
