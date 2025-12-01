/**
 * Severity level for application telemetry events.
 */
export type TelemetrySeverity = "debug" | "info" | "warn" | "error";

/**
 * High-level category for telemetry events.
 */
export type TelemetryCategory = "excel" | "auth" | "query" | "ui" | "settings" | "system" | "formula";

/**
 * Base shape for all telemetry events emitted by the app.
 *
 * Specific domains (Excel, auth, queries, etc.) can extend this
 * interface with additional strongly-typed fields.
 */
export interface AppTelemetryEvent {
  /** Indicates which area of the app produced this event. */
  category: TelemetryCategory;
  /** Short, stable event name (e.g., "query.run.completed"). */
  name: string;
  /**
   * Severity level for the event. This is used to decide how and
   * where to route the event (console only vs workbook logging,
   * future remote sinks, etc.).
   */
  severity: TelemetrySeverity;
  /** Optional human-readable message. */
  message?: string;
  /** Optional structured context payload for the event. */
  context?: Record<string, unknown>;
  /** Optional correlation id that ties related events together. */
  correlationId?: string;
  /** Optional session identifier for the current Angular/app session. */
  sessionId?: string;
  /**
   * Optional tags for additional classification or filtering
   * (for example, ["cold-start", "admin"]).
   */
  tags?: readonly string[];
}

/**
 * Narrower event shape for long-running or multi-step workflows.
 */
export interface WorkflowTelemetryEvent extends AppTelemetryEvent {
  category: "system" | "query" | "auth";
}

/**
 * Narrower event shape for feature-level interactions (UI, settings, etc.).
 */
export interface FeatureTelemetryEvent extends AppTelemetryEvent {
  category: "ui" | "settings" | "query";
}
