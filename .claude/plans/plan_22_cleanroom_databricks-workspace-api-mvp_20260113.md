---
## Metadata
title: "Plan 22 - Cleanroom Rebuild: databricks-workspace-api-mvp"
description: Minified version of databricks-workspace-api for Azure Databricks Jobs
semantic_title: "feat(api): cleanroom databricks-workspace-api-mvp"
tags: [plan, feat, databricks, api, mvp]
Branch: feat/databricks-workspace-api-mvp
Base Branch: develop
status: 🔲 Planning
Created: 2026-01-13
---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Current Architecture Analysis](#current-architecture-analysis)
- [MVP Scope](#mvp-scope)
- [Implementation Plan](#implementation-plan)
- [Verification](#verification)

---

## Problem Statement

### Goal

Create a **minified cleanroom rebuild** of the existing `databricks-workspace-api` package that:
- Can be executed as Azure Databricks Jobs
- Takes parameters and returns data
- Has multiple queryable API endpoints
- Removes unnecessary complexity while retaining core functionality

### Current Package Location

```
/Users/erikplachta/repo/databricks-api/packages/databricks_api_workspace/
```

---

## Current Architecture Analysis

### Package Structure (Full Version)

```
databricks_api_workspace/
├── __init__.py           # Public API exports
├── main.py               # Entry point (HTTP router setup)
├── core/                 # 9 foundation modules
│   ├── runtime/          # Environment detection
│   ├── errors/           # Error codes, exceptions
│   ├── cache/            # Unified caching
│   ├── config/           # Config loading, drift detection
│   ├── logging/          # Structured logging
│   ├── routes/           # Route validation
│   ├── sql_utils/        # SQL escaping, parameterization
│   ├── data_utils/       # Row formatting
│   └── validation_utils/ # JSON Schema validation
├── services/             # 8 business logic modules
│   ├── query/            # Spark SQL execution
│   ├── validation/       # Contract validation
│   ├── response/         # Response envelopes, SHA-256
│   ├── databricks_async_job/  # Job queue
│   ├── auth/             # Authentication, RBAC
│   ├── http/             # FastAPI router
│   ├── execution/        # Notebook execution
│   └── operations/       # Operation registry, executor
├── mocks/                # Local development mocks
│   ├── spark_mock.py     # MockSparkSession, MockDataFrame
│   └── ...               # dbutils, clusters, jobs mocks
├── data/                 # Configuration + queries
│   ├── config.json       # Operation definitions
│   └── queries/          # SQL templates
└── tests/                # 1500+ tests
```

### Core Concepts Being Solved

| Problem | Solution in Current Package |
|---------|----------------------------|
| **Dual-mode execution** | Same code runs locally (mocks) + Databricks (real Spark) |
| **Config-driven operations** | JSON config defines operations without code changes |
| **SQL parameterization** | `:param` placeholders with type-aware escaping |
| **Parameter mapping** | Request params → SQL params via config |
| **Response shaping** | Expression-based mapping from query results |
| **Pagination** | Built-in limit/offset handling |
| **Plugin architecture** | Custom handlers via factory pattern |
| **Mock infrastructure** | Complete Spark simulation for offline testing |
| **Error categorization** | Typed exceptions with error codes |

### Request/Response Flow

```
Job/HTTP Request
    ↓
execute_operation(operation_name, params, user_context)
    ↓
Load operation config (JSON)
    ↓
Route by type: simple | plugin
    ↓
For each query in config:
    1. Load SQL template from file
    2. Map params: {sql_param: request_params[source]}
    3. Substitute :placeholders
    4. Execute via Spark SQL
    5. Collect results
    ↓
Apply response_mapping expressions
    ↓
Return envelope {status, data, meta}
```

### SQL Template Pattern

```sql
-- queries/echo.sql
SELECT
    :message AS message,
    current_timestamp() AS timestamp
```

### Operation Config Pattern

```json
{
  "example/echo": {
    "type": "simple",
    "execution": {
      "queries": [
        {
          "name": "examples/echo",
          "params_map": {"message": "message"},
          "result_key": "echo_result"
        }
      ],
      "response_mapping": {
        "message": "results.get('echo_result', [{}])[0].get('message', '')"
      }
    }
  }
}
```

---

## MVP Scope

### Questions to Clarify

1. **Which operations are needed?**
   - Health check only?
   - Specific data queries (inventory, sales, customers)?
   - All operations from current package?

2. **Authentication requirements?**
   - Skip auth for MVP (jobs run in secure context)?
   - Basic user context pass-through?
   - Full JWT/RBAC?

3. **Deployment target?**
   - Databricks Notebook → Job only?
   - Azure Functions gateway needed?
   - Direct HTTP server in cluster?

4. **Config approach?**
   - Hardcoded operations (simplest)?
   - JSON config (current pattern)?
   - Python decorators (FastAPI-style)?

5. **Mock requirements?**
   - Full mock infrastructure?
   - Minimal mocks for testing?
   - Skip mocks (test only in Databricks)?

---

## Proposed MVP Architecture

### Target Structure (Minimal)

```
databricks_workspace_api_mvp/
├── __init__.py           # Public API
├── main.py               # Entry point for jobs
├── core/
│   ├── sql.py            # SQL parameterization (merged)
│   └── errors.py         # Basic error types
├── operations/
│   ├── registry.py       # Operation config + routing
│   └── executor.py       # Query execution
├── queries/              # SQL templates
│   └── *.sql
├── config.json           # Operation definitions
└── tests/
    └── test_operations.py
```

### Core Components (MVP)

| Component | Purpose | From Current |
|-----------|---------|--------------|
| `sql.py` | Parameter substitution + escaping | `core/sql_utils/` |
| `errors.py` | Error codes + exceptions | `core/errors/` |
| `registry.py` | Load operation config | `services/operations/registry.py` |
| `executor.py` | Execute queries, map response | `services/operations/executor.py` |

### Entry Point Pattern

```python
# main.py - Databricks Job entry point
def handle_request(
    operation: str,
    params: dict,
    user_id: str = None,
    correlation_id: str = None
) -> dict:
    """
    Entry point for Databricks Jobs.

    Args:
        operation: Operation name (e.g., "inventory/status")
        params: Operation parameters
        user_id: Optional user context
        correlation_id: Optional tracing ID

    Returns:
        {"status": "success|error", "data": {...}, "meta": {...}}
    """
```

---

## Implementation Plan

### Phase 1: Core Foundation

- [ ] Create package structure
- [ ] Port SQL parameterization (`sql.py`)
- [ ] Port error types (`errors.py`)
- [ ] Add basic entry point (`main.py`)

### Phase 2: Operation Execution

- [ ] Port operation registry (simplified)
- [ ] Port query executor (Spark SQL)
- [ ] Add response mapping

### Phase 3: Operations + Queries

- [ ] Define MVP operations in config
- [ ] Create SQL templates
- [ ] Wire up operations

### Phase 4: Testing

- [ ] Add minimal mock infrastructure
- [ ] Write operation tests
- [ ] Test in Databricks environment

### Phase 5: Documentation

- [ ] Usage documentation
- [ ] Job configuration examples
- [ ] Parameter schemas

---

## Verification

1. **Unit tests**: Operations execute correctly with mocks
2. **Integration test**: Run in Databricks notebook
3. **Job test**: Execute via Databricks Job API
4. **Parameter test**: Verify SQL injection prevention

---

## Out of Scope (MVP)

- Azure Functions gateway
- Full authentication/RBAC
- Async job queuing
- SHA-256 response integrity
- Plugin architecture
- Hot-reload config
- Telemetry/structured logging

---

## Files to Reference

| Current Package | Purpose |
|----------------|---------|
| `core/sql_utils/params.py` | Parameter substitution |
| `core/sql_utils/safety.py` | SQL escaping |
| `core/errors/codes.py` | Error codes |
| `services/operations/executor.py` | Operation routing |
| `services/operations/registry.py` | Config loading |
| `services/query/executor.py` | Spark SQL execution |
| `mocks/spark_mock.py` | Mock infrastructure |
