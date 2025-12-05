import { TestBed } from '@angular/core/testing';
import { OperationsApiMockService } from './operations-api-mock.service';
import { QueryApiMockService, ApiAuthError } from './query-api-mock.service';
import type { ExecutionResponse } from '@excel-platform/shared/types';

describe('OperationsApiMockService', () => {
  let service: OperationsApiMockService;
  let mockQueryApiMock: jasmine.SpyObj<QueryApiMockService>;

  beforeEach(() => {
    mockQueryApiMock = jasmine.createSpyObj('QueryApiMockService', ['executeApi']);

    TestBed.configureTestingModule({
      providers: [
        OperationsApiMockService,
        { provide: QueryApiMockService, useValue: mockQueryApiMock },
      ],
    });

    service = TestBed.inject(OperationsApiMockService);
  });

  describe('execute', () => {
    it('should return wrapped response format', async () => {
      const mockRows = [{ id: 1, name: 'Test' }];
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve(mockRows));

      const result = await service.execute('test-operation', { param1: 'value1' });

      expect(result.status).toBe('success');
      expect(result.data.rows).toEqual(mockRows);
      expect(result.data.metrics.row_count).toBe(1);
      expect(result.meta.operation).toBe('test-operation');
    });

    it('should include execution metadata', async () => {
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve([]));

      const result = await service.execute('meta-test', {});

      expect(result.meta.execution_id).toBeTruthy();
      expect(result.meta.operation).toBe('meta-test');
      expect(result.meta.timestamp_utc).toBeTruthy();
      expect(result.meta.integrity_hash).toBeTruthy();
    });

    it('should measure execution duration', async () => {
      // Delay the mock to ensure duration > 0
      mockQueryApiMock.executeApi.and.callFake(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return [];
      });

      const result = await service.execute('duration-test', {});

      expect(result.data.metrics.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should return error status on failure', async () => {
      mockQueryApiMock.executeApi.and.returnValue(
        Promise.reject(new Error('Mock error'))
      );

      const result = await service.execute('failing-operation', {});

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('OPERATION_FAILED');
      expect(result.error?.message).toBe('Mock error');
    });

    it('should pass payload to QueryApiMockService', async () => {
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve([]));

      const payload = { startDate: '2025-01-01', limit: 100 };
      await service.execute('param-test', payload);

      expect(mockQueryApiMock.executeApi).toHaveBeenCalledWith('param-test', payload);
    });

    it('should generate unique execution IDs', async () => {
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve([]));

      const result1 = await service.execute('test1', {});
      const result2 = await service.execute('test2', {});

      expect(result1.meta.execution_id).not.toBe(result2.meta.execution_id);
    });

    it('should include row count in metrics', async () => {
      const mockRows = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve(mockRows));

      const result = await service.execute('count-test', {});

      expect(result.data.metrics.row_count).toBe(3);
    });

    it('should generate integrity hash', async () => {
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve([{ id: 1 }]));

      const result = await service.execute('hash-test', {});

      expect(result.meta.integrity_hash).toContain('sha256:');
    });
  });

  describe('executeAndUnwrap', () => {
    it('should return rows on success', async () => {
      const mockRows = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve(mockRows));

      const rows = await service.executeAndUnwrap('list-items', {});

      expect(rows.length).toBe(2);
      expect(rows[0]).toEqual({ id: 1, name: 'Item 1' });
    });

    it('should throw error on failure', async () => {
      mockQueryApiMock.executeApi.and.returnValue(
        Promise.reject(new Error('Test error'))
      );

      await expectAsync(
        service.executeAndUnwrap('failing-op', {})
      ).toBeRejectedWithError("Operation 'failing-op' failed: Test error");
    });

    it('should return empty array when no rows', async () => {
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve([]));

      const rows = await service.executeAndUnwrap('empty-result', {});

      expect(rows).toEqual([]);
    });
  });

  describe('response format alignment', () => {
    it('should match backend ExecutionResponse structure', async () => {
      mockQueryApiMock.executeApi.and.returnValue(Promise.resolve([{ id: 1 }]));

      const result = await service.execute('structure-test', {});

      // Verify all required fields are present
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('rows');
      expect(result.data).toHaveProperty('metrics');
      expect(result.data.metrics).toHaveProperty('row_count');
      expect(result.data.metrics).toHaveProperty('duration_ms');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('execution_id');
      expect(result.meta).toHaveProperty('operation');
      expect(result.meta).toHaveProperty('timestamp_utc');
      expect(result.meta).toHaveProperty('integrity_hash');
    });

    it('should include error details on failure', async () => {
      mockQueryApiMock.executeApi.and.returnValue(
        Promise.reject(new Error('Detailed error message'))
      );

      const result = await service.execute('error-details', {});

      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
    });
  });

  describe('service initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('auth error handling', () => {
    it('should return UNAUTHORIZED error when ApiAuthError is thrown', async () => {
      const authError = new ApiAuthError('Token expired', 401, 'expired');
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(authError));

      const result = await service.execute('protected-operation', {});

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(result.error?.message).toBe('Token expired');
      expect(result.error?.details).toEqual({ reason: 'expired', status: 401 });
    });

    it('should return UNAUTHORIZED with revoked reason', async () => {
      const authError = new ApiAuthError('Token revoked', 401, 'revoked');
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(authError));

      const result = await service.execute('protected-op', {});

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(result.error?.details?.reason).toBe('revoked');
    });

    it('should include metrics even for auth errors', async () => {
      const authError = new ApiAuthError('Not authenticated', 401);
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(authError));

      const result = await service.execute('auth-fail', {});

      expect(result.data.metrics.row_count).toBe(0);
      expect(result.data.metrics.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should include meta even for auth errors', async () => {
      const authError = new ApiAuthError('Token invalid', 401);
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(authError));

      const result = await service.execute('meta-test-auth', {});

      expect(result.meta.execution_id).toBeTruthy();
      expect(result.meta.operation).toBe('meta-test-auth');
      expect(result.meta.timestamp_utc).toBeTruthy();
      expect(result.meta.integrity_hash).toBe('');
    });

    it('should distinguish auth errors from operation errors', async () => {
      // Auth error
      const authError = new ApiAuthError('Unauthorized', 401);
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(authError));
      const authResult = await service.execute('test1', {});

      // Operation error
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(new Error('DB connection failed')));
      const opResult = await service.execute('test2', {});

      expect(authResult.error?.code).toBe('UNAUTHORIZED');
      expect(opResult.error?.code).toBe('OPERATION_FAILED');
    });
  });

  describe('executeAndUnwrap with auth errors', () => {
    it('should throw error with UNAUTHORIZED details', async () => {
      const authError = new ApiAuthError('Token expired', 401, 'expired');
      mockQueryApiMock.executeApi.and.returnValue(Promise.reject(authError));

      await expectAsync(
        service.executeAndUnwrap('protected-op', {})
      ).toBeRejectedWithError("Operation 'protected-op' failed: Token expired");
    });
  });
});
