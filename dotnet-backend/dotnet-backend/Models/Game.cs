namespace dotnet_backend.Models;

public sealed class Game
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string Title { get; set; }

    public required string NormalizedTitle { get; set; }

    public string? Description { get; set; }

    public DateOnly ReleaseDate { get; set; }

    public string? CoverImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset UpdatedAtUtc { get; set; }

    public DateTimeOffset? ArchivedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = [];

    public ICollection<Retrospective> Retrospectives { get; } = [];
}
