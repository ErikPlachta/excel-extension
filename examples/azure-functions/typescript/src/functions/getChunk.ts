/**
 * GET /api/query/chunk/{statementId}/{chunkIndex}
 * GET /api/query/status/{statementId}
 * POST /api/query/cancel/{statementId}
 *
 * Additional query endpoints.
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

function jsonResponse(data: object, status = 200): HttpResponseInit {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

// =============================================================================
// GET /api/query/chunk/{statementId}/{chunkIndex}
// =============================================================================

export async function getChunk(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const statementId = request.params.statementId;
  const chunkIndexStr = request.params.chunkIndex;

  if (!statementId) {
    return jsonResponse({ error: 'Missing statementId' }, 400);
  }

  const chunkIndex = parseInt(chunkIndexStr ?? '', 10);
  if (isNaN(chunkIndex)) {
    return jsonResponse({ error: 'Invalid chunkIndex' }, 400);
  }

  try {
    const client = getDatabricksClient();
    const result = await client.getChunk(statementId, chunkIndex);

    return jsonResponse({
      chunkIndex: result.chunkIndex,
      rowCount: result.data?.length ?? 0,
      data: result.data,
    });
  } catch (error) {
    context.error('Error fetching chunk:', error);

    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('not found')) {
      return jsonResponse(
        { error: 'Statement not found or cache expired. Re-execute query.' },
        410
      );
    }

    return jsonResponse({ error: errorMsg }, 500);
  }
}

app.http('getChunk', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'query/chunk/{statementId}/{chunkIndex}',
  handler: getChunk,
});

// =============================================================================
// GET /api/query/status/{statementId}
// =============================================================================

export async function getStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const statementId = request.params.statementId;

  if (!statementId) {
    return jsonResponse({ error: 'Missing statementId' }, 400);
  }

  try {
    const client = getDatabricksClient();
    const result = await client.getStatementStatus(statementId);

    const status = STATE_TO_STATUS[result.state] ?? 200;

    const response: Record<string, unknown> = {
      statementId: result.statementId,
      state: result.state,
    };

    if (result.state === StatementState.FAILED) {
      response.error = result.errorMessage;
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

    return jsonResponse(response, status);
  } catch (error) {
    context.error('Error fetching status:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

app.http('getStatus', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'query/status/{statementId}',
  handler: getStatus,
});

// =============================================================================
// POST /api/query/cancel/{statementId}
// =============================================================================

export async function cancelQuery(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const statementId = request.params.statementId;

  if (!statementId) {
    return jsonResponse({ error: 'Missing statementId' }, 400);
  }

  try {
    const client = getDatabricksClient();
    const success = await client.cancelStatement(statementId);

    if (success) {
      return jsonResponse({ cancelled: true });
    } else {
      return jsonResponse({ error: 'Failed to cancel' }, 500);
    }
  } catch (error) {
    context.error('Error cancelling query:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

app.http('cancelQuery', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'query/cancel/{statementId}',
  handler: cancelQuery,
});
