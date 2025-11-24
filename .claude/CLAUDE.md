# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm ci                  # Install dependencies
npm start               # Dev server at http://localhost:4200/
npm run start:dev       # Dev server at https://localhost:4200/ (requires dev-certs)
npm run dev-certs       # Install HTTPS dev certs (one-time per machine)
npm run watch           # Build in watch mode
npm run build           # Production build
```

### Testing & Linting
```bash
npm test                # Unit tests (Karma/Jasmine, interactive)
npm run test:ci         # Headless tests (single run, ChromeHeadless)
npm run lint            # ESLint for TypeScript + templates
npm run lint:office     # Office add-in specific linting
npm run lint:office:fix # Auto-fix Office add-in issues
npm run prettier        # Format code
npm run validate:dev-manifest  # Validate dev-manifest.xml
```

### Excel Sideloading
1. Run dev server: `npm start` or `npm run start:dev`
2. In Excel: **Insert → My Add-ins → Upload My Add-in**
3. Select `dev-manifest.xml` from repo
4. Task pane loads Angular app; Office.js calls go through `ExcelService`

## Architecture

Angular 20 task-pane add-in for Excel using standalone components and Office.js. No NgModules. Entry at `src/main.ts` bootstraps `AppComponent` with `provideRouter(routes)`.

### Directory Structure
- **`src/app/core/`** – Root shell, core services (`ExcelService`, `WorkbookService`, `AuthService`, `TelemetryService`, `SettingsService`), app bootstrap/config
- **`src/app/features/`** – Feature views (SSO, home, worksheets, tables, queries, user)
- **`src/app/shared/`** – Query domain models/services, utilities, UI primitives
- **`src/app/types/`** – Shared types (auth, queries, app config, UI primitives)
- **`src/commands/`** – Ribbon command handlers (`commands.html`, `commands.ts`)
- **`src/helpers/`** – Mocked SSO helpers
- **`src/middle-tier/`** – Stubbed middle-tier functions

### Key Services

#### ExcelService (`src/app/core/excel.service.ts`)
- Wraps Office.js `Excel.run()` with `isExcel` guard for safe host detection
- Provides workbook operations: `upsertQueryTable`, `activateQueryLocation`, ownership helpers
- Returns typed `ExcelOperationResult<T>` instead of throwing
- All Excel operations gated by `isExcel` check

#### WorkbookService (`src/app/core/workbook.service.ts`)
- Shared workbook abstraction for tabs/sheets and tables
- Helpers: `getSheets()`, `getTables()`, `getTableByName(name)`
- Ownership model: `getOwnership()`, `isExtensionManagedTable()`, `getManagedTablesForQuery()`
- All features use this instead of direct Office.js calls

#### AuthService (`src/app/core/auth.service.ts`)
- Mocked SSO with user, roles, auth state
- `localStorage` persistence
- Role-based feature visibility (queries require `analyst`/`admin`)

#### TelemetryService (`src/app/core/telemetry.service.ts`)
- Centralized logging to console + optional in-workbook table
- Configuration via `SettingsService` → `TelemetrySettings`
- Enriches events with session ID, host status, auth summary
- Error normalization for Excel operations

#### QueryStateService (`src/app/shared/query-state.service.ts`)
- Tracks query configurations, parameters (global + per-query), last runs
- `localStorage` persistence
- Used by Queries view for state management

#### QueryApiMockService (`src/app/shared/query-api-mock.service.ts`)
- Mock API definitions for queries (sales, customers, inventory, audit)
- Returns sample data rows for each query
- Drives flat catalog in current Queries view

### Office.js Integration Pattern

**Always follow this pattern:**
```typescript
async ngOnInit() {
  if (!this.excel.isExcel) return;
  // Prefer WorkbookService for workbook operations
  this.tables = await this.workbook.getTables();

  // Or use ExcelService directly
  const result = await this.excel.upsertQueryTable(query, rows, params);
  if (!result.ok) {
    // Handle typed error
    console.error(result.error.message);
  }
}
```

- **Always gate on `ExcelService.isExcel`** before Excel APIs
- **Prefer `WorkbookService`** for workbook-level operations
- Use `Excel.run(ctx => { ...; return value; })` with `await ctx.sync()` after `load()`
- Keep Office/Excel globals as `any` at integration boundary

### Navigation & Shell
- State-based navigation in `AppComponent` using `currentView` (no URL changes in Excel)
- Routes in `src/app/core/app.routes.ts` for non-Excel browser usage
- Views: SSO, home, worksheets, tables, queries, user
- Auth-gated: queries require analyst/admin role
- Host banner at bottom when Excel not detected

### Data-Driven Config
- `DEFAULT_APP_CONFIG` in `src/app/shared/app-config.ts` drives nav, roles, layout
- `APP_TEXT` in `src/app/shared/app-text.ts` centralizes all UI copy
- Types in `src/app/types/app-config.types.ts`
- Add new nav item: edit config + text, no template changes needed

### Query Execution (Current Baseline)
- Flat catalog of API definitions from `QueryApiMockService`
- Global + per-query parameter management via `QueryStateService`
- Batch "Run" with Global or Unique parameter modes
- Creates/updates Excel tables via `ExcelService.upsertQueryTable`
- Overwrite-only semantics (append removed)
- Telemetry to console + optional in-workbook log table

### Workbook Ownership Model
- Metadata stored in hidden `_Extension_Ownership` sheet
- Tracks `(sheetName, tableName, queryId, isManaged, lastTouchedUtc)`
- Extension only mutates managed tables
- User table name conflicts: create suffixed alternate table
- Header shape mismatches: delete/recreate table at same anchor
- Dev-only purge: `ExcelService.purgeExtensionManagedContent` removes all managed content

### Manifests
- **`dev-manifest.xml`** – Points to `http://localhost:4200/` for local dev/sideloading
- **`prod-manifest.xml`** – Points to GitHub Pages deployment
- Both validated via `npm run validate:dev-manifest`

## Testing Notes

- Office/Excel globals undefined in Karma
- Tests run outside Excel context
- Code paths gated behind `ExcelService.isExcel`
- Mock Office.js if adding Excel interactions in tests
- TSDoc + tests required for all new/changed code

## Code Standards

- **American English, concise responses**
- **TSDoc required** for public services, components, exported types
- **Tests required** for behavior changes
- Avoid `any` except at Office.js boundary
- Prefer `WorkbookService`/`ExcelService` over direct Office.js
- Use typed `ExcelOperationResult` for error handling
- Strong typing throughout app code

## Common Patterns

### Adding a Routed View
1. Create `foo.component.ts` as standalone with `templateUrl`/`styleUrl`
2. Add `{ path: 'foo', component: FooComponent }` to `src/app/core/app.routes.ts`
3. Link via `<a routerLink="/foo">Foo</a>` in `app.component.html`

### Adding a Nav Item
1. Edit `DEFAULT_APP_CONFIG` in `src/app/shared/app-config.default.ts`
2. Add `NavItemConfig` with unique `id`, `labelKey`, `viewId`, role requirements
3. Add `labelKey` to `APP_TEXT.nav` in `src/app/shared/app-text.ts`
4. Nav updates automatically

### Logging Telemetry
```typescript
this.telemetry.logEvent({
  category: 'feature',
  name: 'query-run',
  severity: 'info',
  message: 'Query executed successfully',
  context: { queryId: query.id }
});
```

## Deployment

- **CI** (`.github/workflows/ci.yml`): Pull requests → lint + build + test
- **CD** (`.github/workflows/deploy.yml`): Push to `main` → build with `--base-href /excel-extension/` → GitHub Pages
- Base href required for GH Pages: already set in workflow

## Gotchas

- **NPM scripts:** Use `npm run watch`, not `npm watch`
- **Base href:** GH Pages needs `--base-href /excel-extension/` (workflow handles this)
- **Tests:** Office globals undefined in Karma; keep `isExcel` guards
- **Blank taskpane:** Dev server not running; start `npm start` or `npm run start:dev`
- **Append mode removed:** Only overwrite semantics supported; append explicitly removed after proving brittle
