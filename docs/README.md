# Excel Platform Documentation

Angular application for Excel add-in development using Nx monorepo architecture.

## Structure

```
docs/
├── README.md                 # This file
├── architecture/             # System design
│   ├── STORAGE-ARCHITECTURE.md
│   └── PERFORMANCE.md
├── guides/                   # Development guides
│   └── GETTING-STARTED.md
├── api/                      # API documentation
│   └── README.md
└── changelog/                # Historical changes
```

## Quick Links

### For Developers
- [Getting Started](guides/GETTING-STARTED.md)
- [Storage Architecture](architecture/STORAGE-ARCHITECTURE.md)
- [Performance Guide](architecture/PERFORMANCE.md)

### API Documentation
- [API Docs](api/README.md) - Run `npm run docs:serve` to view generated docs

### For Claude Code
- See `.claude/CLAUDE.md` for AI-focused index

## Generating Documentation

```bash
npm run docs          # Generate API docs to dist/docs/
npm run docs:serve    # Serve at localhost:8080
npm run docs:watch    # Watch mode
```

## Libraries

| Library | Description |
| ------- | ----------- |
| `@excel-platform/shared/types` | Domain type definitions |
| `@excel-platform/shared/ui` | Reusable UI components |
| `@excel-platform/shared/util` | Utility functions |
| `@excel-platform/core/auth` | Authentication services |
| `@excel-platform/core/telemetry` | Logging and telemetry |
| `@excel-platform/core/settings` | User preferences |
| `@excel-platform/office/excel` | Excel.js integration |
| `@excel-platform/office/common` | Shared Office utilities |
| `@excel-platform/data/storage` | Storage abstraction |
| `@excel-platform/data/api` | API catalog and mocks |
| `@excel-platform/data/query` | Query management |
