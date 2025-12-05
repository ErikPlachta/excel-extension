import { InjectionToken } from '@angular/core';
import type { IOperationsApiService } from '@excel-platform/shared/types';

/**
 * Angular injection token for Operations API service.
 *
 * @remarks
 * Use this token to inject either the real or mock operations API service.
 * Configure in app.config.ts based on environment.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * import { OPERATIONS_API_TOKEN } from '@excel-platform/data/api';
 *
 * providers: [
 *   {
 *     provide: OPERATIONS_API_TOKEN,
 *     useClass: environment.useRealBackend ? OperationsApiService : OperationsApiMockService
 *   }
 * ]
 * ```
 */
export const OPERATIONS_API_TOKEN = new InjectionToken<IOperationsApiService>(
  'OPERATIONS_API_SERVICE'
);
