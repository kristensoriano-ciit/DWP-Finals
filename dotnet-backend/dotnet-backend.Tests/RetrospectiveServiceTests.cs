using System.Data.Common;
using dotnet_backend.Contracts.Retrospectives;
using dotnet_backend.Data;
using dotnet_backend.Models;
using dotnet_backend.Services;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests;

public sealed class RetrospectiveServiceTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task CreateAsync_RequiresActiveGameAndValidNormalizedContent()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var archivedGame = await factory.CreateGameAsync(
            "Archived Game", DateOnly.FromDateTime(DateTime.UtcNow), isActive: false);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var invalid = await service.CreateAsync(author.Id, new CreateRetrospectiveRequest
        {
            GameId = archivedGame.Id,
            Title = " ",
            ReviewContent = new string('x', 20001),
            ImageUrl = "file:///image.png",
            Rating = 11
        }, CancellationToken.None);
        var inactiveGame = await service.CreateAsync(author.Id, new CreateRetrospectiveRequest
        {
            GameId = archivedGame.Id,
            Title = "Valid title",
            ReviewContent = "Valid content",
            Rating = 5
        }, CancellationToken.None);

        var errors = invalid.Error!.ValidationErrors!;
        Assert.Equal(RetrospectiveErrorType.Validation, invalid.Error.Type);
        Assert.Contains(nameof(CreateRetrospectiveRequest.Title), errors.Keys);
        Assert.Contains(nameof(CreateRetrospectiveRequest.ReviewContent), errors.Keys);
        Assert.Contains(nameof(CreateRetrospectiveRequest.ImageUrl), errors.Keys);
        Assert.Contains(nameof(CreateRetrospectiveRequest.Rating), errors.Keys);
        Assert.Contains(
            nameof(CreateRetrospectiveRequest.GameId),
            inactiveGame.Error!.ValidationErrors!.Keys);
    }

    [Fact]
    public async Task CreateAndUpdateAsync_TrimValuesAndRequireAnActiveGameOnUpdate()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Active Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var replacement = await factory.CreateGameAsync(
            "Archived Replacement", DateOnly.FromDateTime(DateTime.UtcNow), isActive: false);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var created = await service.CreateAsync(author.Id, new CreateRetrospectiveRequest
        {
            GameId = game.Id,
            Title = "  A title  ",
            ReviewContent = "  A review  ",
            ImageUrl = " https://example.com/image.jpg ",
            Rating = 8
        }, CancellationToken.None);
        var update = await service.UpdateAsync(author.Id, created.Value!.Id,
            new UpdateRetrospectiveRequest
            {
                GameId = replacement.Id,
                Title = "Changed",
                ReviewContent = "Changed content",
                Rating = 7,
                RowVersion = created.Value.RowVersion
            }, CancellationToken.None);

        Assert.Equal("A title", created.Value.Title);
        Assert.Equal("A review", created.Value.ReviewContent);
        Assert.Equal("https://example.com/image.jpg", created.Value.ImageUrl);
        Assert.Equal(RetrospectiveErrorType.Validation, update.Error!.Type);
    }

    [Fact]
    public async Task ChangeStatusAsync_SupportsAuthorStatusesAndPreservesUsefulTimestamps()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Status Game", DateOnly.FromDateTime(DateTime.UtcNow));
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();
        var current = (await service.CreateAsync(author.Id, new CreateRetrospectiveRequest
        {
            GameId = game.Id,
            Title = "Status review",
            ReviewContent = "Content",
            Rating = 6
        }, CancellationToken.None)).Value!;

        foreach (var status in new[]
                 {
                     AuthorRetrospectiveStatus.Review,
                     AuthorRetrospectiveStatus.Published,
                     AuthorRetrospectiveStatus.Unpublished,
                     AuthorRetrospectiveStatus.Draft
                 })
        {
            var changed = await service.ChangeStatusAsync(author.Id, current.Id,
                new ChangeRetrospectiveStatusRequest
                {
                    Status = status,
                    UnpublishedReason = status == AuthorRetrospectiveStatus.Unpublished
                        ? "  Needs correction.  "
                        : null,
                    RowVersion = current.RowVersion
                }, CancellationToken.None);
            Assert.True(changed.Succeeded);
            current = changed.Value!;
        }

        Assert.Equal(RetrospectiveStatus.Draft, current.Status);
        Assert.Equal("Needs correction.", current.UnpublishedReason);
        Assert.NotNull(current.PublishedAtUtc);
        Assert.NotNull(current.UnpublishedAtUtc);
        Assert.Null(current.ArchivedAtUtc);
    }

    [Fact]
    public async Task ChangeStatusAsync_RequiresReasonAndRejectsArchivedAsAnAuthorStatus()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Reason Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var entity = await factory.CreateRetrospectiveAsync(author.Id, game.Id, "Reason review");
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();
        var token = Convert.ToBase64String(entity.RowVersion);

        var noReason = await service.ChangeStatusAsync(author.Id, entity.Id,
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Unpublished,
                RowVersion = token
            }, CancellationToken.None);
        var archived = await service.ChangeStatusAsync(author.Id, entity.Id,
            new ChangeRetrospectiveStatusRequest
            {
                Status = (AuthorRetrospectiveStatus)999,
                RowVersion = token
            }, CancellationToken.None);

        Assert.Equal(RetrospectiveErrorType.Validation, noReason.Error!.Type);
        Assert.Equal(RetrospectiveErrorType.Validation, archived.Error!.Type);
    }

    [Fact]
    public async Task Ownership_IsEnforcedForReadUpdateStatusAndArchive()
    {
        var owner = await factory.CreateUserAsync("owner@example.com", "password123");
        var other = await factory.CreateUserAsync("other@example.com", "password123");
        var game = await factory.CreateGameAsync("Owned Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var entity = await factory.CreateRetrospectiveAsync(owner.Id, game.Id, "Owned review");
        var token = Convert.ToBase64String(entity.RowVersion);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var detail = await service.GetOwnByIdAsync(other.Id, entity.Id, CancellationToken.None);
        var update = await service.UpdateAsync(other.Id, entity.Id, new UpdateRetrospectiveRequest
        {
            GameId = game.Id,
            Title = "Attempt",
            ReviewContent = "Attempt",
            Rating = 1,
            RowVersion = token
        }, CancellationToken.None);
        var status = await service.ChangeStatusAsync(other.Id, entity.Id,
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Published,
                RowVersion = token
            }, CancellationToken.None);
        var archive = await service.ArchiveAsync(other.Id, entity.Id, token, CancellationToken.None);

        Assert.All(new[] { detail.Error, update.Error, status.Error, archive.Error },
            error => Assert.Equal(RetrospectiveErrorType.Forbidden, error!.Type));
    }

    [Fact]
    public async Task PublishedAndOwnQueries_ApplyVisibilityFilteringAndOrdering()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Browse Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var now = DateTimeOffset.UtcNow;
        await factory.CreateRetrospectiveAsync(author.Id, game.Id, "Older best", RetrospectiveStatus.Published, 10, now.AddHours(-2));
        await factory.CreateRetrospectiveAsync(author.Id, game.Id, "New lower", RetrospectiveStatus.Published, 8, now);
        await factory.CreateRetrospectiveAsync(author.Id, game.Id, "Private draft", RetrospectiveStatus.Draft, 10, now.AddHours(1));
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var newest = await service.GetPublishedAsync(new RetrospectiveListQuery(), CancellationToken.None);
        var best = await service.GetPublishedAsync(
            new RetrospectiveListQuery { Sort = RetrospectiveSort.Best }, CancellationToken.None);
        var own = await service.GetOwnAsync(author.Id,
            new OwnRetrospectiveListQuery(), CancellationToken.None);

        Assert.Equal(["New lower", "Older best"], newest.Value!.Items.Select(value => value.Title));
        Assert.Equal(["Older best", "New lower"], best.Value!.Items.Select(value => value.Title));
        Assert.Equal(3, own.Value!.TotalCount);
    }

    [Fact]
    public async Task ArchivedGame_DoesNotHideAnExistingPublishedRetrospective()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Retained Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var entity = await factory.CreateRetrospectiveAsync(
            author.Id, game.Id, "Retained review", RetrospectiveStatus.Published);
        await using var scope = factory.Services.CreateAsyncScope();
        var gameService = scope.ServiceProvider.GetRequiredService<IGameService>();
        await gameService.ArchiveGameAsync(game.Id, CancellationToken.None);
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var result = await service.GetPublishedByIdAsync(entity.Id, CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("Retained Game", result.Value!.GameTitle);
    }

    [Fact]
    public async Task Archive_IsIdempotentTerminalAndRetainsTheRow()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Archive Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var entity = await factory.CreateRetrospectiveAsync(author.Id, game.Id, "Archive review");
        var token = Convert.ToBase64String(entity.RowVersion);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var first = await service.ArchiveAsync(author.Id, entity.Id, token, CancellationToken.None);
        var repeated = await service.ArchiveAsync(author.Id, entity.Id, "ignored", CancellationToken.None);
        var update = await service.UpdateAsync(author.Id, entity.Id, new UpdateRetrospectiveRequest
        {
            GameId = game.Id,
            Title = "Cannot change",
            ReviewContent = "Cannot change",
            Rating = 1,
            RowVersion = token
        }, CancellationToken.None);
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await context.Retrospectives.AsNoTracking()
            .SingleAsync(value => value.Id == entity.Id);

        Assert.True(first.Succeeded);
        Assert.True(repeated.Succeeded);
        Assert.Equal(RetrospectiveErrorType.Conflict, update.Error!.Type);
        Assert.Equal(RetrospectiveStatus.Archived, stored.Status);
        Assert.NotNull(stored.ArchivedAtUtc);
    }

    [Fact]
    public async Task StaleRowVersion_ReturnsConflict()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Concurrency Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var entity = await factory.CreateRetrospectiveAsync(author.Id, game.Id, "Concurrency review");
        var staleToken = Convert.ToBase64String(entity.RowVersion);
        await using var firstScope = factory.Services.CreateAsyncScope();
        var firstService = firstScope.ServiceProvider.GetRequiredService<IRetrospectiveService>();
        var first = await firstService.UpdateAsync(author.Id, entity.Id, new UpdateRetrospectiveRequest
        {
            GameId = game.Id,
            Title = "First",
            ReviewContent = "First update",
            Rating = 8,
            RowVersion = staleToken
        }, CancellationToken.None);
        Assert.True(first.Succeeded);
        await using var staleScope = factory.Services.CreateAsyncScope();
        var staleService = staleScope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var stale = await staleService.ChangeStatusAsync(author.Id, entity.Id,
            new ChangeRetrospectiveStatusRequest
            {
                Status = AuthorRetrospectiveStatus.Published,
                RowVersion = staleToken
            }, CancellationToken.None);

        Assert.Equal(RetrospectiveErrorType.Conflict, stale.Error!.Type);
    }

    [Fact]
    public async Task PagingOverflow_ReturnsAnEmptyBoundedPage()
    {
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var game = await factory.CreateGameAsync("Paging Game", DateOnly.FromDateTime(DateTime.UtcNow));
        await factory.CreateRetrospectiveAsync(author.Id, game.Id, "One", RetrospectiveStatus.Published);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();

        var result = await service.GetPublishedAsync(new RetrospectiveListQuery
        {
            Page = int.MaxValue,
            PageSize = 100
        }, CancellationToken.None);

        Assert.Empty(result.Value!.Items);
        Assert.Equal(1, result.Value.TotalCount);
    }

    [Fact]
    public async Task CreateAsync_SerializesActiveGameCheckWithConcurrentArchival()
    {
        var author = await factory.CreateUserAsync("create-race@example.com", "password123");
        var game = await factory.CreateGameAsync(
            "Create Race Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var interceptor = new PauseRetrospectiveWriteInterceptor("INSERT INTO [Retrospectives]");
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(factory.ConnectionString)
            .AddInterceptors(interceptor)
            .Options;
        await using var createContext = new ApplicationDbContext(options);
        await using var archiveScope = factory.Services.CreateAsyncScope();
        var retrospectiveService = new RetrospectiveService(createContext, TimeProvider.System);
        var gameService = archiveScope.ServiceProvider.GetRequiredService<IGameService>();

        var createTask = retrospectiveService.CreateAsync(author.Id, new CreateRetrospectiveRequest
        {
            GameId = game.Id,
            Title = "Concurrent create",
            ReviewContent = "The create must commit before archival can complete.",
            Rating = 8
        }, CancellationToken.None);
        await interceptor.WriteReached.WaitAsync(TimeSpan.FromSeconds(5));
        var archiveTask = gameService.ArchiveGameAsync(game.Id, CancellationToken.None);
        await Task.Delay(250);

        var archivalWasBlocked = !archiveTask.IsCompleted;
        interceptor.Continue();
        var created = await createTask.WaitAsync(TimeSpan.FromSeconds(10));
        var archived = await archiveTask.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.True(archivalWasBlocked);
        Assert.True(created.Succeeded);
        Assert.True(archived.Succeeded);
    }

    [Fact]
    public async Task UpdateAsync_SerializesActiveGameCheckWithConcurrentArchival()
    {
        var author = await factory.CreateUserAsync("update-race@example.com", "password123");
        var game = await factory.CreateGameAsync(
            "Update Race Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var retrospective = await factory.CreateRetrospectiveAsync(
            author.Id, game.Id, "Before concurrent update");
        var interceptor = new PauseRetrospectiveWriteInterceptor("UPDATE [Retrospectives]");
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(factory.ConnectionString)
            .AddInterceptors(interceptor)
            .Options;
        await using var updateContext = new ApplicationDbContext(options);
        await using var archiveScope = factory.Services.CreateAsyncScope();
        var retrospectiveService = new RetrospectiveService(updateContext, TimeProvider.System);
        var gameService = archiveScope.ServiceProvider.GetRequiredService<IGameService>();

        var updateTask = retrospectiveService.UpdateAsync(
            author.Id,
            retrospective.Id,
            new UpdateRetrospectiveRequest
            {
                GameId = game.Id,
                Title = "After concurrent update",
                ReviewContent = "The update must commit before archival can complete.",
                Rating = 9,
                RowVersion = Convert.ToBase64String(retrospective.RowVersion)
            },
            CancellationToken.None);
        await interceptor.WriteReached.WaitAsync(TimeSpan.FromSeconds(5));
        var archiveTask = gameService.ArchiveGameAsync(game.Id, CancellationToken.None);
        await Task.Delay(250);

        var archivalWasBlocked = !archiveTask.IsCompleted;
        interceptor.Continue();
        var updated = await updateTask.WaitAsync(TimeSpan.FromSeconds(10));
        var archived = await archiveTask.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.True(archivalWasBlocked);
        Assert.True(updated.Succeeded);
        Assert.Equal("After concurrent update", updated.Value!.Title);
        Assert.True(archived.Succeeded);
    }

    [Fact]
    public async Task PagedOrdering_UsesIdToKeepTiedRowsStableAcrossPages()
    {
        var author = await factory.CreateUserAsync("ties@example.com", "password123");
        var game = await factory.CreateGameAsync(
            "Tied Paging Game", DateOnly.FromDateTime(DateTime.UtcNow));
        var timestamp = DateTimeOffset.UtcNow;
        await factory.CreateRetrospectiveAsync(
            author.Id, game.Id, "Tie A", RetrospectiveStatus.Published, 8, timestamp);
        await factory.CreateRetrospectiveAsync(
            author.Id, game.Id, "Tie B", RetrospectiveStatus.Published, 8, timestamp);
        await factory.CreateRetrospectiveAsync(
            author.Id, game.Id, "Tie C", RetrospectiveStatus.Published, 8, timestamp);
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IRetrospectiveService>();
        var expected = (await service.GetPublishedAsync(new RetrospectiveListQuery
        {
            PageSize = 3
        }, CancellationToken.None)).Value!.Items.Select(value => value.Id).ToArray();

        var newest = new List<Guid>();
        var best = new List<Guid>();
        var own = new List<Guid>();
        for (var page = 1; page <= 3; page++)
        {
            newest.Add((await service.GetPublishedAsync(new RetrospectiveListQuery
            {
                Page = page,
                PageSize = 1
            }, CancellationToken.None)).Value!.Items.Single().Id);
            best.Add((await service.GetPublishedAsync(new RetrospectiveListQuery
            {
                Sort = RetrospectiveSort.Best,
                Page = page,
                PageSize = 1
            }, CancellationToken.None)).Value!.Items.Single().Id);
            own.Add((await service.GetOwnAsync(author.Id, new OwnRetrospectiveListQuery
            {
                Page = page,
                PageSize = 1
            }, CancellationToken.None)).Value!.Items.Single().Id);
        }

        Assert.Equal(expected, newest);
        Assert.Equal(expected, best);
        Assert.Equal(expected, own);
        Assert.Equal(3, newest.Distinct().Count());
    }

    private sealed class PauseRetrospectiveWriteInterceptor(
        string commandFragment) : DbCommandInterceptor
    {
        private readonly TaskCompletionSource _continue =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource _writeReached =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task WriteReached => _writeReached.Task;

        public void Continue() => _continue.TrySetResult();

        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains(commandFragment, StringComparison.Ordinal))
            {
                _writeReached.TrySetResult();
                await _continue.Task.WaitAsync(cancellationToken);
            }

            return result;
        }
    }
}
