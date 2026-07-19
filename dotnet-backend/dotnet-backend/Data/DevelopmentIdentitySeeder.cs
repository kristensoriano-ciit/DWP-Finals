using dotnet_backend.Models;
using Microsoft.AspNetCore.Identity;

namespace dotnet_backend.Data;

public static class DevelopmentIdentitySeeder
{
    public const string AuthorRole = "Author";
    public const string AdminRole = "Admin";

    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("DevelopmentIdentitySeeder");

        foreach (var roleName in new[] { AuthorRole, AdminRole })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
                if (!roleResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Could not create role {roleName}: {FormatErrors(roleResult.Errors)}");
                }
            }
        }

        if (!configuration.GetValue<bool>("AdminSeed:Enabled"))
        {
            return;
        }

        var email = configuration["AdminSeed:Email"]?.Trim();
        var password = configuration["AdminSeed:Password"];
        var displayName = configuration["AdminSeed:DisplayName"]?.Trim();

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(displayName))
        {
            logger.LogInformation(
                "Admin seeding is enabled but credentials are absent. Configure them with User Secrets.");
            return;
        }

        var admin = await userManager.FindByEmailAsync(email);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                DisplayName = displayName,
                Email = email,
                UserName = email,
                IsActive = true,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };

            var createResult = await userManager.CreateAsync(admin, password);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not create the development administrator: {FormatErrors(createResult.Errors)}");
            }
        }

        if (!await userManager.IsInRoleAsync(admin, AdminRole))
        {
            var roleResult = await userManager.AddToRoleAsync(admin, AdminRole);
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not assign the administrator role: {FormatErrors(roleResult.Errors)}");
            }
        }

        cancellationToken.ThrowIfCancellationRequested();
    }

    private static string FormatErrors(IEnumerable<IdentityError> errors) =>
        string.Join(", ", errors.Select(error => error.Description));
}
