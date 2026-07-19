namespace dotnet_backend.Models;

public sealed class UserDeactivation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TargetUserId { get; set; }

    public ApplicationUser TargetUser { get; set; } = null!;

    public Guid AdminUserId { get; set; }

    public ApplicationUser AdminUser { get; set; } = null!;

    public DateTimeOffset DeactivatedAtUtc { get; set; }
}
