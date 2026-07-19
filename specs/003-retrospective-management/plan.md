# Implementation Plan: Retrospective Management

**Branch**: `main` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

## Summary

Extend the .NET 8 API with a retained `Retrospective` entity, explicit public/owner contracts, one
injected `RetrospectiveService`, and thin shared/own controllers. EF Core handles async SQL Server
queries and rowversion concurrency. Published reads allow anonymous visitors; JWT authentication
and an Author policy gate owner views and writes without granting Admin a content override.

## Technical Context

**Language/Version**: C# 12 on .NET 8

**Dependencies**: Existing ASP.NET Core, Identity/JWT, EF Core 8 SQL Server, Swashbuckle

**Storage**: Existing `ApplicationDbContext` and `(localdb)\DwpFinals`

**Testing**: xUnit service tests and migration-backed `WebApplicationFactory` integration tests

**Performance**: No-tracking projections, status/game/author indexes, maximum page size 100, target
below 500 ms p95 for shared browse

## Constitution Check

- **Boundaries - PASS**: Controllers map claims, headers, and HTTP outcomes;
  `RetrospectiveService` owns validation, ownership, lifecycle, queries, and concurrency.
- **Testing - PASS**: Focused service and integration tests cover validation, authorization,
  lifecycle, visibility, ordering, concurrency, response safety, and generated Swagger.
- **UX contract - PASS**: Problem Details distinguish invalid, forbidden, missing, and stale data.
- **Performance - PASS**: All lists are bounded and projected server-side; browse is measured.
- **Small delivery - PASS**: Shared browse, author maintenance, and lifecycle/archive are separate
  independently testable stories.

**Post-design re-check**: PASS. No repository duplicates EF Core; no comments or file-upload layer
was introduced.

## Source Structure

```text
dotnet-backend/dotnet-backend/
├── Contracts/Retrospectives/Requests.cs
├── Contracts/Retrospectives/Responses.cs
├── Controllers/RetrospectivesController.cs
├── Controllers/AccountRetrospectivesController.cs
├── Models/Retrospective.cs
├── Services/IRetrospectiveService.cs
├── Services/RetrospectiveService.cs
├── Data/ApplicationDbContext.cs
└── Migrations/*AddRetrospectiveManagement*

dotnet-backend/dotnet-backend.Tests/
├── RetrospectiveServiceTests.cs
├── RetrospectivesApiTests.cs
├── OpenApiContractTests.cs
└── PerformanceTests.cs
```

## Contract Decisions

- Shared published list/detail routes are anonymous. The six owner and mutation routes require an
  active JWT; mutations and owner views require the Author role.
- `PUT` bodies include Base64 `rowVersion`; DELETE receives the same token through `If-Match`.
- Shared responses are deliberately separate from owner responses and omit owner-only lifecycle and
  concurrency data.
- Restricted foreign keys preserve Game and User attribution after their independent archival or
  deactivation.
- Create and content-update operations use a short serializable transaction from active-Game read
  through retrospective persistence. This gives Game archival and retrospective writes a clear
  database order without changing or weakening the existing archive endpoint.
- Every paged retrospective order ends with `Id` as a unique deterministic tie-breaker.

## Complexity Tracking

No constitution exceptions are required.
