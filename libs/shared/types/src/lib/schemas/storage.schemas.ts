/**
 * Zod schemas for storage/persistence validation.
 *
 * These schemas validate data read from localStorage and IndexedDB,
 * ensuring corrupted or malformed data doesn't crash the app.
 */

import { z } from 'zod';

/**
 * Schema for log columns configuration.
 */
export const LogColumnsSchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  operation: z.string(),
  message: z.string(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
});

/**
 * Schema for telemetry settings.
 * Matches TelemetrySettings interface from settings.types.ts.
 */
export const TelemetrySettingsSchema = z.object({
  enableWorkbookLogging: z.boolean(),
  enableConsoleLogging: z.boolean(),
  sessionStrategy: z.enum(['per-load', 'per-workbook', 'custom']).optional(),
  logWorksheetName: z.string().optional(),
  logTableName: z.string().optional(),
  logColumns: LogColumnsSchema.optional(),
});

/**
 * Schema for query execution settings.
 * Matches QueryExecutionSettings interface from settings.types.ts.
 */
export const QueryExecutionSettingsSchema = z.object({
  maxRowsPerQuery: z.number().min(1),
  chunkSize: z.number().min(1),
  enableProgressiveLoading: z.boolean(),
  apiPageSize: z.number().min(1),
  chunkBackoffMs: z.number().min(0),
  disableFormulasDuringRun: z.boolean(),
  excelRunTimeoutMs: z.number().min(1000),
  maxExecutionTimeMs: z.number().min(1000),
  fetchTimeoutMs: z.number().min(1000),
  maxConcurrentRequests: z.number().min(1).max(20),
  cleanupOnPartialFailure: z.boolean(),
});

/**
 * Schema for application settings.
 * Matches AppSettings interface from settings.types.ts.
 */
export const AppSettingsSchema = z.object({
  telemetry: TelemetrySettingsSchema,
  queryExecution: QueryExecutionSettingsSchema.optional(),
});

/**
 * Schema for query parameter values.
 */
export const QueryParameterValuesSchema = z.record(
  z.string(),
  z.string().optional()
);

/**
 * Schema for query configuration item.
 */
export const QueryConfigurationItemSchema = z.object({
  id: z.string(),
  apiId: z.string(),
  displayName: z.string(),
  parameters: QueryParameterValuesSchema,
  targetSheetName: z.string(),
  targetTableName: z.string(),
  writeMode: z.enum(['overwrite', 'append']),
  includeInBatch: z.boolean(),
});

/**
 * Schema for query configuration.
 */
export const QueryConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  items: z.array(QueryConfigurationItemSchema),
  parameterPresets: z
    .object({
      global: QueryParameterValuesSchema,
      perQuery: z.record(z.string(), QueryParameterValuesSchema),
    })
    .optional(),
  writeModeDefaults: z.enum(['overwrite', 'append']).optional(),
  workbookHints: z
    .object({
      workbookId: z.string().optional(),
      workbookName: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for app state backup (import/export).
 *
 * Uses permissive validation for backwards compatibility with older backups.
 * The settings and queryConfigs are validated as unknown to allow any shape
 * from old versions while ensuring required fields exist.
 */
export const AppStateBackupSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  authState: z.unknown().optional(),
  settings: z.unknown().optional(),
  queryConfigs: z.array(z.unknown()).optional(),
  queryState: z.unknown().optional(),
});

/**
 * Schema for IndexedDB cached query result.
 */
export const CachedQueryResultSchema = z.object({
  id: z.string(),
  queryId: z.string(),
  rows: z.array(z.record(z.string(), z.unknown())),
  timestamp: z.number(),
  expiresAt: z.number(),
});

// Type exports derived from schemas
export type AppSettingsParsed = z.infer<typeof AppSettingsSchema>;
export type QueryConfigurationParsed = z.infer<typeof QueryConfigurationSchema>;
export type AppStateBackupParsed = z.infer<typeof AppStateBackupSchema>;
export type CachedQueryResultParsed = z.infer<typeof CachedQueryResultSchema>;
