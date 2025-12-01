import { TestBed } from '@angular/core/testing';
import { QueryValidationService } from './query-validation.service';
import { ApiCatalogService } from './api-catalog.service';
import { ApiDefinition, ApiParameter, QueryConfiguration, QueryConfigurationItem } from '@excel-platform/shared/types';

describe('QueryValidationService', () => {
  let service: QueryValidationService;
  let apiCatalogSpy: jasmine.SpyObj<ApiCatalogService>;

  const mockApi: ApiDefinition = {
    id: 'sales-summary',
    name: 'Sales Summary',
    description: 'Test API',
    allowedRoles: ['admin'],
    parameters: [
      {
        key: 'startDate',
        type: 'date',
        required: true,
        label: 'Start Date',
      },
      {
        key: 'endDate',
        type: 'date',
        required: true,
        label: 'End Date',
      },
      {
        key: 'region',
        type: 'string',
        required: false,
        label: 'Region',
      },
    ] as ApiParameter[],
  };

  const mockConfigItem: QueryConfigurationItem = {
    id: 'item-1',
    apiId: 'sales-summary',
    displayName: 'Sales Q1',
    parameters: {
      StartDate: '2024-01-01',
      EndDate: '2024-03-31',
    },
    targetSheetName: 'Sheet1',
    targetTableName: 'SalesTable',
    writeMode: 'overwrite' as any,
    includeInBatch: true,
  };

  beforeEach(() => {
    apiCatalogSpy = jasmine.createSpyObj<ApiCatalogService>('ApiCatalogService', [
      'getApiById',
    ]);

    TestBed.configureTestingModule({
      providers: [
        QueryValidationService,
        { provide: ApiCatalogService, useValue: apiCatalogSpy },
      ],
    });

    service = TestBed.inject(QueryValidationService);
  });

  describe('validateConfiguration', () => {
    it('should validate configuration with valid items', () => {
      const config: QueryConfiguration = {
        id: 'config-1',
        name: 'Test Config',
        items: [mockConfigItem],
      };

      apiCatalogSpy.getApiById.and.returnValue(mockApi);

      const result = service.validateConfiguration(config);

      expect(result.valid).toBeTrue();
      expect(result.errors).toEqual([]);
    });

    it('should return error when configuration missing id', () => {
      const config = {
        name: 'Test Config',
        items: [mockConfigItem],
      } as QueryConfiguration;

      const result = service.validateConfiguration(config);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Configuration missing required field: id');
    });

    it('should return error when configuration missing name', () => {
      const config = {
        id: 'config-1',
        items: [mockConfigItem],
      } as QueryConfiguration;

      const result = service.validateConfiguration(config);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Configuration missing required field: name');
    });

    it('should return error when configuration has no items', () => {
      const config: QueryConfiguration = {
        id: 'config-1',
        name: 'Test Config',
        items: [],
      };

      const result = service.validateConfiguration(config);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Configuration must have at least one item');
    });

    it('should include item errors in configuration errors', () => {
      const config: QueryConfiguration = {
        id: 'config-1',
        name: 'Test Config',
        items: [mockConfigItem],
      };

      apiCatalogSpy.getApiById.and.returnValue(undefined); // API not found

      const result = service.validateConfiguration(config);

      expect(result.valid).toBeFalse();
      expect(result.errors.some((e) => e.includes('API not found'))).toBeTrue();
    });

    it('should validate multiple items', () => {
      const item2: QueryConfigurationItem = {
        ...mockConfigItem,
        id: 'item-2',
        apiId: 'inventory-status',
      };

      const config: QueryConfiguration = {
        id: 'config-1',
        name: 'Test Config',
        items: [mockConfigItem, item2],
      };

      apiCatalogSpy.getApiById.and.callFake((id) =>
        id === 'sales-summary' ? mockApi : undefined
      );

      const result = service.validateConfiguration(config);

      expect(result.valid).toBeFalse();
      expect(result.errors.some((e) => e.includes('item-2'))).toBeTrue();
    });
  });

  describe('validateConfigurationItem', () => {
    it('should validate item with valid apiId', () => {
      apiCatalogSpy.getApiById.and.returnValue(mockApi);

      const result = service.validateConfigurationItem(mockConfigItem);

      expect(result.valid).toBeTrue();
      expect(result.errors).toEqual([]);
    });

    it('should return error when item missing id', () => {
      const item = { ...mockConfigItem, id: '' };

      const result = service.validateConfigurationItem(item);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Item missing required field: id');
    });

    it('should return error when item missing apiId', () => {
      const item = { ...mockConfigItem, apiId: '' };

      const result = service.validateConfigurationItem(item);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Item missing required field: apiId');
    });

    it('should return error when apiId not found in catalog', () => {
      apiCatalogSpy.getApiById.and.returnValue(undefined);

      const result = service.validateConfigurationItem(mockConfigItem);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain(`API not found in catalog: ${mockConfigItem.apiId}`);
    });

    it('should validate parameters when provided', () => {
      apiCatalogSpy.getApiById.and.returnValue(mockApi);

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };

      const result = service.validateConfigurationItem(mockConfigItem, params);

      expect(result.valid).toBeTrue();
    });

    it('should return errors for missing required parameters', () => {
      apiCatalogSpy.getApiById.and.returnValue(mockApi);

      const params = {
        startDate: '2024-01-01',
        // endDate missing
      };

      const result = service.validateConfigurationItem(mockConfigItem, params);

      expect(result.valid).toBeFalse();
      expect(result.errors.some((e) => e.includes('Missing required parameter: endDate'))).toBeTrue();
    });
  });

  describe('validateParameters', () => {
    it('should validate all required parameters present', () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };

      const result = service.validateParameters(mockApi, params);

      expect(result.valid).toBeTrue();
      expect(result.errors).toEqual([]);
    });

    it('should return error when required parameter missing', () => {
      const params = {
        startDate: '2024-01-01',
        // endDate missing (required)
      };

      const result = service.validateParameters(mockApi, params);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Missing required parameter: endDate (End Date)');
    });

    it('should return error when required parameter is empty string', () => {
      const params = {
        startDate: '',
        endDate: '2024-03-31',
      };

      const result = service.validateParameters(mockApi, params);

      expect(result.valid).toBeFalse();
      expect(result.errors).toContain('Missing required parameter: startDate (Start Date)');
    });

    it('should not require optional parameters', () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        // region optional - not provided
      };

      const result = service.validateParameters(mockApi, params);

      expect(result.valid).toBeTrue();
    });

    it('should validate parameter types', () => {
      const apiWithNumber: ApiDefinition = {
        ...mockApi,
        parameters: [
          {
            key: 'count',
            type: 'number',
            required: true,
            label: 'Count',
          } as ApiParameter,
        ],
      };

      const params = {
        count: 'not-a-number',
      };

      const result = service.validateParameters(apiWithNumber, params);

      expect(result.valid).toBeFalse();
      expect(result.errors.some((e) => e.includes('must be a number'))).toBeTrue();
    });
  });

  describe('validateParameterType', () => {
    it('should validate number types', () => {
      const param: ApiParameter = {
        key: 'count',
        type: 'number',
        required: true,
        label: 'Count',
      };

      const api: ApiDefinition = { ...mockApi, parameters: [param] };

      const validResult = service.validateParameters(api, { count: 42 });
      expect(validResult.valid).toBeTrue();

      const invalidResult = service.validateParameters(api, { count: 'abc' });
      expect(invalidResult.valid).toBeFalse();
    });

    it('should accept numeric strings for number types', () => {
      const param: ApiParameter = {
        key: 'count',
        type: 'number',
        required: true,
        label: 'Count',
      };

      const api: ApiDefinition = { ...mockApi, parameters: [param] };

      const result = service.validateParameters(api, { count: '42' });
      expect(result.valid).toBeTrue();
    });

    it('should validate boolean types', () => {
      const param: ApiParameter = {
        key: 'active',
        type: 'boolean',
        required: true,
        label: 'Active',
      };

      const api: ApiDefinition = { ...mockApi, parameters: [param] };

      const validResult = service.validateParameters(api, { active: true });
      expect(validResult.valid).toBeTrue();

      const invalidResult = service.validateParameters(api, { active: 'maybe' });
      expect(invalidResult.valid).toBeFalse();
    });

    it('should accept string "true"/"false" for boolean types', () => {
      const param: ApiParameter = {
        key: 'active',
        type: 'boolean',
        required: true,
        label: 'Active',
      };

      const api: ApiDefinition = { ...mockApi, parameters: [param] };

      const result1 = service.validateParameters(api, { active: 'true' });
      expect(result1.valid).toBeTrue();

      const result2 = service.validateParameters(api, { active: 'false' });
      expect(result2.valid).toBeTrue();
    });

    it('should validate date types', () => {
      const param: ApiParameter = {
        key: 'eventDate',
        type: 'date',
        required: true,
        label: 'Event Date',
      };

      const api: ApiDefinition = { ...mockApi, parameters: [param] };

      const validResult1 = service.validateParameters(api, { eventDate: new Date() });
      expect(validResult1.valid).toBeTrue();

      const validResult2 = service.validateParameters(api, { eventDate: '2024-01-01' });
      expect(validResult2.valid).toBeTrue();

      const invalidResult = service.validateParameters(api, { eventDate: 'not-a-date' });
      expect(invalidResult.valid).toBeFalse();
    });

    it('should always pass string/text types', () => {
      const param: ApiParameter = {
        key: 'text',
        type: 'string',
        required: true,
        label: 'Text',
      };

      const api: ApiDefinition = { ...mockApi, parameters: [param] };

      const result1 = service.validateParameters(api, { text: 'valid string' });
      expect(result1.valid).toBeTrue();

      const result2 = service.validateParameters(api, { text: 123 });
      expect(result2.valid).toBeTrue(); // Anything can be stringified
    });
  });

  describe('apiExists', () => {
    it('should return true when API exists in catalog', () => {
      apiCatalogSpy.getApiById.and.returnValue(mockApi);

      const exists = service.apiExists('sales-summary');

      expect(exists).toBeTrue();
      expect(apiCatalogSpy.getApiById).toHaveBeenCalledWith('sales-summary');
    });

    it('should return false when API does not exist in catalog', () => {
      apiCatalogSpy.getApiById.and.returnValue(undefined);

      const exists = service.apiExists('nonexistent-api');

      expect(exists).toBeFalse();
    });
  });
});
