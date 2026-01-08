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

<!-- DIRECTORY_START -->
## Directory Structure

```
apps/
├── excel-addin/
└── excel-addin-docs-website/

libs/
├── core/
│   ├── auth/
│   ├── excel/
│   ├── settings/
│   └── telemetry/
├── shared/
│   ├── types/
│   ├── ui/
│   └── util/
├── data/
│   ├── api/
│   ├── query/
│   └── storage/
└── office/
    ├── common/
    └── excel/
```
<!-- DIRECTORY_END -->

<!-- LIBRARIES_START -->
## Libraries

| Package | Description |
|---------|-------------|
| `@excel-platform/core/auth` | Core authentication services for JWT and SSO management |
| `@excel-platform/core/excel` | Excel service library for Office.js operations |
| `@excel-platform/core/settings` | Core settings service for application configuration |
| `@excel-platform/core/telemetry` | Core telemetry and app context services |
| `@excel-platform/shared/types` | Shared type definitions for the Excel Platform |
| `@excel-platform/shared/ui` | Shared UI components for the Excel Platform |
| `@excel-platform/shared/util` | Shared utility functions for the Excel Platform |
| `@excel-platform/data/api` | API services, catalog, and configuration |
| `@excel-platform/data/query` | Query management services |
| `@excel-platform/data/storage` | Storage services for localStorage and IndexedDB operations |
| `@excel-platform/office/common` | Common Office.js utilities (placeholder) |
| `@excel-platform/office/excel` | Excel-specific Office.js utilities (placeholder) |
<!-- LIBRARIES_END -->

<!-- SCRIPTS_START -->
## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Dev server at localhost:4200 |
| `npm run start:dev` | Dev server with HTTPS |
| `npm run start:mock` | Dev server with mock data |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run test:ci` | Run all tests (headless) |
| `npm run lint` | Lint TypeScript and templates |
| `npm run docs` | Build documentation site |
| `npm run dev-certs` | Install HTTPS dev certificates |
| `npm run docs:generate` | Regenerate intro.md content |
| `npm run docs:serve` | View documentation locally |
| `npm run docs:validate` | Run docs:validate |
| `npm run graph` | View Nx dependency graph |
| `npm run lint:office` | Office add-in specific linting |
| `npm run prettier` | Format code |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run validate:dev-manifest` | Validate Office manifest |
<!-- SCRIPTS_END -->

<!-- SERVICES_START -->
## Services

| Service | Library | Description |
|---------|---------|-------------|
| `AuthApiMockService` | core/auth | Auth API Mock Service |
| `AuthApiService` | core/auth | Auth API Service |
| `AuthService` | core/auth | Authentication Service |
| `JwtHelperService` | core/auth | JWT Helper Service |
| `ExcelService` | core/excel | Angular service that wraps the Office.js Excel APIs. |
| `FormulaScannerService` | core/excel | Scans workbook formulas for table/column dependencies. |
| `WorkbookService` | core/excel | Provides a typed, feature-friendly abstraction over workb... |
| `SettingsService` | core/settings | Settings Service |
| `AppContextService` | core/telemetry | App Context Service |
| `TelemetryService` | core/telemetry | Centralized telemetry service for application operations ... |
| `ApiCatalogService` | data/api | API Catalog Service |
| `ApiConfigService` | data/api | Service for building API URLs. |
| `AppConfigService` | data/api | AppConfig Service |
| `ConfigValidatorService` | data/api | Config Validator Service |
| `OperationsApiMockService` | data/api | Operations API Mock Service |
| `OperationsApiService` | data/api | Operations API Service |
| `QueryApiMockService` | data/api | Mock API service for local development and testing. |
| `QueryValidationService` | data/api | Query Validation Service |
| `QueryConfigurationService` | data/query | Simple local-storage backed store for named query configu... |
| `QueryQueueService` | data/query | Simple in-memory execution queue for `QueryConfigurationI... |
| `QueryStateService` | data/query | Per-query Run checkbox state used for batch execution. |
| `BackupRestoreService` | data/storage | Backup/Restore Service |
| `IndexedDBService` | data/storage | IndexedDB Service |
| `StorageBaseService` | data/storage | Storage Base Service |
| `StorageHelperService` | data/storage | Storage Helper Service |
| `UserKeyedStorageService` | data/storage | User-Keyed Storage Service |
<!-- SERVICES_END -->
