using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public sealed class AccountController(IUserAccountService userAccountService) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> GetCurrentUser(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return UnauthorizedProblem();
        }

        var result = await userAccountService.GetCurrentUserAsync(userId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpPut("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> UpdateProfile(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return UnauthorizedProblem();
        }

        var result = await userAccountService.UpdateProfileAsync(userId, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpPut("password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return UnauthorizedProblem();
        }

        var result = await userAccountService.ChangePasswordAsync(userId, request, cancellationToken);
        return result.Succeeded ? NoContent() : MapError(result.Error!);
    }

    private bool TryGetUserId(out Guid userId) => Guid.TryParse(
        User.FindFirstValue(JwtRegisteredClaimNames.Sub),
        out userId);

    private ActionResult MapError(AccountError error) => error.Type switch
    {
        AccountErrorType.Validation => BadRequest(new ValidationProblemDetails(
            (error.ValidationErrors ?? new Dictionary<string, string[]>())
            .ToDictionary(item => item.Key, item => item.Value))
        {
            Title = "Validation failed",
            Detail = error.Message,
            Status = StatusCodes.Status400BadRequest
        }),
        AccountErrorType.Conflict => Conflict(new ProblemDetails
        {
            Title = "Account conflict",
            Detail = error.Message,
            Status = StatusCodes.Status409Conflict
        }),
        AccountErrorType.NotFound => NotFound(new ProblemDetails
        {
            Title = "Account not found",
            Detail = error.Message,
            Status = StatusCodes.Status404NotFound
        }),
        _ => UnauthorizedProblem()
    };

    private UnauthorizedObjectResult UnauthorizedProblem() => Unauthorized(new ProblemDetails
    {
        Title = "Authentication required",
        Detail = "A valid active-user token is required.",
        Status = StatusCodes.Status401Unauthorized
    });
}
