import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth.service';
import type { RoleId } from '@excel-platform/shared/types';

/**
 * Role-based guard that requires specific roles for route access.
 *
 * Uses route data to specify required roles. User must have at least
 * one of the specified roles to access the route.
 *
 * **Usage:**
 * ```typescript
 * // In app.routes.ts
 * export const routes: Routes = [
 *   {
 *     path: 'admin',
 *     component: AdminComponent,
 *     canActivate: [authGuard, roleGuard],
 *     data: { roles: ['admin'] }
 *   },
 *   {
 *     path: 'queries',
 *     component: QueriesComponent,
 *     canActivate: [authGuard, roleGuard],
 *     data: { roles: ['analyst', 'admin'] }
 *   }
 * ];
 * ```
 *
 * **Note:** Always use with authGuard to ensure authentication check first.
 *
 * **Behavior:**
 * 1. Reads required roles from route.data['roles']
 * 2. If no roles specified, allows access (fail-open for flexibility)
 * 3. Checks if user has any of the required roles
 * 4. If not, redirects to /sso with error query param
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Get required roles from route data
  const requiredRoles = route.data['roles'] as RoleId[] | undefined;

  // If no roles specified, allow access (fail-open)
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // Check if user has any of the required roles
  if (!auth.hasAnyRole(requiredRoles)) {
    router.navigate(['/sso'], {
      queryParams: { error: 'forbidden' }
    });
    return false;
  }

  return true;
};
