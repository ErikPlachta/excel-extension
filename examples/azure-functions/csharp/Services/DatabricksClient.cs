using System.Net.Http.Json;
using System.Text.Json;
using ExcelDatabricksFunction.Models;

namespace ExcelDatabricksFunction.Services;

/// <summary>
/// Databricks SQL Statement Execution client interface.
/// </summary>
public interface IDatabricksClient
{
    Task<StatementResult> ExecuteStatementAsync(
        string statement,
        Dictionary<string, string>? parameters = null,
        string waitTimeout = "50s",
        string format = "JSON_ARRAY",
        CancellationToken cancellationToken = default);

    Task<StatementResult> GetStatementStatusAsync(
        string statementId,
        CancellationToken cancellationToken = default);

    Task<StatementResult> GetChunkAsync(
        string statementId,
        int chunkIndex,
        CancellationToken cancellationToken = default);

    Task<bool> CancelStatementAsync(
        string statementId,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Databricks SQL Statement Execution client.
///
/// Uses IHttpClientFactory for connection pooling to prevent SNAT port exhaustion.
///
/// Reference:
/// - https://docs.databricks.com/api/workspace/statementexecution
/// - https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections
/// </summary>
public class DatabricksClient : IDatabricksClient
{
    private readonly HttpClient _httpClient;
    private readonly string _warehouseId;
    private readonly JsonSerializerOptions _jsonOptions;

    public DatabricksClient(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("Databricks");
        _warehouseId = Environment.GetEnvironmentVariable("DATABRICKS_WAREHOUSE_ID")
            ?? throw new InvalidOperationException("DATABRICKS_WAREHOUSE_ID not configured");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };
    }

    public async Task<StatementResult> ExecuteStatementAsync(
        string statement,
        Dictionary<string, string>? parameters = null,
        string waitTimeout = "50s",
        string format = "JSON_ARRAY",
        CancellationToken cancellationToken = default)
    {
        var payload = new Dictionary<string, object>
        {
            ["warehouse_id"] = _warehouseId,
            ["statement"] = statement,
            ["wait_timeout"] = waitTimeout,
            ["on_wait_timeout"] = "CONTINUE",
            ["format"] = format
        };

        if (parameters != null)
        {
            payload["parameters"] = parameters.Select(p => new { name = p.Key, value = p.Value }).ToList();
        }

        var response = await _httpClient.PostAsJsonAsync(
            "/api/2.0/sql/statements",
            payload,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<DatabricksResponse>(
            _jsonOptions, cancellationToken);

        return ParseResponse(data!);
    }

    public async Task<StatementResult> GetStatementStatusAsync(
        string statementId,
        CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync(
            $"/api/2.0/sql/statements/{statementId}",
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<DatabricksResponse>(
            _jsonOptions, cancellationToken);

        return ParseResponse(data!);
    }

    public async Task<StatementResult> GetChunkAsync(
        string statementId,
        int chunkIndex,
        CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync(
            $"/api/2.0/sql/statements/{statementId}/result/chunks/{chunkIndex}",
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<DatabricksChunkResponse>(
            _jsonOptions, cancellationToken);

        return new StatementResult
        {
            StatementId = statementId,
            State = StatementState.SUCCEEDED,
            ChunkIndex = data?.ChunkIndex ?? chunkIndex,
            Data = data?.DataArray
        };
    }

    public async Task<bool> CancelStatementAsync(
        string statementId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.PostAsync(
                $"/api/2.0/sql/statements/{statementId}/cancel",
                null,
                cancellationToken);

            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private static StatementResult ParseResponse(DatabricksResponse data)
    {
        var stateStr = data.Status?.State ?? "PENDING";
        var state = Enum.TryParse<StatementState>(stateStr, out var parsed)
            ? parsed
            : StatementState.PENDING;

        List<Column>? columns = null;
        if (data.Manifest?.Schema?.Columns != null)
        {
            columns = data.Manifest.Schema.Columns
                .Select(c => new Column(c.Name ?? "", c.TypeName ?? "string"))
                .ToList();
        }

        return new StatementResult
        {
            StatementId = data.StatementId ?? "",
            State = state,
            TotalChunkCount = data.Manifest?.TotalChunkCount,
            TotalRowCount = data.Manifest?.TotalRowCount,
            Columns = columns,
            Data = data.Result?.DataArray,
            ChunkIndex = data.Result?.ChunkIndex,
            ErrorMessage = state == StatementState.FAILED
                ? data.Status?.Error?.Message ?? "Unknown error"
                : null
        };
    }
}
