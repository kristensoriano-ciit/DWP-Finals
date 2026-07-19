using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Contracts.Retrospectives;

public enum RetrospectiveSort
{
    Newest,
    Best
}

public enum AuthorRetrospectiveStatus
{
    Draft,
    Review,
    Published,
    Unpublished
}

public sealed class CreateRetrospectiveRequest
{
    [Required]
    public Guid GameId { get; init; }

    [Required]
    public string Title { get; init; } = string.Empty;

    [Required]
    public string ReviewContent { get; init; } = string.Empty;

    public string? ImageUrl { get; init; }

    [Range(1, 10)]
    public int Rating { get; init; }

    [EnumDataType(typeof(AuthorRetrospectiveStatus))]
    public AuthorRetrospectiveStatus Status { get; init; } = AuthorRetrospectiveStatus.Draft;

    public string? UnpublishedReason { get; init; }
}

public sealed class UpdateRetrospectiveRequest
{
    [Required]
    public Guid GameId { get; init; }

    [Required]
    public string Title { get; init; } = string.Empty;

    [Required]
    public string ReviewContent { get; init; } = string.Empty;

    public string? ImageUrl { get; init; }

    [Range(1, 10)]
    public int Rating { get; init; }

    [Required]
    [MinLength(1)]
    public string RowVersion { get; init; } = string.Empty;
}

public sealed class ChangeRetrospectiveStatusRequest
{
    [Required]
    [EnumDataType(typeof(AuthorRetrospectiveStatus))]
    public AuthorRetrospectiveStatus? Status { get; init; }

    public string? UnpublishedReason { get; init; }

    [Required]
    [MinLength(1)]
    public string RowVersion { get; init; } = string.Empty;
}

public class RetrospectiveListQuery
{
    [FromQuery(Name = "search")]
    public string? Search { get; init; }

    [FromQuery(Name = "gameId")]
    public Guid? GameId { get; init; }

    [FromQuery(Name = "sort")]
    public RetrospectiveSort Sort { get; init; } = RetrospectiveSort.Newest;

    [FromQuery(Name = "page")]
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [FromQuery(Name = "pageSize")]
    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}

public sealed class OwnRetrospectiveListQuery : RetrospectiveListQuery
{
    [FromQuery(Name = "status")]
    public AuthorRetrospectiveStatus? Status { get; init; }
}
