using dotnet_backend.Contracts.Users;
using dotnet_backend.Data;
using dotnet_backend.Services;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests;

public sealed class UserAccountServiceTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task RegisterAsync_NormalizesInputAndAssignsAuthorRole()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();

        var result = await service.RegisterAsync(
            new RegisterRequest
            {
                DisplayName = "  Jane Author  ",
                Email = "  Jane@Example.com  ",
                Password = "password123"
            },
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("Jane Author", result.Value!.DisplayName);
        Assert.Equal("Jane@Example.com", result.Value.Email);
        Assert.Equal("Author", result.Value.Role);
        Assert.True(result.Value.IsActive);
    }

    [Fact]
    public async Task RegisterAsync_RejectsCaseInsensitiveDuplicateEmail()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();

        await service.RegisterAsync(
            ValidRegistration("author@example.com"),
            CancellationToken.None);
        var duplicate = await service.RegisterAsync(
            ValidRegistration("AUTHOR@example.com"),
            CancellationToken.None);

        Assert.False(duplicate.Succeeded);
        Assert.Equal(AccountErrorType.Conflict, duplicate.Error!.Type);
    }

    [Fact]
    public async Task RegisterAsync_RejectsInvalidPassword()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();

        var result = await service.RegisterAsync(
            new RegisterRequest
            {
                DisplayName = "Jane Author",
                Email = "author@example.com",
                Password = "short"
            },
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(AccountErrorType.Validation, result.Error!.Type);
    }

    [Fact]
    public async Task LoginAsync_UsesTheSameErrorForUnknownEmailAndWrongPassword()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();
        await service.RegisterAsync(
            ValidRegistration("author@example.com"),
            CancellationToken.None);

        var unknown = await service.LoginAsync(
            new LoginRequest { Email = "missing@example.com", Password = "wrong-password" },
            CancellationToken.None);
        var wrongPassword = await service.LoginAsync(
            new LoginRequest { Email = "author@example.com", Password = "wrong-password" },
            CancellationToken.None);

        Assert.False(unknown.Succeeded);
        Assert.False(wrongPassword.Succeeded);
        Assert.Equal(unknown.Error, wrongPassword.Error);
        Assert.Equal(AccountErrorType.Unauthorized, unknown.Error!.Type);
    }

    [Fact]
    public async Task LoginAsync_LocksAccountAfterRepeatedFailures()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();
        await service.RegisterAsync(
            ValidRegistration("author@example.com"),
            CancellationToken.None);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var failure = await service.LoginAsync(
                new LoginRequest { Email = "author@example.com", Password = "wrong-password" },
                CancellationToken.None);
            Assert.False(failure.Succeeded);
        }

        var lockedOut = await service.LoginAsync(
            new LoginRequest { Email = "author@example.com", Password = "password123" },
            CancellationToken.None);

        Assert.False(lockedOut.Succeeded);
        Assert.Equal(AccountErrorType.Unauthorized, lockedOut.Error!.Type);
    }

    [Fact]
    public async Task GetAndUpdateProfile_KeepRoleAndStatusProtected()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();
        var registered = await service.RegisterAsync(
            ValidRegistration("author@example.com"),
            CancellationToken.None);

        var updated = await service.UpdateProfileAsync(
            registered.Value!.Id,
            new UpdateProfileRequest
            {
                DisplayName = "  Updated Author  ",
                Email = "  updated@example.com  "
            },
            CancellationToken.None);
        var current = await service.GetCurrentUserAsync(
            registered.Value.Id,
            CancellationToken.None);

        Assert.True(updated.Succeeded);
        Assert.Equal("Updated Author", current.Value!.DisplayName);
        Assert.Equal("updated@example.com", current.Value.Email);
        Assert.Equal("Author", current.Value.Role);
        Assert.True(current.Value.IsActive);
    }

    [Fact]
    public async Task UpdateProfile_RejectsEmailOwnedByAnotherUser()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();
        var first = await service.RegisterAsync(
            ValidRegistration("first@example.com"),
            CancellationToken.None);
        await service.RegisterAsync(
            ValidRegistration("second@example.com"),
            CancellationToken.None);

        var result = await service.UpdateProfileAsync(
            first.Value!.Id,
            new UpdateProfileRequest
            {
                DisplayName = "First Author",
                Email = "SECOND@example.com"
            },
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(AccountErrorType.Conflict, result.Error!.Type);
    }

    [Fact]
    public async Task UpdateProfile_ConcurrentEmailClaimReturnsSuccessAndConflict()
    {
        var first = await factory.CreateUserAsync("first@example.com", "password123");
        var second = await factory.CreateUserAsync("second@example.com", "password123");
        await using var firstScope = factory.Services.CreateAsyncScope();
        await using var secondScope = factory.Services.CreateAsyncScope();
        var firstService = firstScope.ServiceProvider.GetRequiredService<IUserAccountService>();
        var secondService = secondScope.ServiceProvider.GetRequiredService<IUserAccountService>();
        var sharedEmail = "shared@example.com";

        var results = await Task.WhenAll(
            firstService.UpdateProfileAsync(
                first.Id,
                new UpdateProfileRequest { DisplayName = "First", Email = sharedEmail },
                CancellationToken.None),
            secondService.UpdateProfileAsync(
                second.Id,
                new UpdateProfileRequest { DisplayName = "Second", Email = sharedEmail },
                CancellationToken.None));

        Assert.Single(results, result => result.Succeeded);
        Assert.Single(results, result =>
            !result.Succeeded && result.Error!.Type == AccountErrorType.Conflict);
    }

    [Fact]
    public async Task ChangePassword_RequiresCurrentPasswordAndReplacesOldPassword()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();
        var registered = await service.RegisterAsync(
            ValidRegistration("author@example.com"),
            CancellationToken.None);

        var wrongCurrent = await service.ChangePasswordAsync(
            registered.Value!.Id,
            new ChangePasswordRequest
            {
                CurrentPassword = "wrong-password",
                NewPassword = "new-password123"
            },
            CancellationToken.None);
        var changed = await service.ChangePasswordAsync(
            registered.Value.Id,
            new ChangePasswordRequest
            {
                CurrentPassword = "password123",
                NewPassword = "new-password123"
            },
            CancellationToken.None);
        var oldLogin = await service.LoginAsync(
            new LoginRequest { Email = "author@example.com", Password = "password123" },
            CancellationToken.None);
        var newLogin = await service.LoginAsync(
            new LoginRequest { Email = "author@example.com", Password = "new-password123" },
            CancellationToken.None);

        Assert.False(wrongCurrent.Succeeded);
        Assert.Equal(AccountErrorType.Validation, wrongCurrent.Error!.Type);
        Assert.True(changed.Succeeded);
        Assert.False(oldLogin.Succeeded);
        Assert.True(newLogin.Succeeded);
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsABoundedPageAndTotalCount()
    {
        await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        await factory.CreateUserAsync("one@example.com", "password123");
        await factory.CreateUserAsync("two@example.com", "password123");
        await factory.CreateUserAsync("three@example.com", "password123");
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();

        var result = await service.GetUsersAsync(
            new UserListQuery { Page = 1, PageSize = 2 },
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Items.Count);
        Assert.Equal(4, result.Value.TotalCount);
        Assert.Equal(2, result.Value.PageSize);
    }

    [Fact]
    public async Task GetUsersAsync_VeryLargePageReturnsEmptyPageWithoutOverflow()
    {
        await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();

        var result = await service.GetUsersAsync(
            new UserListQuery { Page = int.MaxValue, PageSize = 100 },
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(1, result.Value.TotalCount);
    }

    [Fact]
    public async Task DeactivateUserAsync_IsAuthorizedAuditedAndIdempotent()
    {
        var admin = await factory.CreateUserAsync("admin@example.com", "password123", "Admin");
        var author = await factory.CreateUserAsync("author@example.com", "password123");
        var otherAuthor = await factory.CreateUserAsync("other@example.com", "password123");
        await using var scope = factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserAccountService>();

        var forbidden = await service.DeactivateUserAsync(
            otherAuthor.Id,
            author.Id,
            CancellationToken.None);
        var self = await service.DeactivateUserAsync(
            admin.Id,
            admin.Id,
            CancellationToken.None);
        var first = await service.DeactivateUserAsync(
            admin.Id,
            author.Id,
            CancellationToken.None);
        var repeated = await service.DeactivateUserAsync(
            admin.Id,
            author.Id,
            CancellationToken.None);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var storedAuthor = await context.Users.AsNoTracking().SingleAsync(user => user.Id == author.Id);
        var audits = await context.UserDeactivations.AsNoTracking()
            .Where(item => item.TargetUserId == author.Id)
            .ToListAsync();

        Assert.Equal(AccountErrorType.Forbidden, forbidden.Error!.Type);
        Assert.Equal(AccountErrorType.Conflict, self.Error!.Type);
        Assert.True(first.Succeeded);
        Assert.True(repeated.Succeeded);
        Assert.False(storedAuthor.IsActive);
        Assert.NotNull(storedAuthor.DeactivatedAtUtc);
        Assert.Single(audits);
        Assert.Equal(admin.Id, audits[0].AdminUserId);
    }

    private static RegisterRequest ValidRegistration(string email) => new()
    {
        DisplayName = "Jane Author",
        Email = email,
        Password = "password123"
    };
}
