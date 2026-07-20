using dotnet_backend.Data;
using dotnet_backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests.Infrastructure;

public static class NormalPerformanceDatasetSeeder
{
    public const string Password = "password123";
    public const string AdminEmail = "performance-admin@example.com";
    public const string AuthorEmail = "performance-author-001@example.com";

    private static readonly DateTimeOffset SeededAtUtc =
        new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    public static async Task<NormalPerformanceDataset> SeedAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var admin = CreateUser(0, AdminEmail, "Performance Admin", isActive: true);
        await CreateLoginUserAsync(userManager, admin, DevelopmentIdentitySeeder.AdminRole);

        var measuredAuthor = CreateUser(1, AuthorEmail, "Performance Author 001", isActive: true);
        await CreateLoginUserAsync(userManager, measuredAuthor, DevelopmentIdentitySeeder.AuthorRole);

        var authorRoleId = await context.Roles
            .Where(role => role.Name == DevelopmentIdentitySeeder.AuthorRole)
            .Select(role => role.Id)
            .SingleAsync(cancellationToken);
        var authors = new List<ApplicationUser> { measuredAuthor };
        for (var index = 2; index <= 99; index++)
        {
            var isActive = index <= 89;
            var author = CreateUser(
                index,
                $"performance-author-{index:000}@example.com",
                $"Performance Author {index:000}",
                isActive);
            authors.Add(author);
            context.Users.Add(author);
            context.UserRoles.Add(new IdentityUserRole<Guid>
            {
                UserId = author.Id,
                RoleId = authorRoleId
            });
        }

        var games = Enumerable.Range(1, 100)
            .Select(index => CreateGame(index, isActive: index <= 90))
            .ToList();
        context.Games.AddRange(games);

        var retrospectives = new List<Retrospective>(200);
        for (var index = 0; index < 200; index++)
        {
            var status = GetStatus(index);
            var timestamp = SeededAtUtc.AddDays(-2 * index);
            var author = index % 5 == 0
                ? authors[0]
                : authors[1 + (index % 80)];
            var game = index < 10
                ? games[90 + index]
                : games[index % 90];

            retrospectives.Add(new Retrospective
            {
                Id = DeterministicId(3, index + 1),
                AuthorUserId = author.Id,
                GameId = game.Id,
                Title = $"Performance retrospective {index + 1:000}",
                ReviewContent = $"Deterministic performance review content for item {index + 1:000}.",
                Rating = (index % 10) + 1,
                Status = status,
                UnpublishedReason = status == RetrospectiveStatus.Unpublished
                    ? "Temporarily unpublished in the performance dataset."
                    : null,
                CreatedAtUtc = timestamp,
                UpdatedAtUtc = timestamp,
                PublishedAtUtc = status == RetrospectiveStatus.Published ? timestamp : null,
                UnpublishedAtUtc = status == RetrospectiveStatus.Unpublished ? timestamp : null,
                ArchivedAtUtc = status == RetrospectiveStatus.Archived ? timestamp : null
            });
        }

        context.Retrospectives.AddRange(retrospectives);
        await context.SaveChangesAsync(cancellationToken);

        return new NormalPerformanceDataset(
            games[0].Id,
            games[10].Id,
            retrospectives[0].Id,
            measuredAuthor.Id);
    }

    private static ApplicationUser CreateUser(
        int index,
        string email,
        string displayName,
        bool isActive)
    {
        var normalizedEmail = email.ToUpperInvariant();
        return new ApplicationUser
        {
            Id = DeterministicId(1, index + 1),
            DisplayName = displayName,
            Email = email,
            NormalizedEmail = normalizedEmail,
            UserName = email,
            NormalizedUserName = normalizedEmail,
            EmailConfirmed = true,
            SecurityStamp = $"performance-security-{index:000}",
            ConcurrencyStamp = $"performance-concurrency-{index:000}",
            IsActive = isActive,
            CreatedAtUtc = SeededAtUtc.AddDays(-index),
            DeactivatedAtUtc = isActive ? null : SeededAtUtc.AddDays(-index)
        };
    }

    private static Game CreateGame(int index, bool isActive)
    {
        var timestamp = SeededAtUtc.AddDays(-index);
        var title = $"Performance Game {index:000}";
        return new Game
        {
            Id = DeterministicId(2, index),
            Title = title,
            NormalizedTitle = title.ToUpperInvariant(),
            Description = $"Deterministic performance game {index:000}.",
            ReleaseDate = new DateOnly(2020, 1, 1).AddDays(index * 7),
            IsActive = isActive,
            CreatedAtUtc = timestamp,
            UpdatedAtUtc = timestamp,
            ArchivedAtUtc = isActive ? null : timestamp
        };
    }

    private static RetrospectiveStatus GetStatus(int index) => index switch
    {
        < 80 => RetrospectiveStatus.Published,
        < 120 => RetrospectiveStatus.Draft,
        < 150 => RetrospectiveStatus.Review,
        < 180 => RetrospectiveStatus.Unpublished,
        _ => RetrospectiveStatus.Archived
    };

    private static async Task CreateLoginUserAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        string role)
    {
        var createResult = await userManager.CreateAsync(user, Password);
        Assert.True(createResult.Succeeded, FormatErrors(createResult.Errors));

        var roleResult = await userManager.AddToRoleAsync(user, role);
        Assert.True(roleResult.Succeeded, FormatErrors(roleResult.Errors));
    }

    private static Guid DeterministicId(int entityType, int index) =>
        Guid.Parse($"{entityType}0000000-0000-0000-0000-{index:000000000000}");

    private static string FormatErrors(IEnumerable<IdentityError> errors) =>
        string.Join(", ", errors.Select(error => error.Description));
}

public sealed record NormalPerformanceDataset(
    Guid ActiveGameId,
    Guid FilterGameId,
    Guid PublishedRetrospectiveId,
    Guid AuthorUserId);
