---
sidebar_position: 3
title: API Conventions
---

# API Conventions

Patterns for exporting library APIs.

## Export Structure

### index.ts (Barrel File)

Each library has a single entry point:

```typescript
// libs/core/auth/src/index.ts

// Services (primary exports)
export * from "./lib/auth.service";

// Types (always export types)
export type { User, AuthState, RoleId } from "./lib/auth.types";

// Constants (if public)
export { ROLES, DEFAULT_AUTH_STATE } from "./lib/auth.constants";

// Components (if library has UI)
export * from "./lib/login-button.component";
```

### Export Rules

| Export Type | When to Export |
|-------------|----------------|
| Services | Always (primary API) |
| Types/Interfaces | Always (consumers need types) |
| Constants | If consumers need them |
| Components | If reusable across features |
| Internal helpers | Never |

### Don't Export

```typescript
// src/index.ts

// ❌ Internal helpers
// export * from './lib/internal-utils';

// ❌ Implementation details
// export * from './lib/auth.service.private';

// ❌ Test utilities
// export * from './lib/auth.mocks';
```

## Naming Conventions

### Services

```typescript
// Pattern: [Domain]Service
export class AuthService {}
export class StorageHelperService {}
export class TelemetryService {}
export class QueryStateService {}
```

### Types

```typescript
// Pattern: [Noun] or [Noun][Suffix]
export interface User {}
export interface AuthState {}
export type RoleId = "analyst" | "admin";
export interface QueryDefinition {}
export interface ExcelOperationResult<T> {}
```

### Constants

```typescript
// Pattern: UPPER_SNAKE_CASE
export const DEFAULT_SETTINGS = {};
export const STORAGE_KEYS = {};
export const ROLES = [];
```

### Components

```typescript
// Pattern: [Feature][Type]Component
export class LoginButtonComponent {}
export class QueryTableComponent {}
export class StatusBannerComponent {}
```

## TSDoc Requirements

### Service Documentation

```typescript
/**
 * Manages user authentication state.
 *
 * @remarks
 * - Persists state to localStorage
 * - Emits state changes via Observable
 * - Thread-safe for concurrent access
 *
 * @example
 * ```typescript
 * const auth = inject(AuthService);
 * if (auth.isAuthenticated) {
 *   console.log('User:', auth.user);
 * }
 * ```
 */
@Injectable({ providedIn: "root" })
export class AuthService {}
```

### Method Documentation

```typescript
/**
 * Authenticates user with credentials.
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to auth result
 * @throws {ValidationError} If credentials are invalid format
 *
 * @example
 * ```typescript
 * const result = await auth.signIn('user@example.com', 'password');
 * if (result.ok) {
 *   console.log('Signed in:', result.user);
 * }
 * ```
 */
async signIn(email: string, password: string): Promise<AuthResult> {}
```

### Type Documentation

```typescript
/**
 * User profile information.
 *
 * @property id - Unique user identifier (UUID)
 * @property email - User's email address
 * @property displayName - Name shown in UI
 * @property roles - Assigned role identifiers
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: RoleId[];
}
```

## Result Types

### Pattern: ExcelOperationResult

Return typed results instead of throwing:

```typescript
/**
 * Result of an Excel operation.
 *
 * @typeParam T - Success value type
 */
export interface ExcelOperationResult<T> {
  ok: boolean;
  value?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

// Usage
async function writeData(): Promise<ExcelOperationResult<WriteResult>> {
  try {
    const result = await doWrite();
    return { ok: true, value: result };
  } catch (e) {
    return {
      ok: false,
      error: { message: e.message, code: "WRITE_FAILED" },
    };
  }
}
```

### Pattern: ValidationResult

For validation operations:

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validate(config: Config): ValidationResult {
  const errors: string[] = [];
  if (!config.name) errors.push("Name required");
  return { valid: errors.length === 0, errors };
}
```

## Type Exports

### Re-exporting Types

Use `export type` for type-only exports:

```typescript
// Prefer: explicit type export
export type { User, AuthState } from "./lib/auth.types";

// Avoid: may include runtime code
export * from "./lib/auth.types";
```

### Generic Types

Provide sensible defaults:

```typescript
/**
 * Storage operation result.
 *
 * @typeParam T - Stored value type (default: unknown)
 */
export interface StorageResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: string;
}
```

## Versioning

### Deprecation

Mark deprecated APIs with `@deprecated`:

```typescript
/**
 * @deprecated Use `executeApi()` instead. Will be removed in v2.0.
 */
executeQuery(queryId: string): Promise<any[]> {}
```

### Breaking Changes

When changing API:

1. Add new API alongside old
2. Mark old as `@deprecated`
3. Update all internal usages
4. Remove in next major version

## Import Paths

### Correct

```typescript
// Use the configured import path
import { AuthService } from "@excel-platform/core/auth";
import type { User } from "@excel-platform/core/auth";
```

### Incorrect

```typescript
// ❌ Never use relative paths between libs
import { AuthService } from "../../core/auth/src/lib/auth.service";

// ❌ Never import from internal paths
import { AuthService } from "@excel-platform/core/auth/lib/auth.service";
```

## Circular Dependencies

### Detection

```bash
# View dependency graph
npx nx graph

# Check for circular deps
npx nx lint --configuration=dep-graph
```

### Prevention

Extract shared types to dedicated library:

```
Before:
  core/auth ←→ data/storage (circular!)

After:
  shared/types ← core/auth
  shared/types ← data/storage
```

## Next Steps

- [Creating a Library](creating-a-library) – Full setup guide
- [Testing Libraries](testing-libraries) – Testing patterns
- [Nx Commands](../monorepo/nx-commands) – Dependency management
