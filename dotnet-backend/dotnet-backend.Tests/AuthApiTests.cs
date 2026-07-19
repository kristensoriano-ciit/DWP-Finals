using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Tests;

public sealed class AuthApiTests(UserApiFactory factory)
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
    public async Task Register_ReturnsCreatedSafeAuthorResponse()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration(),
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserResponse>(
            CancellationToken.None);
        Assert.NotNull(user);
        Assert.Equal("Author", user.Role);
        Assert.Equal("author@example.com", user.Email);

        var json = await response.Content.ReadAsStringAsync(CancellationToken.None);
        Assert.DoesNotContain("password", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("securityStamp", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_NormalizesWhitespaceBeforeLengthAndEmailValidation()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                DisplayName = $"   {new string('A', 48)}   ",
                Email = "  spaced@example.com  ",
                Password = "password123"
            },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserResponse>(CancellationToken.None);
        Assert.Equal(48, user!.DisplayName.Length);
        Assert.Equal("spaced@example.com", user.Email);
    }

    [Fact]
    public async Task Register_ConcurrentDuplicateReturnsCreatedAndConflict()
    {
        var firstRequest = _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration("race@example.com"),
            CancellationToken.None);
        var secondRequest = _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration("RACE@example.com"),
            CancellationToken.None);

        var responses = await Task.WhenAll(firstRequest, secondRequest);

        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Login_ReturnsJwtWithIdentityAndRoleClaims()
    {
        await _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration(),
            CancellationToken.None);

        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "author@example.com", Password = "password123" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(
            CancellationToken.None);
        Assert.NotNull(auth);
        Assert.Equal("Author", auth.User.Role);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(auth.AccessToken);
        Assert.Equal(auth.User.Id.ToString(), token.Subject);
        Assert.Contains(token.Claims, claim =>
            claim.Type == ClaimTypes.Role && claim.Value == "Author");
    }

    [Fact]
    public async Task Register_DuplicateEmailReturnsConflict()
    {
        await _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration(),
            CancellationToken.None);

        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration("AUTHOR@example.com"),
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Login_InvalidCredentialsAlwaysReturnsSameProblem()
    {
        await _client.PostAsJsonAsync(
            "/api/auth/register",
            ValidRegistration(),
            CancellationToken.None);

        var unknownResponse = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "missing@example.com", Password = "wrong-password" },
            CancellationToken.None);
        var wrongPasswordResponse = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "author@example.com", Password = "wrong-password" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Unauthorized, unknownResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPasswordResponse.StatusCode);

        var unknownProblem = await unknownResponse.Content.ReadFromJsonAsync<ProblemDetails>(
            CancellationToken.None);
        var wrongPasswordProblem = await wrongPasswordResponse.Content.ReadFromJsonAsync<ProblemDetails>(
            CancellationToken.None);
        Assert.Equal(unknownProblem!.Detail, wrongPasswordProblem!.Detail);
    }

    [Fact]
    public async Task Login_MalformedEmailReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "not-an-email", Password = "password123" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static RegisterRequest ValidRegistration(string email = "author@example.com") => new()
    {
        DisplayName = "Jane Author",
        Email = email,
        Password = "password123"
    };
}
