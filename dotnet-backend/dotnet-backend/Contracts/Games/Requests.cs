using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Contracts.Games;

public enum GameReleaseWindow
{
    All,
    New,
    Upcoming
}

public sealed class CreateGameRequest
{
    [Required]
    public string Title { get; init; } = string.Empty;

    public string? Description { get; init; }

    public DateOnly ReleaseDate { get; init; }

    public string? CoverImageUrl { get; init; }
}

public sealed class UpdateGameRequest
{
    [Required]
    public string Title { get; init; } = string.Empty;

    public string? Description { get; init; }

    public DateOnly ReleaseDate { get; init; }

    public string? CoverImageUrl { get; init; }
}

public sealed class GameListQuery
{
    [FromQuery(Name = "search")]
    public string? Search { get; init; }

    [FromQuery(Name = "releaseWindow")]
    public GameReleaseWindow ReleaseWindow { get; init; } = GameReleaseWindow.All;

    [FromQuery(Name = "page")]
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [FromQuery(Name = "pageSize")]
    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}
