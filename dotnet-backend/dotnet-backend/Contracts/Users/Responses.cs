namespace dotnet_backend.Contracts.Users;

public sealed record UserResponse(
    Guid Id,
    string DisplayName,
    string Email,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? DeactivatedAtUtc);

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAtUtc,
    UserResponse User);

public sealed record PagedUsersResponse(
    IReadOnlyList<UserResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
