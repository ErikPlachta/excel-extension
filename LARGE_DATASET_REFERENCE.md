# Large Dataset Handling Reference

High-level guide for handling large datasets (100k+ rows) in the Excel add-in with Azure-based architecture.

## Architecture Overview

```
┌─────────────────────┐       HTTPS         ┌─────────────────────┐       REST/SDK       ┌─────────────────────┐
│    Excel Add-in     │ ─────────────────►  │   Azure Function    │ ──────────────────►  │  Azure Databricks   │
│    (Office.js)      │   SSO + Bearer      │    (Middleware)     │   SQL Statement      │    (Workspace)      │
│   Hosted on Azure   │      Token          │   Python/TS/C#      │        API           │   Functions/Procs   │
└─────────────────────┘                     └─────────────────────┘                      └─────────────────────┘
```

## Key Limits Quick Reference

| Layer | Limit | Value |
|-------|-------|-------|
| Excel (Office.js) | Payload per write | 5 MB |
| Excel (Office.js) | Recommended chunk | 5,000 rows |
| Azure Function | Timeout (Consumption) | 10 min max |
| Azure Function | Timeout (Flex/Premium) | Unlimited* |
| Azure Function | HTTP hard limit | 230 seconds |
| Azure Function | Max instances | 200 (Consumption), 1000 (Flex) |
| Azure Function | Outbound connections | 600 active per instance |
| Databricks | Auto-chunk size | ~10,000 rows |
| Databricks | Result cache | 24 hours |

*Grace periods: 60 min on scale-in, 10 min on platform updates.

## Key Insight: Databricks Auto-Pagination

**Good news:** Databricks SQL Statement API automatically chunks large results. You don't need LIMIT/OFFSET in stored procedures.

```json
// Databricks response includes pagination info:
{
  "statement_id": "abc123",
  "manifest": {
    "total_chunk_count": 15,
    "total_row_count": 150000
  }
}
```

Frontend fetches additional chunks via:
```
GET /api/2.0/sql/statements/{statement_id}/result/chunks/{chunk_index}
```

## Detailed Documentation

| Topic | Location | Description |
|-------|----------|-------------|
| **Azure Functions Overview** | [`examples/azure-functions/`](examples/azure-functions/) | Architecture and endpoint reference |
| **Python Template** | [`examples/azure-functions/python/`](examples/azure-functions/python/) | V2 model, httpx, connection pooling |
| **TypeScript Template** | [`examples/azure-functions/typescript/`](examples/azure-functions/typescript/) | V4 model, native fetch |
| **C# Template** | [`examples/azure-functions/csharp/`](examples/azure-functions/csharp/) | .NET 8 isolated, IHttpClientFactory |
| **Databricks Connection** | [`examples/databricks/`](examples/databricks/) | REST API, SDK, JDBC/ODBC comparison |
| **Frontend Pagination** | [`examples/frontend-pagination-handler.ts`](examples/frontend-pagination-handler.ts) | Angular service for progressive loading |
| **API Contract Types** | [`examples/api-pagination-contract.ts`](examples/api-pagination-contract.ts) | TypeScript interfaces |

## Data Flow Summary

1. **Excel** sends request with Azure AD SSO token
2. **Azure Function** validates token, calls Databricks
3. **Databricks** executes query, returns chunked results
4. **Azure Function** streams chunks to Excel
5. **Excel** writes 5k rows per Office.js call

## Error Handling Quick Reference

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Process data |
| 202 | Query running | Poll for status |
| 401 | Auth failed | Re-authenticate |
| 410 | Cache expired | Re-execute query |
| 429 | Rate limited | Wait + retry |

## Sources

**Microsoft - Office.js:**
- [Office.js Large Ranges](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large)

**Microsoft - Azure Functions:**
- [Azure Functions Scale and Hosting](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Flex Consumption Plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Concurrency in Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-concurrency)
- [Manage Connections](https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections)
- [Configure Monitoring](https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring)

**Databricks:**
- [SQL Statement API](https://docs.databricks.com/api/workspace/statementexecution)
- [Python SDK](https://docs.databricks.com/dev-tools/sdk-python.html)
