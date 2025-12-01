# Phase 10: Documentation Reorganization

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
>
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 9 completed
> 4. Exit plan mode only when ready to execute

## Metadata

- **Branch:** `chore/doc-reorganization`
- **Depends On:** Phase 9 (Compodoc)
- **Estimated Effort:** 0.5 days (4 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective

Reorganize documentation following the hybrid approach: keep `.claude/CLAUDE.md` as the AI index, move reference docs to `docs/`, and establish clear documentation structure for the monorepo.

---

## Pre-Conditions

- [ ] Phase 9 completed: Compodoc setup and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] Documentation generates: `npm run docs`
- [ ] Working directory clean: `git status`

---

## Success Criteria

- [ ] `.claude/CLAUDE.md` serves as AI-focused index
- [ ] Reference docs moved to `docs/` directory
- [ ] Architecture docs in `docs/architecture/`
- [ ] Development guides in `docs/guides/`
- [ ] Changelog moved to `docs/changelog/`
- [ ] API docs generated to `docs/api/`
- [ ] All internal doc links updated
- [ ] README.md updated with doc structure

---

## Detailed Steps

### Step 1: Create Branch for Phase 10

**Action:** Create dedicated branch for documentation reorganization
**Commands:**

```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b chore/doc-reorganization
```

**Validation:**

```bash
git branch --show-current
# Should return: chore/doc-reorganization
```

---

### Step 2: Create Documentation Structure

**Action:** Create the docs directory structure
**Commands:**

```bash
mkdir -p docs/architecture
mkdir -p docs/guides
mkdir -p docs/changelog
mkdir -p docs/api
```

**Validation:**

```bash
tree docs/
```

---

### Step 3: Move Architecture Documentation

**Action:** Move architecture reference docs from .claude/
**Files to Move:**

| Source                            | Destination                                 |
| --------------------------------- | ------------------------------------------- |
| `.claude/STORAGE-ARCHITECTURE.md` | `docs/architecture/STORAGE-ARCHITECTURE.md` |
| `.claude/PERFORMANCE.md`          | `docs/architecture/PERFORMANCE.md`          |

**Commands:**

```bash
mv .claude/STORAGE-ARCHITECTURE.md docs/architecture/
mv .claude/PERFORMANCE.md docs/architecture/
```

**Validation:**

```bash
ls docs/architecture/
# Should show STORAGE-ARCHITECTURE.md and PERFORMANCE.md
```

---

### Step 4: Move Changelog

**Action:** Move changelog to docs/changelog/
**Files to Move:**

| Source       | Destination       |
| ------------ | ----------------- |
| `changelog/` | `docs/changelog/` |

**Commands:**

```bash
mv changelog/* docs/changelog/
rmdir changelog
```

**Validation:**

```bash
ls docs/changelog/
```

---

### Step 5: Update .claude/CLAUDE.md

**Action:** Update CLAUDE.md to reference new doc locations
**Commands:**

```bash
# Update references in CLAUDE.md
# Change:
#   .claude/STORAGE-ARCHITECTURE.md → docs/architecture/STORAGE-ARCHITECTURE.md
#   .claude/PERFORMANCE.md → docs/architecture/PERFORMANCE.md
#   changelog/... → docs/changelog/...
```

**Manual Edit Required (.claude/CLAUDE.md):**
Update the "Reference docs" section at the end:

```markdown
## Reference Docs

- `docs/architecture/STORAGE-ARCHITECTURE.md` - Storage APIs, IndexedDB schema, backup/restore
- `docs/architecture/PERFORMANCE.md` - Excel limits, chunking, large dataset handling
- `docs/changelog/` - Historical change logs

## Completed Refactors

Architecture refactor (9 phases) completed November 2025. See `docs/changelog/CHANGELOG_20251126_000000_feat-finalize-concept.md` for details.
```

---

### Step 6: Create Documentation Index

**Action:** Create main documentation index
**Commands:**

```bash
cat > docs/README.md << 'EOF'
# Excel Platform Documentation

Welcome to the Excel Platform documentation. This monorepo contains an Angular application for Excel add-in development.

## Documentation Structure

```

docs/
├── README.md # This file
├── architecture/ # System design and architecture
│ ├── STORAGE-ARCHITECTURE.md
│ └── PERFORMANCE.md
├── guides/ # Development guides
│ └── GETTING-STARTED.md
├── api/ # Generated API docs (Compodoc)
│ └── README.md
└── changelog/ # Historical changes
└── CHANGELOG\_\*.md

````

## Quick Links

### For Developers
- [Getting Started](guides/GETTING-STARTED.md)
- [Storage Architecture](architecture/STORAGE-ARCHITECTURE.md)
- [Performance Guide](architecture/PERFORMANCE.md)

### API Documentation
- [Generated API Docs](api/README.md) - Run `npm run docs:serve` to view

### For Claude Code
- See `.claude/CLAUDE.md` for AI-focused index

## Generating Documentation

```bash
npm run docs          # Generate API docs
npm run docs:serve    # Serve at localhost:8080
npm run docs:watch    # Watch mode
````

## Libraries

| Library                          | Description             |
| -------------------------------- | ----------------------- |
| `@excel-platform/shared/types`   | Domain type definitions |
| `@excel-platform/shared/ui`      | Reusable UI components  |
| `@excel-platform/shared/util`    | Utility functions       |
| `@excel-platform/core/auth`      | Authentication services |
| `@excel-platform/core/telemetry` | Logging and telemetry   |
| `@excel-platform/core/settings`  | User preferences        |
| `@excel-platform/office/excel`   | Excel.js integration    |
| `@excel-platform/office/common`  | Shared Office utilities |
| `@excel-platform/data/storage`   | Storage abstraction     |
| `@excel-platform/data/api`       | API catalog and mocks   |
| `@excel-platform/data/query`     | Query management        |

EOF

````

---

### Step 7: Create Getting Started Guide
**Action:** Create developer onboarding guide
**Commands:**
```bash
cat > docs/guides/GETTING-STARTED.md << 'EOF'
# Getting Started

This guide will help you set up the Excel Platform development environment.

## Prerequisites

- Node.js 20.x or 22.x
- npm 10.x+
- VS Code (recommended)
- Microsoft Excel (for add-in testing)

## Initial Setup

```bash
# Clone the repository
git clone https://github.com/ErikPlachta/excel-extension.git
cd excel-extension

# Install dependencies
npm ci

# Start development server
npm start
````

## Development Commands

```bash
npm start           # Dev server at http://localhost:4200/
npm run build       # Production build
npm run test        # Run tests
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

1. Start the dev server: `npm start`
2. Open Excel
3. Go to **Insert → My Add-ins → Upload My Add-in**
4. Select `dev-manifest.xml` from the repo root
5. The task pane will load the app

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

- Read the [Storage Architecture](../architecture/STORAGE-ARCHITECTURE.md)
- Check the [Performance Guide](../architecture/PERFORMANCE.md)
- Browse the [API Documentation](../api/README.md)
  EOF

````

---

### Step 8: Update Compodoc Output Location
**Action:** Update Compodoc to output to docs/api/
**Commands:**
```bash
# Update .compodocrc.json output path
cat > .compodocrc.json << 'EOF'
{
  "$schema": "./node_modules/@compodoc/compodoc/src/config/schema.json",
  "name": "Excel Platform",
  "output": "docs/api/generated",
  "theme": "material",
  "hideGenerator": false,
  "disableSourceCode": false,
  "disableDomTree": false,
  "disableGraph": false,
  "disableCoverage": false,
  "disablePrivate": true,
  "disableProtected": false,
  "disableInternal": true,
  "disableLifeCycleHooks": false,
  "disableRoutesGraph": false,
  "disableSearch": false,
  "disableDependencies": false,
  "coverageTest": 70,
  "coverageTestThresholdFail": false,
  "includes": "docs/guides",
  "includesName": "Guides",
  "toggleMenuItems": ["all"],
  "navTabConfig": [
    { "id": "modules", "label": "Modules" },
    { "id": "components", "label": "Components" },
    { "id": "directives", "label": "Directives" },
    { "id": "classes", "label": "Services" },
    { "id": "injectables", "label": "Injectables" },
    { "id": "interfaces", "label": "Interfaces" },
    { "id": "pipes", "label": "Pipes" },
    { "id": "miscellaneous", "label": "Miscellaneous" }
  ],
  "language": "en-US"
}
EOF
````

---

### Step 9: Update .gitignore for New Locations

**Action:** Update .gitignore for docs structure
**Commands:**

```bash
# Update .gitignore
cat >> .gitignore << 'EOF'

# Generated API docs
docs/api/generated/
EOF
```

---

### Step 10: Clean Up .claude/ Directory

**Action:** Remove moved files and update structure
**Commands:**

```bash
# List remaining .claude contents
ls -la .claude/

# Only CLAUDE.md and plans/ should remain
# plans/ contains the migration plans - can stay or move to docs/plans
```

**Decision Point:**

- Keep `.claude/plans/` for now (contains migration plans)
- These can be archived after migration completes

---

### Step 11: Update Root README.md

**Action:** Update project README with new doc structure
**Commands:**

```bash
# Update README.md to reference docs structure
# Add section pointing to docs/
```

**Manual Edit Required (README.md):**
Add documentation section:

```markdown
## Documentation

- [Documentation Index](docs/README.md)
- [Getting Started](docs/guides/GETTING-STARTED.md)
- [Architecture](docs/architecture/)
- [API Docs](docs/api/) - Run `npm run docs:serve`
```

---

### Step 12: Verify All Links Work

**Action:** Check that all documentation links are valid
**Commands:**

```bash
# Check for broken links in markdown files
grep -r "\.claude/" docs/
grep -r "changelog/" docs/

# Should return no results (all links updated)
```

---

### Step 13: Regenerate API Documentation

**Action:** Generate docs with new output location
**Commands:**

```bash
npm run docs
```

**Validation:**

```bash
ls docs/api/generated/
# Should show index.html and documentation files
```

---

### Step 14: Commit Phase 10 Changes

**Action:** Commit all documentation reorganization
**Commands:**

```bash
git add .
git status

git commit -m "$(cat <<'EOF'
chore: reorganize documentation structure

Reorganize docs following hybrid approach:

## Structure
```

docs/
├── README.md # Documentation index
├── architecture/ # System design
│ ├── STORAGE-ARCHITECTURE.md # (moved from .claude/)
│ └── PERFORMANCE.md # (moved from .claude/)
├── guides/ # Development guides
│ └── GETTING-STARTED.md # New onboarding guide
├── api/ # Compodoc output
│ ├── README.md
│ └── generated/ # Generated docs
└── changelog/ # (moved from changelog/)

```

## .claude/
- CLAUDE.md remains as AI-focused index
- Updated to reference new doc locations
- plans/ kept for migration tracking

## Changes
- Move architecture docs to docs/architecture/
- Move changelog to docs/changelog/
- Create getting started guide
- Update Compodoc output to docs/api/generated/
- Update all internal links
- Update root README.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 15: Create PR for Phase 10

**Action:** Push branch and create pull request
**Commands:**

```bash
git push -u origin chore/doc-reorganization

gh pr create --title "[Phase 10] Reorganize documentation" --body "$(cat <<'EOF'
## Summary
Reorganize documentation with hybrid approach for .claude/ and docs/.

## Changes

### New Structure
```

docs/
├── README.md # Documentation index
├── architecture/ # Moved from .claude/
├── guides/ # Development guides
├── api/ # Compodoc output
└── changelog/ # Moved from changelog/

```

### Moved Files
- `.claude/STORAGE-ARCHITECTURE.md` → `docs/architecture/`
- `.claude/PERFORMANCE.md` → `docs/architecture/`
- `changelog/*` → `docs/changelog/`

### New Files
- `docs/README.md` - Documentation index
- `docs/guides/GETTING-STARTED.md` - Developer onboarding

### Updated Files
- `.claude/CLAUDE.md` - Updated doc references
- `.compodocrc.json` - Output to docs/api/generated/
- `README.md` - Added documentation section

## Hybrid Approach
- `.claude/CLAUDE.md` - AI-focused index for Claude Code
- `docs/` - Human-focused documentation and guides
- Generated API docs in `docs/api/generated/`

## Testing
- [x] All documentation links work
- [x] Compodoc generates to new location
- [x] CLAUDE.md references updated
- [x] Getting started guide complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## File Migration Map

### From .claude/ to docs/

| Source                            | Destination                                 |
| --------------------------------- | ------------------------------------------- |
| `.claude/STORAGE-ARCHITECTURE.md` | `docs/architecture/STORAGE-ARCHITECTURE.md` |
| `.claude/PERFORMANCE.md`          | `docs/architecture/PERFORMANCE.md`          |

### From changelog/ to docs/

| Source        | Destination        |
| ------------- | ------------------ |
| `changelog/*` | `docs/changelog/*` |

### Files Remaining in .claude/

| File        | Purpose                                  |
| ----------- | ---------------------------------------- |
| `CLAUDE.md` | AI-focused index for Claude Code         |
| `plans/`    | Migration plans (archive after complete) |

---

## Final Documentation Structure

```
excel-extension/
├── .claude/
│   ├── CLAUDE.md              # AI-focused index (stays)
│   └── plans/                 # Migration plans (temporary)
├── docs/
│   ├── README.md              # Documentation index
│   ├── architecture/
│   │   ├── STORAGE-ARCHITECTURE.md
│   │   └── PERFORMANCE.md
│   ├── guides/
│   │   └── GETTING-STARTED.md
│   ├── api/
│   │   ├── README.md
│   │   └── generated/         # Compodoc output
│   └── changelog/
│       └── CHANGELOG_*.md
└── README.md                  # Project README
```

---

## Integrity Checks

Run ALL before marking complete:

- [ ] `docs/README.md` exists and is complete
- [ ] `docs/architecture/STORAGE-ARCHITECTURE.md` exists
- [ ] `docs/architecture/PERFORMANCE.md` exists
- [ ] `docs/guides/GETTING-STARTED.md` exists
- [ ] `docs/changelog/` contains changelog files
- [ ] `.claude/CLAUDE.md` references updated
- [ ] No broken links in markdown files
- [ ] `npm run docs` generates to `docs/api/generated/`
- [ ] Root README.md has documentation section

---

## Gap Identification

- **Risk 1:** Broken links after move → **Mitigation:** Grep for old paths
- **Risk 2:** CLAUDE.md loses context → **Mitigation:** Keep as authoritative AI index
- **Risk 3:** Developers can't find docs → **Mitigation:** Update root README
- **Risk 4:** API docs in wrong location → **Mitigation:** Update .compodocrc.json

---

## Rollback Procedure

If this phase fails:

```bash
# Restore moved files
git checkout HEAD -- .claude/STORAGE-ARCHITECTURE.md
git checkout HEAD -- .claude/PERFORMANCE.md
git checkout HEAD -- changelog/

# Remove new docs structure
rm -rf docs/architecture
rm -rf docs/guides
rm -rf docs/changelog
rm docs/README.md

# Restore configurations
git checkout HEAD -- .compodocrc.json
git checkout HEAD -- .claude/CLAUDE.md
git checkout HEAD -- README.md

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D chore/doc-reorganization
```

---

## Exit Criteria

- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] **MIGRATION COMPLETE** - Ready to merge to develop

---

## Notes

- This is the final phase of the Nx migration
- After this phase, merge migration branch to develop
- Archive .claude/plans/ after successful migration
- Consider adding CONTRIBUTING.md in future iteration
