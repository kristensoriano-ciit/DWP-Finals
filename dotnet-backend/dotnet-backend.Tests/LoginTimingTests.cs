using System.Diagnostics;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Services;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class LoginTimingCollection
{
    public const string Name = "Login timing";
}

[Collection(LoginTimingCollection.Name)]
public sealed class LoginTimingTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task LoginAsync_UsesComparableMinimumTimingForUnknownAndKnownAccounts()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();
        await service.RegisterAsync(
            new RegisterRequest
            {
                DisplayName = "Jane Author",
                Email = "author@example.com",
                Password = "password123"
            },
            CancellationToken.None);

        var unknownWatch = Stopwatch.StartNew();
        await service.LoginAsync(
            new LoginRequest { Email = "missing@example.com", Password = "wrong-password" },
            CancellationToken.None);
        unknownWatch.Stop();

        var knownWatch = Stopwatch.StartNew();
        await service.LoginAsync(
            new LoginRequest { Email = "author@example.com", Password = "wrong-password" },
            CancellationToken.None);
        knownWatch.Stop();

        Assert.True(unknownWatch.ElapsedMilliseconds >= 200);
        Assert.True(knownWatch.ElapsedMilliseconds >= 200);
        Assert.InRange(
            Math.Abs(unknownWatch.ElapsedMilliseconds - knownWatch.ElapsedMilliseconds),
            0,
            150);
    }
}
