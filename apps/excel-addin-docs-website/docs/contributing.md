---
sidebar_position: 7
title: Contributing
---

# Contributing

Guide for contributing to the Excel Platform.

## Getting Started

### Prerequisites

- Node.js 20.x or 22.x
- npm 10.x+
- Git
- VS Code (recommended)

### Setup

```bash
git clone https://github.com/ErikPlachta/excel-extension.git
cd excel-extension
npm ci
npm start
```

## Development Workflow

### 1. Create Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature-name
```

### Branch Naming

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Code refactoring |
| `test/` | Test additions |
| `chore/` | Maintenance |

### 2. Make Changes

Follow code standards:

- TSDoc for all public APIs
- Tests for behavior changes
- No `any` types (except Office.js boundary)
- Use existing patterns

### 3. Test

```bash
# Run all tests
npm run test:ci

# Run specific library tests
npx nx test core-auth

# Run lint
npm run lint
```

### 4. Commit

Follow conventional commits:

```bash
git commit -m "feat(auth): add role-based access control"
git commit -m "fix(excel): handle empty table write"
git commit -m "docs(readme): update setup instructions"
```

Format: `type(scope): description`

### 5. Push and PR

```bash
git push origin feat/your-feature-name
```

Create PR on GitHub targeting `develop`.

## Code Standards

### TypeScript

```typescript
// Good: Typed, documented
/**
 * Fetches user by ID.
 * @param id - User identifier
 * @returns User or null if not found
 */
async function getUser(id: string): Promise<User | null> {
  return this.users.find(u => u.id === id) ?? null;
}

// Bad: Untyped, undocumented
async function getUser(id) {
  return this.users.find(u => u.id === id);
}
```

### Angular Components

```typescript
// Good: Standalone, typed
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule],
  template: `...`
})
export class FeatureComponent {
  private service = inject(MyService);
}

// Bad: Module-based, constructor injection
@Component({...})
export class FeatureComponent {
  constructor(private service: MyService) {}
}
```

### Services

```typescript
// Good: Injectable, documented
/**
 * Manages application settings.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  // ...
}
```

## Testing Requirements

### What to Test

- Service methods
- Component behavior
- Edge cases
- Error handling

### Test Structure

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({...});
    service = TestBed.inject(MyService);
  });

  it('should do something', () => {
    expect(service.method()).toBe(expected);
  });
});
```

### Coverage

Aim for 80%+ coverage on new code.

## Documentation

### When to Document

- New features → Update relevant guide
- API changes → Update TSDoc
- Configuration → Update CLAUDE.md

### TSDoc Format

```typescript
/**
 * Brief description.
 *
 * @param param - Parameter description
 * @returns Return description
 *
 * @example
 * ```typescript
 * const result = method(value);
 * ```
 */
```

## Pull Request Process

### PR Title

Use conventional commit format:

```
feat(queries): add batch execution mode
fix(excel): resolve table naming conflict
docs(guides): add library development tutorial
```

### PR Description

Include:

- Summary of changes
- Related issue (if any)
- Testing done
- Screenshots (for UI changes)

### Review Checklist

- [ ] Tests pass
- [ ] Lint passes
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No TODO comments (create issues instead)

## Issue Reporting

### Bug Reports

Include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Environment (OS, Node version, Excel version)
5. Screenshots/logs if applicable

### Feature Requests

Include:

1. Use case description
2. Proposed solution
3. Alternatives considered

## Architecture Decisions

For significant changes, discuss first:

1. Open an issue describing the proposal
2. Include rationale and alternatives
3. Wait for feedback before implementing

## Getting Help

- [Documentation](/) - Project docs
- [Issues](https://github.com/ErikPlachta/excel-extension/issues) - Bug reports and features
- [Discussions](https://github.com/ErikPlachta/excel-extension/discussions) - Questions and ideas

## License

Contributions are licensed under the project's license.
