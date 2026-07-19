using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Data;
using dotnet_backend.Models;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
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
        await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var games = new List<Game>();
        for (var index = 0; index < 5; index++)
        {
            games.Add(await factory.CreateGameAsync(
                $"Performance Game {index + 1}",
                DateOnly.FromDateTime(DateTime.UtcNow).AddDays(index)));
        }
        await SeedMixedRetrospectivesAsync(author.Id, games);

        var authorToken = await GetTokenAsync("author@example.com");
        var adminToken = await GetTokenAsync("admin@example.com");

        var profileP95 = await MeasureP95Async(
            authorToken,
            "/api/account/me",
            sampleCount: 20);
        var adminP95 = await MeasureP95Async(
            adminToken,
            "/api/admin/users?page=1&pageSize=20",
            sampleCount: 20);
        var gamesP95 = await MeasureP95Async(
            authorToken,
            "/api/games?page=1&pageSize=20",
            sampleCount: 20);
        var retrospectiveNewestP95 = await MeasureP95Async(
            authorToken,
            "/api/retrospectives?page=1&pageSize=20&sort=newest",
            sampleCount: 20);
        var retrospectiveBestP95 = await MeasureP95Async(
            authorToken,
            "/api/retrospectives?page=1&pageSize=20&sort=best",
            sampleCount: 20);
        var retrospectiveGameFilterP95 = await MeasureP95Async(
            authorToken,
            $"/api/retrospectives?gameId={games[2].Id}&page=1&pageSize=20&sort=best",
            sampleCount: 20);

        output.WriteLine($"Profile p95: {profileP95:F2} ms");
        output.WriteLine($"Admin list p95: {adminP95:F2} ms");
        output.WriteLine($"Games list p95: {gamesP95:F2} ms");
        output.WriteLine($"Retrospectives newest p95: {retrospectiveNewestP95:F2} ms");
        output.WriteLine($"Retrospectives best p95: {retrospectiveBestP95:F2} ms");
        output.WriteLine($"Retrospectives game-filtered best p95: {retrospectiveGameFilterP95:F2} ms");

        Assert.True(profileP95 < 500, $"Profile p95 was {profileP95:F2} ms.");
        Assert.True(adminP95 < 500, $"Admin list p95 was {adminP95:F2} ms.");
        Assert.True(gamesP95 < 500, $"Games list p95 was {gamesP95:F2} ms.");
        Assert.True(retrospectiveNewestP95 < 500,
            $"Retrospectives newest p95 was {retrospectiveNewestP95:F2} ms.");
        Assert.True(retrospectiveBestP95 < 500,
            $"Retrospectives best p95 was {retrospectiveBestP95:F2} ms.");
        Assert.True(retrospectiveGameFilterP95 < 500,
            $"Retrospectives game-filtered best p95 was {retrospectiveGameFilterP95:F2} ms.");
    }

    private async Task SeedMixedRetrospectivesAsync(Guid authorUserId, IReadOnlyList<Game> games)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTimeOffset.UtcNow;
        for (var index = 0; index < 200; index++)
        {
            var status = (RetrospectiveStatus)(index % 5);
            var timestamp = now.AddMinutes(-index);
            context.Retrospectives.Add(new Retrospective
            {
                Id = Guid.NewGuid(),
                AuthorUserId = authorUserId,
                GameId = games[index % games.Count].Id,
                Title = $"Performance retrospective {index + 1}",
                ReviewContent = $"Representative mixed review content for item {index + 1}.",
                Rating = (index % 10) + 1,
                Status = status,
                UnpublishedReason = status == RetrospectiveStatus.Unpublished
                    ? "Temporarily unpublished for performance data."
                    : null,
                CreatedAtUtc = timestamp,
                UpdatedAtUtc = timestamp,
                PublishedAtUtc = status == RetrospectiveStatus.Published ? timestamp : null,
                UnpublishedAtUtc = status == RetrospectiveStatus.Unpublished ? timestamp : null,
                ArchivedAtUtc = status == RetrospectiveStatus.Archived ? timestamp : null
            });
        }

        await context.SaveChangesAsync();
    }

    private async Task<double> MeasureP95Async(string token, string path, int sampleCount)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        for (var index = 0; index < 3; index++)
        {
            using var warmup = await _client.GetAsync(path);
            warmup.EnsureSuccessStatusCode();
        }

        var samples = new List<double>(sampleCount);
        for (var index = 0; index < sampleCount; index++)
        {
            var stopwatch = Stopwatch.StartNew();
            using var response = await _client.GetAsync(path);
            stopwatch.Stop();
            response.EnsureSuccessStatusCode();
            samples.Add(stopwatch.Elapsed.TotalMilliseconds);
        }

        samples.Sort();
        var p95Index = (int)Math.Ceiling(samples.Count * 0.95) - 1;
        return samples[p95Index];
    }

    private async Task<string> GetTokenAsync(string email)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = email, Password = "password123" });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.AccessToken;
    }
}
