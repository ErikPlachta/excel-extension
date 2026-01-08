# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Commands

### Development

```bash
npm ci                  # Install dependencies
npm start               # Dev server at http://localhost:4200/
npm run start:dev       # Dev server at https://localhost:4200/ (requires dev-certs)
npm run dev-certs       # Install HTTPS dev certs (one-time per machine)
npm run watch           # Build in watch mode
npm run build           # Production build
npm run docs            # Build documentation site
npm run docs:serve      # Local docs server
```

### Testing & Linting

```bash
npm test                # Unit tests (Jest)
npm run test:ci         # Headless tests (Jest, single run)
npm run lint            # ESLint for TypeScript + templates
npm run lint:office     # Office add-in specific linting
npm run prettier        # Format code
npm run validate:dev-manifest  # Validate dev-manifest.xml
```

### Excel Sideloading

1. Run dev server: `npm start` or `npm run start:dev`
2. In Excel: **Insert → My Add-ins → Upload My Add-in**
3. Select `dev-manifest.xml` from repo
4. Task pane loads Angular app; Office.js calls go through `ExcelService`

## Architecture

Angular 21 task-pane add-in for Excel using standalone components and Office.js. No NgModules. Entry at `apps/excel-addin/src/main.ts` bootstraps `AppComponent` with `provideRouter(routes)`.

<!-- DIRECTORY_START -->
### Directory Structure

- **`apps/excel-addin/`** – Main Excel add-in application
- **`apps/excel-addin-docs-website/`** – Docusaurus documentation site
- **`libs/core/`** – auth, excel, settings, telemetry
- **`libs/shared/`** – types, ui, util
- **`libs/data/`** – api, query, storage
- **`libs/office/`** – common, excel (placeholders)
<!-- DIRECTORY_END -->

### Key Services (Summary)

| Service | Purpose |
|---------|---------|
| `ExcelService` | Office.js wrapper with `isExcel` guard, typed results |
| `WorkbookService` | Workbook abstraction, ownership model |
| `AuthService` | JWT auth, roles, SSO mock |
| `TelemetryService` | Centralized logging |
| `SettingsService` | App preferences |
| `QueryStateService` | Parameters, run state |
| `StorageHelperService` | localStorage + IndexedDB abstraction |

**Full service documentation:** [Service Architecture](apps/excel-addin-docs-website/docs/architecture/services.md)

### Office.js Integration Pattern

```typescript
async ngOnInit() {
  if (!this.excel.isExcel) return;
  const result = await this.excel.upsertQueryTable(apiId, target, rows);
  if (!result.ok) console.error(result.error.message);
}
```

- Always gate on `ExcelService.isExcel`
- Prefer `WorkbookService` for workbook operations
- Use typed `ExcelOperationResult` for error handling

## Code Standards

- **TSDoc required** for public services, components, exported types
- **Tests required** for behavior changes
- Avoid `any` except at Office.js boundary
- **Zod validation** at trust boundaries (API responses, storage reads, file imports)

## Deployment

- **CI** (`.github/workflows/ci.yml`): PR → lint + test + build
- **CD** (`.github/workflows/cd.yml`): Push to `main` → GitHub Pages (docs only)
- Base href `/excel-extension/` set in Docusaurus config

## Gotchas

- **NPM scripts:** Use `npm run watch`, not `npm watch`
- **Tests:** Office globals undefined in Jest; always gate on `isExcel`
- **Blank taskpane:** Dev server not running; start `npm start`
- **Append mode removed:** Only overwrite semantics supported

## Reference Documentation

All detailed documentation is in the Docusaurus site (`apps/excel-addin-docs-website/docs/`):

| Topic | Location |
|-------|----------|
| **Quick Start** | `getting-started/quick-start.md` |
| **App Development** | `guides/app/` (patterns, queries, excel-integration, testing) |
| **Library Development** | `guides/library/` (creating, testing, api-conventions) |
| **Monorepo Guides** | `guides/monorepo/` (nx-commands, ci-cd, releases) |
| **Architecture** | `architecture/` (overview, services, storage, performance, backend-api) |
| **API Documentation** | `api/` (auto-generated TypeDoc) |
| **Changelog** | `changelog/` |
| **Contributing** | `contributing.md` |

Run `npm run docs:serve` to browse locally, `npm run docs:generate` to update intro.md.
