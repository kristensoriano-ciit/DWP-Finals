namespace dotnet_backend.Contracts.Games;

public sealed record GameResponse(
    Guid Id,
    string Title,
    string? Description,
    DateOnly ReleaseDate,
    string? CoverImageUrl,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset? ArchivedAtUtc);

public sealed record PagedGamesResponse(
    IReadOnlyList<GameResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
