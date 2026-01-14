"""
Databricks SQL Statement Execution Client

Uses REST API for minimal cold start overhead. Reuses httpx.AsyncClient
to avoid SNAT port exhaustion under high concurrency.

Reference:
- https://docs.databricks.com/api/workspace/statementexecution
- https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections
"""

import os
import logging
from typing import Any
from dataclasses import dataclass
from enum import Enum

import httpx

logger = logging.getLogger(__name__)


class StatementState(str, Enum):
    """Databricks statement execution states."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"
    CLOSED = "CLOSED"


@dataclass
class StatementResult:
    """Result from execute_statement or get_chunk."""
    statement_id: str
    state: StatementState
    total_chunk_count: int | None = None
    total_row_count: int | None = None
    columns: list[dict] | None = None
    data: list[list[Any]] | None = None
    chunk_index: int | None = None
    error_message: str | None = None


class DatabricksClient:
    """
    Async Databricks SQL Statement Execution client.

    IMPORTANT: Create ONE instance per function app (singleton pattern)
    to enable connection pooling and avoid port exhaustion.

    Usage:
        # In function_app.py - module level
        databricks = DatabricksClient()

        # In function handler
        result = await databricks.execute_statement("SELECT * FROM table")
    """

    def __init__(
        self,
        host: str | None = None,
        token: str | None = None,
        warehouse_id: str | None = None,
        timeout: float = 60.0,
    ):
        self.host = (host or os.environ.get("DATABRICKS_HOST", "")).rstrip("/")
        self.token = token or os.environ.get("DATABRICKS_TOKEN", "")
        self.warehouse_id = warehouse_id or os.environ.get("DATABRICKS_WAREHOUSE_ID", "")

        if not all([self.host, self.token, self.warehouse_id]):
            raise ValueError(
                "Missing Databricks config. Set DATABRICKS_HOST, DATABRICKS_TOKEN, "
                "and DATABRICKS_WAREHOUSE_ID environment variables."
            )

        # Reuse client for connection pooling (critical for high concurrency)
        # PooledConnectionLifetime equivalent via limits
        self._client = httpx.AsyncClient(
            base_url=self.host,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(timeout, connect=10.0),
            limits=httpx.Limits(
                max_keepalive_connections=20,
                max_connections=100,
                keepalive_expiry=120.0,  # 2 minutes
            ),
        )

    async def close(self) -> None:
        """Close the HTTP client. Call on app shutdown."""
        await self._client.aclose()

    async def execute_statement(
        self,
        statement: str,
        parameters: dict[str, str] | None = None,
        wait_timeout: str = "50s",
        format_: str = "JSON_ARRAY",
    ) -> StatementResult:
        """
        Execute a SQL statement and return initial results.

        Args:
            statement: SQL statement to execute
            parameters: Named parameters for parameterized queries
            wait_timeout: How long to wait for initial results (max 50s)
            format_: Result format (JSON_ARRAY recommended for chunking)

        Returns:
            StatementResult with statement_id, state, and first chunk if ready

        Raises:
            httpx.HTTPStatusError: On HTTP errors (4xx, 5xx)
        """
        payload = {
            "warehouse_id": self.warehouse_id,
            "statement": statement,
            "wait_timeout": wait_timeout,
            "on_wait_timeout": "CONTINUE",  # Don't cancel on timeout
            "format": format_,
        }

        if parameters:
            payload["parameters"] = [
                {"name": k, "value": str(v)} for k, v in parameters.items()
            ]

        response = await self._client.post(
            "/api/2.0/sql/statements",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

        return self._parse_statement_response(data)

    async def get_statement_status(self, statement_id: str) -> StatementResult:
        """
        Get current status of a statement execution.

        Use this to poll for completion of long-running queries.
        """
        response = await self._client.get(
            f"/api/2.0/sql/statements/{statement_id}",
        )
        response.raise_for_status()
        data = response.json()

        return self._parse_statement_response(data)

    async def get_chunk(self, statement_id: str, chunk_index: int) -> StatementResult:
        """
        Get a specific result chunk by index.

        Args:
            statement_id: ID from execute_statement
            chunk_index: 0-based chunk index

        Returns:
            StatementResult with chunk data
        """
        response = await self._client.get(
            f"/api/2.0/sql/statements/{statement_id}/result/chunks/{chunk_index}",
        )
        response.raise_for_status()
        data = response.json()

        return StatementResult(
            statement_id=statement_id,
            state=StatementState.SUCCEEDED,
            chunk_index=data.get("chunk_index"),
            data=data.get("data_array"),
        )

    async def cancel_statement(self, statement_id: str) -> bool:
        """Cancel a running statement."""
        response = await self._client.post(
            f"/api/2.0/sql/statements/{statement_id}/cancel",
        )
        return response.status_code == 200

    def _parse_statement_response(self, data: dict) -> StatementResult:
        """Parse Databricks API response into StatementResult."""
        status = data.get("status", {})
        state = StatementState(status.get("state", "PENDING"))

        manifest = data.get("manifest", {})
        result = data.get("result", {})

        error_msg = None
        if state == StatementState.FAILED:
            error_msg = status.get("error", {}).get("message", "Unknown error")

        columns = None
        if "schema" in manifest:
            columns = [
                {"name": c["name"], "type": c.get("type_name", "string")}
                for c in manifest["schema"].get("columns", [])
            ]

        return StatementResult(
            statement_id=data.get("statement_id", ""),
            state=state,
            total_chunk_count=manifest.get("total_chunk_count"),
            total_row_count=manifest.get("total_row_count"),
            columns=columns,
            data=result.get("data_array"),
            chunk_index=result.get("chunk_index"),
            error_message=error_msg,
        )


# Module-level singleton for connection reuse
_client: DatabricksClient | None = None


def get_databricks_client() -> DatabricksClient:
    """
    Get or create the singleton Databricks client.

    This ensures connection pooling across all function invocations.
    """
    global _client
    if _client is None:
        _client = DatabricksClient()
    return _client
