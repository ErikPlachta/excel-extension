/**
 * Databricks SQL Statement Execution Client
 *
 * Uses native fetch with connection reuse to avoid SNAT port exhaustion.
 *
 * Reference:
 * - https://docs.databricks.com/api/workspace/statementexecution
 * - https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections
 */

// =============================================================================
// Types
// =============================================================================

export enum StatementState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  CLOSED = 'CLOSED',
}

export interface Column {
  name: string;
  type: string;
}

export interface StatementResult {
  statementId: string;
  state: StatementState;
  totalChunkCount?: number;
  totalRowCount?: number;
  columns?: Column[];
  data?: unknown[][];
  chunkIndex?: number;
  errorMessage?: string;
}

interface DatabricksConfig {
  host: string;
  token: string;
  warehouseId: string;
  timeout?: number;
}

interface DatabricksResponse {
  statement_id: string;
  status: {
    state: string;
    error?: { message: string };
  };
  manifest?: {
    total_chunk_count: number;
    total_row_count: number;
    schema?: {
      columns: Array<{ name: string; type_name?: string }>;
    };
  };
  result?: {
    chunk_index: number;
    data_array?: unknown[][];
  };
}

// =============================================================================
// Client
// =============================================================================

export class DatabricksClient {
  private readonly host: string;
  private readonly token: string;
  private readonly warehouseId: string;
  private readonly timeout: number;

  constructor(config?: Partial<DatabricksConfig>) {
    this.host = (config?.host ?? process.env.DATABRICKS_HOST ?? '').replace(/\/$/, '');
    this.token = config?.token ?? process.env.DATABRICKS_TOKEN ?? '';
    this.warehouseId = config?.warehouseId ?? process.env.DATABRICKS_WAREHOUSE_ID ?? '';
    this.timeout = config?.timeout ?? 60000;

    if (!this.host || !this.token || !this.warehouseId) {
      throw new Error(
        'Missing Databricks config. Set DATABRICKS_HOST, DATABRICKS_TOKEN, ' +
        'and DATABRICKS_WAREHOUSE_ID environment variables.'
      );
    }
  }

  /**
   * Execute a SQL statement and return initial results.
   */
  async executeStatement(
    statement: string,
    parameters?: Record<string, string>,
    waitTimeout = '50s',
    format = 'JSON_ARRAY'
  ): Promise<StatementResult> {
    const payload: Record<string, unknown> = {
      warehouse_id: this.warehouseId,
      statement,
      wait_timeout: waitTimeout,
      on_wait_timeout: 'CONTINUE',
      format,
    };

    if (parameters) {
      payload.parameters = Object.entries(parameters).map(([name, value]) => ({
        name,
        value: String(value),
      }));
    }

    const response = await this.fetch('/api/2.0/sql/statements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return this.parseResponse(response);
  }

  /**
   * Get current status of a statement execution.
   */
  async getStatementStatus(statementId: string): Promise<StatementResult> {
    const response = await this.fetch(`/api/2.0/sql/statements/${statementId}`);
    return this.parseResponse(response);
  }

  /**
   * Get a specific result chunk by index.
   */
  async getChunk(statementId: string, chunkIndex: number): Promise<StatementResult> {
    const response = await this.fetch(
      `/api/2.0/sql/statements/${statementId}/result/chunks/${chunkIndex}`
    );

    return {
      statementId,
      state: StatementState.SUCCEEDED,
      chunkIndex: response.chunk_index ?? chunkIndex,
      data: response.data_array,
    };
  }

  /**
   * Cancel a running statement.
   */
  async cancelStatement(statementId: string): Promise<boolean> {
    try {
      await this.fetch(`/api/2.0/sql/statements/${statementId}/cancel`, {
        method: 'POST',
      });
      return true;
    } catch {
      return false;
    }
  }

  private async fetch(path: string, options?: RequestInit): Promise<DatabricksResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.host}${path}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Databricks API error ${response.status}: ${text}`);
      }

      return response.json() as Promise<DatabricksResponse>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseResponse(data: DatabricksResponse): StatementResult {
    const state = data.status.state as StatementState;

    const result: StatementResult = {
      statementId: data.statement_id,
      state,
    };

    if (state === StatementState.FAILED) {
      result.errorMessage = data.status.error?.message ?? 'Unknown error';
    }

    if (data.manifest) {
      result.totalChunkCount = data.manifest.total_chunk_count;
      result.totalRowCount = data.manifest.total_row_count;

      if (data.manifest.schema?.columns) {
        result.columns = data.manifest.schema.columns.map((c) => ({
          name: c.name,
          type: c.type_name ?? 'string',
        }));
      }
    }

    if (data.result) {
      result.chunkIndex = data.result.chunk_index;
      result.data = data.result.data_array;
    }

    return result;
  }
}

// =============================================================================
// Singleton
// =============================================================================

let clientInstance: DatabricksClient | null = null;

/**
 * Get or create the singleton Databricks client.
 * Ensures connection reuse across all function invocations.
 */
export function getDatabricksClient(): DatabricksClient {
  if (!clientInstance) {
    clientInstance = new DatabricksClient();
  }
  return clientInstance;
}
