/**
 * POST /api/query/execute
 *
 * Execute SQL and return statement metadata.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDatabricksClient, StatementState } from '../services/databricksClient.js';

// HTTP status mapping
const STATE_TO_STATUS: Record<StatementState, number> = {
  [StatementState.PENDING]: 202,
  [StatementState.RUNNING]: 202,
  [StatementState.SUCCEEDED]: 200,
  [StatementState.FAILED]: 500,
  [StatementState.CANCELED]: 410,
  [StatementState.CLOSED]: 410,
};

interface ExecuteRequest {
  statement: string;
  parameters?: Record<string, string>;
}

interface ExecuteResponse {
  statementId: string;
  state: string;
  totalChunks?: number;
  totalRows?: number;
  columns?: Array<{ name: string; type: string }>;
  firstChunk?: {
    chunkIndex: number;
    rowCount: number;
    data: unknown[][];
  };
  error?: string;
}

export async function executeQuery(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: ExecuteRequest;

  try {
    body = (await request.json()) as ExecuteRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.statement) {
    return jsonResponse({ error: "Missing 'statement' field" }, 400);
  }

  try {
    const client = getDatabricksClient();
    const result = await client.executeStatement(body.statement, body.parameters);

    const status = STATE_TO_STATUS[result.state] ?? 200;

    const response: ExecuteResponse = {
      statementId: result.statementId,
      state: result.state,
    };

    if (result.state === StatementState.FAILED) {
      response.error = result.errorMessage;
      return jsonResponse(response, 500);
    }

    if (result.totalChunkCount !== undefined) {
      response.totalChunks = result.totalChunkCount;
    }
    if (result.totalRowCount !== undefined) {
      response.totalRows = result.totalRowCount;
    }
    if (result.columns) {
      response.columns = result.columns;
    }

    // Include first chunk if immediately available
    if (result.data && result.state === StatementState.SUCCEEDED) {
      response.firstChunk = {
        chunkIndex: 0,
        rowCount: result.data.length,
        data: result.data,
      };
    }

    return jsonResponse(response, status);
  } catch (error) {
    context.error('Error executing query:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

function jsonResponse(data: object, status = 200): HttpResponseInit {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

app.http('executeQuery', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'query/execute',
  handler: executeQuery,
});
