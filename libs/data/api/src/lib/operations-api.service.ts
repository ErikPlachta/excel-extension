import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  IOperationsApiService,
  ExecutionResponse,
  ExecutionRequest,
} from '@excel-platform/shared/types';
import { ExecutionResponseSchema } from '@excel-platform/shared/types';
import { ApiConfigService } from './api-config.service';

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
  private readonly apiConfig = inject(ApiConfigService);

  /**
   * Execute an operation with given payload.
   *
   * Validates the API response using Zod schema at the trust boundary
   * to ensure type safety before the data enters the application.
   *
   * @param operationName - Name of the operation (e.g., 'sales-summary')
   * @param payload - Operation parameters
   * @returns Wrapped response with rows, metrics, and metadata
   * @throws Error if response validation fails
   */
  async execute<T = Record<string, unknown>>(
    operationName: string,
    payload: Record<string, unknown>
  ): Promise<ExecutionResponse<T>> {
    const request: ExecutionRequest = { payload };
    const rawResponse = await firstValueFrom(
      this.http.post<unknown>(this.apiConfig.buildUrl(`/operations/${operationName}`), request)
    );

    // Validate response at trust boundary with Zod schema
    const result = ExecutionResponseSchema.safeParse(rawResponse);
    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Invalid API response for '${operationName}': ${issues}`);
    }

    // Cast validated response to typed version
    return result.data as ExecutionResponse<T>;
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
