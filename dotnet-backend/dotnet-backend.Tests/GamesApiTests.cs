using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using dotnet_backend.Contracts.Games;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace dotnet_backend.Tests;

public sealed class GamesApiTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        await factory.CreateUserAsync("author@example.com", "password123");
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task AnonymousVisitorCanBrowseAndOpenOnlyActiveGames()
    {
        var activeGame = await factory.CreateGameAsync(
            "Visible Game",
            DateOnly.FromDateTime(DateTime.UtcNow));
        var archivedGame = await factory.CreateGameAsync(
            "Visible Archived Game",
            DateOnly.FromDateTime(DateTime.UtcNow),
            isActive: false);

        var response = await _client.GetAsync("/api/games?search=visible");
        var games = await response.Content.ReadFromJsonAsync<PagedGamesResponse>();
        var detailResponse = await _client.GetAsync($"/api/games/{activeGame.Id}");
        var detail = await detailResponse.Content.ReadFromJsonAsync<GameResponse>();
        var archivedDetailResponse = await _client.GetAsync($"/api/games/{archivedGame.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Collection(games!.Items, game => Assert.Equal(activeGame.Id, game.Id));
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        Assert.Equal(activeGame.Id, detail!.Id);
        Assert.Equal(HttpStatusCode.NotFound, archivedDetailResponse.StatusCode);
    }

    [Fact]
    public async Task AdminCanCreateUpdateAndArchiveGame()
    {
        await AuthenticateAsync("admin@example.com");
        var createResponse = await _client.PostAsJsonAsync(
            "/api/games",
            new CreateGameRequest
            {
                Title = "New Game",
                ReleaseDate = new DateOnly(2026, 8, 1)
            });
        var created = await createResponse.Content.ReadFromJsonAsync<GameResponse>();
        var updateResponse = await _client.PutAsJsonAsync(
            $"/api/games/{created!.Id}",
            new UpdateGameRequest
            {
                Title = "Updated Game",
                ReleaseDate = created.ReleaseDate
            });
        var deleteResponse = await _client.DeleteAsync($"/api/games/{created.Id}");
        var repeatedDelete = await _client.DeleteAsync($"/api/games/{created.Id}");
        var missingDelete = await _client.DeleteAsync($"/api/games/{Guid.NewGuid()}");
        var hidden = await _client.GetAsync($"/api/games/{created.Id}");

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, repeatedDelete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, missingDelete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
    }

    [Fact]
    public async Task AuthorCannotMutateGames()
    {
        var game = await factory.CreateGameAsync(
            "Protected Game",
            DateOnly.FromDateTime(DateTime.UtcNow));
        await AuthenticateAsync("author@example.com");
        var createResponse = await _client.PostAsJsonAsync(
            "/api/games",
            new CreateGameRequest
            {
                Title = "Forbidden Game",
                ReleaseDate = DateOnly.FromDateTime(DateTime.UtcNow)
            });
        var updateResponse = await _client.PutAsJsonAsync(
            $"/api/games/{game.Id}",
            new UpdateGameRequest
            {
                Title = "Changed",
                ReleaseDate = game.ReleaseDate
            });
        var deleteResponse = await _client.DeleteAsync($"/api/games/{game.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task AnonymousVisitorCannotMutateGames()
    {
        var game = await factory.CreateGameAsync(
            "Protected Game",
            DateOnly.FromDateTime(DateTime.UtcNow));
        var request = new CreateGameRequest
        {
            Title = "Unauthorized Game",
            ReleaseDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        var createResponse = await _client.PostAsJsonAsync("/api/games", request);
        var updateResponse = await _client.PutAsJsonAsync($"/api/games/{game.Id}", request);
        var deleteResponse = await _client.DeleteAsync($"/api/games/{game.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, deleteResponse.StatusCode);
    }

    private async Task AuthenticateAsync(string email)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = email, Password = "password123" });
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
    }
}
