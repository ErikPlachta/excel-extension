using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ExcelDatabricksFunction.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Register DatabricksClient as singleton for connection reuse
        // Critical: Prevents SNAT port exhaustion under high concurrency
        // Reference: https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections
        services.AddSingleton<IDatabricksClient, DatabricksClient>();

        // Configure HttpClient with connection pooling
        services.AddHttpClient("Databricks", client =>
        {
            var host = Environment.GetEnvironmentVariable("DATABRICKS_HOST")?.TrimEnd('/') ?? "";
            var token = Environment.GetEnvironmentVariable("DATABRICKS_TOKEN") ?? "";

            client.BaseAddress = new Uri(host);
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
            client.Timeout = TimeSpan.FromSeconds(60);
        })
        .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            PooledConnectionLifetime = TimeSpan.FromMinutes(2),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1),
            MaxConnectionsPerServer = 100
        });
    })
    .Build();

host.Run();
