using System.Text.Json.Serialization;

namespace ExcelDatabricksFunction.Models;

/// <summary>
/// Databricks statement execution states.
/// </summary>
public enum StatementState
{
    PENDING,
    RUNNING,
    SUCCEEDED,
    FAILED,
    CANCELED,
    CLOSED
}

/// <summary>
/// Column schema information.
/// </summary>
public record Column(string Name, string Type);

/// <summary>
/// Result from execute or get chunk operations.
/// </summary>
public record StatementResult
{
    public required string StatementId { get; init; }
    public required StatementState State { get; init; }
    public int? TotalChunkCount { get; init; }
    public int? TotalRowCount { get; init; }
    public List<Column>? Columns { get; init; }
    public List<List<object?>>? Data { get; init; }
    public int? ChunkIndex { get; init; }
    public string? ErrorMessage { get; init; }
}

// =============================================================================
// Request/Response DTOs
// =============================================================================

public record ExecuteRequest
{
    public required string Statement { get; init; }
    public Dictionary<string, string>? Parameters { get; init; }
}

public record ExecuteResponse
{
    public required string StatementId { get; init; }
    public required string State { get; init; }
    public int? TotalChunks { get; init; }
    public int? TotalRows { get; init; }
    public List<Column>? Columns { get; init; }
    public ChunkData? FirstChunk { get; init; }
    public string? Error { get; init; }
}

public record ChunkData
{
    public required int ChunkIndex { get; init; }
    public required int RowCount { get; init; }
    public required List<List<object?>> Data { get; init; }
}

public record ChunkResponse
{
    public required int ChunkIndex { get; init; }
    public required int RowCount { get; init; }
    public required List<List<object?>> Data { get; init; }
}

public record StatusResponse
{
    public required string StatementId { get; init; }
    public required string State { get; init; }
    public int? TotalChunks { get; init; }
    public int? TotalRows { get; init; }
    public List<Column>? Columns { get; init; }
    public string? Error { get; init; }
}

public record ErrorResponse
{
    public required string Error { get; init; }
}

// =============================================================================
// Databricks API Response DTOs
// =============================================================================

internal record DatabricksResponse
{
    [JsonPropertyName("statement_id")]
    public string? StatementId { get; init; }

    [JsonPropertyName("status")]
    public DatabricksStatus? Status { get; init; }

    [JsonPropertyName("manifest")]
    public DatabricksManifest? Manifest { get; init; }

    [JsonPropertyName("result")]
    public DatabricksResult? Result { get; init; }
}

internal record DatabricksStatus
{
    [JsonPropertyName("state")]
    public string? State { get; init; }

    [JsonPropertyName("error")]
    public DatabricksError? Error { get; init; }
}

internal record DatabricksError
{
    [JsonPropertyName("message")]
    public string? Message { get; init; }
}

internal record DatabricksManifest
{
    [JsonPropertyName("total_chunk_count")]
    public int? TotalChunkCount { get; init; }

    [JsonPropertyName("total_row_count")]
    public int? TotalRowCount { get; init; }

    [JsonPropertyName("schema")]
    public DatabricksSchema? Schema { get; init; }
}

internal record DatabricksSchema
{
    [JsonPropertyName("columns")]
    public List<DatabricksColumn>? Columns { get; init; }
}

internal record DatabricksColumn
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("type_name")]
    public string? TypeName { get; init; }
}

internal record DatabricksResult
{
    [JsonPropertyName("chunk_index")]
    public int? ChunkIndex { get; init; }

    [JsonPropertyName("data_array")]
    public List<List<object?>>? DataArray { get; init; }
}

internal record DatabricksChunkResponse
{
    [JsonPropertyName("chunk_index")]
    public int ChunkIndex { get; init; }

    [JsonPropertyName("data_array")]
    public List<List<object?>>? DataArray { get; init; }
}
