using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Models;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace dotnet_backend.Tests;

public sealed class AdminUsersApiTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    private HttpClient _client = null!;
    private ApplicationUser _admin = null!;
    private ApplicationUser _author = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        _admin = await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        _author = await factory.CreateUserAsync("author@example.com", "password123");
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task AdminCanListBoundedPages()
    {
        await AuthenticateAsync("admin@example.com", "password123");

        var response = await _client.GetAsync("/api/admin/users?page=1&pageSize=1");
        var page = await response.Content.ReadFromJsonAsync<PagedUsersResponse>();
        var invalidPage = await _client.GetAsync("/api/admin/users?page=1&pageSize=101");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(page);
        Assert.Single(page.Items);
        Assert.Equal(2, page.TotalCount);
        Assert.Equal(HttpStatusCode.BadRequest, invalidPage.StatusCode);
    }

    [Fact]
    public async Task AuthorCannotUseAdminRoutes()
    {
        await AuthenticateAsync("author@example.com", "password123");

        var response = await _client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeactivationIsIdempotentAndInvalidatesExistingAuthorToken()
    {
        var authorToken = await GetTokenAsync("author@example.com", "password123");
        await AuthenticateAsync("admin@example.com", "password123");

        var first = await _client.DeleteAsync($"/api/admin/users/{_author.Id}");
        var repeated = await _client.DeleteAsync($"/api/admin/users/{_author.Id}");

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", authorToken);
        var authorRequest = await _client.GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, repeated.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, authorRequest.StatusCode);
    }

    [Fact]
    public async Task DeactivationReturnsNotFoundAndPreventsSelfDeactivation()
    {
        await AuthenticateAsync("admin@example.com", "password123");

        var missing = await _client.DeleteAsync($"/api/admin/users/{Guid.NewGuid()}");
        var self = await _client.DeleteAsync($"/api/admin/users/{_admin.Id}");

        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, self.StatusCode);
    }

    private async Task AuthenticateAsync(string email, string password)
    {
        var token = await GetTokenAsync(email, password);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private async Task<string> GetTokenAsync(string email, string password)
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = email, Password = password });
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.AccessToken;
    }
}
