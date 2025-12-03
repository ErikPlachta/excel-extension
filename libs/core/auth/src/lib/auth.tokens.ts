import { InjectionToken } from '@angular/core';
import type { IAuthApiService } from '@excel-platform/shared/types';

/**
 * Injection token for the auth API service.
 *
 * Use this token to inject the appropriate implementation (real or mock).
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * providers: [
 *   {
 *     provide: AUTH_API_TOKEN,
 *     useClass: environment.useRealBackend ? AuthApiService : AuthApiMockService
 *   }
 * ]
 *
 * // In a component/service
 * constructor(@Inject(AUTH_API_TOKEN) private authApi: IAuthApiService) {}
 * ```
 */
export const AUTH_API_TOKEN = new InjectionToken<IAuthApiService>('AUTH_API_SERVICE');
