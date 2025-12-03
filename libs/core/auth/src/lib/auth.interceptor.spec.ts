import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getAccessToken', 'signOut']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authorization header', () => {
    it('should add Authorization header when authenticated', () => {
      authServiceSpy.getAccessToken.and.returnValue('test-token');

      httpClient.get('/api/data').subscribe();

      const req = httpMock.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({});
    });

    it('should not add Authorization header when not authenticated', () => {
      authServiceSpy.getAccessToken.and.returnValue(null);

      httpClient.get('/api/data').subscribe();

      const req = httpMock.expectOne('/api/data');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('should skip auth header for /auth/* endpoints', () => {
      authServiceSpy.getAccessToken.and.returnValue('test-token');

      httpClient.post('/auth/signin', {}).subscribe();

      const req = httpMock.expectOne('/auth/signin');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('should skip auth header for /auth/refresh endpoint', () => {
      authServiceSpy.getAccessToken.and.returnValue('test-token');

      httpClient.post('/auth/refresh', {}).subscribe();

      const req = httpMock.expectOne('/auth/refresh');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  });

  describe('401 Unauthorized handling', () => {
    it('should sign out on 401 response', () => {
      authServiceSpy.getAccessToken.and.returnValue('expired-token');

      httpClient.get('/api/data').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/api/data');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(authServiceSpy.signOut).toHaveBeenCalled();
    });

    it('should redirect to /sso with session_expired on 401', () => {
      authServiceSpy.getAccessToken.and.returnValue('expired-token');

      httpClient.get('/api/data').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/api/data');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/sso'], {
        queryParams: { error: 'session_expired' },
      });
    });

    it('should still throw the error after handling 401', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('expired-token');

      httpClient.get('/api/data').subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          done();
        },
      });

      const req = httpMock.expectOne('/api/data');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('403 Forbidden handling', () => {
    it('should NOT sign out on 403 response', () => {
      authServiceSpy.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/admin').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      expect(authServiceSpy.signOut).not.toHaveBeenCalled();
    });

    it('should redirect to /sso with forbidden on 403', () => {
      authServiceSpy.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/admin').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/sso'], {
        queryParams: { error: 'forbidden' },
      });
    });

    it('should still throw the error after handling 403', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/admin').subscribe({
        error: (err) => {
          expect(err.status).toBe(403);
          done();
        },
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Other errors', () => {
    it('should not redirect on 404 errors', () => {
      authServiceSpy.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/missing').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/api/missing');
      req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });

      expect(authServiceSpy.signOut).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should not redirect on 500 errors', () => {
      authServiceSpy.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/error').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/api/error');
      req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      expect(authServiceSpy.signOut).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
});
