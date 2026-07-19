# Implementation Plan: Game Management

**Branch**: `main` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

## Summary

Extend the existing .NET 8 API with an EF Core `Game` entity, explicit game request/response DTOs,
an injected `GameService`, and one authenticated `GamesController`. Reads allow any active user;
mutations require the existing Admin policy. Archival preserves relationships for retrospectives.

## Technical Context

**Language/Version**: C# 12 on .NET 8

**Dependencies**: Existing ASP.NET Core, Identity/JWT, EF Core 8, SQL Server LocalDB, Swagger

**Storage**: Existing `ApplicationDbContext` and `(localdb)\DwpFinals`

**Testing**: xUnit and the migration-backed `UserApiFactory`

**Performance**: No-tracking projections, indexed normalized title/date, server paging, p95 below
500 ms for reads

## Constitution Check

- **Boundaries — PASS**: Controller maps HTTP; `GameService` owns normalization, filtering, and
  archival; EF Core owns persistence.
- **Testing — PASS**: Service and HTTP tests cover every story, role, duplicate, and archive rule.
- **UX contract — PASS**: Clear validation, conflict, forbidden, and not-found responses support
  frontend loading/error states.
- **Performance — PASS**: Bounded projections and indexes support panels and search.
- **Small delivery — PASS**: Browse, catalog maintenance, and archival are separate checkpoints.

## Source Structure

```text
dotnet-backend/dotnet-backend/
├── Contracts/Games/Requests.cs
├── Contracts/Games/Responses.cs
├── Controllers/GamesController.cs
├── Models/Game.cs
├── Services/IGameService.cs
├── Services/GameService.cs
├── Data/ApplicationDbContext.cs
└── Migrations/

dotnet-backend/dotnet-backend.Tests/
├── GameServiceTests.cs
└── GamesApiTests.cs
```

No repository layer is added because `ApplicationDbContext` already supplies the required testable
persistence boundary for this focused feature.
