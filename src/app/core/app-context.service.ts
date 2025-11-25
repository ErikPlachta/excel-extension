import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";

/**
 * Host environment status information.
 * Captured once at service initialization.
 */
export interface AppHostStatus {
  /** Whether running in Excel (Office.js available) */
  readonly isExcel: boolean;
  /** Whether browser reports online status */
  readonly isOnline: boolean;
}

/**
 * Authentication summary for telemetry and context enrichment.
 * Derived from AuthService state.
 */
export interface AppAuthSummary {
  /** Whether user is currently authenticated */
  readonly isAuthenticated: boolean;
  /** User display name, or null if not authenticated */
  readonly displayName: string | null;
  /** User roles (e.g., 'admin', 'analyst') */
  readonly roles: readonly string[];
}

/**
 * App Context Service - Aggregates runtime context for telemetry and diagnostics.
 *
 * Provides read-only context information about:
 * - Host environment (Excel vs browser, online status)
 * - Authentication summary (derived from AuthService)
 *
 * **Purpose:**
 * Centralizes context data that's frequently needed for telemetry enrichment,
 * avoiding direct dependencies on multiple services. TelemetryService injects
 * this service to enrich all telemetry events with host and auth context.
 *
 * **Host Detection:**
 * Host status is captured once at service initialization and remains constant
 * for the app lifetime. This is safe because the app doesn't dynamically switch
 * between Excel and browser contexts.
 *
 * **Usage:**
 * ```typescript
 * // Read host status
 * if (appContext.hostStatus.isExcel) {
 *   // Excel-specific logic
 * }
 *
 * // Get auth summary for telemetry
 * const summary = appContext.getAuthSummary();
 * console.log('User:', summary.displayName, 'Roles:', summary.roles);
 * ```
 */
@Injectable({ providedIn: "root" })
export class AppContextService {
  /**
   * Host environment status (captured at initialization).
   * Remains constant for app lifetime.
   */
  readonly hostStatus: AppHostStatus;

  constructor(
    private readonly auth: AuthService
  ) {
    this.hostStatus = {
      isExcel: typeof window !== "undefined" && !!(window as unknown as { Office?: unknown }).Office,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    };
  }

  /**
   * Get current authentication summary.
   * Derived from AuthService state (reflects real-time auth changes).
   *
   * @returns Current auth summary for telemetry/context enrichment
   */
  getAuthSummary(): AppAuthSummary {
    const user = this.auth.user;
    return {
      isAuthenticated: this.auth.isAuthenticated,
      displayName: user ? user.displayName : null,
      roles: this.auth.roles,
    };
  }
}
