import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

/**
 * Authentication guard that requires the user to be authenticated.
 *
 * Checks both authentication status and token validity.
 * Redirects to SSO view if not authenticated or token is invalid.
 *
 * **Usage:**
 * ```typescript
 * // In app.routes.ts
 * export const routes: Routes = [
 *   {
 *     path: 'protected',
 *     component: ProtectedComponent,
 *     canActivate: [authGuard]
 *   }
 * ];
 * ```
 *
 * **Behavior:**
 * 1. Checks if user is authenticated via AuthService
 * 2. Validates current access token
 * 3. If invalid, signs out and redirects to /sso
 * 4. If valid, allows navigation
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Check authentication status
  if (!auth.isAuthenticated) {
    router.navigate(['/sso']);
    return false;
  }

  // Validate current token
  const validation = auth.validateCurrentToken();
  if (!validation.valid) {
    // Token invalid - sign out and redirect
    auth.signOut();
    router.navigate(['/sso']);
    return false;
  }

  return true;
};
