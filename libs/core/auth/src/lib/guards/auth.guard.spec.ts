import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../auth.service';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'signOut',
      'validateCurrentToken'
    ], {
      isAuthenticated: false
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {} as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
  });

  it('should allow access when authenticated with valid token', () => {
    Object.defineProperty(authServiceSpy, 'isAuthenticated', { get: () => true });
    authServiceSpy.validateCurrentToken.and.returnValue({ valid: true });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect when not authenticated', () => {
    Object.defineProperty(authServiceSpy, 'isAuthenticated', { get: () => false });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sso']);
  });

  it('should deny access and sign out when token is invalid', () => {
    Object.defineProperty(authServiceSpy, 'isAuthenticated', { get: () => true });
    authServiceSpy.validateCurrentToken.and.returnValue({ valid: false, reason: 'expired' });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(authServiceSpy.signOut).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sso']);
  });

  it('should deny access when token has no_token reason', () => {
    Object.defineProperty(authServiceSpy, 'isAuthenticated', { get: () => true });
    authServiceSpy.validateCurrentToken.and.returnValue({ valid: false, reason: 'no_token' });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(authServiceSpy.signOut).toHaveBeenCalled();
  });
});
