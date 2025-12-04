/**
 * @packageDocumentation Zod Schemas for Runtime Validation
 *
 * This module provides Zod schemas for validating data at trust boundaries:
 * - API responses (external data entering the system)
 * - localStorage/IndexedDB reads (persisted data)
 * - User input and configuration
 *
 * ## Usage
 *
 * ```typescript
 * import { AppSettingsSchema, ExecutionResponseSchema } from '@excel-platform/shared/types/schemas';
 *
 * // Validate settings from storage
 * const result = AppSettingsSchema.safeParse(storedData);
 * if (result.success) {
 *   // result.data is typed as AppSettings
 * }
 *
 * // Validate API response
 * const response = ExecutionResponseSchema.parse(httpResponse);
 * ```
 */

export * from './api.schemas';
export * from './storage.schemas';
export * from './external.schemas';
