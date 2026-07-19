namespace dotnet_backend.Models;

public enum RetrospectiveStatus
{
    Draft,
    Review,
    Published,
    Unpublished,
    Archived
}

public sealed class Retrospective
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid GameId { get; set; }

    public Game Game { get; set; } = null!;

    public Guid AuthorUserId { get; set; }

    public ApplicationUser AuthorUser { get; set; } = null!;

    public required string Title { get; set; }

    public required string ReviewContent { get; set; }

    public string? ImageUrl { get; set; }

    public int Rating { get; set; }

    public RetrospectiveStatus Status { get; set; } = RetrospectiveStatus.Draft;

    public string? UnpublishedReason { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset UpdatedAtUtc { get; set; }

    public DateTimeOffset? PublishedAtUtc { get; set; }

    public DateTimeOffset? UnpublishedAtUtc { get; set; }

    public DateTimeOffset? ArchivedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = [];
}
