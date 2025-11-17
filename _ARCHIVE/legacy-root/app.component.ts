/**
 * Archived legacy root AppComponent (non-core shell).
 *
 * Archived on 2025-11-17 as part of the feat/add-ui-primitives
 * cleanup, after the new core-based shell in `src/app/core/app.component.*`
 * became the single source of truth for the taskpane UI.
 *
 * This version used the pre-core layout and wiring and is kept only
 * for historical reference. It is no longer referenced by `main.ts`,
 * routes, or tests.
 */

import { Component } from "@angular/core";

// NOTE: All imports, template URLs, and styles were intentionally removed
// to keep this archival copy from participating in the active build.
// The shape below reflects the former API of the legacy root component
// without depending on current modules or assets.

@Component({
  selector: "app-root-legacy-archived",
  standalone: true,
  template: "<!-- archived legacy root component -->",
})
export class AppComponent {
  // Previously: appConfig: AppConfig = DEFAULT_APP_CONFIG;
  // and currentView: ViewId = this.appConfig.defaultViewId;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // The original implementation managed view selection and layout hints.
}
