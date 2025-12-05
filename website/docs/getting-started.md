---
sidebar_position: 2
title: Getting Started
---

# Getting Started

Setup guide for Excel Platform development.

## Prerequisites

- Node.js 20.x or 22.x
- npm 10.x+
- VS Code (recommended)
- Microsoft Excel (for add-in testing)

## Initial Setup

```bash
git clone https://github.com/ErikPlachta/excel-extension.git
cd excel-extension
npm ci
npm start
```

## Development Commands

```bash
npm start           # Dev server at http://localhost:4200/
npm run build       # Production build
npm run test        # Run tests
npm run test:ci     # Run all tests
npm run lint        # Lint code
npm run docs:serve  # View API documentation
```

## Project Structure

```
excel-extension/
├── apps/
│   └── excel-addin/          # Main Angular application
│       └── src/
│           ├── app/          # App components and features
│           ├── commands/     # Excel ribbon commands
│           └── main.ts       # Entry point
├── libs/
│   ├── shared/               # Shared code
│   │   ├── types/           # Type definitions
│   │   ├── ui/              # UI components
│   │   └── util/            # Utilities
│   ├── core/                 # Core services
│   │   ├── auth/            # Authentication
│   │   ├── telemetry/       # Logging
│   │   └── settings/        # Preferences
│   ├── office/               # Office.js integration
│   │   ├── excel/           # Excel services
│   │   └── common/          # Common utilities
│   └── data/                 # Data layer
│       ├── storage/         # Storage services
│       ├── api/             # API services
│       └── query/           # Query management
└── docs/                     # Documentation
```

## Testing in Excel

1. Start dev server: `npm start`
2. Open Excel
3. Go to **Insert > My Add-ins > Upload My Add-in**
4. Select `dev-manifest.xml` from repo root
5. Task pane loads the app

## Nx Commands

```bash
npx nx build excel-addin     # Build app
npx nx test excel-addin      # Test app
npx nx lint excel-addin      # Lint app
npx nx test core-auth        # Test specific library
npx nx graph                 # View dependency graph
npx nx affected --target=test # Test affected projects
```

## Next Steps

- Read [Storage Architecture](architecture/STORAGE-ARCHITECTURE)
- Check [Performance Guide](architecture/PERFORMANCE)
- Browse [API Documentation](api/)
