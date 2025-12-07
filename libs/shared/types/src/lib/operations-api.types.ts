/**
 * Operations API types aligned with backend specification.
 *
 * @remarks
 * These types define the contract for POST /operations/\{operation_name\} endpoints.
 * Source of truth: docs/architecture/BACKEND-API-SPEC.md
 *
 * The response format wraps data with status, metrics, and metadata for:
 * - Consistent error handling across all operations
 * - Metrics for monitoring and optimization
 * - Integrity verification via hash
 */

/**
 * Execution metrics returned with each operation response.
 */
export interface ExecutionMetrics {
  /** Number of rows in the result set */
  row_count: number;
  /** Execution duration in milliseconds */
  duration_ms: number;
}

/**
 * Metadata for tracking and verifying operation execution.
 */
export interface ExecutionMeta {
  /** Unique identifier for this execution (UUID) */
  execution_id: string;
  /** Name of the operation that was executed */
  operation: string;
  /** UTC timestamp when execution completed */
  timestamp_utc: string;
  /** SHA-256 hash of response data for integrity verification */
  integrity_hash: string;
}

/**
 * Wrapped response format from POST /operations/\{name\} endpoints.
 *
 * @remarks
 * All operation responses are wrapped in this format to provide:
 * - Consistent status indication (success/error)
 * - Row data with metrics
 * - Execution metadata for tracking
 *
 * @example
 * ```typescript
 * const response: ExecutionResponse = {
 *   status: 'success',
 *   data: {
 *     rows: [{ id: 1, name: 'Product A' }],
 *     metrics: { row_count: 1, duration_ms: 42 }
 *   },
 *   meta: {
 *     execution_id: '550e8400-e29b-41d4-a716-446655440000',
 *     operation: 'get-products',
 *     timestamp_utc: '2025-12-03T15:30:00Z',
 *     integrity_hash: 'sha256:abc123...'
 *   }
 * };
 * ```
 */
export interface ExecutionResponse<T = Record<string, unknown>> {
  /** Execution status */
  status: 'success' | 'error';
  /** Response data (present on success) */
  data: {
    /** Array of result rows */
    rows: T[];
    /** Execution metrics */
    metrics: ExecutionMetrics;
  };
  /** Execution metadata */
  meta: ExecutionMeta;
  /** Error details (present on error) */
  error?: {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: Record<string, unknown>;
  };
}

/**
 * Request payload for POST /operations/\{name\} endpoints.
 */
export interface ExecutionRequest {
  /** Operation parameters */
  payload: Record<string, unknown>;
}

/**
 * Operations API service interface.
 *
 * @remarks
 * This interface is implemented by both:
 * - `OperationsApiService` - Real backend HTTP calls
 * - `OperationsApiMockService` - Mock simulation for demo mode
 *
 * Use dependency injection with `OPERATIONS_API_TOKEN` to switch implementations.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * providers: [
 *   {
 *     provide: OPERATIONS_API_TOKEN,
 *     useClass: environment.useRealBackend ? OperationsApiService : OperationsApiMockService
 *   }
 * ]
 * ```
 */
export interface IOperationsApiService {
  /**
   * Execute an operation with given payload.
   *
   * @param operationName - Name of the operation to execute
   * @param payload - Operation parameters
   * @returns Wrapped response with rows, metrics, and metadata
   */
  execute<T = Record<string, unknown>>(
    operationName: string,
    payload: Record<string, unknown>
  ): Promise<ExecutionResponse<T>>;

  /**
   * Execute an operation and unwrap the response to just rows.
   * Convenience method that extracts rows from the wrapped response.
   *
   * @param operationName - Name of the operation to execute
   * @param payload - Operation parameters
   * @returns Array of result rows
   * @throws Error if operation returns error status
   */
  executeAndUnwrap<T = Record<string, unknown>>(
    operationName: string,
    payload: Record<string, unknown>
  ): Promise<T[]>;
}

