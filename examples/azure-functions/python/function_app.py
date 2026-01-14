"""
Azure Functions Python V2 - Databricks SQL Middleware

Endpoints:
- POST /api/query/execute - Execute SQL, return statement_id + metadata
- GET /api/query/chunk/{statementId}/{chunkIndex} - Get result chunk
- GET /api/query/status/{statementId} - Check execution status

Reference:
- https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- https://docs.databricks.com/api/workspace/statementexecution
"""

import json
import logging
from http import HTTPStatus

import azure.functions as func

from databricks_client import get_databricks_client, StatementState

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)
logger = logging.getLogger(__name__)


# =============================================================================
# HTTP Status Mapping
# =============================================================================

STATE_TO_HTTP = {
    StatementState.PENDING: HTTPStatus.ACCEPTED,      # 202
    StatementState.RUNNING: HTTPStatus.ACCEPTED,      # 202
    StatementState.SUCCEEDED: HTTPStatus.OK,          # 200
    StatementState.FAILED: HTTPStatus.INTERNAL_SERVER_ERROR,  # 500
    StatementState.CANCELED: HTTPStatus.GONE,         # 410 (client canceled)
    StatementState.CLOSED: HTTPStatus.GONE,           # 410 (cache expired)
}


def json_response(data: dict, status: HTTPStatus = HTTPStatus.OK) -> func.HttpResponse:
    """Create JSON HTTP response."""
    return func.HttpResponse(
        body=json.dumps(data),
        status_code=status.value,
        mimetype="application/json",
    )


def error_response(message: str, status: HTTPStatus) -> func.HttpResponse:
    """Create error JSON response."""
    return json_response({"error": message}, status)


# =============================================================================
# POST /api/query/execute
# =============================================================================

@app.route(route="query/execute", methods=["POST"])
async def execute_query(req: func.HttpRequest) -> func.HttpResponse:
    """
    Execute a SQL query and return statement metadata.

    Request body:
    {
        "statement": "SELECT * FROM table WHERE date > :start_date",
        "parameters": {"start_date": "2024-01-01"}
    }

    Response (200/202):
    {
        "statementId": "abc123",
        "state": "SUCCEEDED",
        "totalChunks": 15,
        "totalRows": 150000,
        "columns": [{"name": "id", "type": "LONG"}, ...]
    }
    """
    try:
        body = req.get_json()
    except ValueError:
        return error_response("Invalid JSON body", HTTPStatus.BAD_REQUEST)

    statement = body.get("statement")
    if not statement:
        return error_response("Missing 'statement' field", HTTPStatus.BAD_REQUEST)

    parameters = body.get("parameters")

    try:
        client = get_databricks_client()
        result = await client.execute_statement(
            statement=statement,
            parameters=parameters,
        )

        http_status = STATE_TO_HTTP.get(result.state, HTTPStatus.OK)

        response_data = {
            "statementId": result.statement_id,
            "state": result.state.value,
        }

        if result.state == StatementState.FAILED:
            response_data["error"] = result.error_message
            return json_response(response_data, HTTPStatus.INTERNAL_SERVER_ERROR)

        if result.total_chunk_count is not None:
            response_data["totalChunks"] = result.total_chunk_count
        if result.total_row_count is not None:
            response_data["totalRows"] = result.total_row_count
        if result.columns:
            response_data["columns"] = result.columns

        # Include first chunk data if immediately available
        if result.data is not None and result.state == StatementState.SUCCEEDED:
            response_data["firstChunk"] = {
                "chunkIndex": 0,
                "rowCount": len(result.data),
                "data": result.data,
            }

        return json_response(response_data, http_status)

    except Exception as e:
        logger.exception("Error executing query")
        return error_response(str(e), HTTPStatus.INTERNAL_SERVER_ERROR)


# =============================================================================
# GET /api/query/chunk/{statementId}/{chunkIndex}
# =============================================================================

@app.route(route="query/chunk/{statementId}/{chunkIndex}", methods=["GET"])
async def get_chunk(req: func.HttpRequest) -> func.HttpResponse:
    """
    Get a specific result chunk.

    Response (200):
    {
        "chunkIndex": 5,
        "rowCount": 10000,
        "data": [[...], [...], ...]
    }
    """
    statement_id = req.route_params.get("statementId")
    chunk_index_str = req.route_params.get("chunkIndex")

    if not statement_id:
        return error_response("Missing statementId", HTTPStatus.BAD_REQUEST)

    try:
        chunk_index = int(chunk_index_str)
    except (ValueError, TypeError):
        return error_response("Invalid chunkIndex", HTTPStatus.BAD_REQUEST)

    try:
        client = get_databricks_client()
        result = await client.get_chunk(statement_id, chunk_index)

        return json_response({
            "chunkIndex": result.chunk_index,
            "rowCount": len(result.data) if result.data else 0,
            "data": result.data,
        })

    except Exception as e:
        logger.exception("Error fetching chunk")

        # Handle common errors
        error_msg = str(e)
        if "404" in error_msg or "not found" in error_msg.lower():
            return error_response(
                "Statement not found or cache expired. Re-execute query.",
                HTTPStatus.GONE,
            )

        return error_response(error_msg, HTTPStatus.INTERNAL_SERVER_ERROR)


# =============================================================================
# GET /api/query/status/{statementId}
# =============================================================================

@app.route(route="query/status/{statementId}", methods=["GET"])
async def get_status(req: func.HttpRequest) -> func.HttpResponse:
    """
    Get execution status for a statement.

    Use this to poll for completion of long-running queries.

    Response (200/202):
    {
        "statementId": "abc123",
        "state": "RUNNING",
        "totalChunks": null,
        "totalRows": null
    }
    """
    statement_id = req.route_params.get("statementId")

    if not statement_id:
        return error_response("Missing statementId", HTTPStatus.BAD_REQUEST)

    try:
        client = get_databricks_client()
        result = await client.get_statement_status(statement_id)

        http_status = STATE_TO_HTTP.get(result.state, HTTPStatus.OK)

        response_data = {
            "statementId": result.statement_id,
            "state": result.state.value,
        }

        if result.state == StatementState.FAILED:
            response_data["error"] = result.error_message

        if result.total_chunk_count is not None:
            response_data["totalChunks"] = result.total_chunk_count
        if result.total_row_count is not None:
            response_data["totalRows"] = result.total_row_count
        if result.columns:
            response_data["columns"] = result.columns

        return json_response(response_data, http_status)

    except Exception as e:
        logger.exception("Error fetching status")
        return error_response(str(e), HTTPStatus.INTERNAL_SERVER_ERROR)


# =============================================================================
# POST /api/query/cancel/{statementId}
# =============================================================================

@app.route(route="query/cancel/{statementId}", methods=["POST"])
async def cancel_query(req: func.HttpRequest) -> func.HttpResponse:
    """Cancel a running query."""
    statement_id = req.route_params.get("statementId")

    if not statement_id:
        return error_response("Missing statementId", HTTPStatus.BAD_REQUEST)

    try:
        client = get_databricks_client()
        success = await client.cancel_statement(statement_id)

        if success:
            return json_response({"cancelled": True})
        else:
            return error_response("Failed to cancel", HTTPStatus.INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.exception("Error cancelling query")
        return error_response(str(e), HTTPStatus.INTERNAL_SERVER_ERROR)
