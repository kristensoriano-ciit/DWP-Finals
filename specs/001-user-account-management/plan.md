# Implementation Plan: User Account Management

**Branch**: `001-user-account-management` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-account-management/spec.md`

## Summary

Add a backend-only account-management slice to the existing ASP.NET Core API. ASP.NET Core
Identity will own credential hashing and account primitives, Entity Framework Core will persist
identity and deactivation records in SQL Server LocalDB, and JWT bearer tokens will authenticate
React clients. Thin controllers will map HTTP requests to one injected account service. The first
slice covers registration and sign-in; profile maintenance and admin deactivation build on it.

## Technical Context

**Language/Version**: C# 12 on .NET 8

**Primary Dependencies**: ASP.NET Core Identity, JWT bearer authentication, Entity Framework Core
8, EF Core SQL Server provider, Swashbuckle/OpenAPI

**Storage**: SQL Server LocalDB for development through EF Core migrations

**Testing**: xUnit, ASP.NET Core `WebApplicationFactory`, and an isolated SQL Server LocalDB test
database created per integration-test run

**Target Platform**: Windows development environment; ASP.NET Core web API consumed by the React
frontend

**Project Type**: Backend portion of a web application

**Performance Goals**: Profile and administration endpoints below 500 ms p95 under documented
normal test conditions; authentication timing measured separately so password hashing is never
weakened to meet a response target

**Constraints**: Preserve retrospective attribution when accounts are deactivated; never expose
password hashes, tokens, security stamps, or internal exceptions; enforce active status and roles
on the backend; page user collections with a maximum page size of 100

**Scale/Scope**: College final project with an initial target of 100 concurrent account requests
and a user collection that may grow beyond one page

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **Code boundaries — PASS**: `AuthController`, `AccountController`, and `AdminUsersController`
  own HTTP behavior. `UserAccountService` owns registration, profile, password, listing, and
  deactivation rules. Identity and EF Core own credential and persistence concerns.
- **Testing — PASS**: Unit tests cover service rules and result mapping. Integration tests cover
  registration, JWT authentication, profile updates, password changes, role authorization,
  pagination, uniqueness, deactivation, and inactive-token rejection.
- **User experience — PASS (backend scope)**: Problem Details responses distinguish validation,
  unauthorized, forbidden, conflict, and not-found outcomes. No frontend UI is changed by this
  feature.
- **Performance — PASS**: User lists are server-paged. Queries use no-tracking projections when
  possible. The quickstart defines timing validation; password hashing remains security-first and
  is reported separately.
- **Small delivery slice — PASS**: The design supports three independently testable slices:
  registration/sign-in, own-profile maintenance, and administrator user deactivation.

**Post-design re-check**: PASS. The data model, API contract, and validation guide preserve these
boundaries without adding a repository layer or speculative abstractions.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-account-management/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── users-api.yaml
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
dotnet-backend/
├── dotnet-backend/
│   ├── Contracts/
│   │   └── Users/
│   │       ├── Requests.cs
│   │       └── Responses.cs
│   ├── Controllers/
│   │   ├── AccountController.cs
│   │   ├── AdminUsersController.cs
│   │   └── AuthController.cs
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   └── DevelopmentIdentitySeeder.cs
│   ├── Models/
│   │   ├── ApplicationUser.cs
│   │   └── UserDeactivation.cs
│   ├── Services/
│   │   ├── IUserAccountService.cs
│   │   ├── JwtTokenService.cs
│   │   └── UserAccountService.cs
│   ├── Program.cs
│   └── appsettings.json
└── dotnet-backend.Tests/
    ├── AccountApiTests.cs
    ├── AdminUsersApiTests.cs
    ├── AuthApiTests.cs
    └── UserAccountServiceTests.cs
```

**Structure Decision**: Keep the existing single ASP.NET Core project and add feature-oriented
contracts plus direct Models, Data, Services, and Controllers folders. Use Identity's `UserManager`
and EF Core context directly inside the account service; a custom repository would duplicate those
abstractions without improving this feature.

## Complexity Tracking

No constitution violations require exceptions.
