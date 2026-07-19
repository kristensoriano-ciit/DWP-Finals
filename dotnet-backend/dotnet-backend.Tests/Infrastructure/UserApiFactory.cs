using dotnet_backend.Data;
using dotnet_backend.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace dotnet_backend.Tests.Infrastructure;

public sealed class UserApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"DwpFinalsTests_{Guid.NewGuid():N}";

    public string ConnectionString =>
        $"Server=(localdb)\\DwpFinals;Database={_databaseName};" +
        "Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
        builder.UseSetting("Jwt:Key", "tests-only-signing-key-with-more-than-32-characters");
        builder.UseSetting("Jwt:Issuer", "DwpFinals.Tests");
        builder.UseSetting("Jwt:Audience", "DwpFinals.Tests.Client");
        builder.UseSetting("Jwt:AccessTokenMinutes", "60");
        builder.UseSetting("AdminSeed:Enabled", "false");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                ["Jwt:Key"] = "tests-only-signing-key-with-more-than-32-characters",
                ["Jwt:Issuer"] = "DwpFinals.Tests",
                ["Jwt:Audience"] = "DwpFinals.Tests.Client",
                ["Jwt:AccessTokenMinutes"] = "60",
                ["AdminSeed:Enabled"] = "false",
                ["Logging:LogLevel:Default"] = "Warning",
                ["Logging:LogLevel:Microsoft.EntityFrameworkCore"] = "Warning"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(ConnectionString));
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureDeletedAsync();
        await context.Database.MigrateAsync();

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in new[]
                 {
                     DevelopmentIdentitySeeder.AuthorRole,
                     DevelopmentIdentitySeeder.AdminRole
                 })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var result = await roleManager.CreateAsync(new IdentityRole<Guid>(role));
                Assert.True(result.Succeeded, string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    public async Task<ApplicationUser> CreateUserAsync(
        string email,
        string password,
        string role = DevelopmentIdentitySeeder.AuthorRole,
        bool isActive = true)
    {
        await using var scope = Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            DisplayName = role + " User",
            Email = email,
            UserName = email,
            IsActive = isActive,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            DeactivatedAtUtc = isActive ? null : DateTimeOffset.UtcNow
        };

        var createResult = await userManager.CreateAsync(user, password);
        Assert.True(
            createResult.Succeeded,
            string.Join(", ", createResult.Errors.Select(error => error.Description)));

        var roleResult = await userManager.AddToRoleAsync(user, role);
        Assert.True(
            roleResult.Succeeded,
            string.Join(", ", roleResult.Errors.Select(error => error.Description)));

        return user;
    }

    public async Task<Game> CreateGameAsync(
        string title,
        DateOnly releaseDate,
        bool isActive = true)
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTimeOffset.UtcNow;
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = title.Trim(),
            NormalizedTitle = title.Trim().ToUpperInvariant(),
            ReleaseDate = releaseDate,
            IsActive = isActive,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            ArchivedAtUtc = isActive ? null : now
        };
        context.Games.Add(game);
        await context.SaveChangesAsync();
        return game;
    }

    public async Task<Retrospective> CreateRetrospectiveAsync(
        Guid authorUserId,
        Guid gameId,
        string title,
        RetrospectiveStatus status = RetrospectiveStatus.Draft,
        int rating = 5,
        DateTimeOffset? timestamp = null)
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = timestamp ?? DateTimeOffset.UtcNow;
        var retrospective = new Retrospective
        {
            Id = Guid.NewGuid(),
            AuthorUserId = authorUserId,
            GameId = gameId,
            Title = title,
            ReviewContent = $"Review content for {title}.",
            Rating = rating,
            Status = status,
            UnpublishedReason = status == RetrospectiveStatus.Unpublished ? "Temporarily hidden." : null,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            PublishedAtUtc = status == RetrospectiveStatus.Published ? now : null,
            UnpublishedAtUtc = status == RetrospectiveStatus.Unpublished ? now : null,
            ArchivedAtUtc = status == RetrospectiveStatus.Archived ? now : null
        };
        context.Retrospectives.Add(retrospective);
        await context.SaveChangesAsync();
        return retrospective;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try
            {
                using var scope = Services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                context.Database.EnsureDeleted();
            }
            catch
            {
                // Test cleanup must not hide the original test result.
            }
        }

        base.Dispose(disposing);
    }
}
