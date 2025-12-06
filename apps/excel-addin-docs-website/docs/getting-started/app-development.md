---
sidebar_position: 2
title: App Development Tutorial
---

# App Development Tutorial

Build your first feature in the Excel add-in using existing libraries.

## Prerequisites

- Completed [Quick Start](quick-start) setup
- Development server running (`npm start`)
- Excel with add-in sideloaded

## Tutorial: Add a New View

We'll add a "Reports" view that displays query run history.

### Step 1: Create the Component

Create `apps/excel-addin/src/app/features/reports/reports.component.ts`:

```typescript
import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "../../core/excel.service";
import { QueryStateService } from "../../shared/query-state.service";
import { SectionComponent } from "@excel-platform/shared/ui";

@Component({
  selector: "app-reports",
  standalone: true,
  imports: [CommonModule, SectionComponent],
  template: `
    <app-section title="Query Run History">
      @if (!excel.isExcel) {
        <p class="warning">Excel not detected. History unavailable.</p>
      } @else if (runs.length === 0) {
        <p>No query runs yet.</p>
      } @else {
        <ul>
          @for (run of runs; track run.queryId) {
            <li>{{ run.queryId }} - {{ run.rowCount }} rows</li>
          }
        </ul>
      }
    </app-section>
  `,
})
export class ReportsComponent {
  excel = inject(ExcelService);
  private queryState = inject(QueryStateService);

  runs = this.queryState.getAllLastRuns();
}
```

### Step 2: Add Navigation Item

Edit `libs/data/api/src/lib/app-config.default.ts`:

```typescript
{
  id: 'reports',
  labelKey: 'nav.reports',
  viewId: 'reports',
  actionType: 'select-view',
  requiresAuth: true,
  requiredRoles: ['analyst', 'admin'],
  buttonConfig: { variant: 'default', size: 'medium' }
}
```

### Step 3: Add Text Label

Edit `libs/data/api/src/lib/app-text.ts`:

```typescript
nav: {
  // existing items...
  reports: "Reports"
}
```

### Step 4: Wire to Shell

Edit `apps/excel-addin/src/app/core/app.component.ts`, add the view case:

```typescript
@switch (currentView) {
  // existing cases...
  @case ('reports') {
    <app-reports />
  }
}
```

Import the component:

```typescript
import { ReportsComponent } from '../features/reports/reports.component';
```

### Step 5: Test

1. Save all files
2. Dev server hot-reloads
3. Open Excel add-in
4. New "Reports" nav item appears
5. Click to view history

## Key Patterns

### Excel Host Guard

Always check `ExcelService.isExcel` before Excel operations:

```typescript
if (!this.excel.isExcel) {
  console.warn('Not in Excel context');
  return;
}
// Safe to call Excel APIs
```

### Result Handling

Use typed results instead of try/catch:

```typescript
const result = await this.excel.upsertQueryTable(apiId, target, rows);
if (result.ok) {
  // Success: result.value is QueryRunLocation
  console.log('Written to:', result.value.sheetName);
} else {
  // Error: result.error has message and code
  console.error('Failed:', result.error.message);
}
```

### State Management

Use services for state, not component properties:

```typescript
// Good: Service manages state
this.queryState.setGlobalParams({ StartDate: '2025-01-01' });
const params = this.queryState.getEffectiveParams(queryId, 'global');

// Bad: Local state doesn't persist
this.localParams = { StartDate: '2025-01-01' };
```

## Next Steps

- [Common Patterns](../guides/app/patterns) – Code patterns and recipes
- [Query System](../guides/app/queries) – Query execution details
- [Excel Integration](../guides/app/excel-integration) – Office.js patterns
- [Testing](../guides/app/testing) – Writing and running tests
