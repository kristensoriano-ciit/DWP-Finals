using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using dotnet_backend.Contracts.Retrospectives;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Models;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace dotnet_backend.Tests;

public sealed class RetrospectivesApiTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private HttpClient _client = null!;
    private ApplicationUser _owner = null!;
    private ApplicationUser _other = null!;
    private Game _game = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        _owner = await factory.CreateUserAsync("owner@example.com", "password123");
        _other = await factory.CreateUserAsync("other@example.com", "password123");
        await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        _game = await factory.CreateGameAsync(
            "API Game", DateOnly.FromDateTime(DateTime.UtcNow));
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task PublishedReadsArePublicButOwnerAndMutationRoutesRequireAuthentication()
    {
        var id = Guid.NewGuid();
        using var publishedList = await _client.GetAsync("/api/retrospectives");
        using var publishedDetail = await _client.GetAsync($"/api/retrospectives/{id}");
        using var ownList = await _client.GetAsync("/api/account/retrospectives");
        using var ownDetail = await _client.GetAsync($"/api/account/retrospectives/{id}");
        using var create = await _client.PostAsJsonAsync(
            "/api/retrospectives", ValidCreate());
        using var update = await _client.PutAsJsonAsync(
            $"/api/retrospectives/{id}", new UpdateRetrospectiveRequest());
        using var status = await _client.PutAsJsonAsync(
            $"/api/retrospectives/{id}/status", new ChangeRetrospectiveStatusRequest());
        using var archive = await _client.DeleteAsync($"/api/retrospectives/{id}");

        Assert.Equal(HttpStatusCode.OK, publishedList.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, publishedDetail.StatusCode);
        Assert.All(new[]
        {
            ownList, ownDetail, create, update, status, archive
        }, response => Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode));
    }

    [Fact]
    public async Task AuthorCanCreatePublishUnpublishAndSeeCorrectVisibility()
    {
        await AuthenticateAsync("owner@example.com");
        var createResponse = await _client.PostAsJsonAsync(
            "/api/retrospectives", ValidCreate());
        var created = await createResponse.Content.ReadFromJsonAsync<RetrospectiveResponse>(JsonOptions);
        using var hidden = await _client.GetAsync($"/api/retrospectives/{created!.Id}");
        using var ownDraft = await _client.GetAsync($"/api/account/retrospectives/{created.Id}");
        var publishResponse = await _client.PutAsJsonAsync(
            $"/api/retrospectives/{created.Id}/status",
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Published,
                RowVersion = created.RowVersion
            });
        var published = await publishResponse.Content.ReadFromJsonAsync<RetrospectiveResponse>(JsonOptions);
        using var visible = await _client.GetAsync($"/api/retrospectives/{created.Id}");
        var unpublishResponse = await _client.PutAsJsonAsync(
            $"/api/retrospectives/{created.Id}/status",
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Unpublished,
                UnpublishedReason = "  Fixing a factual error.  ",
                RowVersion = published!.RowVersion
            });
        var unpublished = await unpublishResponse.Content.ReadFromJsonAsync<RetrospectiveResponse>(JsonOptions);
        using var hiddenAgain = await _client.GetAsync($"/api/retrospectives/{created.Id}");
        using var ownUnpublished = await _client.GetAsync($"/api/account/retrospectives/{created.Id}");

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ownDraft.StatusCode);
        Assert.NotNull(published.PublishedAtUtc);
        Assert.Equal(HttpStatusCode.OK, visible.StatusCode);
        Assert.Equal("Fixing a factual error.", unpublished!.UnpublishedReason);
        Assert.NotNull(unpublished.UnpublishedAtUtc);
        Assert.Equal(HttpStatusCode.NotFound, hiddenAgain.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ownUnpublished.StatusCode);
    }

    [Fact]
    public async Task PublicResponseDoesNotExposeOwnerOnlyOrIdentityInternalFields()
    {
        var entity = await factory.CreateRetrospectiveAsync(
            _owner.Id, _game.Id, "Safe response", RetrospectiveStatus.Published, 9);
        using var response = await _client.GetAsync($"/api/retrospectives/{entity.Id}");
        var json = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(root.TryGetProperty("rowVersion", out _));
        Assert.False(root.TryGetProperty("unpublishedReason", out _));
        Assert.False(root.TryGetProperty("email", out _));
        Assert.False(root.TryGetProperty("status", out _));
        Assert.Equal("Author User", root.GetProperty("authorDisplayName").GetString());
    }

    [Fact]
    public async Task OtherAuthorIsForbiddenFromEveryOwnerOperation()
    {
        var entity = await factory.CreateRetrospectiveAsync(
            _owner.Id, _game.Id, "Protected review");
        var token = Convert.ToBase64String(entity.RowVersion);
        await AuthenticateAsync("other@example.com");

        using var ownDetail = await _client.GetAsync($"/api/account/retrospectives/{entity.Id}");
        using var update = await _client.PutAsJsonAsync($"/api/retrospectives/{entity.Id}",
            new UpdateRetrospectiveRequest
            {
                GameId = _game.Id,
                Title = "Attempt",
                ReviewContent = "Attempt",
                Rating = 5,
                RowVersion = token
            });
        using var status = await _client.PutAsJsonAsync($"/api/retrospectives/{entity.Id}/status",
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Published,
                RowVersion = token
            });
        using var archiveRequest = new HttpRequestMessage(
            HttpMethod.Delete, $"/api/retrospectives/{entity.Id}");
        archiveRequest.Headers.TryAddWithoutValidation("If-Match", $"\"{token}\"");
        using var archive = await _client.SendAsync(archiveRequest);

        Assert.All(new[] { ownDetail, update, status, archive },
            response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
    }

    [Fact]
    public async Task AdminCannotCreateOrUseAuthorOwnerRoutes()
    {
        await AuthenticateAsync("admin@example.com");
        using var create = await _client.PostAsJsonAsync(
            "/api/retrospectives", ValidCreate());
        using var own = await _client.GetAsync("/api/account/retrospectives");

        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, own.StatusCode);
    }

    [Fact]
    public async Task ValidationRejectsImageRatingContentAndMissingUnpublishedReason()
    {
        await AuthenticateAsync("owner@example.com");
        var invalidResponse = await _client.PostAsJsonAsync("/api/retrospectives",
            new CreateRetrospectiveRequest
            {
                GameId = _game.Id,
                Title = new string('t', 201),
                ReviewContent = " ",
                ImageUrl = "ftp://example.com/image.jpg",
                Rating = 0
            });
        var created = await CreateAsync();
        var reasonResponse = await _client.PutAsJsonAsync(
            $"/api/retrospectives/{created.Id}/status",
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Unpublished,
                UnpublishedReason = " ",
                RowVersion = created.RowVersion
            });

        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, reasonResponse.StatusCode);
    }

    [Fact]
    public async Task StatusChangeWithoutStatusReturnsBadRequestAndPreservesState()
    {
        await AuthenticateAsync("owner@example.com");
        var created = await CreateAsync();

        using var response = await _client.PutAsJsonAsync(
            $"/api/retrospectives/{created.Id}/status",
            new { rowVersion = created.RowVersion });
        var current = await _client.GetFromJsonAsync<RetrospectiveResponse>(
            $"/api/account/retrospectives/{created.Id}", JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(RetrospectiveStatus.Draft, current!.Status);
        Assert.Equal(created.RowVersion, current.RowVersion);
        Assert.Equal(created.UpdatedAtUtc, current.UpdatedAtUtc);
    }

    [Fact]
    public async Task PublishedBrowseSupportsSearchGameFilterSortAndPagingOverflow()
    {
        var otherGame = await factory.CreateGameAsync(
            "Other Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var now = DateTimeOffset.UtcNow;
        await factory.CreateRetrospectiveAsync(
            _owner.Id, _game.Id, "Older Best", RetrospectiveStatus.Published, 10, now.AddHours(-2));
        await factory.CreateRetrospectiveAsync(
            _owner.Id, _game.Id, "Newest Match", RetrospectiveStatus.Published, 7, now);
        await factory.CreateRetrospectiveAsync(
            _owner.Id, otherGame.Id, "Other Match", RetrospectiveStatus.Published, 9, now.AddHours(-1));
        await AuthenticateAsync("owner@example.com");

        var newest = await _client.GetFromJsonAsync<PagedPublishedRetrospectivesResponse>(
            $"/api/retrospectives?gameId={_game.Id}&sort=newest", JsonOptions);
        var best = await _client.GetFromJsonAsync<PagedPublishedRetrospectivesResponse>(
            $"/api/retrospectives?gameId={_game.Id}&sort=best", JsonOptions);
        var search = await _client.GetFromJsonAsync<PagedPublishedRetrospectivesResponse>(
            "/api/retrospectives?search=match", JsonOptions);
        var overflow = await _client.GetFromJsonAsync<PagedPublishedRetrospectivesResponse>(
            "/api/retrospectives?page=2147483647&pageSize=100", JsonOptions);

        Assert.Equal(["Newest Match", "Older Best"], newest!.Items.Select(value => value.Title));
        Assert.Equal(["Older Best", "Newest Match"], best!.Items.Select(value => value.Title));
        Assert.Equal(2, search!.TotalCount);
        Assert.Empty(overflow!.Items);
    }

    [Fact]
    public async Task ArchiveIsIdempotentTerminalAndStaleTokensConflict()
    {
        await AuthenticateAsync("owner@example.com");
        var created = await CreateAsync();
        var updatedResponse = await _client.PutAsJsonAsync($"/api/retrospectives/{created.Id}",
            new UpdateRetrospectiveRequest
            {
                GameId = _game.Id,
                Title = "Updated",
                ReviewContent = "Updated review",
                Rating = 9,
                RowVersion = created.RowVersion
            });
        var updated = await updatedResponse.Content.ReadFromJsonAsync<RetrospectiveResponse>(JsonOptions);
        var staleStatus = await _client.PutAsJsonAsync($"/api/retrospectives/{created.Id}/status",
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Published,
                RowVersion = created.RowVersion
            });
        using var staleArchiveRequest = new HttpRequestMessage(
            HttpMethod.Delete, $"/api/retrospectives/{created.Id}");
        staleArchiveRequest.Headers.TryAddWithoutValidation("If-Match", $"\"{created.RowVersion}\"");
        using var staleArchive = await _client.SendAsync(staleArchiveRequest);
        using var archiveRequest = new HttpRequestMessage(
            HttpMethod.Delete, $"/api/retrospectives/{created.Id}");
        archiveRequest.Headers.TryAddWithoutValidation("If-Match", $"\"{updated!.RowVersion}\"");
        using var archive = await _client.SendAsync(archiveRequest);
        using var repeatedRequest = new HttpRequestMessage(
            HttpMethod.Delete, $"/api/retrospectives/{created.Id}");
        repeatedRequest.Headers.TryAddWithoutValidation("If-Match", $"\"{created.RowVersion}\"");
        using var repeated = await _client.SendAsync(repeatedRequest);
        using var terminalUpdate = await _client.PutAsJsonAsync($"/api/retrospectives/{created.Id}",
            new UpdateRetrospectiveRequest
            {
                GameId = _game.Id,
                Title = "Too late",
                ReviewContent = "Too late",
                Rating = 1,
                RowVersion = updated.RowVersion
            });
        using var ownHidden = await _client.GetAsync($"/api/account/retrospectives/{created.Id}");

        Assert.Equal(HttpStatusCode.Conflict, staleStatus.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, staleArchive.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, archive.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, repeated.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, terminalUpdate.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, ownHidden.StatusCode);
    }

    private CreateRetrospectiveRequest ValidCreate() => new()
    {
        GameId = _game.Id,
        Title = "API retrospective",
        ReviewContent = "A complete review.",
        ImageUrl = "https://example.com/review.jpg",
        Rating = 8
    };

    private async Task<RetrospectiveResponse> CreateAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/retrospectives", ValidCreate());
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RetrospectiveResponse>(JsonOptions))!;
    }

    private async Task AuthenticateAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Email = email, Password = "password123" });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        return options;
    }
}
