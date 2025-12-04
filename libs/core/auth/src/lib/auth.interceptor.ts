import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * HTTP interceptor that adds Authorization header and handles auth errors.
 *
 * **Features:**
 * - Adds `Authorization: Bearer <token>` header to all requests
 * - Handles 401 Unauthorized: signs out and redirects to /sso
 * - Handles 403 Forbidden: redirects to /sso with error param (no sign-out)
 *
 * **Usage:**
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([authInterceptor]))
 *   ]
 * };
 * ```
 *
 * **401 vs 403 Behavior:**
 * - 401: Token invalid/expired → sign out + redirect (clear session)
 * - 403: Token valid but insufficient permissions → redirect only (keep session)
 *
 * **Note:** Skips adding auth header for /auth/* endpoints to avoid
 * circular issues during sign-in/refresh flows.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Clone request with auth header if authenticated
  let authReq = req;

  // Skip auth header for auth endpoints to avoid circular issues
  const isAuthEndpoint = req.url.includes('/auth/');

  if (!isAuthEndpoint) {
    const token = auth.getAccessToken();
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token invalid or expired - sign out and redirect
        auth.signOut();
        router.navigate(['/sso'], {
          queryParams: { error: 'session_expired' },
        });
      } else if (error.status === 403) {
        // Forbidden - user authenticated but lacks permissions
        // Don't sign out, just redirect with error
        router.navigate(['/sso'], {
          queryParams: { error: 'forbidden' },
        });
      }

      return throwError(() => error);
    })
  );
};
