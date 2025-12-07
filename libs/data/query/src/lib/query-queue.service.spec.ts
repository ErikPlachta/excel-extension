import { QueryQueueService } from './query-queue.service';
import { TelemetryService, WorkflowTelemetryEvent } from "@excel-platform/core/telemetry";
import { QueryConfigurationItem } from '@excel-platform/shared/types';

/** Progress state from QueryQueueService.progress$ */
interface QueueProgress {
  configId: string | null;
  total: number;
  completed: number;
  currentItemId: string | null;
}

describe('QueryQueueService', () => {
  let service: QueryQueueService;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    telemetrySpy = jasmine.createSpyObj<TelemetryService>('TelemetryService', [
      'logEvent',
      'createWorkflowEvent',
    ]);

    // createWorkflowEvent returns the same object passed in
    telemetrySpy.createWorkflowEvent.and.callFake(
      (event: Omit<WorkflowTelemetryEvent, 'category'> & { category?: string }) =>
        ({ category: 'system', ...event }) as WorkflowTelemetryEvent
    );

    service = new QueryQueueService(telemetrySpy);
  });

  function createMockItem(id: string, apiId: string): QueryConfigurationItem {
    return {
      id,
      apiId,
      displayName: `Item ${id}`,
      targetSheetName: 'TestSheet',
      targetTableName: 'TestTable',
      writeMode: 'overwrite',
      includeInBatch: true,
      parameters: {},
    };
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with isRunning = false', () => {
    expect(service.isRunning).toBeFalse();
  });

  it('should return empty progress initially', (done) => {
    service.progress$.subscribe((progress) => {
      expect(progress.configId).toBeNull();
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.currentItemId).toBeNull();
      done();
    });
  });

  it('should execute batch with successful runner', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
      createMockItem('item-2', 'api-2'),
    ];

    const runnerSpy = jasmine
      .createSpy('runner')
      .and.returnValue(Promise.resolve({ ok: true, rowCount: 10 }));

    await service.runBatch(
      {
        configId: 'config-1',
        items,
      },
      runnerSpy
    );

    expect(runnerSpy).toHaveBeenCalledTimes(2);
    expect(service.isRunning).toBeFalse();
  });

  it('should handle failed runner', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
    ];

    const runnerSpy = jasmine
      .createSpy('runner')
      .and.returnValue(Promise.resolve({ ok: false, rowCount: 0 }));

    await service.runBatch(
      {
        configId: 'config-1',
        items,
      },
      runnerSpy
    );

    expect(runnerSpy).toHaveBeenCalledTimes(1);
    expect(service.isRunning).toBeFalse();

    // Should log failure event
    const failedEvent = telemetrySpy.logEvent.calls
      .allArgs()
      .find((args) => args[0].name === 'query.queue.failed');
    expect(failedEvent).toBeDefined();
  });

  it('should handle runner exception', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
    ];

    const runnerSpy = jasmine
      .createSpy('runner')
      .and.returnValue(Promise.reject(new Error('Runner error')));

    await service.runBatch(
      {
        configId: 'config-1',
        items,
      },
      runnerSpy
    );

    expect(runnerSpy).toHaveBeenCalledTimes(1);
    expect(service.isRunning).toBeFalse();

    // Should log failure event
    const failedEvent = telemetrySpy.logEvent.calls
      .allArgs()
      .find((args) => args[0].name === 'query.queue.failed');
    expect(failedEvent).toBeDefined();
  });

  it('should reject concurrent batch runs', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
    ];

    let resolveRunner: () => void;
    const runnerPromise = new Promise<{ ok: boolean; rowCount: number }>((resolve) => {
      resolveRunner = () => resolve({ ok: true, rowCount: 10 });
    });

    const runnerSpy = jasmine.createSpy('runner').and.returnValue(runnerPromise);

    // Start first batch (won't complete immediately)
    const firstBatch = service.runBatch(
      {
        configId: 'config-1',
        items,
      },
      runnerSpy
    );

    expect(service.isRunning).toBeTrue();

    // Try to start second batch while first is running
    await service.runBatch(
      {
        configId: 'config-2',
        items,
      },
      runnerSpy
    );

    // Second batch should be rejected
    const rejectedEvent = telemetrySpy.logEvent.calls
      .allArgs()
      .find((args) => args[0].name === 'query.queue.rejected');
    expect(rejectedEvent).toBeDefined();

    // Complete first batch
    resolveRunner!();
    await firstBatch;

    expect(service.isRunning).toBeFalse();
  });

  it('should emit progress updates during execution', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
      createMockItem('item-2', 'api-2'),
    ];

    const runnerSpy = jasmine
      .createSpy('runner')
      .and.returnValue(Promise.resolve({ ok: true, rowCount: 10 }));

    const progressUpdates: QueueProgress[] = [];
    service.progress$.subscribe((progress) => {
      progressUpdates.push({ ...progress });
    });

    await service.runBatch(
      {
        configId: 'config-1',
        items,
      },
      runnerSpy
    );

    // Should have progress updates: initial, item-1 start, item-1 complete, item-2 start, item-2 complete, final reset
    expect(progressUpdates.length).toBeGreaterThan(3);
    expect(progressUpdates.some((p) => p.currentItemId === 'item-1')).toBeTrue();
    expect(progressUpdates.some((p) => p.currentItemId === 'item-2')).toBeTrue();
    expect(progressUpdates[progressUpdates.length - 1].configId).toBeNull();
  });

  it('should handle empty items array', async () => {
    const runnerSpy = jasmine.createSpy('runner');

    await service.runBatch(
      {
        configId: 'config-1',
        items: [],
      },
      runnerSpy
    );

    expect(runnerSpy).not.toHaveBeenCalled();
    expect(service.isRunning).toBeFalse();
  });

  it('should respect backoffMs delay between items', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
      createMockItem('item-2', 'api-2'),
    ];

    const runnerSpy = jasmine
      .createSpy('runner')
      .and.returnValue(Promise.resolve({ ok: true, rowCount: 10 }));

    const startTime = Date.now();

    await service.runBatch(
      {
        configId: 'config-1',
        items,
        backoffMs: 50,
      },
      runnerSpy
    );

    const elapsed = Date.now() - startTime;

    // Should take at least 50ms for backoff between 2 items
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  it('should pass maxRowsPerItem to runner', async () => {
    const items: QueryConfigurationItem[] = [
      createMockItem('item-1', 'api-1'),
    ];

    const runnerSpy = jasmine
      .createSpy('runner')
      .and.returnValue(Promise.resolve({ ok: true, rowCount: 10 }));

    await service.runBatch(
      {
        configId: 'config-1',
        items,
        maxRowsPerItem: 1000,
      },
      runnerSpy
    );

    expect(runnerSpy).toHaveBeenCalledWith(items[0], { maxRowsPerItem: 1000 });
  });
});
