import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OperationsApiService } from './operations-api.service';
import type { ExecutionResponse } from '@excel-platform/shared/types';

describe('OperationsApiService', () => {
  let service: OperationsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OperationsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(OperationsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('execute', () => {
    it('should POST to /operations/{operationName}', async () => {
      const mockResponse: ExecutionResponse = {
        status: 'success',
        data: {
          rows: [{ id: 1, name: 'Test' }],
          metrics: { row_count: 1, duration_ms: 42 },
        },
        meta: {
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          operation: 'test-operation',
          timestamp_utc: '2025-12-03T15:30:00Z',
          integrity_hash: 'sha256:abc123',
        },
      };

      const promise = service.execute('test-operation', { param1: 'value1' });

      const req = httpMock.expectOne('/operations/test-operation');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ payload: { param1: 'value1' } });
      req.flush(mockResponse);

      const result = await promise;
      expect(result).toEqual(mockResponse);
    });

    it('should include payload in request body', async () => {
      const mockResponse: ExecutionResponse = {
        status: 'success',
        data: {
          rows: [],
          metrics: { row_count: 0, duration_ms: 10 },
        },
        meta: {
          execution_id: 'test-id',
          operation: 'get-data',
          timestamp_utc: '2025-12-03T15:30:00Z',
          integrity_hash: 'sha256:def456',
        },
      };

      const payload = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        limit: 100,
      };

      const promise = service.execute('get-data', payload);

      const req = httpMock.expectOne('/operations/get-data');
      expect(req.request.body.payload).toEqual(payload);
      req.flush(mockResponse);

      await promise;
    });

    it('should return error response from server', async () => {
      const errorResponse: ExecutionResponse = {
        status: 'error',
        data: {
          rows: [],
          metrics: { row_count: 0, duration_ms: 5 },
        },
        meta: {
          execution_id: 'error-id',
          operation: 'failing-op',
          timestamp_utc: '2025-12-03T15:30:00Z',
          integrity_hash: '',
        },
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameter: startDate',
        },
      };

      const promise = service.execute('failing-op', {});

      const req = httpMock.expectOne('/operations/failing-op');
      req.flush(errorResponse);

      const result = await promise;
      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('executeAndUnwrap', () => {
    it('should return rows on success', async () => {
      const mockResponse: ExecutionResponse = {
        status: 'success',
        data: {
          rows: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
          metrics: { row_count: 2, duration_ms: 50 },
        },
        meta: {
          execution_id: 'exec-id',
          operation: 'list-items',
          timestamp_utc: '2025-12-03T15:30:00Z',
          integrity_hash: 'sha256:ghi789',
        },
      };

      const promise = service.executeAndUnwrap('list-items', {});

      const req = httpMock.expectOne('/operations/list-items');
      req.flush(mockResponse);

      const rows = await promise;
      expect(rows.length).toBe(2);
      expect(rows[0]).toEqual({ id: 1, name: 'Item 1' });
    });

    it('should throw error on error status', async () => {
      const errorResponse: ExecutionResponse = {
        status: 'error',
        data: {
          rows: [],
          metrics: { row_count: 0, duration_ms: 5 },
        },
        meta: {
          execution_id: 'error-id',
          operation: 'failing-op',
          timestamp_utc: '2025-12-03T15:30:00Z',
          integrity_hash: '',
        },
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      const promise = service.executeAndUnwrap('failing-op', {});

      const req = httpMock.expectOne('/operations/failing-op');
      req.flush(errorResponse);

      await expectAsync(promise).toBeRejectedWithError(
        "Operation 'failing-op' failed: Resource not found"
      );
    });

    it('should use default error message when not provided', async () => {
      const errorResponse: ExecutionResponse = {
        status: 'error',
        data: {
          rows: [],
          metrics: { row_count: 0, duration_ms: 5 },
        },
        meta: {
          execution_id: 'error-id',
          operation: 'failing-op',
          timestamp_utc: '2025-12-03T15:30:00Z',
          integrity_hash: '',
        },
      };

      const promise = service.executeAndUnwrap('failing-op', {});

      const req = httpMock.expectOne('/operations/failing-op');
      req.flush(errorResponse);

      await expectAsync(promise).toBeRejectedWithError(
        "Operation 'failing-op' failed: Operation failed"
      );
    });
  });

  describe('service initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });
});
