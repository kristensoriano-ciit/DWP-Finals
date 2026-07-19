using dotnet_backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace dotnet_backend.Data;

public sealed class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<UserDeactivation> UserDeactivations => Set<UserDeactivation>();

    public DbSet<Game> Games => Set<Game>();

    public DbSet<Retrospective> Retrospectives => Set<Retrospective>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(user =>
        {
            user.Property(value => value.DisplayName)
                .HasMaxLength(50)
                .IsRequired();

            user.Property(value => value.IsActive)
                .HasDefaultValue(true);

            user.HasIndex(value => value.NormalizedEmail)
                .IsUnique()
                .HasFilter("[NormalizedEmail] IS NOT NULL");

            user.ToTable(table => table.HasCheckConstraint(
                "CK_AspNetUsers_ActiveLifecycle",
                "([IsActive] = CAST(1 AS bit) AND [DeactivatedAtUtc] IS NULL) OR " +
                "([IsActive] = CAST(0 AS bit) AND [DeactivatedAtUtc] IS NOT NULL)"));
        });

        builder.Entity<UserDeactivation>(deactivation =>
        {
            deactivation.HasKey(value => value.Id);

            deactivation.HasOne(value => value.TargetUser)
                .WithMany(value => value.DeactivationsReceived)
                .HasForeignKey(value => value.TargetUserId)
                .OnDelete(DeleteBehavior.Restrict);

            deactivation.HasOne(value => value.AdminUser)
                .WithMany(value => value.DeactivationsPerformed)
                .HasForeignKey(value => value.AdminUserId)
                .OnDelete(DeleteBehavior.Restrict);

            deactivation.HasIndex(value => value.TargetUserId);
            deactivation.HasIndex(value => value.AdminUserId);
        });

        builder.Entity<Game>(game =>
        {
            game.Property(value => value.Title).HasMaxLength(200).IsRequired();
            game.Property(value => value.NormalizedTitle).HasMaxLength(200).IsRequired();
            game.Property(value => value.Description).HasMaxLength(2000);
            game.Property(value => value.ReleaseDate).HasColumnType("date");
            game.Property(value => value.CoverImageUrl).HasMaxLength(2048);
            game.Property(value => value.IsActive).HasDefaultValue(true);
            game.Property(value => value.RowVersion).IsRowVersion();

            game.HasIndex(value => new { value.NormalizedTitle, value.ReleaseDate }).IsUnique();
            game.HasIndex(value => value.NormalizedTitle);
            game.HasIndex(value => new { value.IsActive, value.ReleaseDate });

            game.ToTable(table => table.HasCheckConstraint(
                "CK_Games_ActiveLifecycle",
                "([IsActive] = CAST(1 AS bit) AND [ArchivedAtUtc] IS NULL) OR " +
                "([IsActive] = CAST(0 AS bit) AND [ArchivedAtUtc] IS NOT NULL)"));
        });

        builder.Entity<Retrospective>(retrospective =>
        {
            retrospective.Property(value => value.Title).HasMaxLength(200).IsRequired();
            retrospective.Property(value => value.ReviewContent).HasMaxLength(20000).IsRequired();
            retrospective.Property(value => value.ImageUrl).HasMaxLength(2048);
            retrospective.Property(value => value.Status)
                .HasConversion<string>()
                .HasMaxLength(20);
            retrospective.Property(value => value.UnpublishedReason).HasMaxLength(500);
            retrospective.Property(value => value.RowVersion).IsRowVersion();

            retrospective.HasOne(value => value.Game)
                .WithMany(value => value.Retrospectives)
                .HasForeignKey(value => value.GameId)
                .OnDelete(DeleteBehavior.Restrict);
            retrospective.HasOne(value => value.AuthorUser)
                .WithMany(value => value.Retrospectives)
                .HasForeignKey(value => value.AuthorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            retrospective.HasIndex(value => new { value.Status, value.PublishedAtUtc });
            retrospective.HasIndex(value => new { value.GameId, value.Status });
            retrospective.HasIndex(value => new { value.AuthorUserId, value.Status, value.UpdatedAtUtc });

            retrospective.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_Retrospectives_Rating",
                    "[Rating] >= 1 AND [Rating] <= 10");
                table.HasCheckConstraint(
                    "CK_Retrospectives_UnpublishedReason",
                    "[Status] <> 'Unpublished' OR (LEN(LTRIM(RTRIM([UnpublishedReason]))) BETWEEN 1 AND 500)");
                table.HasCheckConstraint(
                    "CK_Retrospectives_ArchivedLifecycle",
                    "([Status] = 'Archived' AND [ArchivedAtUtc] IS NOT NULL) OR " +
                    "([Status] <> 'Archived' AND [ArchivedAtUtc] IS NULL)");
            });
        });
    }
}
