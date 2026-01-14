/**
 * ============================================================================
 * FRONTEND PAGINATION HANDLER EXAMPLE
 * ============================================================================
 *
 * This example shows how the frontend should:
 * 1. Pre-flight check to warn about large datasets
 * 2. Fetch pages from the API
 * 3. Write each page to Excel progressively (don't wait for all pages)
 * 4. Handle errors with adaptive page sizing
 *
 * ============================================================================
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type {
  PaginatedApiResponse,
  QueryMetadataResponse,
  PayloadTooLargeError,
} from './api-pagination-contract';

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

export interface QueryProgress {
  phase: 'idle' | 'preflight' | 'fetching' | 'writing' | 'complete' | 'error';
  currentPage: number;
  totalPages: number | null;
  rowsLoaded: number;
  rowsWritten: number;
  totalRows: number | null;
  message: string;
  error?: Error;
}

// =============================================================================
// EXAMPLE SERVICE IMPLEMENTATION
// =============================================================================

/**
 * Example service that coordinates fetching from API and writing to Excel.
 *
 * Key patterns:
 * - Pre-flight check before large queries
 * - Progressive loading (write each page as it arrives)
 * - Adaptive page sizing on errors
 * - User feedback via progress observable
 */
@Injectable({ providedIn: 'root' })
export class LargeDatasetHandler {
  /** Observable for tracking progress */
  readonly progress$ = new BehaviorSubject<QueryProgress>({
    phase: 'idle',
    currentPage: 0,
    totalPages: null,
    rowsLoaded: 0,
    rowsWritten: 0,
    totalRows: null,
    message: 'Ready',
  });

  /** Warning threshold for large datasets */
  private readonly WARN_ROW_THRESHOLD = 50000;

  /** Default page size */
  private readonly DEFAULT_PAGE_SIZE = 10000;

  /** Minimum page size (stop reducing below this) */
  private readonly MIN_PAGE_SIZE = 100;

  constructor(
    private readonly api: any,    // Your QueryApiService
    private readonly excel: any,  // Your ExcelService
    private readonly dialog: any, // Your dialog/confirmation service
  ) {}

  /**
   * Execute a query with full large-dataset handling.
   *
   * 1. Pre-flight check (get metadata)
   * 2. Warn user if large
   * 3. Fetch pages progressively
   * 4. Write to Excel as pages arrive
   */
  async executeQueryWithLargeDatasetSupport(
    queryId: string,
    params: Record<string, unknown>,
    target: { sheetName: string; tableName: string }
  ): Promise<{ success: boolean; rowsWritten: number }> {
    try {
      // Phase 1: Pre-flight check
      this.updateProgress({
        phase: 'preflight',
        message: 'Checking query size...',
      });

      const metadata = await this.preflightCheck(queryId);

      // Phase 2: Warn user about large datasets
      if (metadata.estimatedRows > this.WARN_ROW_THRESHOLD) {
        const confirmed = await this.confirmLargeQuery(metadata);
        if (!confirmed) {
          this.updateProgress({
            phase: 'idle',
            message: 'Query cancelled by user',
          });
          return { success: false, rowsWritten: 0 };
        }
      }

      // Phase 3: Fetch and write progressively
      const result = await this.fetchAndWriteProgressively(
        queryId,
        params,
        target,
        metadata
      );

      this.updateProgress({
        phase: 'complete',
        rowsWritten: result.rowsWritten,
        message: `Complete: ${result.rowsWritten.toLocaleString()} rows written`,
      });

      return result;

    } catch (error) {
      this.updateProgress({
        phase: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Pre-flight check: Get metadata BEFORE fetching data.
   * This lets us warn users and make decisions about chunking.
   */
  private async preflightCheck(queryId: string): Promise<QueryMetadataResponse> {
    try {
      return await this.api.getQueryMetadata(queryId);
    } catch (error) {
      // If metadata endpoint not available, return defaults
      console.warn('Metadata endpoint not available, using defaults');
      return {
        estimatedRows: -1, // Unknown
        estimatedSizeBytes: -1,
        columns: [],
        supportsPagination: true,
        maxPageSize: this.DEFAULT_PAGE_SIZE,
      };
    }
  }

  /**
   * Show confirmation dialog for large queries.
   */
  private async confirmLargeQuery(metadata: QueryMetadataResponse): Promise<boolean> {
    const estimatedTime = Math.ceil(metadata.estimatedRows / 10000) * 2; // ~2s per 10k rows

    return this.dialog.confirm({
      title: 'Large Dataset Warning',
      message: `This query will return approximately ${metadata.estimatedRows.toLocaleString()} rows.
This may take ${estimatedTime}+ seconds to complete.
Do you want to continue?`,
      confirmText: 'Continue',
      cancelText: 'Cancel',
    });
  }

  /**
   * Fetch pages from API and write to Excel progressively.
   *
   * Key behavior:
   * - Writes each page to Excel as soon as it arrives
   * - Doesn't wait for all pages before writing
   * - Reduces page size on payload errors
   */
  private async fetchAndWriteProgressively(
    queryId: string,
    params: Record<string, unknown>,
    target: { sheetName: string; tableName: string },
    metadata: QueryMetadataResponse
  ): Promise<{ success: boolean; rowsWritten: number }> {
    let pageSize = Math.min(this.DEFAULT_PAGE_SIZE, metadata.maxPageSize);
    let page = 1;
    let hasMore = true;
    let totalRowsWritten = 0;
    let isFirstPage = true;

    const totalPages = metadata.estimatedRows > 0
      ? Math.ceil(metadata.estimatedRows / pageSize)
      : null;

    while (hasMore) {
      try {
        // Update progress: fetching
        this.updateProgress({
          phase: 'fetching',
          currentPage: page,
          totalPages,
          rowsLoaded: totalRowsWritten,
          message: `Fetching page ${page}${totalPages ? ` of ${totalPages}` : ''}...`,
        });

        // Fetch this page
        const response = await this.fetchPageWithRetry(
          queryId,
          params,
          { page, pageSize }
        );

        // Update progress: writing
        this.updateProgress({
          phase: 'writing',
          currentPage: page,
          totalPages: response.pagination.totalPages,
          totalRows: response.pagination.totalRows,
          rowsLoaded: totalRowsWritten + response.data.length,
          message: `Writing page ${page} to Excel...`,
        });

        // Write to Excel
        if (isFirstPage) {
          // First page: create/overwrite table
          await this.excel.upsertQueryTable(
            queryId,
            target,
            response.data
          );
          isFirstPage = false;
        } else {
          // Subsequent pages: append to existing table
          await this.excel.appendToTable(
            target.tableName,
            response.data
          );
        }

        totalRowsWritten += response.data.length;
        hasMore = response.pagination.hasMore;
        page++;

        // Update progress after write
        this.updateProgress({
          rowsWritten: totalRowsWritten,
          message: `${totalRowsWritten.toLocaleString()} rows written...`,
        });

      } catch (error) {
        // Handle payload too large - reduce page size
        if (this.isPayloadTooLargeError(error) && pageSize > this.MIN_PAGE_SIZE) {
          const newPageSize = Math.max(this.MIN_PAGE_SIZE, Math.floor(pageSize / 2));
          console.warn(`Payload too large, reducing page size: ${pageSize} → ${newPageSize}`);
          pageSize = newPageSize;
          // Don't increment page - retry same page with smaller size
          continue;
        }

        throw error;
      }
    }

    return { success: true, rowsWritten: totalRowsWritten };
  }

  /**
   * Fetch a page with retry logic.
   */
  private async fetchPageWithRetry<T>(
    queryId: string,
    params: Record<string, unknown>,
    pagination: { page: number; pageSize: number },
    maxRetries: number = 3
  ): Promise<PaginatedApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.api.executeQueryPage<T>(queryId, params, pagination);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry payload errors - let caller handle
        if (this.isPayloadTooLargeError(error)) {
          throw error;
        }

        // Rate limited - wait and retry
        if (this.isRateLimitedError(error)) {
          const waitMs = this.getRateLimitWaitTime(error);
          console.warn(`Rate limited, waiting ${waitMs}ms before retry`);
          await this.sleep(waitMs);
          continue;
        }

        // Other errors - exponential backoff
        if (attempt < maxRetries) {
          const backoffMs = 1000 * Math.pow(2, attempt - 1);
          console.warn(`Request failed, retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})`);
          await this.sleep(backoffMs);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private updateProgress(partial: Partial<QueryProgress>): void {
    this.progress$.next({
      ...this.progress$.value,
      ...partial,
    });
  }

  private isPayloadTooLargeError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'PayloadTooLargeError' ||
             error.message.includes('413') ||
             error.message.toLowerCase().includes('payload too large');
    }
    return false;
  }

  private isRateLimitedError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'RateLimitedError' ||
             error.message.includes('429') ||
             error.message.toLowerCase().includes('rate limit');
    }
    return false;
  }

  private getRateLimitWaitTime(error: unknown): number {
    // Try to get Retry-After from error, default to 5 seconds
    if (error && typeof error === 'object' && 'retryAfterSeconds' in error) {
      return (error as { retryAfterSeconds: number }).retryAfterSeconds * 1000;
    }
    return 5000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/**
 * Example usage in a component:
 *
 * ```typescript
 * @Component({...})
 * export class QueryRunnerComponent {
 *   constructor(private handler: LargeDatasetHandler) {}
 *
 *   // Subscribe to progress updates
 *   ngOnInit() {
 *     this.handler.progress$.subscribe(progress => {
 *       this.progressMessage = progress.message;
 *       this.progressPercent = progress.totalRows
 *         ? (progress.rowsWritten / progress.totalRows) * 100
 *         : null;
 *     });
 *   }
 *
 *   async runQuery() {
 *     try {
 *       const result = await this.handler.executeQueryWithLargeDatasetSupport(
 *         'my-query-id',
 *         { startDate: '2024-01-01', endDate: '2024-12-31' },
 *         { sheetName: 'Data', tableName: 'QueryResults' }
 *       );
 *       console.log(`Wrote ${result.rowsWritten} rows`);
 *     } catch (error) {
 *       console.error('Query failed:', error);
 *     }
 *   }
 * }
 * ```
 */
