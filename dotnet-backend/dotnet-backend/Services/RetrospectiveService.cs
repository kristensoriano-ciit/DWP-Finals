using System.Data;
using dotnet_backend.Contracts.Retrospectives;
using dotnet_backend.Data;
using dotnet_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace dotnet_backend.Services;

public sealed class RetrospectiveService(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider) : IRetrospectiveService
{
    public async Task<RetrospectiveResult<PagedPublishedRetrospectivesResponse>> GetPublishedAsync(
        RetrospectiveListQuery query,
        CancellationToken cancellationToken)
    {
        var queryError = ValidateQuery(query);
        if (queryError is not null)
        {
            return RetrospectiveResult<PagedPublishedRetrospectivesResponse>.Failure(queryError);
        }

        var retrospectives = dbContext.Retrospectives.AsNoTracking()
            .Where(value => value.Status == RetrospectiveStatus.Published);
        retrospectives = ApplyFilters(retrospectives, query);

        var totalCount = await retrospectives.CountAsync(cancellationToken);
        var offset = ((long)query.Page - 1) * query.PageSize;
        if (offset >= totalCount)
        {
            return RetrospectiveResult<PagedPublishedRetrospectivesResponse>.Success(
                new PagedPublishedRetrospectivesResponse([], query.Page, query.PageSize, totalCount));
        }

        var ordered = query.Sort == RetrospectiveSort.Best
            ? retrospectives.OrderByDescending(value => value.Rating)
                .ThenByDescending(value => value.PublishedAtUtc)
                .ThenByDescending(value => value.CreatedAtUtc)
                .ThenBy(value => value.Id)
            : retrospectives.OrderByDescending(value => value.PublishedAtUtc)
                .ThenByDescending(value => value.CreatedAtUtc)
                .ThenBy(value => value.Id);
        var items = await ordered
            .Skip((int)offset)
            .Take(query.PageSize)
            .Select(value => new PublishedRetrospectiveResponse(
                value.Id,
                value.GameId,
                value.Game.Title,
                value.AuthorUserId,
                value.AuthorUser.DisplayName,
                value.Title,
                value.ReviewContent,
                value.ImageUrl,
                value.Rating,
                value.PublishedAtUtc!.Value))
            .ToListAsync(cancellationToken);

        return RetrospectiveResult<PagedPublishedRetrospectivesResponse>.Success(
            new PagedPublishedRetrospectivesResponse(items, query.Page, query.PageSize, totalCount));
    }

    public async Task<RetrospectiveResult<PublishedRetrospectiveResponse>> GetPublishedByIdAsync(
        Guid retrospectiveId,
        CancellationToken cancellationToken)
    {
        var response = await dbContext.Retrospectives.AsNoTracking()
            .Where(value => value.Id == retrospectiveId &&
                value.Status == RetrospectiveStatus.Published)
            .Select(value => new PublishedRetrospectiveResponse(
                value.Id,
                value.GameId,
                value.Game.Title,
                value.AuthorUserId,
                value.AuthorUser.DisplayName,
                value.Title,
                value.ReviewContent,
                value.ImageUrl,
                value.Rating,
                value.PublishedAtUtc!.Value))
            .SingleOrDefaultAsync(cancellationToken);
        return response is null
            ? RetrospectiveResult<PublishedRetrospectiveResponse>.Failure(NotFoundError())
            : RetrospectiveResult<PublishedRetrospectiveResponse>.Success(response);
    }

    public async Task<RetrospectiveResult<PagedRetrospectivesResponse>> GetOwnAsync(
        Guid authorUserId,
        OwnRetrospectiveListQuery query,
        CancellationToken cancellationToken)
    {
        var queryError = ValidateQuery(query);
        if (queryError is not null)
        {
            return RetrospectiveResult<PagedRetrospectivesResponse>.Failure(queryError);
        }
        if (query.Status.HasValue && !Enum.IsDefined(query.Status.Value))
        {
            return RetrospectiveResult<PagedRetrospectivesResponse>.Failure(ValidationError(
                new Dictionary<string, string[]>
                {
                    [nameof(query.Status)] =
                        ["Status must be draft, review, published, or unpublished."]
                }));
        }

        var retrospectives = dbContext.Retrospectives.AsNoTracking()
            .Where(value => value.AuthorUserId == authorUserId &&
                value.Status != RetrospectiveStatus.Archived);
        retrospectives = ApplyFilters(retrospectives, query);
        if (query.Status.HasValue)
        {
            var status = ToModelStatus(query.Status.Value);
            retrospectives = retrospectives.Where(value => value.Status == status);
        }

        var totalCount = await retrospectives.CountAsync(cancellationToken);
        var offset = ((long)query.Page - 1) * query.PageSize;
        if (offset >= totalCount)
        {
            return RetrospectiveResult<PagedRetrospectivesResponse>.Success(
                new PagedRetrospectivesResponse([], query.Page, query.PageSize, totalCount));
        }

        var ordered = query.Sort == RetrospectiveSort.Best
            ? retrospectives.OrderByDescending(value => value.Rating)
                .ThenByDescending(value => value.PublishedAtUtc)
                .ThenByDescending(value => value.CreatedAtUtc)
                .ThenBy(value => value.Id)
            : retrospectives.OrderByDescending(value => value.UpdatedAtUtc)
                .ThenByDescending(value => value.CreatedAtUtc)
                .ThenBy(value => value.Id);
        var items = await ordered
            .Skip((int)offset)
            .Take(query.PageSize)
            .Select(value => new RetrospectiveResponse(
                value.Id,
                value.GameId,
                value.Game.Title,
                value.AuthorUserId,
                value.AuthorUser.DisplayName,
                value.Title,
                value.ReviewContent,
                value.ImageUrl,
                value.Rating,
                value.Status,
                value.UnpublishedReason,
                value.CreatedAtUtc,
                value.UpdatedAtUtc,
                value.PublishedAtUtc,
                value.UnpublishedAtUtc,
                value.ArchivedAtUtc,
                Convert.ToBase64String(value.RowVersion)))
            .ToListAsync(cancellationToken);

        return RetrospectiveResult<PagedRetrospectivesResponse>.Success(
            new PagedRetrospectivesResponse(items, query.Page, query.PageSize, totalCount));
    }

    public async Task<RetrospectiveResult<RetrospectiveResponse>> GetOwnByIdAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        CancellationToken cancellationToken)
    {
        var retrospective = await dbContext.Retrospectives.AsNoTracking()
            .Include(value => value.Game)
            .Include(value => value.AuthorUser)
            .SingleOrDefaultAsync(value => value.Id == retrospectiveId, cancellationToken);
        if (retrospective is null || retrospective.Status == RetrospectiveStatus.Archived)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(NotFoundError());
        }

        if (retrospective.AuthorUserId != authorUserId)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(ForbiddenError());
        }

        return RetrospectiveResult<RetrospectiveResponse>.Success(ToOwnResponse(retrospective));
    }

    public async Task<RetrospectiveResult<RetrospectiveResponse>> CreateAsync(
        Guid authorUserId,
        CreateRetrospectiveRequest request,
        CancellationToken cancellationToken)
    {
        var values = NormalizeAndValidate(
            request.GameId,
            request.Title,
            request.ReviewContent,
            request.ImageUrl,
            request.Rating);
        var statusError = ValidateStatus(
            request.Status, request.UnpublishedReason, out var requestedStatus);
        var error = CombineValidation(values.Error, statusError);
        if (error is not null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(error);
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var game = await dbContext.Games.SingleOrDefaultAsync(
            value => value.Id == request.GameId && value.IsActive,
            cancellationToken);
        if (game is null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(ActiveGameError());
        }

        var author = await dbContext.Users.SingleAsync(
            value => value.Id == authorUserId,
            cancellationToken);
        var now = timeProvider.GetUtcNow();
        var retrospective = new Retrospective
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Game = game,
            AuthorUserId = authorUserId,
            AuthorUser = author,
            Title = values.Title!,
            ReviewContent = values.ReviewContent!,
            ImageUrl = values.ImageUrl,
            Rating = request.Rating,
            Status = requestedStatus,
            UnpublishedReason = requestedStatus == RetrospectiveStatus.Unpublished
                ? request.UnpublishedReason!.Trim()
                : null,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            PublishedAtUtc = requestedStatus == RetrospectiveStatus.Published ? now : null,
            UnpublishedAtUtc = requestedStatus == RetrospectiveStatus.Unpublished ? now : null
        };
        dbContext.Retrospectives.Add(retrospective);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return RetrospectiveResult<RetrospectiveResponse>.Success(ToOwnResponse(retrospective));
    }

    public async Task<RetrospectiveResult<RetrospectiveResponse>> UpdateAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        UpdateRetrospectiveRequest request,
        CancellationToken cancellationToken)
    {
        var values = NormalizeAndValidate(
            request.GameId,
            request.Title,
            request.ReviewContent,
            request.ImageUrl,
            request.Rating);
        if (values.Error is not null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(values.Error);
        }

        if (!TryDecodeRowVersion(request.RowVersion, out var rowVersion))
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(RowVersionValidationError());
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var retrospective = await FindOwnedForMutationAsync(
            authorUserId, retrospectiveId, cancellationToken);
        if (retrospective.Error is not null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(retrospective.Error);
        }

        var game = await dbContext.Games.SingleOrDefaultAsync(
            value => value.Id == request.GameId && value.IsActive,
            cancellationToken);
        if (game is null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(ActiveGameError());
        }

        var entity = retrospective.Value!;
        dbContext.Entry(entity).Property(value => value.RowVersion).OriginalValue = rowVersion;
        entity.GameId = game.Id;
        entity.Game = game;
        entity.Title = values.Title!;
        entity.ReviewContent = values.ReviewContent!;
        entity.ImageUrl = values.ImageUrl;
        entity.Rating = request.Rating;
        entity.UpdatedAtUtc = timeProvider.GetUtcNow();

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(ConcurrencyError());
        }

        return RetrospectiveResult<RetrospectiveResponse>.Success(ToOwnResponse(entity));
    }

    public async Task<RetrospectiveResult<RetrospectiveResponse>> ChangeStatusAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        ChangeRetrospectiveStatusRequest request,
        CancellationToken cancellationToken)
    {
        var statusError = ValidateStatus(
            request.Status, request.UnpublishedReason, out var requestedStatus);
        if (statusError is not null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(statusError);
        }

        if (!TryDecodeRowVersion(request.RowVersion, out var rowVersion))
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(RowVersionValidationError());
        }

        var retrospective = await FindOwnedForMutationAsync(
            authorUserId, retrospectiveId, cancellationToken);
        if (retrospective.Error is not null)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(retrospective.Error);
        }

        var entity = retrospective.Value!;
        dbContext.Entry(entity).Property(value => value.RowVersion).OriginalValue = rowVersion;
        var now = timeProvider.GetUtcNow();
        if (entity.Status != requestedStatus)
        {
            if (requestedStatus == RetrospectiveStatus.Published)
            {
                entity.PublishedAtUtc = now;
            }
            else if (requestedStatus == RetrospectiveStatus.Unpublished)
            {
                entity.UnpublishedAtUtc = now;
            }
        }

        entity.Status = requestedStatus;
        if (requestedStatus == RetrospectiveStatus.Unpublished)
        {
            entity.UnpublishedReason = request.UnpublishedReason!.Trim();
        }
        entity.UpdatedAtUtc = now;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return RetrospectiveResult<RetrospectiveResponse>.Failure(ConcurrencyError());
        }

        return RetrospectiveResult<RetrospectiveResponse>.Success(ToOwnResponse(entity));
    }

    public async Task<RetrospectiveResult> ArchiveAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        string rowVersionValue,
        CancellationToken cancellationToken)
    {
        var retrospective = await dbContext.Retrospectives.SingleOrDefaultAsync(
            value => value.Id == retrospectiveId,
            cancellationToken);
        if (retrospective is null)
        {
            return RetrospectiveResult.Failure(NotFoundError());
        }

        if (retrospective.AuthorUserId != authorUserId)
        {
            return RetrospectiveResult.Failure(ForbiddenError());
        }

        if (retrospective.Status == RetrospectiveStatus.Archived)
        {
            return RetrospectiveResult.Success();
        }

        if (!TryDecodeRowVersion(rowVersionValue, out var rowVersion))
        {
            return RetrospectiveResult.Failure(RowVersionValidationError());
        }

        dbContext.Entry(retrospective).Property(value => value.RowVersion).OriginalValue = rowVersion;
        var now = timeProvider.GetUtcNow();
        retrospective.Status = RetrospectiveStatus.Archived;
        retrospective.ArchivedAtUtc = now;
        retrospective.UpdatedAtUtc = now;
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return RetrospectiveResult.Success();
        }
        catch (DbUpdateConcurrencyException)
        {
            dbContext.Entry(retrospective).State = EntityState.Detached;
            var current = await dbContext.Retrospectives.AsNoTracking()
                .SingleOrDefaultAsync(value => value.Id == retrospectiveId, cancellationToken);
            return current is not null &&
                current.AuthorUserId == authorUserId &&
                current.Status == RetrospectiveStatus.Archived
                ? RetrospectiveResult.Success()
                : RetrospectiveResult.Failure(ConcurrencyError());
        }
    }

    private async Task<OwnedRetrospectiveResult> FindOwnedForMutationAsync(
        Guid authorUserId,
        Guid retrospectiveId,
        CancellationToken cancellationToken)
    {
        var retrospective = await dbContext.Retrospectives
            .Include(value => value.Game)
            .Include(value => value.AuthorUser)
            .SingleOrDefaultAsync(value => value.Id == retrospectiveId, cancellationToken);
        if (retrospective is null)
        {
            return new OwnedRetrospectiveResult(Error: NotFoundError());
        }

        if (retrospective.AuthorUserId != authorUserId)
        {
            return new OwnedRetrospectiveResult(Error: ForbiddenError());
        }

        return retrospective.Status == RetrospectiveStatus.Archived
            ? new OwnedRetrospectiveResult(Error: ArchivedError())
            : new OwnedRetrospectiveResult(retrospective);
    }

    private static IQueryable<Retrospective> ApplyFilters(
        IQueryable<Retrospective> retrospectives,
        RetrospectiveListQuery query)
    {
        var search = query.Search?.Trim();
        if (!string.IsNullOrWhiteSpace(search))
        {
            retrospectives = retrospectives.Where(value =>
                value.Title.Contains(search) || value.ReviewContent.Contains(search));
        }

        if (query.GameId.HasValue)
        {
            retrospectives = retrospectives.Where(value => value.GameId == query.GameId.Value);
        }

        return retrospectives;
    }

    private static RetrospectiveError? ValidateQuery(RetrospectiveListQuery query)
    {
        var errors = new Dictionary<string, string[]>();
        if (query.Page < 1)
        {
            errors[nameof(query.Page)] = ["Page must be at least 1."];
        }
        if (query.PageSize is < 1 or > 100)
        {
            errors[nameof(query.PageSize)] = ["Page size must be between 1 and 100."];
        }
        if (query.Search?.Trim().Length > 200)
        {
            errors[nameof(query.Search)] = ["Search cannot exceed 200 characters."];
        }

        return errors.Count == 0 ? null : ValidationError(errors);
    }

    private static NormalizedValues NormalizeAndValidate(
        Guid gameId,
        string? titleValue,
        string? reviewContentValue,
        string? imageUrlValue,
        int rating)
    {
        var title = titleValue?.Trim() ?? string.Empty;
        var reviewContent = reviewContentValue?.Trim() ?? string.Empty;
        var imageUrl = string.IsNullOrWhiteSpace(imageUrlValue) ? null : imageUrlValue.Trim();
        var errors = new Dictionary<string, string[]>();
        if (gameId == Guid.Empty)
        {
            errors[nameof(CreateRetrospectiveRequest.GameId)] = ["Game ID is required."];
        }
        if (title.Length is < 1 or > 200)
        {
            errors[nameof(CreateRetrospectiveRequest.Title)] =
                ["Title must contain between 1 and 200 characters."];
        }
        if (reviewContent.Length is < 1 or > 20000)
        {
            errors[nameof(CreateRetrospectiveRequest.ReviewContent)] =
                ["Review content must contain between 1 and 20,000 characters."];
        }
        if (rating is < 1 or > 10)
        {
            errors[nameof(CreateRetrospectiveRequest.Rating)] =
                ["Rating must be between 1 and 10."];
        }
        if (imageUrl is not null &&
            (imageUrl.Length > 2048 ||
             !Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) ||
             (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)))
        {
            errors[nameof(CreateRetrospectiveRequest.ImageUrl)] =
                ["Image URL must be an absolute HTTP or HTTPS URL with at most 2,048 characters."];
        }

        return errors.Count == 0
            ? new NormalizedValues(title, reviewContent, imageUrl)
            : new NormalizedValues(Error: ValidationError(errors));
    }

    private static RetrospectiveError? ValidateStatus(
        AuthorRetrospectiveStatus? requestedStatus,
        string? unpublishedReason,
        out RetrospectiveStatus status)
    {
        status = RetrospectiveStatus.Draft;
        var errors = new Dictionary<string, string[]>();
        if (!requestedStatus.HasValue || !Enum.IsDefined(requestedStatus.Value))
        {
            errors[nameof(ChangeRetrospectiveStatusRequest.Status)] =
                ["Status is required and must be draft, review, published, or unpublished."];
        }
        else
        {
            status = ToModelStatus(requestedStatus.Value);
        }
        if (status == RetrospectiveStatus.Unpublished &&
            string.IsNullOrWhiteSpace(unpublishedReason))
        {
            errors[nameof(ChangeRetrospectiveStatusRequest.UnpublishedReason)] =
                ["An unpublished reason is required when status is unpublished."];
        }
        else if (unpublishedReason?.Trim().Length > 500)
        {
            errors[nameof(ChangeRetrospectiveStatusRequest.UnpublishedReason)] =
                ["Unpublished reason cannot exceed 500 characters."];
        }

        return errors.Count == 0 ? null : ValidationError(errors);
    }

    private static RetrospectiveStatus ToModelStatus(AuthorRetrospectiveStatus status) => status switch
    {
        AuthorRetrospectiveStatus.Draft => RetrospectiveStatus.Draft,
        AuthorRetrospectiveStatus.Review => RetrospectiveStatus.Review,
        AuthorRetrospectiveStatus.Published => RetrospectiveStatus.Published,
        AuthorRetrospectiveStatus.Unpublished => RetrospectiveStatus.Unpublished,
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    private static RetrospectiveError? CombineValidation(
        RetrospectiveError? first,
        RetrospectiveError? second)
    {
        if (first is null)
        {
            return second;
        }
        if (second is null)
        {
            return first;
        }

        return ValidationError(first.ValidationErrors!
            .Concat(second.ValidationErrors!)
            .ToDictionary(value => value.Key, value => value.Value));
    }

    private static bool TryDecodeRowVersion(string? value, out byte[] rowVersion)
    {
        try
        {
            rowVersion = Convert.FromBase64String(value?.Trim().Trim('"') ?? string.Empty);
            return rowVersion.Length > 0;
        }
        catch (FormatException)
        {
            rowVersion = [];
            return false;
        }
    }

    private static RetrospectiveResponse ToOwnResponse(Retrospective value) => new(
        value.Id,
        value.GameId,
        value.Game.Title,
        value.AuthorUserId,
        value.AuthorUser.DisplayName,
        value.Title,
        value.ReviewContent,
        value.ImageUrl,
        value.Rating,
        value.Status,
        value.UnpublishedReason,
        value.CreatedAtUtc,
        value.UpdatedAtUtc,
        value.PublishedAtUtc,
        value.UnpublishedAtUtc,
        value.ArchivedAtUtc,
        Convert.ToBase64String(value.RowVersion));

    private static RetrospectiveError ValidationError(
        IReadOnlyDictionary<string, string[]> errors) => new(
        RetrospectiveErrorType.Validation,
        "validation_failed",
        "One or more validation errors occurred.",
        errors);

    private static RetrospectiveError ActiveGameError() => ValidationError(
        new Dictionary<string, string[]>
        {
            [nameof(CreateRetrospectiveRequest.GameId)] =
                ["Game must identify an existing active game."]
        });

    private static RetrospectiveError RowVersionValidationError() => ValidationError(
        new Dictionary<string, string[]>
        {
            [nameof(UpdateRetrospectiveRequest.RowVersion)] =
                ["Row version must be a valid Base64 concurrency token."]
        });

    private static RetrospectiveError ForbiddenError() => new(
        RetrospectiveErrorType.Forbidden,
        "retrospective_not_owned",
        "Only the retrospective's author can perform this operation.");

    private static RetrospectiveError NotFoundError() => new(
        RetrospectiveErrorType.NotFound,
        "retrospective_not_found",
        "The requested retrospective was not found.");

    private static RetrospectiveError ArchivedError() => new(
        RetrospectiveErrorType.Conflict,
        "retrospective_archived",
        "Archived retrospectives are terminal and cannot be changed.");

    private static RetrospectiveError ConcurrencyError() => new(
        RetrospectiveErrorType.Conflict,
        "retrospective_changed",
        "The retrospective changed while this operation was in progress. Reload it and try again.");

    private sealed record NormalizedValues(
        string? Title = null,
        string? ReviewContent = null,
        string? ImageUrl = null,
        RetrospectiveError? Error = null);

    private sealed record OwnedRetrospectiveResult(
        Retrospective? Value = null,
        RetrospectiveError? Error = null);
}
