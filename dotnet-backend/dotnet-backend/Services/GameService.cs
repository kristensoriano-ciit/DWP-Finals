using dotnet_backend.Contracts.Games;
using dotnet_backend.Data;
using dotnet_backend.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace dotnet_backend.Services;

public sealed class GameService(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider) : IGameService
{
    public async Task<GameResult<PagedGamesResponse>> GetGamesAsync(
        GameListQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page < 1 || query.PageSize is < 1 or > 100)
        {
            var errors = new Dictionary<string, string[]>();
            if (query.Page < 1)
            {
                errors[nameof(GameListQuery.Page)] = ["Page must be at least 1."];
            }

            if (query.PageSize is < 1 or > 100)
            {
                errors[nameof(GameListQuery.PageSize)] =
                    ["Page size must be between 1 and 100."];
            }

            return GameResult<PagedGamesResponse>.Failure(ValidationError(errors));
        }

        var games = dbContext.Games.AsNoTracking().Where(game => game.IsActive);
        var normalizedSearch = query.Search?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            games = games.Where(game => game.NormalizedTitle.Contains(normalizedSearch));
        }

        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        games = query.ReleaseWindow switch
        {
            GameReleaseWindow.New => games.Where(game =>
                game.ReleaseDate >= today.AddDays(-90) && game.ReleaseDate <= today),
            GameReleaseWindow.Upcoming => games.Where(game => game.ReleaseDate > today),
            _ => games
        };

        var totalCount = await games.CountAsync(cancellationToken);
        var offset = ((long)query.Page - 1) * query.PageSize;
        if (offset >= totalCount)
        {
            return GameResult<PagedGamesResponse>.Success(new PagedGamesResponse(
                [], query.Page, query.PageSize, totalCount));
        }

        var orderedGames = query.ReleaseWindow switch
        {
            GameReleaseWindow.New => games
                .OrderByDescending(game => game.ReleaseDate)
                .ThenBy(game => game.Title),
            GameReleaseWindow.Upcoming => games
                .OrderBy(game => game.ReleaseDate)
                .ThenBy(game => game.Title),
            _ => games.OrderBy(game => game.Title).ThenBy(game => game.ReleaseDate)
        };
        var items = await orderedGames
            .Skip((int)offset)
            .Take(query.PageSize)
            .Select(game => ToResponse(game))
            .ToListAsync(cancellationToken);

        return GameResult<PagedGamesResponse>.Success(new PagedGamesResponse(
            items, query.Page, query.PageSize, totalCount));
    }

    public async Task<GameResult<GameResponse>> GetGameAsync(
        Guid gameId,
        CancellationToken cancellationToken)
    {
        var game = await dbContext.Games.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == gameId && value.IsActive, cancellationToken);
        return game is null
            ? GameResult<GameResponse>.Failure(NotFoundError())
            : GameResult<GameResponse>.Success(ToResponse(game));
    }

    public async Task<GameResult<GameResponse>> CreateGameAsync(
        CreateGameRequest request,
        CancellationToken cancellationToken)
    {
        var values = NormalizeAndValidate(
            request.Title,
            request.Description,
            request.ReleaseDate,
            request.CoverImageUrl);
        if (values.Error is not null)
        {
            return GameResult<GameResponse>.Failure(values.Error);
        }

        if (await DuplicateExistsAsync(values.NormalizedTitle!, request.ReleaseDate, null, cancellationToken))
        {
            return GameResult<GameResponse>.Failure(DuplicateError());
        }

        var now = timeProvider.GetUtcNow();
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = values.Title!,
            NormalizedTitle = values.NormalizedTitle!,
            Description = values.Description,
            ReleaseDate = request.ReleaseDate,
            CoverImageUrl = values.CoverImageUrl,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        dbContext.Games.Add(game);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return GameResult<GameResponse>.Failure(ConcurrencyError());
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            return GameResult<GameResponse>.Failure(DuplicateError());
        }
        return GameResult<GameResponse>.Success(ToResponse(game));
    }

    public async Task<GameResult<GameResponse>> UpdateGameAsync(
        Guid gameId,
        UpdateGameRequest request,
        CancellationToken cancellationToken)
    {
        var values = NormalizeAndValidate(
            request.Title,
            request.Description,
            request.ReleaseDate,
            request.CoverImageUrl);
        if (values.Error is not null)
        {
            return GameResult<GameResponse>.Failure(values.Error);
        }

        var game = await dbContext.Games.SingleOrDefaultAsync(
            value => value.Id == gameId && value.IsActive,
            cancellationToken);
        if (game is null)
        {
            return GameResult<GameResponse>.Failure(NotFoundError());
        }

        if (await DuplicateExistsAsync(
                values.NormalizedTitle!, request.ReleaseDate, gameId, cancellationToken))
        {
            return GameResult<GameResponse>.Failure(DuplicateError());
        }

        game.Title = values.Title!;
        game.NormalizedTitle = values.NormalizedTitle!;
        game.Description = values.Description;
        game.ReleaseDate = request.ReleaseDate;
        game.CoverImageUrl = values.CoverImageUrl;
        game.UpdatedAtUtc = timeProvider.GetUtcNow();

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            return GameResult<GameResponse>.Failure(DuplicateError());
        }
        catch (DbUpdateConcurrencyException)
        {
            return GameResult<GameResponse>.Failure(ConcurrencyError());
        }

        return GameResult<GameResponse>.Success(ToResponse(game));
    }

    public async Task<GameResult> ArchiveGameAsync(
        Guid gameId,
        CancellationToken cancellationToken)
    {
        var game = await dbContext.Games.SingleOrDefaultAsync(
            value => value.Id == gameId,
            cancellationToken);
        if (game is null)
        {
            return GameResult.Failure(NotFoundError());
        }

        if (!game.IsActive)
        {
            return GameResult.Success();
        }

        var now = timeProvider.GetUtcNow();
        game.IsActive = false;
        game.ArchivedAtUtc = now;
        game.UpdatedAtUtc = now;
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return GameResult.Success();
        }
        catch (DbUpdateConcurrencyException)
        {
            dbContext.Entry(game).State = EntityState.Detached;
            var current = await dbContext.Games.AsNoTracking()
                .SingleOrDefaultAsync(value => value.Id == gameId, cancellationToken);
            return current is not null && !current.IsActive
                ? GameResult.Success()
                : GameResult.Failure(ConcurrencyError());
        }
    }

    private Task<bool> DuplicateExistsAsync(
        string normalizedTitle,
        DateOnly releaseDate,
        Guid? excludedGameId,
        CancellationToken cancellationToken) => dbContext.Games.AnyAsync(game =>
            game.NormalizedTitle == normalizedTitle &&
            game.ReleaseDate == releaseDate &&
            (!excludedGameId.HasValue || game.Id != excludedGameId.Value),
            cancellationToken);

    private static NormalizedGameValues NormalizeAndValidate(
        string titleValue,
        string? descriptionValue,
        DateOnly releaseDate,
        string? coverImageUrlValue)
    {
        var title = titleValue.Trim();
        var description = string.IsNullOrWhiteSpace(descriptionValue) ? null : descriptionValue.Trim();
        var coverImageUrl = string.IsNullOrWhiteSpace(coverImageUrlValue)
            ? null
            : coverImageUrlValue.Trim();
        var errors = new Dictionary<string, string[]>();

        if (title.Length is < 1 or > 200)
        {
            errors[nameof(CreateGameRequest.Title)] =
                ["Title must contain between 1 and 200 characters."];
        }

        if (description?.Length > 2000)
        {
            errors[nameof(CreateGameRequest.Description)] =
                ["Description cannot exceed 2,000 characters."];
        }

        if (releaseDate == default)
        {
            errors[nameof(CreateGameRequest.ReleaseDate)] = ["Release date is required."];
        }

        if (coverImageUrl is not null &&
            (coverImageUrl.Length > 2048 ||
             !Uri.TryCreate(coverImageUrl, UriKind.Absolute, out var uri) ||
             (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)))
        {
            errors[nameof(CreateGameRequest.CoverImageUrl)] =
                ["Cover image URL must be an absolute HTTP or HTTPS URL with at most 2,048 characters."];
        }

        return errors.Count > 0
            ? new NormalizedGameValues(Error: ValidationError(errors))
            : new NormalizedGameValues(
                title,
                title.ToUpperInvariant(),
                description,
                coverImageUrl);
    }

    private static GameResponse ToResponse(Game game) => new(
        game.Id,
        game.Title,
        game.Description,
        game.ReleaseDate,
        game.CoverImageUrl,
        game.IsActive,
        game.CreatedAtUtc,
        game.UpdatedAtUtc,
        game.ArchivedAtUtc);

    private static GameError ValidationError(IReadOnlyDictionary<string, string[]> errors) => new(
        GameErrorType.Validation,
        "validation_failed",
        "One or more validation errors occurred.",
        errors);

    private static GameError DuplicateError() => new(
        GameErrorType.Conflict,
        "duplicate_game",
        "A game already uses this title and release date.");

    private static GameError NotFoundError() => new(
        GameErrorType.NotFound,
        "game_not_found",
        "The requested active game was not found.");

    private static GameError ConcurrencyError() => new(
        GameErrorType.Conflict,
        "game_changed",
        "The game changed while this operation was in progress. Reload it and try again.");

    private static bool IsUniqueViolation(DbUpdateException exception)
    {
        Exception? current = exception;
        while (current is not null)
        {
            if (current is SqlException { Number: 2601 or 2627 })
            {
                return true;
            }

            current = current.InnerException;
        }

        return false;
    }

    private sealed record NormalizedGameValues(
        string? Title = null,
        string? NormalizedTitle = null,
        string? Description = null,
        string? CoverImageUrl = null,
        GameError? Error = null);
}
