using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Data;
using dotnet_backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace dotnet_backend.Services;

public sealed class UserAccountService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ApplicationDbContext dbContext,
    JwtTokenService jwtTokenService,
    TimeProvider timeProvider) : IUserAccountService
{
    private static readonly AccountError InvalidCredentials = new(
        AccountErrorType.Unauthorized,
        "invalid_credentials",
        "The email or password is invalid, or the account is inactive.");
    private static readonly PasswordHasher<ApplicationUser> DummyPasswordHasher = new();
    private static readonly ApplicationUser DummyPasswordUser = new()
    {
        Id = Guid.Empty,
        DisplayName = "Unknown User",
        Email = "unknown@example.invalid",
        UserName = "unknown@example.invalid"
    };
    private static readonly string DummyPasswordHash = DummyPasswordHasher.HashPassword(
        DummyPasswordUser,
        "not-a-real-user-password");

    public async Task<AccountResult<UserResponse>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var displayName = request.DisplayName.Trim();
        var email = request.Email.Trim();
        var validationErrors = ValidateRegistration(displayName, email, request.Password);
        if (validationErrors.Count > 0)
        {
            return AccountResult<UserResponse>.Failure(ValidationError(validationErrors));
        }

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return AccountResult<UserResponse>.Failure(DuplicateEmailError());
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            DisplayName = displayName,
            Email = email,
            UserName = email,
            IsActive = true,
            CreatedAtUtc = timeProvider.GetUtcNow()
        };

        try
        {
            var createResult = await userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                return AccountResult<UserResponse>.Failure(MapIdentityErrors(createResult.Errors));
            }

            var roleResult = await userManager.AddToRoleAsync(user, DevelopmentIdentitySeeder.AuthorRole);
            if (!roleResult.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                return AccountResult<UserResponse>.Failure(MapIdentityErrors(roleResult.Errors));
            }

            await transaction.CommitAsync(cancellationToken);
            return AccountResult<UserResponse>.Success(
                ToResponse(user, DevelopmentIdentitySeeder.AuthorRole));
        }
        catch (DbUpdateException exception) when (IsUniqueEmailViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            return AccountResult<UserResponse>.Failure(DuplicateEmailError());
        }
    }

    public async Task<AccountResult<AuthResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var startedAt = Stopwatch.GetTimestamp();
        cancellationToken.ThrowIfCancellationRequested();
        var email = request.Email.Trim();
        if (!new EmailAddressAttribute().IsValid(email))
        {
            _ = DummyPasswordHasher.VerifyHashedPassword(
                DummyPasswordUser,
                DummyPasswordHash,
                request.Password);
            await DelayUntilMinimumLoginTimeAsync(startedAt, cancellationToken);
            return AccountResult<AuthResponse>.Failure(ValidationError(
                new Dictionary<string, string[]>
                {
                    [nameof(LoginRequest.Email)] = ["Email must be a valid email address."]
                }));
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
        {
            _ = DummyPasswordHasher.VerifyHashedPassword(
                DummyPasswordUser,
                DummyPasswordHash,
                request.Password);
            await DelayUntilMinimumLoginTimeAsync(startedAt, cancellationToken);
            return AccountResult<AuthResponse>.Failure(InvalidCredentials);
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(
            user,
            request.Password,
            lockoutOnFailure: true);
        if (!signInResult.Succeeded)
        {
            await DelayUntilMinimumLoginTimeAsync(startedAt, cancellationToken);
            return AccountResult<AuthResponse>.Failure(InvalidCredentials);
        }

        var roles = await userManager.GetRolesAsync(user);
        var token = jwtTokenService.CreateToken(user, roles.ToArray());
        var role = roles.FirstOrDefault() ?? DevelopmentIdentitySeeder.AuthorRole;

        await DelayUntilMinimumLoginTimeAsync(startedAt, cancellationToken);
        return AccountResult<AuthResponse>.Success(new AuthResponse(
            token.AccessToken,
            token.ExpiresAtUtc,
            ToResponse(user, role)));
    }

    public async Task<AccountResult<UserResponse>> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == userId, cancellationToken);
        if (user is null)
        {
            return AccountResult<UserResponse>.Failure(UserNotFoundError());
        }

        var roles = await userManager.GetRolesAsync(user);
        return AccountResult<UserResponse>.Success(ToResponse(
            user,
            roles.FirstOrDefault() ?? DevelopmentIdentitySeeder.AuthorRole));
    }

    public async Task<AccountResult<UserResponse>> UpdateProfileAsync(
        Guid userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var displayName = request.DisplayName.Trim();
        var email = request.Email.Trim();
        var validationErrors = ValidateProfile(displayName, email);
        if (validationErrors.Count > 0)
        {
            return AccountResult<UserResponse>.Failure(ValidationError(validationErrors));
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return AccountResult<UserResponse>.Failure(UserNotFoundError());
        }

        var emailOwner = await userManager.FindByEmailAsync(email);
        if (emailOwner is not null && emailOwner.Id != userId)
        {
            return AccountResult<UserResponse>.Failure(DuplicateEmailError());
        }

        user.DisplayName = displayName;
        user.Email = email;
        user.UserName = email;
        IdentityResult updateResult;
        try
        {
            updateResult = await userManager.UpdateAsync(user);
        }
        catch (DbUpdateException exception) when (IsUniqueEmailViolation(exception))
        {
            return AccountResult<UserResponse>.Failure(DuplicateEmailError());
        }
        if (!updateResult.Succeeded)
        {
            return AccountResult<UserResponse>.Failure(MapIdentityErrors(updateResult.Errors));
        }

        var roles = await userManager.GetRolesAsync(user);
        return AccountResult<UserResponse>.Success(ToResponse(
            user,
            roles.FirstOrDefault() ?? DevelopmentIdentitySeeder.AuthorRole));
    }

    public async Task<AccountResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (request.NewPassword.Length is < 8 or > 128)
        {
            return AccountResult.Failure(ValidationError(new Dictionary<string, string[]>
            {
                [nameof(ChangePasswordRequest.NewPassword)] =
                    ["New password must contain between 8 and 128 characters."]
            }));
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return AccountResult.Failure(UserNotFoundError());
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var changeResult = await userManager.ChangePasswordAsync(
            user,
            request.CurrentPassword,
            request.NewPassword);
        if (!changeResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AccountResult.Failure(MapIdentityErrors(changeResult.Errors));
        }

        user.AuthenticationVersion++;
        var versionResult = await userManager.UpdateAsync(user);
        if (!versionResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AccountResult.Failure(MapIdentityErrors(versionResult.Errors));
        }

        await transaction.CommitAsync(cancellationToken);
        return AccountResult.Success();
    }

    public async Task<AccountResult<PagedUsersResponse>> GetUsersAsync(
        UserListQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page < 1 || query.PageSize is < 1 or > 100)
        {
            return AccountResult<PagedUsersResponse>.Failure(ValidationError(
                new Dictionary<string, string[]>
                {
                    [nameof(UserListQuery.Page)] = ["Page must be at least 1."],
                    [nameof(UserListQuery.PageSize)] = ["Page size must be between 1 and 100."]
                }));
        }

        var totalCount = await dbContext.Users.CountAsync(cancellationToken);
        var offset = ((long)query.Page - 1) * query.PageSize;
        if (offset >= totalCount)
        {
            return AccountResult<PagedUsersResponse>.Success(new PagedUsersResponse(
                [],
                query.Page,
                query.PageSize,
                totalCount));
        }

        var items = await (
                from user in dbContext.Users.AsNoTracking()
                join userRole in dbContext.UserRoles.AsNoTracking() on user.Id equals userRole.UserId
                join role in dbContext.Roles.AsNoTracking() on userRole.RoleId equals role.Id
                orderby user.CreatedAtUtc, user.Id
                select new UserResponse(
                    user.Id,
                    user.DisplayName,
                    user.Email ?? string.Empty,
                    role.Name ?? DevelopmentIdentitySeeder.AuthorRole,
                    user.IsActive,
                    user.CreatedAtUtc,
                    user.DeactivatedAtUtc))
            .Skip((int)offset)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return AccountResult<PagedUsersResponse>.Success(new PagedUsersResponse(
            items,
            query.Page,
            query.PageSize,
            totalCount));
    }

    public async Task<AccountResult> DeactivateUserAsync(
        Guid adminUserId,
        Guid targetUserId,
        CancellationToken cancellationToken)
    {
        var admin = await userManager.FindByIdAsync(adminUserId.ToString());
        if (admin is null ||
            !admin.IsActive ||
            !await userManager.IsInRoleAsync(admin, DevelopmentIdentitySeeder.AdminRole))
        {
            return AccountResult.Failure(new AccountError(
                AccountErrorType.Forbidden,
                "admin_required",
                "Administrator access is required."));
        }

        if (adminUserId == targetUserId)
        {
            return AccountResult.Failure(new AccountError(
                AccountErrorType.Conflict,
                "self_deactivation",
                "Administrators cannot deactivate their own account."));
        }

        var target = await userManager.FindByIdAsync(targetUserId.ToString());
        if (target is null)
        {
            return AccountResult.Failure(UserNotFoundError());
        }

        if (!target.IsActive)
        {
            return AccountResult.Success();
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var deactivatedAt = timeProvider.GetUtcNow();
        target.IsActive = false;
        target.DeactivatedAtUtc = deactivatedAt;
        dbContext.UserDeactivations.Add(new UserDeactivation
        {
            Id = Guid.NewGuid(),
            TargetUserId = target.Id,
            AdminUserId = admin.Id,
            DeactivatedAtUtc = deactivatedAt
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return AccountResult.Success();
    }

    private static Dictionary<string, string[]> ValidateRegistration(
        string displayName,
        string email,
        string password)
    {
        var errors = new Dictionary<string, string[]>();
        if (displayName.Length is < 2 or > 50)
        {
            errors[nameof(RegisterRequest.DisplayName)] =
                ["Display name must contain between 2 and 50 characters."];
        }

        if (!new EmailAddressAttribute().IsValid(email))
        {
            errors[nameof(RegisterRequest.Email)] = ["Email must be a valid email address."];
        }

        if (password.Length is < 8 or > 128)
        {
            errors[nameof(RegisterRequest.Password)] =
                ["Password must contain between 8 and 128 characters."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateProfile(string displayName, string email)
    {
        var errors = new Dictionary<string, string[]>();
        if (displayName.Length is < 2 or > 50)
        {
            errors[nameof(UpdateProfileRequest.DisplayName)] =
                ["Display name must contain between 2 and 50 characters."];
        }

        if (!new EmailAddressAttribute().IsValid(email))
        {
            errors[nameof(UpdateProfileRequest.Email)] = ["Email must be a valid email address."];
        }

        return errors;
    }

    private static UserResponse ToResponse(ApplicationUser user, string role) => new(
        user.Id,
        user.DisplayName,
        user.Email ?? string.Empty,
        role,
        user.IsActive,
        user.CreatedAtUtc,
        user.DeactivatedAtUtc);

    private static AccountError DuplicateEmailError() => new(
        AccountErrorType.Conflict,
        "duplicate_email",
        "An account already uses this email address.");

    private static AccountError UserNotFoundError() => new(
        AccountErrorType.NotFound,
        "user_not_found",
        "The requested user account was not found.");

    private static AccountError ValidationError(IReadOnlyDictionary<string, string[]> errors) => new(
        AccountErrorType.Validation,
        "validation_failed",
        "One or more validation errors occurred.",
        errors);

    private static AccountError MapIdentityErrors(IEnumerable<IdentityError> identityErrors)
    {
        var errors = identityErrors.ToArray();
        if (errors.Any(error =>
                error.Code.Contains("DuplicateEmail", StringComparison.OrdinalIgnoreCase) ||
                error.Code.Contains("DuplicateUserName", StringComparison.OrdinalIgnoreCase)))
        {
            return DuplicateEmailError();
        }

        return ValidationError(errors
            .GroupBy(error => error.Code)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Description).ToArray()));
    }

    private static bool IsUniqueEmailViolation(DbUpdateException exception)
    {
        Exception? current = exception;
        while (current is not null)
        {
            if (current is SqlException { Number: 2601 or 2627 })
            {
                return true;
            }

            current = current.InnerException;
        }

        return false;
    }

    private static async Task DelayUntilMinimumLoginTimeAsync(
        long startedAt,
        CancellationToken cancellationToken)
    {
        var remaining = TimeSpan.FromMilliseconds(250) - Stopwatch.GetElapsedTime(startedAt);
        if (remaining > TimeSpan.Zero)
        {
            await Task.Delay(remaining, cancellationToken);
        }
    }
}
