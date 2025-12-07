---
sidebar_position: 1
title: Creating a Library
---

# Creating a Library

Step-by-step guide to creating new libraries in the Nx monorepo.

## When to Create a Library

Create a new library when:

- Code is shared between multiple features
- Logic should be tested in isolation
- You want clear dependency boundaries
- A domain needs encapsulation

## Library Scopes

| Scope | Directory | Purpose |
|-------|-----------|---------|
| `core` | `libs/core/` | Core services (auth, settings, telemetry) |
| `data` | `libs/data/` | Data layer (storage, API, queries) |
| `office` | `libs/office/` | Office.js integration |
| `shared` | `libs/shared/` | Cross-cutting utilities |

## Step-by-Step Creation

### 1. Generate the Library

```bash
npx nx generate @nx/angular:library \
  --name=my-feature \
  --directory=libs/shared/my-feature \
  --importPath=@excel-platform/shared/my-feature \
  --tags=scope:shared,type:util \
  --standalone
```

**Parameters:**

- `--name`: Library name (kebab-case)
- `--directory`: Physical location in `libs/`
- `--importPath`: How it's imported (`@excel-platform/...`)
- `--tags`: Nx tags for dependency constraints
- `--standalone`: Use standalone Angular components

### 2. Library Structure

Generated structure:

```
libs/shared/my-feature/
├── src/
│   ├── index.ts              # Public API exports
│   └── lib/
│       └── my-feature.*.ts   # Implementation
├── project.json              # Nx project config
├── tsconfig.json             # TypeScript config
├── tsconfig.lib.json
├── tsconfig.spec.json
└── jest.config.ts            # Test config
```

### 3. Define Public API

Edit `src/index.ts` to export public types and services:

```typescript
// Services
export * from "./lib/my-feature.service";

// Types
export * from "./lib/my-feature.types";

// Components (if any)
export * from "./lib/my-feature.component";
```

### 4. Add TSDoc Documentation

All exports must have TSDoc:

```typescript
/**
 * Service for managing feature state.
 *
 * @remarks
 * Thread-safe and optimized for frequent access.
 */
@Injectable({ providedIn: "root" })
export class MyFeatureService {
  /**
   * Get current feature state.
   *
   * @returns Current state object
   */
  getState(): FeatureState {
    return this.state;
  }
}
```

### 5. Configure Nx Tags

Tags enable dependency rules. Edit `project.json`:

```json
{
  "tags": ["scope:shared", "type:util"]
}
```

**Available tags:**

| Tag | Description |
|-----|-------------|
| `scope:core` | Core infrastructure |
| `scope:data` | Data/storage layer |
| `scope:office` | Office.js integration |
| `scope:shared` | Shared utilities |
| `type:feature` | Feature library |
| `type:util` | Utility library |
| `type:ui` | UI components |

### 6. Add Tests

Create test file alongside implementation:

```typescript
// my-feature.service.spec.ts
import { TestBed } from "@angular/core/testing";
import { MyFeatureService } from "./my-feature.service";

describe("MyFeatureService", () => {
  let service: MyFeatureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyFeatureService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should return initial state", () => {
    const state = service.getState();
    expect(state).toBeDefined();
  });
});
```

### 7. Run Tests

```bash
# Test this library only
npx nx test shared-my-feature

# Test with coverage
npx nx test shared-my-feature --coverage

# Test affected libraries
npx nx affected --target=test
```

## Using the Library

### Import in Application

```typescript
import { MyFeatureService } from "@excel-platform/shared/my-feature";

@Component({...})
export class MyComponent {
  private myFeature = inject(MyFeatureService);
}
```

### Import in Another Library

Libraries can import from other libraries:

```typescript
// In libs/data/query/src/lib/query.service.ts
import { MyFeatureService } from "@excel-platform/shared/my-feature";
```

## Best Practices

### Keep Libraries Focused

Each library should have a single responsibility:

```
✅ libs/shared/date-utils/    # Just date formatting
✅ libs/core/auth/            # Just authentication
❌ libs/shared/utils/         # Too generic
```

### Export Only Public API

Only export what consumers need:

```typescript
// src/index.ts
export * from "./lib/public.service";
export type { PublicType } from "./lib/types";

// Don't export internals
// export * from './lib/internal-helper';
```

### Avoid Circular Dependencies

Use the dependency graph to check:

```bash
npx nx graph
```

If circular deps occur, extract shared types to a new library.

### Write Tests First

Test libraries in isolation before integrating:

```bash
npx nx test my-library --watch
```

## Troubleshooting

### Import Not Found

Ensure `tsconfig.base.json` has the path mapping:

```json
{
  "paths": {
    "@excel-platform/shared/my-feature": ["libs/shared/my-feature/src/index.ts"]
  }
}
```

### Test Failures

Check for missing test setup. Each library needs `jest.config.ts`:

```typescript
export default {
  displayName: "shared-my-feature",
  preset: "../../../jest.preset.js",
  // ...
};
```

### Circular Dependency

Extract shared types into a separate `types` library:

```
libs/shared/types/       # Shared type definitions
libs/data/api/           # Depends on types
libs/core/auth/          # Depends on types
```

## Next Steps

- [Testing Libraries](testing-libraries) – Detailed testing guide
- [API Conventions](api-conventions) – Export patterns and naming
- [Nx Commands](../monorepo/nx-commands) – Useful Nx commands
