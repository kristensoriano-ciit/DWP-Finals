using dotnet_backend.Contracts.Games;

namespace dotnet_backend.Services;

public enum GameErrorType
{
    Validation,
    Conflict,
    NotFound
}

public sealed record GameError(
    GameErrorType Type,
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? ValidationErrors = null);

public class GameResult
{
    protected GameResult(bool succeeded, GameError? error)
    {
        Succeeded = succeeded;
        Error = error;
    }

    public bool Succeeded { get; }

    public GameError? Error { get; }

    public static GameResult Success() => new(true, null);

    public static GameResult Failure(GameError error) => new(false, error);
}

public sealed class GameResult<T> : GameResult
{
    private GameResult(bool succeeded, T? value, GameError? error)
        : base(succeeded, error)
    {
        Value = value;
    }

    public T? Value { get; }

    public static GameResult<T> Success(T value) => new(true, value, null);

    public new static GameResult<T> Failure(GameError error) => new(false, default, error);
}

public interface IGameService
{
    Task<GameResult<PagedGamesResponse>> GetGamesAsync(
        GameListQuery query,
        CancellationToken cancellationToken);

    Task<GameResult<GameResponse>> GetGameAsync(
        Guid gameId,
        CancellationToken cancellationToken);

    Task<GameResult<GameResponse>> CreateGameAsync(
        CreateGameRequest request,
        CancellationToken cancellationToken);

    Task<GameResult<GameResponse>> UpdateGameAsync(
        Guid gameId,
        UpdateGameRequest request,
        CancellationToken cancellationToken);

    Task<GameResult> ArchiveGameAsync(
        Guid gameId,
        CancellationToken cancellationToken);
}
