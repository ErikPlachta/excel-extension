import { TestBed } from '@angular/core/testing';
import { AuthApiMockService } from './auth-api-mock.service';
import { JwtHelperService } from './jwt-helper.service';

describe('AuthApiMockService', () => {
  let service: AuthApiMockService;
  let jwtHelper: JwtHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthApiMockService, JwtHelperService],
    });
    service = TestBed.inject(AuthApiMockService);
    jwtHelper = TestBed.inject(JwtHelperService);
  });

  afterEach(() => {
    service.reset();
  });

  describe('signIn', () => {
    it('should sign in with demo email and roles', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      expect(tokens).toBeDefined();
      expect(tokens.access).toBeDefined();
      expect(tokens.access.token).toBeTruthy();
      expect(tokens.refresh).toBeDefined();
      expect(tokens.refresh.token).toBeTruthy();
    });

    it('should include jti, aud, iss claims in tokens', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      const payload = jwtHelper.decodeMockToken(tokens.access.token);
      expect(payload).toBeDefined();
      expect(payload?.jti).toBeTruthy();
      expect(payload?.aud).toBe('databricks-api');
      expect(payload?.iss).toBe('excel-extension-mock');
    });

    it('should revoke previous tokens on new sign-in', async () => {
      const tokens1 = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      const payload1 = jwtHelper.decodeMockToken(tokens1.access.token);
      expect(payload1?.jti).toBeTruthy();

      // Sign in again
      const tokens2 = await service.signIn({
        email: 'test@example.com',
        roles: ['admin'],
      });

      // Old token should be revoked
      expect(service.isTokenRevoked(payload1!.jti)).toBe(true);

      // New token should be valid
      const payload2 = jwtHelper.decodeMockToken(tokens2.access.token);
      expect(service.isTokenRevoked(payload2!.jti)).toBe(false);
    });

    it('should throw error if no email or azureAdToken provided', async () => {
      await expect(service.signIn({})).rejects.toThrow(
        'Invalid sign-in request: email or azureAdToken required'
      );
    });

    it('should handle simulated Azure AD token', async () => {
      const mockAzureToken = btoa('azure.user@example.com');
      const tokens = await service.signIn({
        azureAdToken: mockAzureToken,
      });

      expect(tokens).toBeDefined();
      const payload = jwtHelper.decodeMockToken(tokens.access.token);
      expect(payload?.email).toBe('azure.user@example.com');
    });
  });

  describe('refresh', () => {
    it('should refresh token pair with rotation', async () => {
      const tokens1 = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      const refreshPayload1 = jwtHelper.decodeMockToken(tokens1.refresh.token);

      const tokens2 = await service.refresh(tokens1.refresh.token);

      // Old refresh token should be revoked
      expect(service.isTokenRevoked(refreshPayload1!.jti)).toBe(true);

      // New tokens should be valid
      const refreshPayload2 = jwtHelper.decodeMockToken(tokens2.refresh.token);
      expect(service.isTokenRevoked(refreshPayload2!.jti)).toBe(false);
    });

    it('should throw error for revoked refresh token', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      // Refresh once (revokes original)
      await service.refresh(tokens.refresh.token);

      // Try to use old refresh token again
      await expect(service.refresh(tokens.refresh.token)).rejects.toThrow(
        'Refresh token has been revoked'
      );
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(service.refresh('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile after sign-in', async () => {
      await service.signIn({
        email: 'test@example.com',
        roles: ['analyst', 'admin'],
      });

      const profile = await service.getProfile();

      expect(profile).toBeDefined();
      expect(profile.email).toBe('test@example.com');
      expect(profile.roles).toContain('analyst');
      expect(profile.roles).toContain('admin');
      expect(profile.displayName).toBe('test');
    });

    it('should throw error if not authenticated', async () => {
      await expect(service.getProfile()).rejects.toThrow('Not authenticated');
    });
  });

  describe('signOut', () => {
    it('should revoke current tokens', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      const accessPayload = jwtHelper.decodeMockToken(tokens.access.token);
      const refreshPayload = jwtHelper.decodeMockToken(tokens.refresh.token);

      const result = await service.signOut();

      expect(result.success).toBe(true);
      expect(service.isTokenRevoked(accessPayload!.jti)).toBe(true);
      expect(service.isTokenRevoked(refreshPayload!.jti)).toBe(true);
    });

    it('should clear user profile', async () => {
      await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      await service.signOut();

      await expect(service.getProfile()).rejects.toThrow('Not authenticated');
    });
  });

  describe('revoke', () => {
    it('should revoke specific refresh token', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      const refreshPayload = jwtHelper.decodeMockToken(tokens.refresh.token);

      const result = await service.revoke(tokens.refresh.token);

      expect(result.success).toBe(true);
      expect(service.isTokenRevoked(refreshPayload!.jti)).toBe(true);
    });

    it('should return failure for invalid token', async () => {
      const result = await service.revoke('invalid-token');
      expect(result.success).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should validate valid token', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      const result = service.validateToken(tokens.access.token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.email).toBe('test@example.com');
    });

    it('should reject revoked token', async () => {
      const tokens = await service.signIn({
        email: 'test@example.com',
        roles: ['analyst'],
      });

      await service.signOut();

      const result = service.validateToken(tokens.access.token);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('revoked');
    });

    it('should reject invalid token', () => {
      const result = service.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token format');
    });
  });
});
