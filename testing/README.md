# Testing Utilities

Jest runtime utilities imported by test files across the monorepo.

## Files

### `jest-compat.ts`

Provides Jasmine-style API compatibility for Jest. Allows tests written with Jasmine syntax (`createSpyObj`, `spy.and.returnValue`, etc.) to work in Jest after migration from Karma/Jasmine.

**Imported by:** All `test-setup.ts` files in `apps/` and `libs/`

**Why not in `scripts/`?** This is TypeScript code imported at Jest runtime, not an executable script. The `scripts/` folder contains shell scripts and Node scripts run via npm commands.
