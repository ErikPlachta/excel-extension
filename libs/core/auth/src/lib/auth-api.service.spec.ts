import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthApiService } from './auth-api.service';
import type { TokenPair, UserProfile } from '@excel-platform/shared/types';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  const mockTokenPair: TokenPair = {
    access: {
      token: 'mock-access-token',
      expiresAt: Date.now() + 900000, // 15 minutes
    },
    refresh: {
      token: 'mock-refresh-token',
      expiresAt: Date.now() + 604800000, // 7 days
    },
  };

  const mockProfile: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    roles: ['analyst'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthApiService],
    });
    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('signIn', () => {
    it('should POST to /auth/signin with request body', async () => {
      const signInPromise = service.signIn({ azureAdToken: 'azure-token-123' });

      const req = httpMock.expectOne('/auth/signin');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ azureAdToken: 'azure-token-123' });
      req.flush(mockTokenPair);

      const result = await signInPromise;
      expect(result).toEqual(mockTokenPair);
    });

    it('should handle demo sign-in request', async () => {
      const signInPromise = service.signIn({
        email: 'demo@example.com',
        roles: ['admin'],
      });

      const req = httpMock.expectOne('/auth/signin');
      expect(req.request.body).toEqual({
        email: 'demo@example.com',
        roles: ['admin'],
      });
      req.flush(mockTokenPair);

      const result = await signInPromise;
      expect(result).toEqual(mockTokenPair);
    });
  });

  describe('refresh', () => {
    it('should POST to /auth/refresh with refresh token', async () => {
      const refreshPromise = service.refresh('my-refresh-token');

      const req = httpMock.expectOne('/auth/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'my-refresh-token' });
      req.flush(mockTokenPair);

      const result = await refreshPromise;
      expect(result).toEqual(mockTokenPair);
    });
  });

  describe('getProfile', () => {
    it('should GET /auth/profile', async () => {
      const profilePromise = service.getProfile();

      const req = httpMock.expectOne('/auth/profile');
      expect(req.request.method).toBe('GET');
      req.flush(mockProfile);

      const result = await profilePromise;
      expect(result).toEqual(mockProfile);
    });
  });

  describe('signOut', () => {
    it('should POST to /auth/signout', async () => {
      const signOutPromise = service.signOut();

      const req = httpMock.expectOne('/auth/signout');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });

      const result = await signOutPromise;
      expect(result).toEqual({ success: true });
    });
  });

  describe('revoke', () => {
    it('should POST to /auth/revoke with refresh token', async () => {
      const revokePromise = service.revoke('token-to-revoke');

      const req = httpMock.expectOne('/auth/revoke');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'token-to-revoke' });
      req.flush({ success: true });

      const result = await revokePromise;
      expect(result).toEqual({ success: true });
    });
  });

  describe('error handling', () => {
    it('should propagate HTTP errors on signIn', async () => {
      const signInPromise = service.signIn({ azureAdToken: 'invalid' });

      const req = httpMock.expectOne('/auth/signin');
      req.flush({ error: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });

      await expect(signInPromise).rejects.toMatchObject({
        status: 401,
      });
    });

    it('should propagate HTTP errors on refresh', async () => {
      const refreshPromise = service.refresh('expired-token');

      const req = httpMock.expectOne('/auth/refresh');
      req.flush({ error: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

      await expect(refreshPromise).rejects.toMatchObject({
        status: 401,
      });
    });

    it('should propagate 403 errors on getProfile', async () => {
      const profilePromise = service.getProfile();

      const req = httpMock.expectOne('/auth/profile');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      await expect(profilePromise).rejects.toMatchObject({
        status: 403,
      });
    });
  });
});
