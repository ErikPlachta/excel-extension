/**
 * ============================================================================
 * API PAGINATION CONTRACT EXAMPLES
 * ============================================================================
 *
 * These types define the contract between backend and frontend for handling
 * large datasets. Implement these on your API server (Databricks, etc.).
 *
 * ============================================================================
 */

// =============================================================================
// BACKEND RESPONSE TYPES (implement on your API server)
// =============================================================================

/**
 * Paginated API response structure.
 * Backend should return this shape for large dataset endpoints.
 */
export interface PaginatedApiResponse<T> {
  /** The data rows for this page */
  data: T[];

  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;

    /** Rows per page */
    pageSize: number;

    /** Total rows in full result set (if known) */
    totalRows: number | null;

    /** Total pages (if totalRows known) */
    totalPages: number | null;

    /** Whether more pages exist */
    hasMore: boolean;

    /** Cursor for next page (cursor-based pagination) */
    nextCursor?: string;
  };

  /** Optional metadata about the query execution */
  metadata?: {
    /** Time to execute the query in ms */
    executionTimeMs: number;

    /** Whether results were truncated due to limits */
    truncated: boolean;

    /** Warning messages (e.g., "Results limited to 1M rows") */
    warnings?: string[];
  };
}

/**
 * Query metadata response (for pre-flight checks).
 * Frontend can call this BEFORE fetching to know what to expect.
 */
export interface QueryMetadataResponse {
  /** Estimated row count (may be approximate) */
  estimatedRows: number;

  /** Estimated response size in bytes (helps with chunking decisions) */
  estimatedSizeBytes: number;

  /** Column information */
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'null';
    nullable: boolean;
  }>;

  /** Whether the query supports pagination */
  supportsPagination: boolean;

  /** Maximum page size supported */
  maxPageSize: number;
}

// =============================================================================
// BACKEND IMPLEMENTATION EXAMPLE (Node.js/Express)
// =============================================================================

/**
 * Example Express route handler for paginated query execution.
 *
 * ```typescript
 * // routes/queries.ts
 * import { Router } from 'express';
 *
 * const router = Router();
 *
 * // GET /api/v1/queries/:queryId/execute?page=1&pageSize=10000
 * router.get('/:queryId/execute', async (req, res) => {
 *   const { queryId } = req.params;
 *   const page = Math.max(1, parseInt(req.query.page as string) || 1);
 *   const pageSize = Math.min(
 *     MAX_PAGE_SIZE,
 *     Math.max(1, parseInt(req.query.pageSize as string) || DEFAULT_PAGE_SIZE)
 *   );
 *
 *   try {
 *     // Execute query with pagination
 *     const result = await executeQueryPaginated(queryId, { page, pageSize });
 *
 *     // Set helpful headers
 *     res.setHeader('X-Total-Rows', result.totalRows?.toString() || 'unknown');
 *     res.setHeader('X-Page', page.toString());
 *     res.setHeader('X-Page-Size', pageSize.toString());
 *
 *     // Return paginated response
 *     res.json({
 *       data: result.rows,
 *       pagination: {
 *         page,
 *         pageSize,
 *         totalRows: result.totalRows,
 *         totalPages: result.totalRows
 *           ? Math.ceil(result.totalRows / pageSize)
 *           : null,
 *         hasMore: result.rows.length === pageSize,
 *       },
 *       metadata: {
 *         executionTimeMs: result.executionTimeMs,
 *         truncated: false,
 *       },
 *     } as PaginatedApiResponse<QueryRow>);
 *
 *   } catch (error) {
 *     if (error.name === 'QueryTimeoutError') {
 *       res.status(504).json({ error: 'Query timed out' });
 *     } else {
 *       res.status(500).json({ error: 'Internal server error' });
 *     }
 *   }
 * });
 *
 * // GET /api/v1/queries/:queryId/metadata (pre-flight check)
 * router.get('/:queryId/metadata', async (req, res) => {
 *   const { queryId } = req.params;
 *
 *   const metadata = await getQueryMetadata(queryId);
 *
 *   res.json({
 *     estimatedRows: metadata.rowCount,
 *     estimatedSizeBytes: metadata.rowCount * metadata.avgRowSizeBytes,
 *     columns: metadata.columns,
 *     supportsPagination: true,
 *     maxPageSize: MAX_PAGE_SIZE,
 *   } as QueryMetadataResponse);
 * });
 * ```
 */

// =============================================================================
// BACKEND CONSTANTS (recommended values)
// =============================================================================

/** Maximum rows per page - protects server memory */
export const MAX_PAGE_SIZE = 10000;

/** Default page size if not specified */
export const DEFAULT_PAGE_SIZE = 1000;

/** Query execution timeout in ms */
export const QUERY_TIMEOUT_MS = 30000;

/** Maximum total rows to return (absolute limit) */
export const MAX_TOTAL_ROWS = 1000000;

/** Maximum response size in bytes (50MB) */
export const MAX_RESPONSE_SIZE_BYTES = 50 * 1024 * 1024;

// =============================================================================
// FRONTEND REQUEST TYPES
// =============================================================================

/**
 * Pagination request parameters.
 * Frontend sends these to request a specific page.
 */
export interface PaginationRequest {
  /** Page number (1-indexed) */
  page?: number;

  /** Rows per page (capped by server's MAX_PAGE_SIZE) */
  pageSize?: number;

  /** Cursor for cursor-based pagination (alternative to page number) */
  cursor?: string;
}

/**
 * Frontend service interface for paginated API calls.
 */
export interface PaginatedApiService {
  /**
   * Get metadata about a query before executing.
   * Use this to warn users about large datasets.
   */
  getQueryMetadata(queryId: string): Promise<QueryMetadataResponse>;

  /**
   * Execute a query with pagination.
   * Returns one page of results.
   */
  executeQueryPage<T>(
    queryId: string,
    params: Record<string, unknown>,
    pagination: PaginationRequest
  ): Promise<PaginatedApiResponse<T>>;

  /**
   * Execute a query and fetch ALL pages.
   * Handles pagination internally, calls onProgress for each page.
   */
  executeQueryAll<T>(
    queryId: string,
    params: Record<string, unknown>,
    options?: {
      pageSize?: number;
      onProgress?: (loaded: number, total: number | null) => void;
    }
  ): Promise<T[]>;
}

// =============================================================================
// FRONTEND IMPLEMENTATION EXAMPLE
// =============================================================================

/**
 * Example implementation of PaginatedApiService.
 *
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class QueryApiService implements PaginatedApiService {
 *   private readonly baseUrl = '/api/v1/queries';
 *
 *   async getQueryMetadata(queryId: string): Promise<QueryMetadataResponse> {
 *     const response = await fetch(`${this.baseUrl}/${queryId}/metadata`);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   }
 *
 *   async executeQueryPage<T>(
 *     queryId: string,
 *     params: Record<string, unknown>,
 *     pagination: PaginationRequest
 *   ): Promise<PaginatedApiResponse<T>> {
 *     const url = new URL(`${this.baseUrl}/${queryId}/execute`, window.location.origin);
 *     url.searchParams.set('page', String(pagination.page || 1));
 *     url.searchParams.set('pageSize', String(pagination.pageSize || 1000));
 *
 *     // Add query parameters
 *     Object.entries(params).forEach(([key, value]) => {
 *       if (value !== undefined) url.searchParams.set(key, String(value));
 *     });
 *
 *     const response = await fetch(url.toString());
 *     if (!response.ok) {
 *       if (response.status === 413) throw new PayloadTooLargeError();
 *       if (response.status === 429) throw new RateLimitedError();
 *       throw new Error(`HTTP ${response.status}`);
 *     }
 *
 *     return response.json();
 *   }
 *
 *   async executeQueryAll<T>(
 *     queryId: string,
 *     params: Record<string, unknown>,
 *     options?: {
 *       pageSize?: number;
 *       onProgress?: (loaded: number, total: number | null) => void;
 *     }
 *   ): Promise<T[]> {
 *     const pageSize = options?.pageSize || 10000;
 *     const allRows: T[] = [];
 *     let page = 1;
 *     let hasMore = true;
 *     let totalRows: number | null = null;
 *
 *     while (hasMore) {
 *       const response = await this.executeQueryPage<T>(
 *         queryId,
 *         params,
 *         { page, pageSize }
 *       );
 *
 *       allRows.push(...response.data);
 *       hasMore = response.pagination.hasMore;
 *       totalRows = response.pagination.totalRows;
 *       page++;
 *
 *       // Report progress
 *       options?.onProgress?.(allRows.length, totalRows);
 *     }
 *
 *     return allRows;
 *   }
 * }
 * ```
 */

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Thrown when server returns 413 Payload Too Large */
export class PayloadTooLargeError extends Error {
  constructor(message = 'Payload too large - reduce page size') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

/** Thrown when server returns 429 Too Many Requests */
export class RateLimitedError extends Error {
  constructor(
    public readonly retryAfterSeconds: number = 5,
    message = 'Rate limited - slow down requests'
  ) {
    super(message);
    this.name = 'RateLimitedError';
  }
}

/** Thrown when query execution times out */
export class QueryTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    message = 'Query timed out'
  ) {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}
