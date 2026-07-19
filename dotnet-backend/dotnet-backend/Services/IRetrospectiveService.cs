using dotnet_backend.Contracts.Retrospectives;

namespace dotnet_backend.Services;

public enum RetrospectiveErrorType
{
    Validation,
    Forbidden,
    Conflict,
    NotFound
}

public sealed record RetrospectiveError(
    RetrospectiveErrorType Type,
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? ValidationErrors = null);

public class RetrospectiveResult
{
    protected RetrospectiveResult(bool succeeded, RetrospectiveError? error)
    {
        Succeeded = succeeded;
        Error = error;
    }

    public bool Succeeded { get; }

    public RetrospectiveError? Error { get; }

    public static RetrospectiveResult Success() => new(true, null);

    public static RetrospectiveResult Failure(RetrospectiveError error) => new(false, error);
}

public sealed class RetrospectiveResult<T> : RetrospectiveResult
{
    private RetrospectiveResult(bool succeeded, T? value, RetrospectiveError? error)
        : base(succeeded, error) => Value = value;

    public T? Value { get; }

    public static RetrospectiveResult<T> Success(T value) => new(true, value, null);

    public new static RetrospectiveResult<T> Failure(RetrospectiveError error) =>
        new(false, default, error);
}

public interface IRetrospectiveService
{
    Task<RetrospectiveResult<PagedPublishedRetrospectivesResponse>> GetPublishedAsync(
        RetrospectiveListQuery query,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult<PublishedRetrospectiveResponse>> GetPublishedByIdAsync(
        Guid retrospectiveId,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult<PagedRetrospectivesResponse>> GetOwnAsync(
        Guid authorUserId,
        OwnRetrospectiveListQuery query,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult<RetrospectiveResponse>> GetOwnByIdAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult<RetrospectiveResponse>> CreateAsync(
        Guid authorUserId,
        CreateRetrospectiveRequest request,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult<RetrospectiveResponse>> UpdateAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        UpdateRetrospectiveRequest request,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult<RetrospectiveResponse>> ChangeStatusAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        ChangeRetrospectiveStatusRequest request,
        CancellationToken cancellationToken);

    Task<RetrospectiveResult> ArchiveAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        string rowVersion,
        CancellationToken cancellationToken);
}
