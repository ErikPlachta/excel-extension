---
sidebar_position: 1
title: Nx Commands
---

# Nx Commands

Common Nx commands for working with the monorepo.

## Project Commands

### Build

```bash
# Build specific project
npx nx build excel-addin

# Build all projects
npx nx run-many --target=build --all

# Build only affected projects
npx nx affected --target=build
```

### Test

```bash
# Test specific project
npx nx test excel-addin
npx nx test core-auth

# Test with watch mode
npx nx test excel-addin --watch

# Test with coverage
npx nx test excel-addin --coverage

# Test all projects
npx nx run-many --target=test --all

# Test affected only
npx nx affected --target=test
```

### Lint

```bash
# Lint specific project
npx nx lint excel-addin

# Lint all
npx nx run-many --target=lint --all

# Lint affected
npx nx affected --target=lint
```

## Generators

### Create Library

```bash
npx nx generate @nx/angular:library \
  --name=my-lib \
  --directory=libs/shared/my-lib \
  --importPath=@excel-platform/shared/my-lib \
  --tags=scope:shared,type:util \
  --standalone
```

### Create Component

```bash
npx nx generate @nx/angular:component \
  --name=my-component \
  --project=excel-addin \
  --standalone \
  --path=apps/excel-addin/src/app/features/my-feature
```

### Create Service

```bash
npx nx generate @nx/angular:service \
  --name=my-service \
  --project=shared-my-lib \
  --path=libs/shared/my-lib/src/lib
```

## Dependency Graph

### View Graph

```bash
# Open interactive graph in browser
npx nx graph

# Show affected projects
npx nx affected:graph
```

### Check Dependencies

```bash
# List project dependencies
npx nx show project excel-addin --web

# List all projects
npx nx show projects
```

## Affected Commands

Run targets only for projects affected by changes:

```bash
# Affected since main branch
npx nx affected --target=test

# Affected since specific commit
npx nx affected --target=test --base=abc123

# Affected between commits
npx nx affected --target=test --base=abc123 --head=def456
```

### Multiple Targets

```bash
# Run multiple targets
npx nx affected --target=lint,test,build
```

## Caching

Nx caches task results. Subsequent runs are instant if inputs haven't changed.

### Clear Cache

```bash
# Clear local cache
npx nx reset
```

### Cache Info

```bash
# Show cache status
npx nx show projects --affected
```

## Run-Many

Execute targets across multiple projects:

```bash
# Run on all projects
npx nx run-many --target=test --all

# Run on specific projects
npx nx run-many --target=test --projects=core-auth,data-storage

# Run in parallel (default: 3)
npx nx run-many --target=test --all --parallel=5

# Run sequentially
npx nx run-many --target=test --all --parallel=1
```

## Project References

### List Projects

```bash
npx nx show projects
```

Output:
```
excel-addin
core-auth
core-settings
core-telemetry
data-api
data-query
data-storage
office-excel
shared-types
shared-ui
shared-util
```

### Project Config

```bash
# Show project configuration
npx nx show project excel-addin
```

## Workspace

### Migrate Nx

```bash
# Update Nx to latest
npx nx migrate latest

# Apply migrations
npx nx migrate --run-migrations
```

### Format

```bash
# Format affected files
npx nx format:write

# Check formatting
npx nx format:check
```

## CI Optimization

### Run Affected in CI

```bash
# CI typically runs affected against main
npx nx affected --target=lint --base=origin/main
npx nx affected --target=test --base=origin/main --ci
npx nx affected --target=build --base=origin/main
```

### Parallel Execution

```bash
# Optimal for CI (adjust based on runner)
npx nx run-many --target=test --all --parallel=3 --ci
```

## Troubleshooting

### Reset Workspace

```bash
# Clear cache and daemon
npx nx reset

# Clear node_modules and reinstall
rm -rf node_modules
npm ci
```

### Debug Affected

```bash
# See what's affected and why
npx nx affected:graph

# Print affected projects
npx nx affected --target=test --print-affected
```

### Dependency Issues

```bash
# Check for circular dependencies
npx nx graph

# Lint dependency constraints
npx nx lint --configuration=dep-graph
```

## Quick Reference

| Task | Command |
|------|---------|
| Build app | `npx nx build excel-addin` |
| Test app | `npx nx test excel-addin` |
| Test library | `npx nx test core-auth` |
| Test affected | `npx nx affected --target=test` |
| View graph | `npx nx graph` |
| Create library | `npx nx g @nx/angular:library --name=my-lib` |
| Clear cache | `npx nx reset` |

## Next Steps

- [CI/CD](ci-cd) – GitHub Actions workflow
- [Releases](releases) – Version and release process
- [Creating a Library](../library/creating-a-library) – Library setup
