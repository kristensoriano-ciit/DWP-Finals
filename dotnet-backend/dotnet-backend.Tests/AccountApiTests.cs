using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace dotnet_backend.Tests;

public sealed class AccountApiTests(UserApiFactory factory)
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
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task ProfileEndpoints_ReturnAndUpdateOnlySafeOwnedFields()
    {
        await AuthenticateAsync();

        var current = await _client.GetFromJsonAsync<UserResponse>(
            "/api/account/me",
            CancellationToken.None);
        var updateResponse = await _client.PutAsJsonAsync(
            "/api/account/me",
            new
            {
                displayName = "Updated Author",
                email = "updated@example.com",
                role = "Admin",
                isActive = false
            },
            CancellationToken.None);
        var updated = await updateResponse.Content.ReadFromJsonAsync<UserResponse>(
            CancellationToken.None);

        Assert.NotNull(current);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.Equal("Updated Author", updated!.DisplayName);
        Assert.Equal("updated@example.com", updated.Email);
        Assert.Equal("Author", updated.Role);
        Assert.True(updated.IsActive);
    }

    [Fact]
    public async Task ProfileUpdate_DuplicateEmailReturnsConflict()
    {
        await factory.CreateUserAsync("existing@example.com", "password123");
        await AuthenticateAsync();

        var response = await _client.PutAsJsonAsync(
            "/api/account/me",
            new UpdateProfileRequest
            {
                DisplayName = "Jane Author",
                Email = "EXISTING@example.com"
            },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task PasswordChange_RejectsWrongCurrentAndAcceptsNewPassword()
    {
        await AuthenticateAsync();

        var wrongResponse = await _client.PutAsJsonAsync(
            "/api/account/password",
            new ChangePasswordRequest
            {
                CurrentPassword = "wrong-password",
                NewPassword = "new-password123"
            },
            CancellationToken.None);
        var changedResponse = await _client.PutAsJsonAsync(
            "/api/account/password",
            new ChangePasswordRequest
            {
                CurrentPassword = "password123",
                NewPassword = "new-password123"
            },
            CancellationToken.None);
        var oldTokenResponse = await _client.GetAsync("/api/account/me", CancellationToken.None);

        Assert.Equal(HttpStatusCode.BadRequest, wrongResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, changedResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, oldTokenResponse.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        var oldLogin = await LoginAsync("password123");
        var newLogin = await LoginAsync("new-password123");
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    [Fact]
    public async Task ProfileEndpoints_RequireAuthentication()
    {
        var getResponse = await _client.GetAsync("/api/account/me", CancellationToken.None);
        var updateResponse = await _client.PutAsJsonAsync(
            "/api/account/me",
            new UpdateProfileRequest
            {
                DisplayName = "Jane Author",
                Email = "author@example.com"
            },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Unauthorized, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, updateResponse.StatusCode);
    }

    private async Task AuthenticateAsync()
    {
        await _client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                DisplayName = "Jane Author",
                Email = "author@example.com",
                Password = "password123"
            },
            CancellationToken.None);
        var login = await LoginAsync("password123");
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>(CancellationToken.None);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
    }

    private Task<HttpResponseMessage> LoginAsync(string password) =>
        _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "author@example.com", Password = password },
            CancellationToken.None);
}
