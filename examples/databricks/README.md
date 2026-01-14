# Databricks Connection Guide

Detailed guide for connecting Azure Functions to Azure Databricks.

## Verify Auto-Chunking Behavior

**Important:** Auto-chunking behavior depends on your Databricks workspace configuration and SQL Warehouse settings.

### How to Verify

1. **Check your warehouse type:**
   ```sql
   -- In Databricks SQL Editor
   DESCRIBE WAREHOUSE <your-warehouse-name>;
   ```

2. **Test with a large query:**
   ```bash
   curl -X POST "https://<workspace>.azuredatabricks.net/api/2.0/sql/statements" \
     -H "Authorization: Bearer $DATABRICKS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "warehouse_id": "<warehouse-id>",
       "statement": "SELECT * FROM your_table LIMIT 100000",
       "wait_timeout": "50s"
     }'
   ```

3. **Check the response for:**
   ```json
   {
     "manifest": {
       "total_chunk_count": 10,  // If > 1, auto-chunking is working
       "total_row_count": 100000
     }
   }
   ```

### Factors Affecting Chunking

| Factor | Impact |
|--------|--------|
| Warehouse type | Serverless vs Classic affects behavior |
| Result format | `JSON_ARRAY` vs `ARROW_STREAM` |
| Row size | Larger rows = smaller chunks |
| Workspace region | May vary by region |

### If Auto-Chunking is NOT Available

If `total_chunk_count` is always 1, implement pagination manually:

```sql
-- Option 1: LIMIT/OFFSET (simple but slow for large offsets)
SELECT * FROM table LIMIT 10000 OFFSET 0;
SELECT * FROM table LIMIT 10000 OFFSET 10000;

-- Option 2: Keyset pagination (faster for large datasets)
SELECT * FROM table WHERE id > @last_id ORDER BY id LIMIT 10000;
```

---

## Connection Method Comparison

| Method | Cold Start | Dependencies | Memory | Best For |
|--------|------------|--------------|--------|----------|
| **REST API** | Fast | None | Low | Consumption tier, simple queries |
| **SDK** | Medium | `databricks-sdk` | Low | Complex workflows, type safety |
| **JDBC** | Slow | Driver JAR | High | Legacy migration, ORMs |

---

## Method 1: REST API

**Best for:** Azure Functions Consumption tier, minimal dependencies

### Python

```python
import httpx
import os

DATABRICKS_HOST = os.environ["DATABRICKS_HOST"]
DATABRICKS_TOKEN = os.environ["DATABRICKS_TOKEN"]
WAREHOUSE_ID = os.environ["DATABRICKS_WAREHOUSE_ID"]

async def execute_statement(statement: str, params: dict = None) -> dict:
    """Execute SQL statement via Databricks REST API."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{DATABRICKS_HOST}/api/2.0/sql/statements",
            headers={"Authorization": f"Bearer {DATABRICKS_TOKEN}"},
            json={
                "warehouse_id": WAREHOUSE_ID,
                "statement": statement,
                "parameters": [
                    {"name": k, "value": str(v)} for k, v in (params or {}).items()
                ],
                "wait_timeout": "50s",
                "on_wait_timeout": "CONTINUE",
                "format": "JSON_ARRAY"
            }
        )
        response.raise_for_status()
        return response.json()

async def get_chunk(statement_id: str, chunk_index: int) -> dict:
    """Fetch a specific result chunk."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            f"{DATABRICKS_HOST}/api/2.0/sql/statements/{statement_id}/result/chunks/{chunk_index}",
            headers={"Authorization": f"Bearer {DATABRICKS_TOKEN}"}
        )
        response.raise_for_status()
        return response.json()
```

### TypeScript

```typescript
const DATABRICKS_HOST = process.env.DATABRICKS_HOST!;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN!;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID!;

interface StatementResponse {
  statement_id: string;
  status: { state: string; error?: { message: string } };
  manifest?: {
    total_chunk_count: number;
    total_row_count: number;
    schema: { columns: Array<{ name: string; type_name: string }> };
  };
  result?: {
    chunk_index: number;
    row_count: number;
    data_array: unknown[][];
  };
}

async function executeStatement(
  statement: string,
  params?: Record<string, string>
): Promise<StatementResponse> {
  const response = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement,
      parameters: Object.entries(params || {}).map(([name, value]) => ({ name, value })),
      wait_timeout: '50s',
      on_wait_timeout: 'CONTINUE',
      format: 'JSON_ARRAY'
    })
  });

  if (!response.ok) {
    throw new Error(`Databricks error: ${response.status}`);
  }

  return response.json();
}
```

### C#

```csharp
using System.Net.Http.Json;

public class DatabricksRestClient
{
    private readonly HttpClient _client;
    private readonly string _warehouseId;

    public DatabricksRestClient(string host, string token, string warehouseId)
    {
        _client = new HttpClient
        {
            BaseAddress = new Uri(host),
            DefaultRequestHeaders = { { "Authorization", $"Bearer {token}" } }
        };
        _warehouseId = warehouseId;
    }

    public async Task<StatementResponse> ExecuteStatementAsync(
        string statement,
        Dictionary<string, string>? parameters = null)
    {
        var request = new
        {
            warehouse_id = _warehouseId,
            statement,
            parameters = parameters?.Select(p => new { name = p.Key, value = p.Value }),
            wait_timeout = "50s",
            on_wait_timeout = "CONTINUE",
            format = "JSON_ARRAY"
        };

        var response = await _client.PostAsJsonAsync("/api/2.0/sql/statements", request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<StatementResponse>()
            ?? throw new Exception("Empty response");
    }
}
```

---

## Method 2: Databricks SDK

**Best for:** Complex workflows, type safety, auto-retry

### Python

```python
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState, ExecuteStatementRequest

# Uses DATABRICKS_HOST and DATABRICKS_TOKEN from environment
client = WorkspaceClient()

def execute_query(statement: str, warehouse_id: str) -> dict:
    """Execute statement using Databricks SDK."""
    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=statement,
        wait_timeout="50s"
    )

    if response.status.state == StatementState.FAILED:
        raise Exception(f"Query failed: {response.status.error.message}")

    return {
        "statement_id": response.statement_id,
        "total_chunks": response.manifest.total_chunk_count,
        "total_rows": response.manifest.total_row_count,
        "columns": [
            {"name": c.name, "type": c.type_name}
            for c in response.manifest.schema.columns
        ],
        "first_chunk": response.result.data_array if response.result else None
    }

def get_chunk(statement_id: str, chunk_index: int) -> list:
    """Fetch specific chunk using SDK."""
    response = client.statement_execution.get_statement_result_chunk_n(
        statement_id=statement_id,
        chunk_index=chunk_index
    )
    return response.data_array
```

### TypeScript (via REST - no official TS SDK)

Use REST API above, or consider:
- `@databricks/sql` for JDBC-style queries
- Community packages (verify maintenance status)

### C# (via REST - no official C# SDK)

Use REST API above. Microsoft has `Azure.Analytics.Synapse` but not Databricks-specific SDK.

---

## Method 3: JDBC/ODBC

**Best for:** Legacy migration, ORM compatibility

### Python

```python
from databricks import sql
import os

def get_connection():
    return sql.connect(
        server_hostname=os.environ["DATABRICKS_HOST"].replace("https://", ""),
        http_path=f"/sql/1.0/warehouses/{os.environ['DATABRICKS_WAREHOUSE_ID']}",
        access_token=os.environ["DATABRICKS_TOKEN"]
    )

def execute_query_jdbc(statement: str) -> list[dict]:
    """Execute query using JDBC-style connector."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(statement)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()  # WARNING: Loads all into memory!
            return [dict(zip(columns, row)) for row in rows]

# For large datasets, use fetchmany():
def execute_query_chunked(statement: str, chunk_size: int = 10000):
    """Stream results in chunks."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(statement)
            columns = [desc[0] for desc in cursor.description]

            while True:
                rows = cursor.fetchmany(chunk_size)
                if not rows:
                    break
                yield [dict(zip(columns, row)) for row in rows]
```

### Dependencies

```txt
# requirements.txt
databricks-sql-connector>=2.9.0
```

**Warning:** JDBC requires driver initialization on cold start (~2-5s penalty).

---

## Authentication Options

### Option 1: Personal Access Token (PAT)

Simple but requires rotation:

```python
# Store in Azure Key Vault
DATABRICKS_TOKEN = os.environ["DATABRICKS_TOKEN"]
```

### Option 2: Service Principal (Recommended)

```python
from azure.identity import ClientSecretCredential

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["DATABRICKS_SP_CLIENT_ID"],
    client_secret=os.environ["DATABRICKS_SP_CLIENT_SECRET"]
)

# Get token for Databricks
token = credential.get_token("2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default")
```

### Option 3: Managed Identity (Best for Azure)

```python
from azure.identity import DefaultAzureCredential

# No secrets needed - Azure handles auth
credential = DefaultAzureCredential()
token = credential.get_token("2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default")
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Token expired/invalid | Refresh token, check permissions |
| `404 Statement not found` | Cache expired (24h) | Re-execute query |
| `429 Too Many Requests` | Rate limited | Add exponential backoff |
| `FAILED` state | SQL error | Check `status.error.message` |
| Slow cold starts | JDBC driver init | Use REST API instead |
