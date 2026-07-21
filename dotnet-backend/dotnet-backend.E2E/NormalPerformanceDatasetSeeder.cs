using dotnet_backend.Data;
using dotnet_backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.E2E;

public static class NormalPerformanceDatasetSeeder
{
    public const string AdminEmail = "e2e-admin@example.com";
    public const string PerformanceAuthorEmail = "e2e-performance-author@example.com";
    public const string AccountAuthorEmail = "e2e-account-author@example.com";
    public const string LifecycleAuthorEmail = "e2e-lifecycle-author@example.com";
    public const string ConflictAuthorEmail = "e2e-conflict-author@example.com";
    public const string DeactivationTargetEmail = "e2e-deactivation-target@example.com";

    private static readonly DateTimeOffset SeededAtUtc =
        new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static readonly LoginFixture[] LoginFixtures =
    [
        new(0, AdminEmail, "E2E Admin", DevelopmentIdentitySeeder.AdminRole),
        new(1, PerformanceAuthorEmail, "E2E Performance Author", DevelopmentIdentitySeeder.AuthorRole),
        new(2, AccountAuthorEmail, "E2E Account Author", DevelopmentIdentitySeeder.AuthorRole),
        new(3, LifecycleAuthorEmail, "E2E Lifecycle Author", DevelopmentIdentitySeeder.AuthorRole),
        new(4, ConflictAuthorEmail, "E2E Conflict Author", DevelopmentIdentitySeeder.AuthorRole),
        new(5, DeactivationTargetEmail, "E2E Deactivation Target", DevelopmentIdentitySeeder.AuthorRole)
    ];

    public static async Task<NormalPerformanceDataset> SeedAsync(
        IServiceProvider services,
        string password,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var role in new[]
                 {
                     DevelopmentIdentitySeeder.AuthorRole,
                     DevelopmentIdentitySeeder.AdminRole
                 })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                EnsureSucceeded(
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role)),
                    $"create the {role} role");
            }
        }

        var authors = new List<ApplicationUser>(99);
        foreach (var fixture in LoginFixtures)
        {
            var user = CreateUser(fixture.Index, fixture.Email, fixture.DisplayName, isActive: true);
            EnsureSucceeded(
                await userManager.CreateAsync(user, password),
                $"create fixture user {fixture.Email}");
            EnsureSucceeded(
                await userManager.AddToRoleAsync(user, fixture.Role),
                $"assign the {fixture.Role} role to {fixture.Email}");

            if (fixture.Role == DevelopmentIdentitySeeder.AuthorRole)
            {
                authors.Add(user);
            }
        }

        var authorRoleId = await context.Roles
            .Where(role => role.Name == DevelopmentIdentitySeeder.AuthorRole)
            .Select(role => role.Id)
            .SingleAsync(cancellationToken);
        for (var index = 6; index <= 99; index++)
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
        await VerifyTotalsAsync(context, cancellationToken);

        return new NormalPerformanceDataset(
            games[0].Id,
            games[10].Id,
            retrospectives[0].Id,
            authors[0].Id);
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

    private static async Task VerifyTotalsAsync(
        ApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var gameCount = await context.Games.CountAsync(cancellationToken);
        var activeGameCount = await context.Games.CountAsync(game => game.IsActive, cancellationToken);
        var userCount = await context.Users.CountAsync(cancellationToken);
        var activeUserCount = await context.Users.CountAsync(user => user.IsActive, cancellationToken);
        var adminCount = await CountUsersInRoleAsync(
            context,
            DevelopmentIdentitySeeder.AdminRole,
            activeOnly: false,
            cancellationToken);
        var authorCount = await CountUsersInRoleAsync(
            context,
            DevelopmentIdentitySeeder.AuthorRole,
            activeOnly: false,
            cancellationToken);
        var activeAuthorCount = await CountUsersInRoleAsync(
            context,
            DevelopmentIdentitySeeder.AuthorRole,
            activeOnly: true,
            cancellationToken);
        var retrospectiveCount = await context.Retrospectives.CountAsync(cancellationToken);
        var statusCounts = await context.Retrospectives
            .GroupBy(retrospective => retrospective.Status)
            .ToDictionaryAsync(
                group => group.Key,
                group => group.Count(),
                cancellationToken);

        var hasExpectedDistribution =
            gameCount == 100 &&
            activeGameCount == 90 &&
            userCount == 100 &&
            activeUserCount == 90 &&
            adminCount == 1 &&
            authorCount == 99 &&
            activeAuthorCount == 89 &&
            retrospectiveCount == 200 &&
            GetCount(statusCounts, RetrospectiveStatus.Published) == 80 &&
            GetCount(statusCounts, RetrospectiveStatus.Draft) == 40 &&
            GetCount(statusCounts, RetrospectiveStatus.Review) == 30 &&
            GetCount(statusCounts, RetrospectiveStatus.Unpublished) == 30 &&
            GetCount(statusCounts, RetrospectiveStatus.Archived) == 20;
        if (!hasExpectedDistribution)
        {
            throw new InvalidOperationException(
                "The seeded fixture does not match the required deterministic distribution.");
        }
    }

    private static Task<int> CountUsersInRoleAsync(
        ApplicationDbContext context,
        string roleName,
        bool activeOnly,
        CancellationToken cancellationToken) => context.UserRoles
        .Join(
            context.Roles.Where(role => role.Name == roleName),
            userRole => userRole.RoleId,
            role => role.Id,
            (userRole, _) => userRole.UserId)
        .Join(
            context.Users.Where(user => !activeOnly || user.IsActive),
            userId => userId,
            user => user.Id,
            (_, user) => user)
        .CountAsync(cancellationToken);

    private static int GetCount(
        IReadOnlyDictionary<RetrospectiveStatus, int> counts,
        RetrospectiveStatus status) => counts.GetValueOrDefault(status);

    private static void EnsureSucceeded(IdentityResult result, string operation)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Could not {operation}: {FormatErrors(result.Errors)}");
        }
    }

    private static Guid DeterministicId(int entityType, int index) =>
        Guid.Parse($"{entityType}0000000-0000-0000-0000-{index:000000000000}");

    private static string FormatErrors(IEnumerable<IdentityError> errors) =>
        string.Join(", ", errors.Select(error => error.Description));

    private sealed record LoginFixture(
        int Index,
        string Email,
        string DisplayName,
        string Role);
}

public sealed record NormalPerformanceDataset(
    Guid ActiveGameId,
    Guid FilterGameId,
    Guid PublishedRetrospectiveId,
    Guid AuthorUserId);
