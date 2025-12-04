import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  IOperationsApiService,
  ExecutionResponse,
  ExecutionRequest,
} from '@excel-platform/shared/types';

/**
 * Operations API Service - Real backend HTTP implementation.
 *
 * Implements `IOperationsApiService` with actual HTTP calls to the backend.
 * Use this service in production mode with a real operations server.
 *
 * **Endpoints (per BACKEND-API-SPEC.md):**
 * - POST /operations/{operation_name} - Execute named operation
 *
 * **Response format:**
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
 * @see OperationsApiMockService for demo/testing mode
 */
@Injectable()
export class OperationsApiService implements IOperationsApiService {
  private readonly http = inject(HttpClient);

  /**
   * Execute an operation with given payload.
   *
   * @param operationName - Name of the operation (e.g., 'sales-summary')
   * @param payload - Operation parameters
   * @returns Wrapped response with rows, metrics, and metadata
   */
  async execute<T = Record<string, unknown>>(
    operationName: string,
    payload: Record<string, unknown>
  ): Promise<ExecutionResponse<T>> {
    const request: ExecutionRequest = { payload };
    return firstValueFrom(
      this.http.post<ExecutionResponse<T>>(`/operations/${operationName}`, request)
    );
  }

  /**
   * Execute an operation and unwrap the response to just rows.
   * Convenience method that extracts rows from the wrapped response.
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
}
