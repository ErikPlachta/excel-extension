---
sidebar_position: 1
slug: /
title: Excel Platform
---

# Excel Platform Documentation

Angular 21 Excel add-in with Nx monorepo architecture.

## Choose Your Path

### I want to build features in the Excel add-in

Start here if you're adding features, fixing bugs, or working on the UI.

- [Quick Start](getting-started/quick-start) → [App Development Tutorial](getting-started/app-development)
- **Guides:** [Patterns](guides/app/patterns) | [Queries](guides/app/queries) | [Excel Integration](guides/app/excel-integration) | [Testing](guides/app/testing)

### I want to create or extend libraries

Start here if you're building shared services, utilities, or components.

- [Quick Start](getting-started/quick-start) → [Library Development Tutorial](getting-started/library-development)
- **Guides:** [Creating Libraries](guides/library/creating-a-library) | [Testing Libraries](guides/library/testing-libraries) | [API Conventions](guides/library/api-conventions)

### I maintain the monorepo

Start here for CI/CD, releases, and Nx tooling.

- **Guides:** [Nx Commands](guides/monorepo/nx-commands) | [CI/CD](guides/monorepo/ci-cd) | [Releases](guides/monorepo/releases)

## Reference

- [Architecture Overview](architecture/overview) - System design
- [Services](architecture/services) - Service documentation
- [Storage](architecture/storage) - Storage architecture
- [Performance](architecture/performance) - Large dataset handling
- [Backend API](architecture/backend-api) - API specification
- [API Documentation](api/) - Generated TypeScript docs
- [Changelog](category/changelog) - Release history
- [Contributing](contributing) - How to contribute

<!-- LIBRARIES_START -->
## Libraries

| Package | Description |
|---------|-------------|
| `@excel-platform/shared/types` | Shared TypeScript types and interfaces |
| `@excel-platform/shared/ui` | Reusable UI components |
| `@excel-platform/shared/util` | Utility functions |
| `@excel-platform/core/auth` | Authentication service |
| `@excel-platform/core/telemetry` | Telemetry and logging |
| `@excel-platform/core/settings` | Application settings |
| `@excel-platform/office/excel` | Excel Office.js wrapper |
| `@excel-platform/office/common` | Common Office utilities |
| `@excel-platform/data/storage` | Storage abstraction |
| `@excel-platform/data/api` | API services |
| `@excel-platform/data/query` | Query execution |
<!-- LIBRARIES_END -->

<!-- SCRIPTS_START -->
## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server at localhost:4200 |
| `npm run start:dev` | Dev server with HTTPS |
| `npm run build` | Production build |
| `npm run test:ci` | Run all tests (headless) |
| `npm run lint` | Lint TypeScript and templates |
| `npm run docs:serve` | View documentation locally |
<!-- SCRIPTS_END -->
