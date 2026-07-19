using dotnet_backend.Contracts.Users;

namespace dotnet_backend.Services;

public enum AccountErrorType
{
    Validation,
    Unauthorized,
    Forbidden,
    Conflict,
    NotFound
}

public sealed record AccountError(
    AccountErrorType Type,
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? ValidationErrors = null);

public class AccountResult
{
    protected AccountResult(bool succeeded, AccountError? error)
    {
        Succeeded = succeeded;
        Error = error;
    }

    public bool Succeeded { get; }

    public AccountError? Error { get; }

    public static AccountResult Success() => new(true, null);

    public static AccountResult Failure(AccountError error) => new(false, error);
}

public sealed class AccountResult<T> : AccountResult
{
    private AccountResult(bool succeeded, T? value, AccountError? error)
        : base(succeeded, error)
    {
        Value = value;
    }

    public T? Value { get; }

    public static AccountResult<T> Success(T value) => new(true, value, null);

    public new static AccountResult<T> Failure(AccountError error) => new(false, default, error);
}

public interface IUserAccountService
{
    Task<AccountResult<UserResponse>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken);

    Task<AccountResult<AuthResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken);

    Task<AccountResult<UserResponse>> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken);

    Task<AccountResult<UserResponse>> UpdateProfileAsync(
        Guid userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken);

    Task<AccountResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken);

    Task<AccountResult<PagedUsersResponse>> GetUsersAsync(
        UserListQuery query,
        CancellationToken cancellationToken);

    Task<AccountResult> DeactivateUserAsync(
        Guid adminUserId,
        Guid targetUserId,
        CancellationToken cancellationToken);
}
