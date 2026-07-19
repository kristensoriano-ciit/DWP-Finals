using dotnet_backend.Models;

namespace dotnet_backend.Contracts.Retrospectives;

public sealed record PublishedRetrospectiveResponse(
    Guid Id,
    Guid GameId,
    string GameTitle,
    Guid AuthorUserId,
    string AuthorDisplayName,
    string Title,
    string ReviewContent,
    string? ImageUrl,
    int Rating,
    DateTimeOffset PublishedAtUtc);

public sealed record RetrospectiveResponse(
    Guid Id,
    Guid GameId,
    string GameTitle,
    Guid AuthorUserId,
    string AuthorDisplayName,
    string Title,
    string ReviewContent,
    string? ImageUrl,
    int Rating,
    RetrospectiveStatus Status,
    string? UnpublishedReason,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset? PublishedAtUtc,
    DateTimeOffset? UnpublishedAtUtc,
    DateTimeOffset? ArchivedAtUtc,
    string RowVersion);

public sealed record PagedPublishedRetrospectivesResponse(
    IReadOnlyList<PublishedRetrospectiveResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record PagedRetrospectivesResponse(
    IReadOnlyList<RetrospectiveResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
