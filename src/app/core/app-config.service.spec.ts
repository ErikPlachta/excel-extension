import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppConfigService } from './app-config.service';
import { ConfigValidatorService } from './config-validator.service';
import { AppConfig } from '../types/app-config.types';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AppConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getConfig()', () => {
    it('should return default config initially', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.defaultViewId).toBeDefined();
      expect(config.navItems).toBeDefined();
      expect(config.roles).toBeDefined();
    });
  });

  describe('setConfig()', () => {
    it('should update config', () => {
      const newConfig: AppConfig = {
        ...service.getConfig(),
        defaultViewId: 'worksheets',
      };

      service.setConfig(newConfig);

      expect(service.getConfig().defaultViewId).toBe('worksheets');
    });

    it('should notify subscribers via config$ observable', (done) => {
      const newConfig: AppConfig = {
        ...service.getConfig(),
        defaultViewId: 'tables',
      };

      service.config$.subscribe(config => {
        if (config.defaultViewId === 'tables') {
          expect(config.defaultViewId).toBe('tables');
          done();
        }
      });

      service.setConfig(newConfig);
    });
  });

  describe('mergeConfig()', () => {
    it('should merge partial config into current', () => {
      const original = service.getConfig();

      service.mergeConfig({ defaultViewId: 'user' });

      const updated = service.getConfig();
      expect(updated.defaultViewId).toBe('user');
      expect(updated.navItems).toEqual(original.navItems); // Other fields unchanged
    });
  });

  describe('loadRemoteConfig()', () => {
    it('should load and merge remote config successfully', async () => {
      const remoteConfig: Partial<AppConfig> = {
        defaultViewId: 'queries',
      };

      const loadPromise = service.loadRemoteConfig('/test-config.json');

      const req = httpMock.expectOne('/test-config.json');
      expect(req.request.method).toBe('GET');
      req.flush(remoteConfig);

      const result = await loadPromise;

      expect(result).toBe(true);
      expect(service.getConfig().defaultViewId).toBe('queries');
    });

    it('should return false when remote fetch fails', async () => {
      const loadPromise = service.loadRemoteConfig('/test-config.json');

      const req = httpMock.expectOne('/test-config.json');
      req.error(new ProgressEvent('error'));

      const result = await loadPromise;

      expect(result).toBe(false);
    });

    it('should return false when remote config validation fails', async () => {
      const invalidConfig: any = {
        // Missing required fields
        navItems: [],
      };

      const loadPromise = service.loadRemoteConfig('/test-config.json');

      const req = httpMock.expectOne('/test-config.json');
      req.flush(invalidConfig);

      const result = await loadPromise;

      expect(result).toBe(false);
    });
  });

  describe('reloadConfig()', () => {
    it('should use default URL when not specified', async () => {
      const loadPromise = service.reloadConfig();

      const req = httpMock.expectOne('/assets/app-config.json');
      expect(req.request.method).toBe('GET');
      req.error(new ProgressEvent('error')); // Fail to resolve promise

      const result = await loadPromise;
      expect(result).toBe(false);
    });

    it('should use provided URL', async () => {
      const loadPromise = service.reloadConfig('/custom-config.json');

      const req = httpMock.expectOne('/custom-config.json');
      expect(req.request.method).toBe('GET');
      req.error(new ProgressEvent('error'));

      await loadPromise;
    });
  });
});
