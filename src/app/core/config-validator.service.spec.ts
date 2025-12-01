import { TestBed } from '@angular/core/testing';
import { ConfigValidatorService } from './config-validator.service';
import { AppConfig } from '../types/app-config.types';

describe('ConfigValidatorService', () => {
  let service: ConfigValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validate()', () => {
    it('should pass validation for valid minimal config', () => {
      const validConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
      };

      const result = service.validate(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail validation when defaultViewId is missing', () => {
      const invalidConfig = {
        navItems: [],
        roles: [],
        rootIdsAndClasses: {},
      } as any;

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config missing required field: defaultViewId');
    });

    it('should fail validation when navItems is missing', () => {
      const invalidConfig = {
        defaultViewId: 'sso',
        roles: [],
        rootIdsAndClasses: {},
      } as any;

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config missing or invalid field: navItems (must be array)');
    });

    it('should fail validation when navItems is empty', () => {
      const invalidConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
      };

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config navItems array is empty');
    });

    it('should fail validation when navItem missing required fields', () => {
      const invalidConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: '',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
          {
            id: 'nav-2',
            labelKey: '',
            actionType: 'select-view',
          },
          {
            id: 'nav-3',
            labelKey: 'nav.three',
            actionType: '' as any,
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
      };

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('navItems[0] missing required field: id');
      expect(result.errors).toContain('navItems[1] missing required field: labelKey');
      expect(result.errors).toContain('navItems[2] missing required field: actionType');
    });

    it('should fail validation when apiCatalog is not an array', () => {
      const invalidConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
        apiCatalog: {} as any,
      };

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config apiCatalog must be an array');
    });

    it('should fail validation when apiCatalog item missing required fields', () => {
      const invalidConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
        apiCatalog: [
          {
            id: '',
            name: 'API 1',
            parameters: [],
          } as any,
          {
            id: 'api-2',
            name: '',
            parameters: [],
          } as any,
          {
            id: 'api-3',
            name: 'API 3',
            parameters: undefined as any,
          },
        ],
      };

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('apiCatalog[0] missing required field: id');
      expect(result.errors).toContain('apiCatalog[1] missing required field: name');
      expect(result.errors).toContain('apiCatalog[2] missing or invalid field: parameters (must be array)');
    });

    it('should fail validation when text catalog is not an object', () => {
      const invalidConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
        text: 'invalid' as any,
      };

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config text must be an object');
    });

    it('should fail validation when text catalog missing required sections', () => {
      const invalidConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
        text: {
          nav: {},
        } as any,
      };

      const result = service.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config text missing required section: auth');
      expect(result.errors).toContain('Config text missing required section: query');
      expect(result.errors).toContain('Config text missing required section: worksheet');
      expect(result.errors).toContain('Config text missing required section: table');
      expect(result.errors).toContain('Config text missing required section: user');
      expect(result.errors).toContain('Config text missing required section: ui');
    });

    it('should pass validation with valid apiCatalog and text', () => {
      const validConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
        apiCatalog: [
          {
            id: 'api-1',
            name: 'API 1',
            parameters: [],
          },
        ],
        text: {
          nav: {},
          auth: {},
          query: {},
          worksheet: {},
          table: {},
          user: {},
          ui: {},
        },
      };

      const result = service.validate(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateOrThrow()', () => {
    it('should not throw for valid config', () => {
      const validConfig: AppConfig = {
        defaultViewId: 'sso',
        navItems: [
          {
            id: 'nav-sso',
            labelKey: 'nav.sso',
            actionType: 'select-view',
          },
        ],
        roles: [],
        rootIdsAndClasses: {
          navClass: 'nav',
          statusClass: 'status',
          userBannerClass: 'user-banner',
          hostStatusClass: 'host-status',
        },
      };

      expect(() => service.validateOrThrow(validConfig)).not.toThrow();
    });

    it('should throw for invalid config', () => {
      const invalidConfig = {
        navItems: [],
        roles: [],
        rootIdsAndClasses: {},
      } as any;

      expect(() => service.validateOrThrow(invalidConfig)).toThrow();
    });

    it('should throw with validation errors in message', () => {
      const invalidConfig = {
        navItems: [],
        roles: [],
        rootIdsAndClasses: {},
      } as any;

      expect(() => service.validateOrThrow(invalidConfig)).toThrowError(/Config validation failed/);
      expect(() => service.validateOrThrow(invalidConfig)).toThrowError(/defaultViewId/);
    });
  });
});
