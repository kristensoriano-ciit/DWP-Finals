# Tasks: Retrospective Management

## Phase 1: Design and Persistence

- [X] T001 Create the Spec Kit specification, plan, model, contract, checklist, and quickstart under `specs/003-retrospective-management/`
- [X] T002 Point `.specify/feature.json` to `specs/003-retrospective-management`
- [X] T003 Add the Retrospective entity and lifecycle enum in `dotnet-backend/dotnet-backend/Models/Retrospective.cs`
- [X] T004 Configure restricted relationships, constraints, indexes, and SQL rowversion in `dotnet-backend/dotnet-backend/Data/ApplicationDbContext.cs`
- [X] T005 Generate the `AddRetrospectiveManagement` EF migration under `dotnet-backend/dotnet-backend/Migrations/`

## Phase 2: Contracts and Business Logic

- [X] T006 Add validated mutation/list DTOs in `dotnet-backend/dotnet-backend/Contracts/Retrospectives/Requests.cs`
- [X] T007 Add separate public-safe and owner-safe projections in `dotnet-backend/dotnet-backend/Contracts/Retrospectives/Responses.cs`
- [X] T008 Define explicit service operations and outcomes in `dotnet-backend/dotnet-backend/Services/IRetrospectiveService.cs`
- [X] T009 Implement published and owner browse/detail queries in `dotnet-backend/dotnet-backend/Services/RetrospectiveService.cs`
- [X] T010 Implement normalized create/update with active Game checks and ownership in `dotnet-backend/dotnet-backend/Services/RetrospectiveService.cs`
- [X] T011 Implement author-controlled statuses, timestamps, reasons, and history in `dotnet-backend/dotnet-backend/Services/RetrospectiveService.cs`
- [X] T012 Implement rowversion conflict handling and terminal idempotent archive in `dotnet-backend/dotnet-backend/Services/RetrospectiveService.cs`

## Phase 3: HTTP API

- [X] T013 Implement shared and mutation routes in `dotnet-backend/dotnet-backend/Controllers/RetrospectivesController.cs`
- [X] T014 Implement own-list/detail routes in `dotnet-backend/dotnet-backend/Controllers/AccountRetrospectivesController.cs`
- [X] T015 Register the service and Author-only policy in `dotnet-backend/dotnet-backend/Program.cs`
- [X] T016 Document all eight exact operations in `specs/003-retrospective-management/contracts/retrospectives-api.yaml`

## Phase 4: Tests

- [X] T017 Add focused validation, lifecycle, ownership, visibility, ordering, archive, concurrency, and overflow service tests in `dotnet-backend/dotnet-backend.Tests/RetrospectiveServiceTests.cs`
- [X] T018 Add migration-backed auth, authorization, visibility, response safety, contract, and concurrency integration tests in `dotnet-backend/dotnet-backend.Tests/RetrospectivesApiTests.cs`
- [X] T019 Extend generated Swagger path, security, response, header, and safe-schema tests in `dotnet-backend/dotnet-backend.Tests/OpenApiContractTests.cs`
- [X] T020 Extend published browse p95 coverage in `dotnet-backend/dotnet-backend.Tests/PerformanceTests.cs`

## Phase 5: Validation

- [X] T021 Apply all migrations to the current `(localdb)\DwpFinals` database using process-only tooling secrets
- [X] T022 Run `dotnet format --verify-no-changes` and the complete build with zero warnings
- [X] T023 Run the full automated test suite and record exact passing counts
- [X] T024 Run EF pending-model detection and lint the feature OpenAPI contract
- [X] T025 Record final migration, test, performance, and validation results in `quickstart.md`

All tasks were marked complete only after the final validation gates passed.

## Phase 6: Independent Review Remediation

- [X] T026 Require an explicit status-change value and add state-preservation API coverage in `dotnet-backend/dotnet-backend/Contracts/Retrospectives/Requests.cs` and `dotnet-backend/dotnet-backend.Tests/RetrospectivesApiTests.cs`
- [X] T027 Restrict author-facing status schemas and publish normalized validation constraints in generated and checked-in OpenAPI contracts
- [X] T028 Serialize retrospective create/update active-Game validation with Game archival and add concurrency regressions in `dotnet-backend/dotnet-backend/Services/RetrospectiveService.cs` and `dotnet-backend/dotnet-backend.Tests/RetrospectiveServiceTests.cs`
- [X] T029 Add unique retrospective paging tie-breakers and tied-page regression coverage in `dotnet-backend/dotnet-backend/Services/RetrospectiveService.cs` and `dotnet-backend/dotnet-backend.Tests/RetrospectiveServiceTests.cs`
- [X] T030 Measure representative mixed-data published browse, filter, and sort paths and record results in `specs/003-retrospective-management/quickstart.md`
- [X] T031 Run formatting, build, full tests, EF pending-model detection, LocalDB migration update, and OpenAPI lint before completing remediation tasks

Remediation tasks were marked complete only after all final validation gates passed.

## Phase 7: Anonymous Published Browsing

- [X] T032 Allow anonymous shared published reads while preserving Author-only owner and mutation routes in `dotnet-backend/dotnet-backend/Controllers/RetrospectivesController.cs`
- [X] T033 Add anonymous visibility and protected-route regressions in `dotnet-backend/dotnet-backend.Tests/RetrospectivesApiTests.cs` and `dotnet-backend/dotnet-backend.Tests/OpenApiContractTests.cs`
- [X] T034 Synchronize public browsing requirements and API security declarations under `specs/003-retrospective-management/`
