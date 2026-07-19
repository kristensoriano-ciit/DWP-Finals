using dotnet_backend.Contracts.Users;
using dotnet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace dotnet_backend.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public sealed class AuthController(IUserAccountService userAccountService) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await userAccountService.RegisterAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return MapError(result.Error!);
        }

        return Created("/api/account/me", result.Value);
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await userAccountService.LoginAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return MapError(result.Error!);
        }

        return Ok(result.Value);
    }

    private ActionResult MapError(AccountError error) => error.Type switch
    {
        AccountErrorType.Validation => BadRequest(
            new ValidationProblemDetails((error.ValidationErrors ?? new Dictionary<string, string[]>())
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
        _ => Unauthorized(new ProblemDetails
        {
            Title = "Authentication failed",
            Detail = error.Message,
            Status = StatusCodes.Status401Unauthorized
        })
    };
}
