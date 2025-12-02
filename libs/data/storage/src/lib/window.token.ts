import { InjectionToken } from '@angular/core';

/**
 * Injection token for the Window object.
 *
 * Provides testable access to window APIs by allowing dependency injection
 * instead of direct global access. This enables proper mocking in tests,
 * particularly for read-only properties like window.location.reload().
 *
 * @example
 * ```typescript
 * constructor(@Inject(WINDOW) private window: Window) {}
 *
 * someMethod() {
 *   this.window.location.reload();
 * }
 * ```
 */
export const WINDOW = new InjectionToken<Window>('Window', {
  providedIn: 'root',
  factory: () => window,
});
