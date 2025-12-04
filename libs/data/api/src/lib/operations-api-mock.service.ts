import { Injectable, inject } from '@angular/core';
import type {
  IOperationsApiService,
  ExecutionResponse,
  ExecutionMetrics,
  ExecutionMeta,
} from '@excel-platform/shared/types';
import { QueryApiMockService, ExecuteQueryResultRow, ApiAuthError } from './query-api-mock.service';

/**
 * Operations API Mock Service - Simulates backend for demo mode.
 *
 * Implements `IOperationsApiService` by delegating to `QueryApiMockService`
 * and wrapping responses in the backend-aligned format.
 *
 * **Features:**
 * - Wraps QueryApiMockService execution in standard response format
 * - Generates mock execution IDs, timestamps, and integrity hashes
 * - Measures execution time for metrics
 * - Simulates network delay for realistic behavior
 *
 * **Response format matches backend:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "rows": [...],
 *     "metrics": { "row_count": 100, "duration_ms": 42 }
 *   },
 *   "meta": {
 *     "execution_id": "...",
 *     "operation": "...",
 *     "timestamp_utc": "...",
 *     "integrity_hash": "..."
 *   }
 * }
 * ```
 *
 * **Usage:**
 * Configure via DI provider in app.config.ts:
 * ```typescript
 * import { OPERATIONS_API_TOKEN } from '@excel-platform/data/api';
 *
 * providers: [
 *   {
 *     provide: OPERATIONS_API_TOKEN,
 *     useClass: environment.useRealBackend ? OperationsApiService : OperationsApiMockService
 *   }
 * ]
 * ```
 *
 * @see OperationsApiService for production mode with real backend
 */
@Injectable()
export class OperationsApiMockService implements IOperationsApiService {
  private readonly queryApiMock = inject(QueryApiMockService);

  /**
   * Execute an operation with given payload.
   * Delegates to QueryApiMockService and wraps result in backend format.
   *
   * @param operationName - Name of the operation (maps to apiId in QueryApiMockService)
   * @param payload - Operation parameters
   * @returns Wrapped response with rows, metrics, and metadata
   */
  async execute<T = Record<string, unknown>>(
    operationName: string,
    payload: Record<string, unknown>
  ): Promise<ExecutionResponse<T>> {
    const startTime = Date.now();

    try {
      // Delegate to existing QueryApiMockService
      const rows = await this.queryApiMock.executeApi(
        operationName,
        payload as Record<string, string | number | boolean | Date | null | undefined>
      );

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Build metrics
      const metrics: ExecutionMetrics = {
        row_count: rows.length,
        duration_ms: durationMs,
      };

      // Build metadata
      const meta: ExecutionMeta = {
        execution_id: this.generateExecutionId(),
        operation: operationName,
        timestamp_utc: new Date().toISOString(),
        integrity_hash: this.generateIntegrityHash(rows),
      };

      return {
        status: 'success',
        data: {
          rows: rows as T[],
          metrics,
        },
        meta,
      };
    } catch (error) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Handle auth errors specifically (401)
      if (error instanceof ApiAuthError) {
        return {
          status: 'error',
          data: {
            rows: [],
            metrics: { row_count: 0, duration_ms: durationMs },
          },
          meta: {
            execution_id: this.generateExecutionId(),
            operation: operationName,
            timestamp_utc: new Date().toISOString(),
            integrity_hash: '',
          },
          error: {
            code: 'UNAUTHORIZED',
            message: error.message,
            details: { reason: error.reason, status: error.status },
          },
        };
      }

      // Build generic error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'error',
        data: {
          rows: [],
          metrics: { row_count: 0, duration_ms: durationMs },
        },
        meta: {
          execution_id: this.generateExecutionId(),
          operation: operationName,
          timestamp_utc: new Date().toISOString(),
          integrity_hash: '',
        },
        error: {
          code: 'OPERATION_FAILED',
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Execute an operation and unwrap the response to just rows.
   *
   * @param operationName - Name of the operation to execute
   * @param payload - Operation parameters
   * @returns Array of result rows
   * @throws Error if operation returns error status
   */
  async executeAndUnwrap<T = Record<string, unknown>>(
    operationName: string,
    payload: Record<string, unknown>
  ): Promise<T[]> {
    const response = await this.execute<T>(operationName, payload);

    if (response.status === 'error') {
      const errorMessage = response.error?.message ?? 'Operation failed';
      throw new Error(`Operation '${operationName}' failed: ${errorMessage}`);
    }

    return response.data.rows;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Mock-specific helpers
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Generate a mock execution ID (UUID v4 format).
   */
  private generateExecutionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a mock integrity hash.
   * In production, this would be a SHA-256 of the response data.
   * For mock purposes, we generate a pseudo-hash from row count and timestamp.
   */
  private generateIntegrityHash(rows: ExecuteQueryResultRow[]): string {
    const data = `${rows.length}-${Date.now()}`;
    // Simple hash simulation (not cryptographically secure, just for demo)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(8, '0')}mock`;
  }
}
