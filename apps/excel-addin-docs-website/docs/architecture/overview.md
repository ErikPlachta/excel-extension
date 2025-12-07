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

```
excel-extension/
├── apps/
│   ├── excel-addin/              # Main Angular application
│   └── excel-addin-docs-website/ # Documentation site
├── libs/
│   ├── core/                     # Core services
│   │   ├── auth/                 # Authentication
│   │   ├── settings/             # User preferences
│   │   └── telemetry/            # Logging
│   ├── data/                     # Data layer
│   │   ├── api/                  # API definitions
│   │   ├── query/                # Query management
│   │   └── storage/              # Storage abstraction
│   ├── office/                   # Office.js integration
│   │   └── excel/                # Excel-specific
│   └── shared/                   # Shared utilities
│       ├── types/                # Type definitions
│       ├── ui/                   # UI components
│       └── util/                 # Utilities
└── docs/                         # Documentation
```

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
