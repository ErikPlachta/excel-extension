---
sidebar_position: 1
title: API Reference
---

# Excel Platform API Documentation

TypeScript API documentation for all libraries.

## Libraries

### Shared Libraries
- **@excel-platform/shared/types** - Domain type definitions
- **@excel-platform/shared/ui** - Reusable UI components
- **@excel-platform/shared/util** - Utility functions

### Core Libraries
- **@excel-platform/core/auth** - Authentication services
- **@excel-platform/core/telemetry** - Logging and telemetry
- **@excel-platform/core/settings** - User preferences

### Office Libraries
- **@excel-platform/office/excel** - Excel.js integration
- **@excel-platform/office/common** - Shared Office utilities

### Data Libraries
- **@excel-platform/data/storage** - Storage abstraction
- **@excel-platform/data/api** - API catalog and mocks
- **@excel-platform/data/query** - Query management

## Generating Documentation

```bash
npm run docs          # Generate docs
npm run docs:serve    # Generate and serve
npm run docs:watch    # Watch mode with live reload
npm run docs:coverage # Check TSDoc coverage
```

## Coverage Requirements

All public APIs should have TSDoc comments with at least 70% coverage.
