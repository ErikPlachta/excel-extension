---
sidebar_position: 1
slug: /
title: Excel Platform
---

# Excel Platform Documentation

Angular application for Excel add-in development using Nx monorepo architecture.

## Quick Links

### For Developers
- [Getting Started](getting-started) - Setup and development workflow
- [Storage Architecture](architecture/STORAGE-ARCHITECTURE) - Browser storage design
- [Performance Guide](architecture/PERFORMANCE) - Excel limits and optimization

### Architecture
- [Backend API Spec](architecture/BACKEND-API-SPEC) - Full API specification
- [Backend Endpoints](architecture/BACKEND-API-ENDPOINTS) - Quick endpoint reference

### API Reference
- [API Docs](api/) - Generated TypeScript documentation

### Changelog
- [View all changes](category/changelog) - Historical development log

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

## NPM Scripts

```bash
npm start          # Dev server
npm run build      # Production build
npm run test:ci    # Run tests
npm run lint       # Lint code
npm run docs:serve # View documentation
```
