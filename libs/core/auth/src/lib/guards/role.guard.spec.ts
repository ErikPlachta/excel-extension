import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../auth.service';

describe('roleGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasAnyRole']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockState = {} as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
  });

  it('should allow access when user has required role', () => {
    const mockRoute = {
      data: { roles: ['admin'] }
    } as unknown as ActivatedRouteSnapshot;

    authServiceSpy.hasAnyRole.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(authServiceSpy.hasAnyRole).toHaveBeenCalledWith(['admin']);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should allow access when user has any of multiple roles', () => {
    const mockRoute = {
      data: { roles: ['analyst', 'admin'] }
    } as unknown as ActivatedRouteSnapshot;

    authServiceSpy.hasAnyRole.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(authServiceSpy.hasAnyRole).toHaveBeenCalledWith(['analyst', 'admin']);
  });

  it('should deny access when user lacks required role', () => {
    const mockRoute = {
      data: { roles: ['admin'] }
    } as unknown as ActivatedRouteSnapshot;

    authServiceSpy.hasAnyRole.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sso'], {
      queryParams: { error: 'forbidden' }
    });
  });

  it('should allow access when no roles specified (fail-open)', () => {
    const mockRoute = {
      data: {}
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(authServiceSpy.hasAnyRole).not.toHaveBeenCalled();
  });

  it('should allow access when roles is empty array', () => {
    const mockRoute = {
      data: { roles: [] }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(authServiceSpy.hasAnyRole).not.toHaveBeenCalled();
  });

  it('should support automation role', () => {
    const mockRoute = {
      data: { roles: ['automation'] }
    } as unknown as ActivatedRouteSnapshot;

    authServiceSpy.hasAnyRole.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(authServiceSpy.hasAnyRole).toHaveBeenCalledWith(['automation']);
  });
});
