using System.ComponentModel.DataAnnotations;

namespace dotnet_backend.Contracts.Users;

public sealed class RegisterRequest
{
    [Required]
    public string DisplayName { get; init; } = string.Empty;

    [Required]
    public string Email { get; init; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}

public sealed class UpdateProfileRequest
{
    [Required]
    public string DisplayName { get; init; } = string.Empty;

    [Required]
    public string Email { get; init; } = string.Empty;
}

public sealed class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}

public sealed class UserListQuery
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}
