using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests.Infrastructure;

public static class NormalPerformanceDatasetSeeder
{
    public const string Password = "password123";
    public const string AdminEmail = E2E.NormalPerformanceDatasetSeeder.AdminEmail;
    public const string AuthorEmail = E2E.NormalPerformanceDatasetSeeder.PerformanceAuthorEmail;

    public static Task<E2E.NormalPerformanceDataset> SeedAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default) =>
        E2E.NormalPerformanceDatasetSeeder.SeedAsync(
            services,
            Password,
            cancellationToken);
}
