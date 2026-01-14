using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using ExcelDatabricksFunction.Models;
using ExcelDatabricksFunction.Services;

namespace ExcelDatabricksFunction.Functions;

/// <summary>
/// Query execution endpoints for Databricks SQL.
/// </summary>
public class QueryFunctions
{
    private readonly ILogger<QueryFunctions> _logger;
    private readonly IDatabricksClient _databricks;

    private static readonly Dictionary<StatementState, HttpStatusCode> StateToStatus = new()
    {
        [StatementState.PENDING] = HttpStatusCode.Accepted,
        [StatementState.RUNNING] = HttpStatusCode.Accepted,
        [StatementState.SUCCEEDED] = HttpStatusCode.OK,
        [StatementState.FAILED] = HttpStatusCode.InternalServerError,
        [StatementState.CANCELED] = HttpStatusCode.Gone,
        [StatementState.CLOSED] = HttpStatusCode.Gone
    };

    public QueryFunctions(ILogger<QueryFunctions> logger, IDatabricksClient databricks)
    {
        _logger = logger;
        _databricks = databricks;
    }

    /// <summary>
    /// POST /api/query/execute - Execute SQL and return statement metadata.
    /// </summary>
    [Function("ExecuteQuery")]
    public async Task<HttpResponseData> ExecuteQuery(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "query/execute")]
        HttpRequestData req,
        CancellationToken cancellationToken)
    {
        ExecuteRequest? body;
        try
        {
            body = await req.ReadFromJsonAsync<ExecuteRequest>(cancellationToken);
        }
        catch
        {
            return await CreateJsonResponse(req, new ErrorResponse { Error = "Invalid JSON body" }, HttpStatusCode.BadRequest);
        }

        if (body?.Statement == null)
        {
            return await CreateJsonResponse(req, new ErrorResponse { Error = "Missing 'statement' field" }, HttpStatusCode.BadRequest);
        }

        try
        {
            var result = await _databricks.ExecuteStatementAsync(
                body.Statement,
                body.Parameters,
                cancellationToken: cancellationToken);

            var status = StateToStatus.GetValueOrDefault(result.State, HttpStatusCode.OK);

            var response = new ExecuteResponse
            {
                StatementId = result.StatementId,
                State = result.State.ToString(),
                TotalChunks = result.TotalChunkCount,
                TotalRows = result.TotalRowCount,
                Columns = result.Columns,
                Error = result.State == StatementState.FAILED ? result.ErrorMessage : null
            };

            // Include first chunk if immediately available
            if (result.Data != null && result.State == StatementState.SUCCEEDED)
            {
                response = response with
                {
                    FirstChunk = new ChunkData
                    {
                        ChunkIndex = 0,
                        RowCount = result.Data.Count,
                        Data = result.Data
                    }
                };
            }

            return await CreateJsonResponse(req, response, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing query");
            return await CreateJsonResponse(req, new ErrorResponse { Error = ex.Message }, HttpStatusCode.InternalServerError);
        }
    }

    /// <summary>
    /// GET /api/query/chunk/{statementId}/{chunkIndex} - Get result chunk.
    /// </summary>
    [Function("GetChunk")]
    public async Task<HttpResponseData> GetChunk(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "query/chunk/{statementId}/{chunkIndex}")]
        HttpRequestData req,
        string statementId,
        string chunkIndex,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(statementId))
        {
            return await CreateJsonResponse(req, new ErrorResponse { Error = "Missing statementId" }, HttpStatusCode.BadRequest);
        }

        if (!int.TryParse(chunkIndex, out var index))
        {
            return await CreateJsonResponse(req, new ErrorResponse { Error = "Invalid chunkIndex" }, HttpStatusCode.BadRequest);
        }

        try
        {
            var result = await _databricks.GetChunkAsync(statementId, index, cancellationToken);

            return await CreateJsonResponse(req, new ChunkResponse
            {
                ChunkIndex = result.ChunkIndex ?? index,
                RowCount = result.Data?.Count ?? 0,
                Data = result.Data ?? new List<List<object?>>()
            });
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return await CreateJsonResponse(req,
                new ErrorResponse { Error = "Statement not found or cache expired. Re-execute query." },
                HttpStatusCode.Gone);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching chunk");
            return await CreateJsonResponse(req, new ErrorResponse { Error = ex.Message }, HttpStatusCode.InternalServerError);
        }
    }

    /// <summary>
    /// GET /api/query/status/{statementId} - Check execution status.
    /// </summary>
    [Function("GetStatus")]
    public async Task<HttpResponseData> GetStatus(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "query/status/{statementId}")]
        HttpRequestData req,
        string statementId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(statementId))
        {
            return await CreateJsonResponse(req, new ErrorResponse { Error = "Missing statementId" }, HttpStatusCode.BadRequest);
        }

        try
        {
            var result = await _databricks.GetStatementStatusAsync(statementId, cancellationToken);
            var status = StateToStatus.GetValueOrDefault(result.State, HttpStatusCode.OK);

            return await CreateJsonResponse(req, new StatusResponse
            {
                StatementId = result.StatementId,
                State = result.State.ToString(),
                TotalChunks = result.TotalChunkCount,
                TotalRows = result.TotalRowCount,
                Columns = result.Columns,
                Error = result.State == StatementState.FAILED ? result.ErrorMessage : null
            }, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching status");
            return await CreateJsonResponse(req, new ErrorResponse { Error = ex.Message }, HttpStatusCode.InternalServerError);
        }
    }

    /// <summary>
    /// POST /api/query/cancel/{statementId} - Cancel running query.
    /// </summary>
    [Function("CancelQuery")]
    public async Task<HttpResponseData> CancelQuery(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "query/cancel/{statementId}")]
        HttpRequestData req,
        string statementId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(statementId))
        {
            return await CreateJsonResponse(req, new ErrorResponse { Error = "Missing statementId" }, HttpStatusCode.BadRequest);
        }

        try
        {
            var success = await _databricks.CancelStatementAsync(statementId, cancellationToken);

            if (success)
            {
                return await CreateJsonResponse(req, new { cancelled = true });
            }

            return await CreateJsonResponse(req, new ErrorResponse { Error = "Failed to cancel" }, HttpStatusCode.InternalServerError);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling query");
            return await CreateJsonResponse(req, new ErrorResponse { Error = ex.Message }, HttpStatusCode.InternalServerError);
        }
    }

    private static async Task<HttpResponseData> CreateJsonResponse<T>(
        HttpRequestData req,
        T data,
        HttpStatusCode status = HttpStatusCode.OK)
    {
        var response = req.CreateResponse(status);
        await response.WriteAsJsonAsync(data);
        return response;
    }
}
