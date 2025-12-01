import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { TelemetryService } from "../core/telemetry.service";
import { QueryConfigurationItem } from '@excel-platform/shared/types';

/**
 * Simple in-memory execution queue for `QueryConfigurationItem` entries.
 *
 * This service is intentionally generic and host-agnostic; callers
 * provide the concrete runner function that knows how to execute a
 * single item (for example, using `QueryApiMockService` and
 * `ExcelService`).
 */
@Injectable({ providedIn: "root" })
export class QueryQueueService {
  private running = false;

  private readonly progressSubject = new BehaviorSubject<{
    configId: string | null;
    total: number;
    completed: number;
    currentItemId: string | null;
  }>({ configId: null, total: 0, completed: 0, currentItemId: null });

  constructor(private readonly telemetry: TelemetryService) {}

  /** Returns whether the queue is currently processing items. */
  get isRunning(): boolean {
    return this.running;
  }

  /** Observable progress for the currently running batch. */
  get progress$(): Observable<{
    configId: string | null;
    total: number;
    completed: number;
    currentItemId: string | null;
  }> {
    return this.progressSubject.asObservable();
  }

  /**
   * Enqueue a batch of items and process them sequentially using the
   * provided runner. The runner is awaited for each item before moving
   * to the next.
   */
  async runBatch(
    options: {
      configId: string;
      items: QueryConfigurationItem[];
      backoffMs?: number;
      maxRowsPerItem?: number;
    },
    runner: (
      item: QueryConfigurationItem,
      controls: { maxRowsPerItem?: number }
    ) => Promise<{
      ok: boolean;
      rowCount: number;
    }>
  ): Promise<void> {
    if (!options.items.length) {
      return;
    }

    if (this.running) {
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "query.queue.rejected",
          severity: "warn",
          context: { configId: options.configId },
        })
      );
      return;
    }

    const { configId, items, backoffMs, maxRowsPerItem } = options;

    this.running = true;
    this.progressSubject.next({
      configId,
      total: items.length,
      completed: 0,
      currentItemId: null,
    });

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "query.queue.enqueued",
        severity: "info",
        context: {
          configId,
          itemIds: items.map((i) => i.id),
        },
      })
    );

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "query.queue.started",
        severity: "info",
        context: {
          configId,
          itemIds: items.map((i) => i.id),
        },
      })
    );

    const failedItemIds: string[] = [];

    let completed = 0;

    for (const item of items) {
      this.progressSubject.next({
        configId,
        total: items.length,
        completed,
        currentItemId: item.id,
      });

      try {
        const result = await runner(item, { maxRowsPerItem });
        if (!result.ok) {
          failedItemIds.push(item.id);
        }

        completed += 1;
        this.progressSubject.next({
          configId,
          total: items.length,
          completed,
          currentItemId: null,
        });

        if (backoffMs && backoffMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      } catch (error) {
        failedItemIds.push(item.id);
        completed += 1;
        this.progressSubject.next({
          configId,
          total: items.length,
          completed,
          currentItemId: null,
        });

        // Log the error with context for debugging
        this.telemetry.logEvent(
          this.telemetry.createWorkflowEvent({
            category: "query",
            name: "query.queue.item.error",
            severity: "error",
            context: {
              configId,
              itemId: item.id,
              apiId: item.apiId,
              error: error instanceof Error ? error.message : String(error),
            },
          })
        );
      }
    }

    const anyFailed = failedItemIds.length > 0;

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: anyFailed ? "query.queue.failed" : "query.queue.completed",
        severity: anyFailed ? "error" : "info",
        context: {
          configId,
          itemIds: items.map((i) => i.id),
          failedItemIds,
        },
      })
    );

    this.running = false;
    this.progressSubject.next({
      configId: null,
      total: 0,
      completed: 0,
      currentItemId: null,
    });
  }
}
