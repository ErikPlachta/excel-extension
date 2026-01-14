# Azure Function Examples for Excel Add-in

Complete, deployable Azure Functions middleware implementations for connecting Excel add-in to Databricks.

## Quick Start

Choose your runtime:

| Runtime | Directory | Model | Best For |
|---------|-----------|-------|----------|
| **Python** | [`python/`](python/) | V2 (decorators) | Data science, existing Python setup |
| **TypeScript** | [`typescript/`](typescript/) | V4 (app.http) | Type safety, same stack as Excel frontend |
| **C#** | [`csharp/`](csharp/) | .NET 8 Isolated | Enterprise .NET, Azure-native integrations |

Each template includes:
- Complete file structure ready for deployment
- Connection pooling for high concurrency
- Databricks REST API client
- All four endpoints (execute, chunk, status, cancel)
- Production-ready host.json with logging/concurrency config

## Architecture

```
Excel Add-in                    Azure Function                   Databricks
     │                               │                               │
     │  POST /api/query/execute      │                               │
     │  { queryId, params }          │                               │
     │ ─────────────────────────────►│                               │
     │                               │  POST /sql/statements         │
     │                               │  { statement, warehouse_id }  │
     │                               │ ─────────────────────────────►│
     │                               │                               │
     │                               │◄───────────────────────────── │
     │                               │  { statement_id,              │
     │                               │    total_chunk_count: 15 }    │
     │◄───────────────────────────── │                               │
     │  { statementId, totalChunks } │                               │
     │                               │                               │
     │  GET /api/query/chunk/0       │                               │
     │ ─────────────────────────────►│  GET /chunks/0                │
     │                               │ ─────────────────────────────►│
     │◄───────────────────────────── │◄───────────────────────────── │
     │  { data: [...] }              │                               │
```

## Endpoints to Implement

### 1. Execute Query

```http
POST /api/query/execute
Content-Type: application/json
Authorization: Bearer <user-sso-token>

{
  "queryId": "sales-report",
  "params": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

**Response:**
```json
{
  "statementId": "01ef-1234-abcd",
  "totalChunks": 15,
  "totalRows": 150000,
  "columns": [
    { "name": "id", "type": "number" },
    { "name": "name", "type": "string" }
  ]
}
```

### 2. Get Chunk

```http
GET /api/query/chunk/{statementId}/{chunkIndex}
Authorization: Bearer <user-sso-token>
```

**Response:**
```json
{
  "chunkIndex": 0,
  "rowCount": 10000,
  "data": [
    [1, "Alice", 1234.56],
    [2, "Bob", 2345.67]
  ]
}
```

### 3. Query Status (for long-running queries)

```http
GET /api/query/status/{statementId}
Authorization: Bearer <user-sso-token>
```

**Response:**
```json
{
  "state": "RUNNING",
  "progress": 45
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABRICKS_HOST` | Workspace URL | `https://adb-123.azuredatabricks.net` |
| `DATABRICKS_WAREHOUSE_ID` | SQL Warehouse ID | `abc123def456` |
| `DATABRICKS_TOKEN` | PAT or use Managed Identity | `dapi...` |
| `AZURE_AD_TENANT_ID` | For SSO validation | `12345-abcde-...` |
| `AZURE_AD_CLIENT_ID` | App registration | `67890-fghij-...` |

## Authentication Flow

```
1. Excel sends user's Azure AD token
2. Function validates token with Azure AD
3. Function uses Service Principal or PAT for Databricks
4. Databricks validates and returns data
```

### Recommended: Managed Identity

```python
# No secrets in code - Azure handles authentication
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
token = credential.get_token("2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default")
```

## Scaling & Concurrency

### Plan Comparison

| Plan | Max Instances | Timeout Max | Memory | Best For |
|------|---------------|-------------|--------|----------|
| Consumption | 200 | 10 min | 1.5 GB | Low-traffic, simple queries |
| Flex Consumption | 1000 | Unlimited* | 512 MB-4 GB | Recommended for production |
| Premium | 100/plan | Unlimited* | 3.5-14 GB | VNet, long-running, pre-warmed |

*Grace periods: 60 min on scale-in, 10 min on platform updates.

**Critical:** HTTP triggers have a **230 second hard limit** (Azure Load Balancer). For longer queries, use async polling pattern.

### Concurrency Configuration (host.json)

```json
{
  "extensions": {
    "http": {
      "maxConcurrentRequests": 100,
      "maxOutstandingRequests": 200,
      "dynamicThrottlesEnabled": true
    }
  }
}
```

Effective concurrency = `instances × maxConcurrentRequests`

### Connection Limits

| Limit | Value |
|-------|-------|
| Outbound connections per instance | 600 active / 1,200 total |
| SNAT ports per instance | 128 preallocated |

**All templates use singleton HTTP clients** to prevent port exhaustion.

## Timeout Handling

| Tier | Default | Max | Strategy |
|------|---------|-----|----------|
| Consumption | 5 min | 10 min | Return `statementId`, poll for results |
| Flex/Premium | 30 min | Unlimited | Can wait for full result |

For queries > 50s (Databricks sync limit):
1. Set `wait_timeout: "50s"` and `on_wait_timeout: "CONTINUE"`
2. Return `statementId` to client immediately
3. Client polls `/status` endpoint until complete

## Error Mapping

| Databricks State | HTTP Status | Description |
|------------------|-------------|-------------|
| `PENDING` | 202 | Query queued |
| `RUNNING` | 202 | Query executing |
| `SUCCEEDED` | 200 | Data ready |
| `FAILED` | 500 | Query error |
| `CANCELED` | 499 | User canceled |
| `CLOSED` | 410 | Cache expired |
