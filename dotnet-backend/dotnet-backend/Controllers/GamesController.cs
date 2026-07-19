using dotnet_backend.Contracts.Games;
using dotnet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_backend.Controllers;

[ApiController]
[Route("api/games")]
[Authorize]
public sealed class GamesController(IGameService gameService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedGamesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedGamesResponse>> GetGames(
        [FromQuery] GameListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await gameService.GetGamesAsync(query, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpGet("{gameId:guid}")]
    [ProducesResponseType<GameResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GameResponse>> GetGame(
        Guid gameId,
        CancellationToken cancellationToken)
    {
        var result = await gameService.GetGameAsync(gameId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType<GameResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GameResponse>> CreateGame(
        CreateGameRequest request,
        CancellationToken cancellationToken)
    {
        var result = await gameService.CreateGameAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetGame), new { gameId = result.Value!.Id }, result.Value)
            : MapError(result.Error!);
    }

    [HttpPut("{gameId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType<GameResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GameResponse>> UpdateGame(
        Guid gameId,
        UpdateGameRequest request,
        CancellationToken cancellationToken)
    {
        var result = await gameService.UpdateGameAsync(gameId, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : MapError(result.Error!);
    }

    [HttpDelete("{gameId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ArchiveGame(
        Guid gameId,
        CancellationToken cancellationToken)
    {
        var result = await gameService.ArchiveGameAsync(gameId, cancellationToken);
        return result.Succeeded ? NoContent() : MapError(result.Error!);
    }

    private ActionResult MapError(GameError error) => error.Type switch
    {
        GameErrorType.Validation => BadRequest(new ValidationProblemDetails(
            (error.ValidationErrors ?? new Dictionary<string, string[]>())
            .ToDictionary(item => item.Key, item => item.Value))
        {
            Title = "Validation failed",
            Detail = error.Message,
            Status = StatusCodes.Status400BadRequest
        }),
        GameErrorType.Conflict => Conflict(CreateProblem(
            "Game conflict", error.Message, StatusCodes.Status409Conflict)),
        _ => NotFound(CreateProblem(
            "Game not found", error.Message, StatusCodes.Status404NotFound))
    };

    private static ProblemDetails CreateProblem(string title, string detail, int status) => new()
    {
        Title = title,
        Detail = detail,
        Status = status
    };
}
