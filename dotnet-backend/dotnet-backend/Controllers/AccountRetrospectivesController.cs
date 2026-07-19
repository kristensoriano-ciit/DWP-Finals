using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using dotnet_backend.Contracts.Retrospectives;
using dotnet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Controllers;

[ApiController]
[Route("api/account/retrospectives")]
[Authorize(Policy = "AuthorOnly")]
public sealed class AccountRetrospectivesController(
    IRetrospectiveService retrospectiveService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedRetrospectivesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedRetrospectivesResponse>> GetOwn(
        [FromQuery] OwnRetrospectiveListQuery query,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var authorUserId))
        {
            return UnauthorizedProblem();
        }

        var result = await retrospectiveService.GetOwnAsync(
            authorUserId, query, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpGet("{retrospectiveId:guid}")]
    [ProducesResponseType<RetrospectiveResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RetrospectiveResponse>> GetOwnById(
        Guid retrospectiveId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var authorUserId))
        {
            return UnauthorizedProblem();
        }

        var result = await retrospectiveService.GetOwnByIdAsync(
            authorUserId, retrospectiveId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    private bool TryGetUserId(out Guid userId) => Guid.TryParse(
        User.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);

    private ActionResult MapError(RetrospectiveError error) => error.Type switch
    {
        RetrospectiveErrorType.Validation => BadRequest(new ValidationProblemDetails(
            (error.ValidationErrors ?? new Dictionary<string, string[]>())
            .ToDictionary(value => value.Key, value => value.Value))
        {
            Title = "Validation failed",
            Detail = error.Message,
            Status = StatusCodes.Status400BadRequest
        }),
        RetrospectiveErrorType.Forbidden => StatusCode(
            StatusCodes.Status403Forbidden,
            CreateProblem("Access forbidden", error.Message, StatusCodes.Status403Forbidden)),
        RetrospectiveErrorType.Conflict => Conflict(
            CreateProblem("Retrospective conflict", error.Message, StatusCodes.Status409Conflict)),
        _ => NotFound(
            CreateProblem("Retrospective not found", error.Message, StatusCodes.Status404NotFound))
    };

    private UnauthorizedObjectResult UnauthorizedProblem() => Unauthorized(CreateProblem(
        "Authentication required",
        "A valid active-user token is required.",
        StatusCodes.Status401Unauthorized));

    private static ProblemDetails CreateProblem(string title, string detail, int status) => new()
    {
        Title = title,
        Detail = detail,
        Status = status
    };
}
