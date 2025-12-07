---
sidebar_position: 2
title: CI/CD
---

# CI/CD

GitHub Actions workflows for continuous integration and deployment.

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on pull requests to validate changes.

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - run: npx nx affected --target=lint --base=origin/main
      - run: npx nx affected --target=test --base=origin/main --ci
      - run: npx nx affected --target=build --base=origin/main
```

### Deploy Workflow (`.github/workflows/deploy.yml`)

Deploys to GitHub Pages on push to main.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npx nx build excel-addin --base-href=/excel-extension/

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/apps/excel-addin

      - uses: actions/deploy-pages@v4
```

## CI Stages

### 1. Lint

Checks code style and potential issues:

```bash
npx nx affected --target=lint --base=origin/main
```

Runs ESLint with Angular-specific rules.

### 2. Test

Runs unit tests with coverage:

```bash
npx nx affected --target=test --base=origin/main --ci
```

The `--ci` flag:
- Runs in headless mode
- Single run (no watch)
- Fails on any test failure

### 3. Build

Produces production artifacts:

```bash
npx nx affected --target=build --base=origin/main
```

Build output goes to `dist/`.

## Affected vs Run-Many

### Affected (PRs)

Only runs tasks for changed projects:

```bash
# Efficient for PRs
npx nx affected --target=test --base=origin/main
```

### Run-Many (Full CI)

Runs tasks on all projects:

```bash
# Complete validation
npx nx run-many --target=test --all --ci
```

## GitHub Pages Deployment

### Requirements

1. Repository Settings → Pages → Source: GitHub Actions
2. Base href must match repo name: `--base-href=/excel-extension/`

### Manual Deployment

```bash
# Build for GitHub Pages
npx nx build excel-addin --base-href=/excel-extension/

# Output: dist/apps/excel-addin/
```

### Deployment URL

After deployment: `https://{username}.github.io/excel-extension/`

## Caching

### npm Cache

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"
```

Caches `node_modules` based on `package-lock.json`.

### Nx Cache

Nx caches task outputs locally. For CI, consider [Nx Cloud](https://nx.dev/ci/features/remote-cache) for distributed caching.

## Branch Protection

Recommended rules for `main`:

1. **Require pull request reviews**
2. **Require status checks to pass:**
   - CI / lint
   - CI / test
   - CI / build
3. **Require branches to be up to date**

## Environment Variables

### Secrets

Set in Repository Settings → Secrets:

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | Auto-provided by Actions |

### Variables

Set in Repository Settings → Variables:

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_VERSION` | `20` | Node.js version |

## Troubleshooting

### Build Failures

1. Check Node.js version matches `package.json` engines
2. Verify `npm ci` (not `npm install`) for reproducible builds
3. Check for TypeScript errors: `npx tsc --noEmit`

### Test Failures

1. Run locally: `npx nx affected --target=test`
2. Check for flaky tests (timing issues)
3. Verify test environment matches CI

### Deployment Failures

1. Verify Pages is enabled in repo settings
2. Check `base-href` matches repo name
3. Verify `permissions` in workflow

### Cache Issues

```bash
# Clear npm cache
npm cache clean --force

# Clear Nx cache
npx nx reset
```

## Local CI Simulation

Run the same commands locally:

```bash
# Full CI validation
npm ci
npx nx run-many --target=lint --all --parallel=3
npx nx run-many --target=test --all --ci --parallel=3
npx nx run-many --target=build --all --parallel=3
```

## Next Steps

- [Releases](releases) – Version and changelog management
- [Nx Commands](nx-commands) – Detailed command reference
- [Quick Start](../../getting-started/quick-start) – Local development setup
