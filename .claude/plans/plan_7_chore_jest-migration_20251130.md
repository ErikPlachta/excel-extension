# Phase 7: Jest Migration

> ⚠️ **PLAN MODE REQUIRED**
> Before executing this plan:
> 1. Enter plan mode: Review this plan thoroughly
> 2. Verify integrity: Check all file paths exist, dependencies are correct
> 3. Confirm pre-conditions: Ensure Phase 6 completed
> 4. Exit plan mode only when ready to execute

## Metadata
- **Branch:** `refactor/jest-migration`
- **Depends On:** Phase 6 (App Migration)
- **Estimated Effort:** 1.5 days (12 hours)
- **Created:** 2025-11-30
- **Status:** 🔴 Not Started

---

## Objective
Replace Karma/Jasmine test runner with Jest. Jest is the Nx default and provides faster test execution, better developer experience, and better monorepo support with caching.

---

## Pre-Conditions
- [ ] Phase 6 completed: App migrated to apps/excel-addin and PR merged
- [ ] On migration branch: `git checkout refactor/nx-monorepo-migration && git pull`
- [ ] All tests passing with current Karma setup: `npm run test:ci`
- [ ] Working directory clean: `git status`

---

## Success Criteria
- [ ] Jest installed and configured for workspace
- [ ] jest.preset.js created for shared configuration
- [ ] Each library has jest.config.ts
- [ ] App has jest.config.ts
- [ ] All existing tests pass with Jest
- [ ] `nx run-many --target=test --all` passes
- [ ] Karma/Jasmine dependencies removed
- [ ] Test coverage reporting works

---

## Detailed Steps

### Step 1: Create Branch for Phase 7
**Action:** Create dedicated branch for Jest migration
**Commands:**
```bash
cd /Users/erikplachta/repo/excel-extension
git checkout refactor/nx-monorepo-migration
git pull origin refactor/nx-monorepo-migration
git checkout -b refactor/jest-migration
```
**Validation:**
```bash
git branch --show-current
# Should return: refactor/jest-migration
```

---

### Step 2: Install Jest Dependencies
**Action:** Add Jest and related packages
**Commands:**
```bash
npm install -D jest @types/jest ts-jest jest-preset-angular @nx/jest jest-environment-jsdom
```
**Files Affected:**
- `package.json` - devDependencies updated
- `package-lock.json` - lockfile updated

**Validation:**
```bash
npm list jest @types/jest ts-jest jest-preset-angular
```

---

### Step 3: Create Jest Preset Configuration
**Action:** Create shared Jest preset for the workspace
**Commands:**
```bash
cat > jest.preset.js << 'EOF'
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/test-setup.ts',
  ],
};
EOF
```
**Validation:**
```bash
cat jest.preset.js
```

---

### Step 4: Create App Jest Configuration
**Action:** Create Jest config for the main app
**Commands:**
```bash
cat > apps/excel-addin/jest.config.ts << 'EOF'
export default {
  displayName: 'excel-addin',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/excel-addin',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
EOF
```

---

### Step 5: Create App Test Setup File
**Action:** Create test-setup.ts for Angular testing
**Commands:**
```bash
cat > apps/excel-addin/src/test-setup.ts << 'EOF'
import 'jest-preset-angular/setup-jest';

// Mock Office.js for testing
(global as any).Office = {
  context: {
    document: {},
    host: 'Excel',
    platform: 'PC',
  },
  onReady: (callback: () => void) => {
    callback();
    return Promise.resolve();
  },
};

(global as any).Excel = {
  run: async (callback: (context: any) => Promise<any>) => {
    const mockContext = {
      workbook: {
        worksheets: {
          getActiveWorksheet: () => ({
            load: () => {},
            name: 'Sheet1',
          }),
        },
      },
      sync: async () => {},
    };
    return callback(mockContext);
  },
};

// Suppress console during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
EOF
```

---

### Step 6: Create Library Jest Configurations
**Action:** Create jest.config.ts for each library
**Commands:**
```bash
# libs/shared/types
cat > libs/shared/types/jest.config.ts << 'EOF'
export default {
  displayName: 'shared-types',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/types',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/shared/ui
cat > libs/shared/ui/jest.config.ts << 'EOF'
export default {
  displayName: 'shared-ui',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/ui',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/shared/util
cat > libs/shared/util/jest.config.ts << 'EOF'
export default {
  displayName: 'shared-util',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/util',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/core/auth
cat > libs/core/auth/jest.config.ts << 'EOF'
export default {
  displayName: 'core-auth',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/core/auth',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/core/telemetry
cat > libs/core/telemetry/jest.config.ts << 'EOF'
export default {
  displayName: 'core-telemetry',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/core/telemetry',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/core/settings
cat > libs/core/settings/jest.config.ts << 'EOF'
export default {
  displayName: 'core-settings',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/core/settings',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/office/excel
cat > libs/office/excel/jest.config.ts << 'EOF'
export default {
  displayName: 'office-excel',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/office/excel',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/office/common
cat > libs/office/common/jest.config.ts << 'EOF'
export default {
  displayName: 'office-common',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/office/common',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/data/storage
cat > libs/data/storage/jest.config.ts << 'EOF'
export default {
  displayName: 'data-storage',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/data/storage',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/data/api
cat > libs/data/api/jest.config.ts << 'EOF'
export default {
  displayName: 'data-api',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/data/api',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF

# libs/data/query
cat > libs/data/query/jest.config.ts << 'EOF'
export default {
  displayName: 'data-query',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/data/query',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
EOF
```
**Validation:**
```bash
find . -name "jest.config.ts" | wc -l
# Should return: 12 (1 app + 11 libs)
```

---

### Step 7: Create Library Test Setup Files
**Action:** Create test-setup.ts for each library
**Commands:**
```bash
# Create test-setup.ts for each library that needs Angular testing
for lib in libs/shared/types libs/shared/ui libs/shared/util libs/core/auth libs/core/telemetry libs/core/settings libs/office/excel libs/office/common libs/data/storage libs/data/api libs/data/query; do
  cat > $lib/src/test-setup.ts << 'EOF'
import 'jest-preset-angular/setup-jest';
EOF
done
```
**Validation:**
```bash
find libs -name "test-setup.ts" | wc -l
# Should return: 11
```

---

### Step 8: Update Library project.json Files with Test Targets
**Action:** Add Jest test targets to each library
**Commands:**
```bash
# This requires updating each project.json to add test target
# Example for libs/core/auth/project.json:

# Add to project.json targets:
# "test": {
#   "executor": "@nx/jest:jest",
#   "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
#   "options": {
#     "jestConfig": "libs/core/auth/jest.config.ts"
#   }
# }
```

**Manual Edit Required for each library project.json:**
Add the test target to each library's project.json file.

---

### Step 9: Update Test Files for Jest Syntax
**Action:** Update any Jasmine-specific syntax to Jest
**Common Changes:**

| Jasmine | Jest |
|---------|------|
| `jasmine.createSpy()` | `jest.fn()` |
| `jasmine.createSpyObj()` | Create object with `jest.fn()` properties |
| `spyOn(obj, 'method').and.returnValue()` | `jest.spyOn(obj, 'method').mockReturnValue()` |
| `spyOn(obj, 'method').and.callThrough()` | `jest.spyOn(obj, 'method')` |
| `expect(spy).toHaveBeenCalledWith(jasmine.any(Object))` | `expect(spy).toHaveBeenCalledWith(expect.any(Object))` |
| `expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({...}))` | `expect(spy).toHaveBeenCalledWith(expect.objectContaining({...}))` |

**Commands:**
```bash
# Find all spec files
find apps libs -name "*.spec.ts" -type f

# Search for Jasmine-specific patterns
grep -r "jasmine\." apps/ libs/ --include="*.spec.ts"
grep -r "\.and\.returnValue" apps/ libs/ --include="*.spec.ts"
grep -r "\.and\.callThrough" apps/ libs/ --include="*.spec.ts"
```

---

### Step 10: Remove Karma Configuration
**Action:** Remove Karma/Jasmine config files
**Commands:**
```bash
# Remove Karma configuration files
rm -f karma.conf.js
rm -f src/test.ts

# Remove from package.json scripts if any karma-specific scripts exist
```

---

### Step 11: Remove Karma Dependencies
**Action:** Uninstall Karma and Jasmine packages
**Commands:**
```bash
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter @types/jasmine jasmine-core
```
**Validation:**
```bash
npm list karma
# Should show "empty" or error
```

---

### Step 12: Update Package.json Scripts
**Action:** Update test scripts to use Jest/Nx
**Commands:**
```bash
npm pkg set scripts.test="nx test excel-addin"
npm pkg set scripts.test:ci="nx run-many --target=test --all --ci"
npm pkg set scripts.test:coverage="nx run-many --target=test --all --coverage"
npm pkg set scripts.test:watch="nx test excel-addin --watch"
```

---

### Step 13: Run All Tests with Jest
**Action:** Verify all tests pass with the new test runner
**Commands:**
```bash
# Run all tests
npx nx run-many --target=test --all

# Run with coverage
npx nx run-many --target=test --all --coverage

# Run specific project
npx nx test excel-addin
npx nx test core-auth
```
**Expected Output:**
- All tests pass
- Coverage report generated in `coverage/` directory

---

### Step 14: Verify Test Performance
**Action:** Compare test execution time
**Commands:**
```bash
# Time the test run
time npx nx run-many --target=test --all

# Run affected tests only (should be faster)
npx nx affected --target=test
```
**Expected:** Jest should be faster than Karma, especially with caching.

---

### Step 15: Update CI Configuration (Preview)
**Action:** Note changes needed for CI (will be done in Phase 8)
**Note:** The CI workflow will be updated in Phase 8 to use:
```yaml
- run: npx nx run-many --target=test --all --ci
```

---

### Step 16: Commit Phase 7 Changes
**Action:** Commit all Jest migration changes
**Commands:**
```bash
git add .
git status

git commit -m "$(cat <<'EOF'
chore: migrate from Karma/Jasmine to Jest

Replace Karma/Jasmine test runner with Jest:

## Added
- jest.preset.js - Shared Jest configuration
- jest.config.ts for app and all 11 libraries
- test-setup.ts for each project
- Office.js mock in test setup

## Updated
- package.json scripts for Jest
- Spec files with Jest syntax (if any)

## Removed
- karma.conf.js
- Karma/Jasmine dependencies

## Testing
- `nx test excel-addin` - Test app
- `nx run-many --target=test --all` - Test all projects
- `nx run-many --target=test --all --coverage` - With coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Step 17: Create PR for Phase 7
**Action:** Push branch and create pull request
**Commands:**
```bash
git push -u origin refactor/jest-migration

gh pr create --title "[Phase 7] Migrate to Jest test runner" --body "$(cat <<'EOF'
## Summary
Replace Karma/Jasmine with Jest for faster, more modern testing.

## Changes
- Add Jest dependencies and configuration
- Create jest.preset.js for shared settings
- Create jest.config.ts for app and all 11 libraries
- Create test-setup.ts with Office.js mocks
- Update test syntax for Jest compatibility
- Remove Karma/Jasmine configuration and dependencies
- Update package.json test scripts

## Benefits
- Faster test execution with caching
- Better developer experience with watch mode
- Native monorepo support via Nx
- Simplified configuration
- Better snapshot testing support

## Test Commands
```bash
nx test excel-addin          # Test app
nx test core-auth            # Test specific library
nx run-many --target=test --all  # Test everything
nx affected --target=test    # Test affected only
```

## Testing
- [x] All existing tests pass
- [x] Coverage reporting works
- [x] Watch mode works
- [x] Nx caching works

## Next Steps
Phase 8: CI/CD update for Nx commands

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Integrity Checks
Run ALL before marking complete:
- [ ] `nx test excel-addin` passes
- [ ] `nx run-many --target=test --all` passes
- [ ] Test count matches previous Karma test count
- [ ] Coverage report generates in `coverage/`
- [ ] No Karma dependencies remain
- [ ] All jest.config.ts files exist (12 total)
- [ ] All test-setup.ts files exist
- [ ] Watch mode works: `nx test excel-addin --watch`

---

## Gap Identification
- **Risk 1:** Jasmine syntax incompatible with Jest → **Mitigation:** Update spy/mock syntax
- **Risk 2:** Angular testing setup different → **Mitigation:** Use jest-preset-angular
- **Risk 3:** Some tests may be flaky → **Mitigation:** Review and fix timing issues
- **Risk 4:** Office.js mocks may differ → **Mitigation:** Create comprehensive mock in test-setup

---

## Rollback Procedure
If this phase fails:
```bash
# Restore Karma config
git checkout HEAD -- karma.conf.js
git checkout HEAD -- src/test.ts

# Restore package.json
git checkout HEAD -- package.json
git checkout HEAD -- package-lock.json

# Reinstall dependencies
npm ci

# Remove Jest configs
find . -name "jest.config.ts" -delete
find . -name "test-setup.ts" -delete
rm jest.preset.js

# Discard changes
git checkout -- .
git clean -fd
git checkout refactor/nx-monorepo-migration
git branch -D refactor/jest-migration
```

---

## Exit Criteria
- [ ] All success criteria met
- [ ] All integrity checks pass
- [ ] PR created and CI passes
- [ ] PR approved and merged to migration branch
- [ ] Ready to proceed to Phase 8

---

## Notes
- Jest is faster than Karma for monorepo testing
- Nx caches test results for unchanged code
- Office.js mocks are critical for tests to pass
- Some async test patterns may need adjustment
