using dotnet_backend.Contracts.Games;
using dotnet_backend.Data;
using dotnet_backend.Services;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests;

public sealed class GameServiceTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetGamesAsync_FiltersNewUpcomingSearchAndArchivedGames()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await factory.CreateGameAsync("Recent Quest", today.AddDays(-10));
        await factory.CreateGameAsync("Old Quest", today.AddDays(-100));
        await factory.CreateGameAsync("Future Quest", today.AddDays(30));
        await factory.CreateGameAsync("Archived Quest", today.AddDays(-5), isActive: false);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();

        var newGames = await service.GetGamesAsync(
            new GameListQuery { ReleaseWindow = GameReleaseWindow.New },
            CancellationToken.None);
        var upcoming = await service.GetGamesAsync(
            new GameListQuery { ReleaseWindow = GameReleaseWindow.Upcoming },
            CancellationToken.None);
        var search = await service.GetGamesAsync(
            new GameListQuery { Search = "recent" },
            CancellationToken.None);

        Assert.Equal(["Recent Quest"], newGames.Value!.Items.Select(game => game.Title));
        Assert.Equal(["Future Quest"], upcoming.Value!.Items.Select(game => game.Title));
        Assert.Equal(["Recent Quest"], search.Value!.Items.Select(game => game.Title));
    }

    [Fact]
    public async Task GetGamesAsync_PagesResultsAndHandlesVeryLargePage()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await factory.CreateGameAsync("Alpha", today);
        await factory.CreateGameAsync("Beta", today.AddDays(1));
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();

        var firstPage = await service.GetGamesAsync(
            new GameListQuery { Page = 1, PageSize = 1 },
            CancellationToken.None);
        var hugePage = await service.GetGamesAsync(
            new GameListQuery { Page = int.MaxValue, PageSize = 100 },
            CancellationToken.None);

        Assert.Single(firstPage.Value!.Items);
        Assert.Equal(2, firstPage.Value.TotalCount);
        Assert.Empty(hugePage.Value!.Items);
    }

    [Fact]
    public async Task GetGamesAsync_ReportsOnlyTheInvalidPagingField()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();

        var result = await service.GetGamesAsync(
            new GameListQuery { Page = 0, PageSize = 20 },
            CancellationToken.None);

        Assert.Equal(GameErrorType.Validation, result.Error!.Type);
        Assert.Contains(nameof(GameListQuery.Page), result.Error.ValidationErrors!.Keys);
        Assert.DoesNotContain(nameof(GameListQuery.PageSize), result.Error.ValidationErrors.Keys);
    }

    [Fact]
    public async Task CreateAndUpdateGame_NormalizeValuesAndRejectDuplicates()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();
        var releaseDate = new DateOnly(2026, 8, 1);

        var created = await service.CreateGameAsync(
            new CreateGameRequest
            {
                Title = "  Example Game  ",
                Description = "  Description  ",
                ReleaseDate = releaseDate,
                CoverImageUrl = "https://example.com/cover.jpg"
            },
            CancellationToken.None);
        var duplicate = await service.CreateGameAsync(
            new CreateGameRequest { Title = "EXAMPLE GAME", ReleaseDate = releaseDate },
            CancellationToken.None);
        var updated = await service.UpdateGameAsync(
            created.Value!.Id,
            new UpdateGameRequest
            {
                Title = "Updated Game",
                ReleaseDate = releaseDate,
                Description = "Updated"
            },
            CancellationToken.None);

        Assert.Equal("Example Game", created.Value.Title);
        Assert.Equal("Description", created.Value.Description);
        Assert.Equal(GameErrorType.Conflict, duplicate.Error!.Type);
        Assert.Equal("Updated Game", updated.Value!.Title);
    }

    [Fact]
    public async Task CreateGame_RejectsInvalidCoverUrlAndEmptyTitle()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();

        var result = await service.CreateGameAsync(
            new CreateGameRequest
            {
                Title = "   ",
                ReleaseDate = DateOnly.FromDateTime(DateTime.UtcNow),
                CoverImageUrl = "file:///secret/image.jpg"
            },
            CancellationToken.None);

        Assert.Equal(GameErrorType.Validation, result.Error!.Type);
        Assert.Contains(nameof(CreateGameRequest.Title), result.Error.ValidationErrors!.Keys);
        Assert.Contains(nameof(CreateGameRequest.CoverImageUrl), result.Error.ValidationErrors.Keys);
    }

    [Fact]
    public async Task UpdateGame_RejectsDuplicateTitleAndReleaseDate()
    {
        var releaseDate = new DateOnly(2026, 8, 1);
        await factory.CreateGameAsync("Existing Game", releaseDate);
        var other = await factory.CreateGameAsync("Other Game", releaseDate);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();

        var result = await service.UpdateGameAsync(
            other.Id,
            new UpdateGameRequest { Title = " existing game ", ReleaseDate = releaseDate },
            CancellationToken.None);

        Assert.Equal(GameErrorType.Conflict, result.Error!.Type);
    }

    [Fact]
    public async Task ArchiveGame_IsIdempotentRetainedAndHiddenFromActiveLookup()
    {
        var game = await factory.CreateGameAsync(
            "Archive Me",
            DateOnly.FromDateTime(DateTime.UtcNow));
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IGameService>();

        var first = await service.ArchiveGameAsync(game.Id, CancellationToken.None);
        var repeated = await service.ArchiveGameAsync(game.Id, CancellationToken.None);
        var detail = await service.GetGameAsync(game.Id, CancellationToken.None);
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await context.Games.AsNoTracking().SingleAsync(value => value.Id == game.Id);

        Assert.True(first.Succeeded);
        Assert.True(repeated.Succeeded);
        Assert.Equal(GameErrorType.NotFound, detail.Error!.Type);
        Assert.False(stored.IsActive);
        Assert.NotNull(stored.ArchivedAtUtc);
    }

    [Fact]
    public async Task GameRowVersion_PreventsAStaleUpdateAfterArchival()
    {
        var game = await factory.CreateGameAsync(
            "Concurrency Game",
            DateOnly.FromDateTime(DateTime.UtcNow));
        await using var staleScope = factory.Services.CreateAsyncScope();
        var staleContext = staleScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var staleGame = await staleContext.Games.SingleAsync(value => value.Id == game.Id);

        await using var archiveScope = factory.Services.CreateAsyncScope();
        var archiveService = archiveScope.ServiceProvider.GetRequiredService<IGameService>();
        var archived = await archiveService.ArchiveGameAsync(game.Id, CancellationToken.None);

        staleGame.Description = "This stale update must not be saved.";
        Assert.True(archived.Succeeded);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
            staleContext.SaveChangesAsync(CancellationToken.None));
    }

    [Fact]
    public async Task ArchiveGame_ConcurrentRequestsRemainIdempotent()
    {
        var game = await factory.CreateGameAsync(
            "Concurrent Archive",
            DateOnly.FromDateTime(DateTime.UtcNow));
        await using var firstScope = factory.Services.CreateAsyncScope();
        await using var secondScope = factory.Services.CreateAsyncScope();
        var firstService = firstScope.ServiceProvider.GetRequiredService<IGameService>();
        var secondService = secondScope.ServiceProvider.GetRequiredService<IGameService>();

        var results = await Task.WhenAll(
            firstService.ArchiveGameAsync(game.Id, CancellationToken.None),
            secondService.ArchiveGameAsync(game.Id, CancellationToken.None));

        Assert.All(results, result => Assert.True(result.Succeeded));
    }
}
