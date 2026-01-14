# C# Azure Function - Databricks SQL Middleware

Azure Functions .NET 8 Isolated Worker template for connecting Excel add-in to Databricks.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| .NET SDK | 8.0 |
| Azure Functions Core Tools | 4.x |
| Azure CLI | 2.x (for deployment) |

## Quick Start

### 1. Restore Dependencies

```bash
cd examples/azure-functions/csharp
dotnet restore
```

### 2. Configure Environment

Copy `local.settings.json` and update with your values:

| Variable | Description |
|----------|-------------|
| `DATABRICKS_HOST` | Workspace URL (e.g., `https://adb-123.azuredatabricks.net`) |
| `DATABRICKS_WAREHOUSE_ID` | SQL Warehouse ID |
| `DATABRICKS_TOKEN` | Personal Access Token or use Service Principal |

### 3. Build and Run

```bash
dotnet build
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

## Project Structure

```
csharp/
├── Functions/
│   └── QueryFunctions.cs      # All HTTP endpoints
├── Services/
│   └── DatabricksClient.cs    # Databricks API client
├── Models/
│   └── DatabricksModels.cs    # DTOs and types
├── Program.cs                 # Host configuration
├── ExcelDatabricksFunction.csproj
├── host.json
├── local.settings.json
└── README.md
```

## Deployment

### Azure CLI

```bash
# Create Function App
az functionapp create \
  --resource-group myResourceGroup \
  --name myFunctionApp \
  --consumption-plan-location eastus \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --functions-version 4 \
  --storage-account mystorageaccount

# Build and deploy
dotnet publish -c Release
func azure functionapp publish myFunctionApp
```

### Environment Variables

Set in Azure Portal -> Function App -> Configuration:

```
DATABRICKS_HOST=https://adb-123.azuredatabricks.net
DATABRICKS_WAREHOUSE_ID=abc123
DATABRICKS_TOKEN=dapi...
```

**Recommended:** Use Azure Key Vault:

```bash
az keyvault secret set --vault-name myVault --name DatabricksToken --value "dapi..."
```

Reference in app settings:
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
2. **IHttpClientFactory** handles connection pooling (see Program.cs)
3. **PooledConnectionLifetime** set to 2 minutes prevents stale connections

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

### Connection Pooling

Uses `IHttpClientFactory` with `SocketsHttpHandler` for optimal connection reuse:

```csharp
// In Program.cs
services.AddHttpClient("Databricks", client => { ... })
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(2),
        MaxConnectionsPerServer = 100
    });
```

This prevents SNAT port exhaustion (600 active connections per instance limit).

### Dependency Injection

`DatabricksClient` is registered as singleton:

```csharp
services.AddSingleton<IDatabricksClient, DatabricksClient>();
```

All function invocations share the same client instance.

### Long-Running Queries

For queries >50s (Databricks sync limit):

1. `ExecuteStatementAsync()` returns 202 with `statementId`
2. Client polls `/status/{statementId}`
3. When `state === "SUCCEEDED"`, fetch chunks

## References

- [Azure Functions .NET Isolated](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
- [Azure Functions Scale and Hosting](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Manage Connections](https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections)
- [IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory)
- [Databricks SQL Statement API](https://docs.databricks.com/api/workspace/statementexecution)
