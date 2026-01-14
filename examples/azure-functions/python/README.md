# Python Azure Function - Databricks SQL Middleware

Azure Functions Python V2 template for connecting Excel add-in to Databricks.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.10, 3.11, or 3.12 |
| Azure Functions Core Tools | 4.x |
| Azure CLI | 2.x (for deployment) |

## Quick Start

### 1. Install Dependencies

```bash
cd examples/azure-functions/python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `local.settings.json` and update with your values:

| Variable | Description |
|----------|-------------|
| `DATABRICKS_HOST` | Workspace URL (e.g., `https://adb-123.azuredatabricks.net`) |
| `DATABRICKS_WAREHOUSE_ID` | SQL Warehouse ID |
| `DATABRICKS_TOKEN` | Personal Access Token or use Service Principal |

### 3. Run Locally

```bash
func start
```

### 4. Test Endpoints

```bash
# Execute query
curl -X POST http://localhost:7071/api/query/execute \
  -H "Content-Type: application/json" \
  -d '{"statement": "SELECT * FROM samples.nyctaxi.trips LIMIT 100"}'

# Get chunk
curl http://localhost:7071/api/query/chunk/{statementId}/0

# Check status
curl http://localhost:7071/api/query/status/{statementId}
```

## API Endpoints

### POST /api/query/execute

Execute SQL and get statement metadata.

**Request:**
```json
{
  "statement": "SELECT * FROM table WHERE date > :start_date",
  "parameters": {"start_date": "2024-01-01"}
}
```

**Response (200/202):**
```json
{
  "statementId": "abc123",
  "state": "SUCCEEDED",
  "totalChunks": 15,
  "totalRows": 150000,
  "columns": [{"name": "id", "type": "LONG"}],
  "firstChunk": {
    "chunkIndex": 0,
    "rowCount": 10000,
    "data": [[...], [...]]
  }
}
```

### GET /api/query/chunk/{statementId}/{chunkIndex}

Retrieve a specific result chunk.

**Response:**
```json
{
  "chunkIndex": 5,
  "rowCount": 10000,
  "data": [[...], [...]]
}
```

### GET /api/query/status/{statementId}

Poll for long-running query completion.

**Response:**
```json
{
  "statementId": "abc123",
  "state": "RUNNING",
  "totalChunks": null,
  "totalRows": null
}
```

## Deployment

### Azure CLI

```bash
# Create Function App (Flex Consumption recommended for production)
az functionapp create \
  --resource-group myResourceGroup \
  --name myFunctionApp \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --storage-account mystorageaccount

# Deploy
func azure functionapp publish myFunctionApp
```

### Environment Variables

Set in Azure Portal → Function App → Configuration:

```
DATABRICKS_HOST=https://adb-123.azuredatabricks.net
DATABRICKS_WAREHOUSE_ID=abc123
DATABRICKS_TOKEN=dapi...
```

**Recommended:** Use Azure Key Vault for secrets:

```bash
az keyvault secret set --vault-name myVault --name DatabricksToken --value "dapi..."
```

Then reference in app settings:
```
DATABRICKS_TOKEN=@Microsoft.KeyVault(SecretUri=https://myVault.vault.azure.net/secrets/DatabricksToken/)
```

## Configuration

### host.json Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `functionTimeout` | 00:10:00 | Max execution time (Consumption limit) |
| `http.maxConcurrentRequests` | 100 | Per-instance concurrent requests |
| `http.maxOutstandingRequests` | 200 | Queued requests before 429 |

### Scaling for High Concurrency

For hundreds of concurrent users:

1. **Use Flex Consumption or Premium plan** for longer timeouts
2. **Connection pooling** is built-in via singleton `DatabricksClient`
3. **Increase `maxTelemetryItemsPerSecond`** in host.json for better monitoring

## Error Handling

| HTTP Status | Meaning | Client Action |
|-------------|---------|---------------|
| 200 | Success | Process data |
| 202 | Query running | Poll `/status` endpoint |
| 400 | Bad request | Check request body |
| 410 | Cache expired | Re-execute query |
| 429 | Rate limited | Wait + retry |
| 500 | Server error | Check error message |

## Architecture Notes

### Connection Reuse

The `DatabricksClient` uses a module-level singleton pattern:

```python
# BAD - creates new connection per request
async def handler(req):
    client = DatabricksClient()  # DON'T DO THIS

# GOOD - reuse singleton
async def handler(req):
    client = get_databricks_client()  # Uses shared instance
```

This prevents SNAT port exhaustion under load (600 active connections per instance).

### Long-Running Queries

For queries >50s (Databricks sync limit):

1. `execute_statement()` returns 202 with `statementId`
2. Client polls `/status/{statementId}`
3. When `state === "SUCCEEDED"`, fetch chunks

## References

- [Azure Functions Python V2](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
- [Azure Functions Scale and Hosting](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Manage Connections](https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections)
- [Databricks SQL Statement API](https://docs.databricks.com/api/workspace/statementexecution)
