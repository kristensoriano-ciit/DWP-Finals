using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using dotnet_backend.Contracts.Retrospectives;
using dotnet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Controllers;

[ApiController]
[Route("api/retrospectives")]
[Authorize]
public sealed class RetrospectivesController(
    IRetrospectiveService retrospectiveService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<PagedPublishedRetrospectivesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedPublishedRetrospectivesResponse>> GetPublished(
        [FromQuery] RetrospectiveListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await retrospectiveService.GetPublishedAsync(query, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpGet("{retrospectiveId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<PublishedRetrospectiveResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublishedRetrospectiveResponse>> GetPublishedById(
        Guid retrospectiveId,
        CancellationToken cancellationToken)
    {
        var result = await retrospectiveService.GetPublishedByIdAsync(
            retrospectiveId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpPost]
    [Authorize(Policy = "AuthorOnly")]
    [ProducesResponseType<RetrospectiveResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<RetrospectiveResponse>> Create(
        CreateRetrospectiveRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var authorUserId))
        {
            return UnauthorizedProblem();
        }

        var result = await retrospectiveService.CreateAsync(
            authorUserId, request, cancellationToken);
        return result.Succeeded
            ? Created($"/api/account/retrospectives/{result.Value!.Id}", result.Value)
            : MapError(result.Error!);
    }

    [HttpPut("{retrospectiveId:guid}")]
    [Authorize(Policy = "AuthorOnly")]
    [ProducesResponseType<RetrospectiveResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RetrospectiveResponse>> Update(
        Guid retrospectiveId,
        UpdateRetrospectiveRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var authorUserId))
        {
            return UnauthorizedProblem();
        }

        var result = await retrospectiveService.UpdateAsync(
            authorUserId, retrospectiveId, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpPut("{retrospectiveId:guid}/status")]
    [Authorize(Policy = "AuthorOnly")]
    [ProducesResponseType<RetrospectiveResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RetrospectiveResponse>> ChangeStatus(
        Guid retrospectiveId,
        ChangeRetrospectiveStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var authorUserId))
        {
            return UnauthorizedProblem();
        }

        var result = await retrospectiveService.ChangeStatusAsync(
            authorUserId, retrospectiveId, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpDelete("{retrospectiveId:guid}")]
    [Authorize(Policy = "AuthorOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Archive(
        Guid retrospectiveId,
        [FromHeader(Name = "If-Match")]
        [Required]
        string rowVersion,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var authorUserId))
        {
            return UnauthorizedProblem();
        }

        var result = await retrospectiveService.ArchiveAsync(
            authorUserId, retrospectiveId, rowVersion, cancellationToken);
        return result.Succeeded ? NoContent() : MapError(result.Error!);
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
