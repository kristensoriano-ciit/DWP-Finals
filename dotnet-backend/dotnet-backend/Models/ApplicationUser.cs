using Microsoft.AspNetCore.Identity;

namespace dotnet_backend.Models;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string DisplayName { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? DeactivatedAtUtc { get; set; }

    public int AuthenticationVersion { get; set; }

    public ICollection<UserDeactivation> DeactivationsReceived { get; } = [];

    public ICollection<UserDeactivation> DeactivationsPerformed { get; } = [];

    public ICollection<Retrospective> Retrospectives { get; } = [];
}
