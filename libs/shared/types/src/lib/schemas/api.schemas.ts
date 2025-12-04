/**
 * Zod schemas for API response validation.
 *
 * These schemas validate responses from the backend API,
 * ensuring type safety at the trust boundary.
 */

import { z } from 'zod';

/**
 * Schema for a single row from API response.
 */
export const ExecuteApiResultRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

/**
 * Schema for execution metrics from API.
 */
export const ExecutionMetricsSchema = z.object({
  row_count: z.number(),
  duration_ms: z.number(),
});

/**
 * Schema for execution metadata from API.
 */
export const ExecutionMetaSchema = z.object({
  execution_id: z.string(),
  operation: z.string(),
  timestamp_utc: z.string(),
  integrity_hash: z.string(),
});

/**
 * Schema for API error response.
 */
export const ExecutionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

/**
 * Schema for wrapped execution response from backend.
 *
 * Matches the ApiEnvelope format from BACKEND-API-ENDPOINTS.md.
 */
export const ExecutionResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z
    .object({
      rows: z.array(z.record(z.unknown())),
      metrics: ExecutionMetricsSchema,
    })
    .nullable(),
  meta: ExecutionMetaSchema.nullable(),
  error: ExecutionErrorSchema.optional(),
});

/**
 * Schema for token pair from auth endpoints.
 */
export const TokenPairSchema = z.object({
  access: z.object({
    token: z.string(),
    expiresAt: z.string(),
  }),
  refresh: z.object({
    token: z.string(),
    expiresAt: z.string(),
  }),
});

/**
 * Schema for user profile from auth endpoints.
 */
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  roles: z.array(z.string()),
});

/**
 * Schema for API parameter definition.
 */
export const ApiParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string().nullable(),
});

/**
 * Schema for API definition from catalog.
 */
export const ApiDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  allowedRoles: z.array(z.string()).nullable(),
  parameters: z.array(ApiParameterSchema),
  responseSchema: z.record(z.unknown()).nullable(),
});

/**
 * Schema for catalog response from GET /api/catalog.
 */
export const CatalogResponseSchema = z.object({
  operations: z.array(ApiDefinitionSchema),
  roles: z.array(z.string()),
});

// Type exports derived from schemas
export type ExecuteApiResultRowParsed = z.infer<typeof ExecuteApiResultRowSchema>;
export type ExecutionResponseParsed = z.infer<typeof ExecutionResponseSchema>;
export type TokenPairParsed = z.infer<typeof TokenPairSchema>;
export type UserProfileParsed = z.infer<typeof UserProfileSchema>;
export type CatalogResponseParsed = z.infer<typeof CatalogResponseSchema>;
