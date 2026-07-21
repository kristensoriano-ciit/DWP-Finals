using dotnet_backend.Data;
using dotnet_backend.E2E;
using dotnet_backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

return await E2EDatabaseProvisioner.RunAsync();

internal static class E2EDatabaseProvisioner
{
    private const string ApprovedServer = @"(localdb)\DwpFinals";
    private const string ApprovedDatabase = "DwpFinalsE2E";

    public static async Task<int> RunAsync()
    {
        try
        {
            var connectionString = RequireEnvironmentValue("E2E_CONNECTION_STRING");
            var password = RequireEnvironmentValue("E2E_PASSWORD");
            ValidateResetPermission(connectionString);

            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));
            services
                .AddIdentityCore<ApplicationUser>(options =>
                {
                    options.User.RequireUniqueEmail = true;
                    options.Password.RequiredLength = 8;
                    options.Password.RequireDigit = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireUppercase = false;
                    options.Password.RequireNonAlphanumeric = false;
                })
                .AddRoles<IdentityRole<Guid>>()
                .AddEntityFrameworkStores<ApplicationDbContext>();

            await using var serviceProvider = services.BuildServiceProvider();
            await using (var scope = serviceProvider.CreateAsyncScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await context.Database.EnsureDeletedAsync();
                await context.Database.MigrateAsync();
            }

            await NormalPerformanceDatasetSeeder.SeedAsync(serviceProvider, password);
            Console.WriteLine(
                $"Seeded {ApprovedDatabase}: 100 games, 100 users, 200 retrospectives.");
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"E2E database provisioning failed: {exception.Message}");
            return 1;
        }
    }

    private static void ValidateResetPermission(string connectionString)
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("E2E_ALLOW_DATABASE_RESET"),
                "YES",
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "E2E_ALLOW_DATABASE_RESET must be exactly YES.");
        }

        SqlConnectionStringBuilder builder;
        try
        {
            builder = new SqlConnectionStringBuilder(connectionString);
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException("E2E_CONNECTION_STRING is not valid.");
        }

        if (!string.Equals(builder.DataSource, ApprovedServer, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Database server must be exactly {ApprovedServer}.");
        }

        if (!string.Equals(builder.InitialCatalog, ApprovedDatabase, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Database name must be exactly {ApprovedDatabase}.");
        }
    }

    private static string RequireEnvironmentValue(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{name} must be configured.");
        }

        return value;
    }
}
