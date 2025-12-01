export * from "./app.component";
export * from "./app.config";
export * from "./app-config.service";
export * from "./config-validator.service";
// Note: app.routes intentionally not exported from barrel to avoid circular dependency
// Import directly from ./app.routes when needed

// Re-export from migrated libraries for backward compatibility
export * from "@excel-platform/core/auth";
export * from "@excel-platform/core/settings";
export * from "@excel-platform/core/telemetry";
export * from "@excel-platform/core/excel";
