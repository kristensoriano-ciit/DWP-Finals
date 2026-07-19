using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using dotnet_backend.Contracts.Users;
using dotnet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminUsersController(IUserAccountService userAccountService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedUsersResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedUsersResponse>> GetUsers(
        [FromQuery] UserListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await userAccountService.GetUsersAsync(query, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpDelete("{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeactivateUser(
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var adminUserId))
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Authentication required",
                detail: "A valid active-user token is required.");
        }

        var result = await userAccountService.DeactivateUserAsync(
            adminUserId,
            userId,
            cancellationToken);
        return result.Succeeded ? NoContent() : MapError(result.Error!);
    }

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
        AccountErrorType.Forbidden => StatusCode(
            StatusCodes.Status403Forbidden,
            CreateProblem("Access forbidden", error.Message, StatusCodes.Status403Forbidden)),
        AccountErrorType.NotFound => NotFound(
            CreateProblem("Account not found", error.Message, StatusCodes.Status404NotFound)),
        AccountErrorType.Conflict => Conflict(
            CreateProblem("Account conflict", error.Message, StatusCodes.Status409Conflict)),
        _ => Unauthorized(
            CreateProblem("Authentication required", error.Message, StatusCodes.Status401Unauthorized))
    };

    private static ProblemDetails CreateProblem(string title, string detail, int status) => new()
    {
        Title = title,
        Detail = detail,
        Status = status
    };
}
