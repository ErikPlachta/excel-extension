---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

High-level system design for the Excel Platform.

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Excel Desktop/Online                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Task Pane (Angular)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │  │
│  │  │   Views     │  │  Services   │  │     Libraries       │ │  │
│  │  │  ─────────  │  │  ─────────  │  │  ─────────────────  │ │  │
│  │  │ Home        │  │ Excel       │→ │ @excel-platform/    │ │  │
│  │  │ Queries     │  │ Workbook    │  │   core/auth         │ │  │
│  │  │ Worksheets  │  │ Auth        │  │   core/settings     │ │  │
│  │  │ Tables      │  │ Telemetry   │  │   data/storage      │ │  │
│  │  │ User        │  │ QueryState  │  │   shared/ui         │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      Office.js API                          │  │
│  │  Excel.run() │ Workbook │ Worksheets │ Tables │ Ranges     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Future)
              ┌───────────────────────────────┐
              │        Backend API            │
              │  Azure Functions + Databricks │
              └───────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | Angular 21 | Component-based UI |
| Task Pane | Office.js | Excel integration |
| State | RxJS | Reactive state management |
| Build | Nx | Monorepo tooling |
| Testing | Jest | Unit tests |
| Deployment | GitHub Pages | Static hosting |

## Monorepo Structure

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

## Application Architecture

### Entry Point

Bootstrap at `apps/excel-addin/src/main.ts`:

```typescript
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ]
});
```

### Component Hierarchy

```
AppComponent (Shell)
├── NavigationComponent
├── @switch (currentView)
│   ├── SsoHomeComponent
│   ├── HomeComponent
│   ├── QueriesComponent
│   ├── WorksheetsComponent
│   ├── TablesComponent
│   └── UserComponent
└── StatusBannerComponent
```

### Service Architecture

```
ExcelService (Office.js wrapper)
    │
    ├── WorkbookService (Sheet/table operations)
    │
    └── QueryStateService (Query configuration)
        │
        ├── QueryApiMockService (API execution)
        │
        └── StorageHelperService (Persistence)
            │
            ├── StorageBaseService (localStorage)
            │
            └── IndexedDBService (Large data)
```

## Key Design Decisions

### Standalone Components

No NgModules. All components are standalone:

```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, SharedComponents]
})
```

### Host Detection

All Excel operations gated by host check:

```typescript
if (!this.excel.isExcel) {
  console.warn('Not in Excel');
  return;
}
```

### Result Types

Operations return typed results instead of throwing:

```typescript
interface ExcelOperationResult<T> {
  ok: boolean;
  value?: T;
  error?: { message: string; code: string };
}
```

### Data-Driven Configuration

Navigation and features defined in config:

```typescript
// libs/data/api/src/lib/app-config.default.ts
const config: AppConfig = {
  navItems: [...],
  roles: [...],
  queries: [...]
};
```

## Data Flow

### Query Execution Flow

```
User clicks "Run Query"
    │
    ▼
QueriesComponent.runQuery()
    │
    ▼
QueryStateService.getEffectiveParams()
    │
    ▼
QueryApiMockService.executeApi()
    │
    ├── Check IndexedDB cache
    │
    ▼
ExcelService.upsertQueryTable()
    │
    ├── Check isExcel
    ├── Resolve target (ownership model)
    ├── Write data in chunks
    │
    ▼
Return ExcelOperationResult
```

### State Persistence Flow

```
Service updates state
    │
    ▼
StorageHelperService.setItem()
    │
    ├── < 100KB → localStorage
    │
    └── >= 100KB → IndexedDB
```

## Security Model

### Authentication

- Mock SSO for development
- Azure AD integration planned
- Role-based feature access

### Roles

| Role | Access |
|------|--------|
| `analyst` | Query execution, view data |
| `admin` | Full access, settings |
| `automation` | API-only, scheduled runs |

### Data Protection

- No sensitive data in localStorage
- Token storage in memory (production)
- HTTPS required for Office.js

## Performance Patterns

### Chunked Writes

Large datasets written in batches:

```typescript
for (let i = 0; i < rows.length; i += chunkSize) {
  table.rows.add(null, rows.slice(i, i + chunkSize));
  await ctx.sync();
  await sleep(backoffMs);
}
```

### Caching

- IndexedDB for query result caching
- TTL-based expiration (1 hour default)
- Manual cache clear in Settings

## Deployment Architecture

### Development

```
localhost:4200 → Excel (sideloaded via dev-manifest.xml)
```

### Production

```
GitHub Pages → Excel (via prod-manifest.xml)
    │
    └── https://{user}.github.io/excel-extension/
```

## Related Documentation

- [Services](services) - Service details
- [Storage Architecture](storage) - Storage tiers
- [Performance](performance) - Large dataset handling
- [Backend API](backend-api) - API specification
