using System.Diagnostics;
using System.Net.Http.Json;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace dotnet_backend.Tests;

public sealed class PerformanceTests(
    UserApiFactory factory,
    ITestOutputHelper output) : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    [Trait("Category", "Performance")]
    public async Task WarmPrimaryQueriesStayBelowTheP95Target()
    {
        var dataset = await NormalPerformanceDatasetSeeder.SeedAsync(factory.Services);
        var authorToken = await GetTokenAsync(NormalPerformanceDatasetSeeder.AuthorEmail);
        var adminToken = await GetTokenAsync(NormalPerformanceDatasetSeeder.AdminEmail);

        var gamesP95 = await MeasureP95Async(
            "/api/games?page=1&pageSize=20",
            sampleCount: 20);
        var gameDetailP95 = await MeasureP95Async(
            $"/api/games/{dataset.ActiveGameId}",
            sampleCount: 20);
        var retrospectiveNewestP95 = await MeasureP95Async(
            "/api/retrospectives?page=1&pageSize=20&sort=newest",
            sampleCount: 20);
        var retrospectiveBestP95 = await MeasureP95Async(
            "/api/retrospectives?page=1&pageSize=20&sort=best",
            sampleCount: 20);
        var retrospectiveGameFilterP95 = await MeasureP95Async(
            $"/api/retrospectives?gameId={dataset.FilterGameId}&page=1&pageSize=20&sort=best",
            sampleCount: 20);
        var retrospectiveDetailP95 = await MeasureP95Async(
            $"/api/retrospectives/{dataset.PublishedRetrospectiveId}",
            sampleCount: 20);
        var authorDashboardP95 = await MeasureP95Async(
            "/api/account/retrospectives?page=1&pageSize=20&sort=newest",
            sampleCount: 20,
            authorToken);
        var adminUsersP95 = await MeasureP95Async(
            "/api/admin/users?page=1&pageSize=20",
            sampleCount: 20,
            adminToken);

        output.WriteLine($"Games list p95: {gamesP95:F2} ms");
        output.WriteLine($"Game detail p95: {gameDetailP95:F2} ms");
        output.WriteLine($"Retrospectives newest p95: {retrospectiveNewestP95:F2} ms");
        output.WriteLine($"Retrospectives best p95: {retrospectiveBestP95:F2} ms");
        output.WriteLine($"Retrospectives game-filtered best p95: {retrospectiveGameFilterP95:F2} ms");
        output.WriteLine($"Retrospective detail p95: {retrospectiveDetailP95:F2} ms");
        output.WriteLine($"Author dashboard p95: {authorDashboardP95:F2} ms");
        output.WriteLine($"Admin users p95: {adminUsersP95:F2} ms");

        Assert.True(gamesP95 < 500, $"Games list p95 was {gamesP95:F2} ms.");
        Assert.True(gameDetailP95 < 500, $"Game detail p95 was {gameDetailP95:F2} ms.");
        Assert.True(retrospectiveNewestP95 < 500,
            $"Retrospectives newest p95 was {retrospectiveNewestP95:F2} ms.");
        Assert.True(retrospectiveBestP95 < 500,
            $"Retrospectives best p95 was {retrospectiveBestP95:F2} ms.");
        Assert.True(retrospectiveGameFilterP95 < 500,
            $"Retrospectives game-filtered best p95 was {retrospectiveGameFilterP95:F2} ms.");
        Assert.True(retrospectiveDetailP95 < 500,
            $"Retrospective detail p95 was {retrospectiveDetailP95:F2} ms.");
        Assert.True(authorDashboardP95 < 500,
            $"Author dashboard p95 was {authorDashboardP95:F2} ms.");
        Assert.True(adminUsersP95 < 500,
            $"Admin users p95 was {adminUsersP95:F2} ms.");
    }

    private async Task<double> MeasureP95Async(
        string path,
        int sampleCount,
        string? token = null)
    {
        for (var index = 0; index < 3; index++)
        {
            using var request = CreateRequest(path, token);
            using var warmup = await _client.SendAsync(request);
            warmup.EnsureSuccessStatusCode();
        }

        var samples = new List<double>(sampleCount);
        for (var index = 0; index < sampleCount; index++)
        {
            using var request = CreateRequest(path, token);
            var stopwatch = Stopwatch.StartNew();
            using var response = await _client.SendAsync(request);
            stopwatch.Stop();
            response.EnsureSuccessStatusCode();
            samples.Add(stopwatch.Elapsed.TotalMilliseconds);
        }

        samples.Sort();
        var p95Index = (int)Math.Ceiling(samples.Count * 0.95) - 1;
        return samples[p95Index];
    }

    private static HttpRequestMessage CreateRequest(string path, string? token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        if (token is not null)
        {
            request.Headers.Authorization = new("Bearer", token);
        }

        return request;
    }

    private async Task<string> GetTokenAsync(string email)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = email, Password = NormalPerformanceDatasetSeeder.Password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.AccessToken;
    }
}
