# Tasks: Game Management

## Phase 1: Foundation

- [X] T001 Create the Game entity and EF configuration in `dotnet-backend/dotnet-backend/Models/Game.cs` and `dotnet-backend/dotnet-backend/Data/ApplicationDbContext.cs`
- [X] T002 [P] Create normalized request DTOs in `dotnet-backend/dotnet-backend/Contracts/Games/Requests.cs`
- [X] T003 [P] Create safe response DTOs in `dotnet-backend/dotnet-backend/Contracts/Games/Responses.cs`
- [X] T004 Define game operations and explicit outcomes in `dotnet-backend/dotnet-backend/Services/IGameService.cs`
- [X] T005 Generate and apply the Game catalog migration under `dotnet-backend/dotnet-backend/Migrations/`

## Phase 2: User Story 1 - Browse Games

- [X] T006 [P] [US1] Add paging, search, new, upcoming, detail, archive visibility, and overflow service tests in `dotnet-backend/dotnet-backend.Tests/GameServiceTests.cs`
- [X] T007 [P] [US1] Add authenticated browse API tests in `dotnet-backend/dotnet-backend.Tests/GamesApiTests.cs`
- [X] T008 [US1] Implement bounded active-game queries and projections in `dotnet-backend/dotnet-backend/Services/GameService.cs`
- [X] T009 [US1] Implement authenticated GET game endpoints in `dotnet-backend/dotnet-backend/Controllers/GamesController.cs`
- [X] T010 [US1] Register the game service in `dotnet-backend/dotnet-backend/Program.cs` and validate US1 tests

## Phase 3: User Story 2 - Maintain Game Catalog

- [X] T011 [P] [US2] Add create/update validation, duplicate, normalization, and Author-forbidden tests in `dotnet-backend/dotnet-backend.Tests/GameServiceTests.cs` and `dotnet-backend/dotnet-backend.Tests/GamesApiTests.cs`
- [X] T012 [US2] Implement validated create and update operations in `dotnet-backend/dotnet-backend/Services/GameService.cs`
- [X] T013 [US2] Implement Admin-only POST and PUT endpoints in `dotnet-backend/dotnet-backend/Controllers/GamesController.cs`
- [X] T014 [US2] Validate US2 tests and generated Swagger against `specs/002-game-management/contracts/games-api.yaml`

## Phase 4: User Story 3 - Archive Games

- [X] T015 [P] [US3] Add idempotent archive, not-found, Author-forbidden, and hidden-active-lookup tests in `dotnet-backend/dotnet-backend.Tests/GameServiceTests.cs` and `dotnet-backend/dotnet-backend.Tests/GamesApiTests.cs`
- [X] T016 [US3] Implement retained-row archival in `dotnet-backend/dotnet-backend/Services/GameService.cs`
- [X] T017 [US3] Implement the Admin-only DELETE endpoint in `dotnet-backend/dotnet-backend/Controllers/GamesController.cs`
- [X] T018 [US3] Validate US3 tests and archive persistence through `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj`

## Phase 5: Final Validation

- [X] T019 Add generated Swagger operation coverage for Games in `dotnet-backend/dotnet-backend.Tests/OpenApiContractTests.cs`
- [X] T020 Measure game read p95 and record results in `specs/002-game-management/quickstart.md`
- [X] T021 Run formatting, build, all migrations, and the complete suite from `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj`

## Phase 6: Review Remediation

- [X] T022 Add row-version concurrency protection for update/archive races in `dotnet-backend/dotnet-backend/Models/Game.cs` and `dotnet-backend/dotnet-backend/Services/GameService.cs`
- [X] T023 Add complete Games response metadata in `dotnet-backend/dotnet-backend/Controllers/GamesController.cs`
- [X] T024 Publish `releaseWindow` as lowercase string values in `dotnet-backend/dotnet-backend/Program.cs`
- [X] T025 Correct per-field paging validation and expand API/concurrency regressions in `dotnet-backend/dotnet-backend.Tests/GameServiceTests.cs` and `dotnet-backend/dotnet-backend.Tests/GamesApiTests.cs`
- [X] T026 Revalidate Swagger, migrations, formatting, build, and all tests through `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj`
