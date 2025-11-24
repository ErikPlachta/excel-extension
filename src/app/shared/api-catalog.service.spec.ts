import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiCatalogService } from './api-catalog.service';
import { ApiDefinition } from '../types/api.types';

describe('ApiCatalogService', () => {
  let service: ApiCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ApiCatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getApis', () => {
    it('should return all API definitions', () => {
      const apis = service.getApis();
      expect(apis).toBeInstanceOf(Array);
      expect(apis.length).toBeGreaterThan(0);
    });

    it('should return APIs with required fields', () => {
      const apis = service.getApis();
      apis.forEach(api => {
        expect(api.id).toBeDefined();
        expect(typeof api.id).toBe('string');
        expect(api.name).toBeDefined();
        expect(typeof api.name).toBe('string');
        expect(api.parameters).toBeInstanceOf(Array);
      });
    });
  });

  describe('getApiById', () => {
    it('should return API when ID exists', () => {
      const apis = service.getApis();
      const firstApi = apis[0];

      const result = service.getApiById(firstApi.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstApi.id);
    });

    it('should return undefined when ID does not exist', () => {
      const result = service.getApiById('non-existent-api');

      expect(result).toBeUndefined();
    });

    it('should return sales-summary API', () => {
      const result = service.getApiById('sales-summary');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sales Summary');
    });
  });

  describe('getApisByRole', () => {
    it('should return APIs accessible to analyst role', () => {
      const apis = service.getApisByRole(['analyst']);

      expect(apis).toBeInstanceOf(Array);
      expect(apis.length).toBeGreaterThan(0);

      // Verify all returned APIs allow analyst role
      apis.forEach(api => {
        if (api.allowedRoles && api.allowedRoles.length > 0) {
          expect(api.allowedRoles).toContain('analyst');
        }
      });
    });

    it('should return admin-only APIs for admin role', () => {
      const apis = service.getApisByRole(['admin']);

      // Find admin-only APIs
      const adminOnlyApis = apis.filter(api =>
        api.allowedRoles &&
        api.allowedRoles.length > 0 &&
        api.allowedRoles.includes('admin')
      );

      expect(adminOnlyApis.length).toBeGreaterThan(0);
    });

    it('should NOT return admin-only APIs for analyst role', () => {
      const analystApis = service.getApisByRole(['analyst']);
      const adminApis = service.getApisByRole(['admin']);

      // Find APIs that are ONLY for admin (not analyst)
      const adminOnlyApis = adminApis.filter(api =>
        api.allowedRoles &&
        api.allowedRoles.length > 0 &&
        api.allowedRoles.includes('admin') &&
        !api.allowedRoles.includes('analyst')
      );

      // Verify none of these admin-only APIs appear in analyst list
      adminOnlyApis.forEach(adminApi => {
        const foundInAnalyst = analystApis.find(a => a.id === adminApi.id);
        expect(foundInAnalyst).toBeUndefined();
      });
    });

    it('should return APIs with no role restrictions for any role', () => {
      const apis = service.getApis();
      const noRoleRestrictionApis = apis.filter(api => !api.allowedRoles || api.allowedRoles.length === 0);

      if (noRoleRestrictionApis.length > 0) {
        const guestApis = service.getApisByRole(['guest' as any]);

        noRoleRestrictionApis.forEach(api => {
          const found = guestApis.find(a => a.id === api.id);
          expect(found).toBeDefined();
        });
      }
    });

    it('should handle multiple roles correctly', () => {
      const apis = service.getApisByRole(['analyst', 'admin']);

      expect(apis).toBeInstanceOf(Array);
      expect(apis.length).toBeGreaterThan(0);

      // Should include both analyst and admin APIs
      const analystOnlyApis = service.getApisByRole(['analyst']);
      const adminOnlyApis = service.getApisByRole(['admin']);

      expect(apis.length).toBeGreaterThanOrEqual(Math.max(analystOnlyApis.length, adminOnlyApis.length));
    });

    it('should return empty array for role with no access', () => {
      const apis = service.getApisByRole(['nonexistent-role' as any]);

      // Should only return APIs with no role restrictions
      apis.forEach(api => {
        expect(!api.allowedRoles || api.allowedRoles.length === 0).toBeTruthy();
      });
    });
  });

  describe('API definitions validation', () => {
    it('should have unique API IDs', () => {
      const apis = service.getApis();
      const ids = apis.map(api => api.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid parameter types', () => {
      const apis = service.getApis();
      const validTypes = ['string', 'number', 'date', 'boolean', 'array'];

      apis.forEach(api => {
        api.parameters.forEach(param => {
          expect(validTypes).toContain(param.type);
        });
      });
    });

    it('should have required field set for all parameters', () => {
      const apis = service.getApis();

      apis.forEach(api => {
        api.parameters.forEach(param => {
          expect(typeof param.required).toBe('boolean');
        });
      });
    });
  });
});
