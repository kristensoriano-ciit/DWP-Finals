using System.Net;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace dotnet_backend.Tests;

public sealed class CorsApiTests(UserApiFactory factory) : IClassFixture<UserApiFactory>
{
    [Fact]
    public async Task PreflightFromConfiguredFrontendOriginIsAllowed()
    {
        using var client = CreateClient();
        using var request = CreatePreflightRequest("http://localhost:5173");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(
            "http://localhost:5173",
            Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.Contains("GET", response.Headers.GetValues("Access-Control-Allow-Methods"));
        Assert.Contains(
            response.Headers.GetValues("Access-Control-Allow-Headers"),
            value => value.Contains("authorization", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task PreflightFromUnconfiguredOriginIsRejected()
    {
        using var client = CreateClient();
        using var request = CreatePreflightRequest("https://untrusted.example");

        var response = await client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.False(response.Headers.Contains("Access-Control-Allow-Methods"));
        Assert.False(response.Headers.Contains("Access-Control-Allow-Headers"));
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost")
    });

    private static HttpRequestMessage CreatePreflightRequest(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/games");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "Authorization");
        return request;
    }
}
