# Quickstart: Retrospective Management

## Prerequisites

- Complete the Users and Games backend setup.
- Start the named SQL Server LocalDB instance with `SqlLocalDB start DwpFinals`.
- Supply JWT keys through environment variables or User Secrets, never tracked settings.

## Apply Migration

From `dotnet-backend/dotnet-backend`:

```powershell
dotnet tool restore
$env:Jwt__Key = "<temporary-development-key-at-least-32-characters>"
$env:ConnectionStrings__DefaultConnection = "Server=(localdb)\DwpFinals;Database=DwpFinals;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
dotnet tool run dotnet-ef database update
```

## Validate

From `dotnet-backend`:

```powershell
dotnet format dotnet-backend/dotnet-backend.csproj --verify-no-changes
dotnet build dotnet-backend/dotnet-backend.slnx --no-restore
dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --no-build
dotnet tool run dotnet-ef migrations has-pending-model-changes --project dotnet-backend/dotnet-backend.csproj --startup-project dotnet-backend/dotnet-backend.csproj
```

Lint the feature contract from the repository root:

```powershell
npx --yes @redocly/cli lint specs/003-retrospective-management/contracts/retrospectives-api.yaml
```

## API Sequence

1. Sign in as an Author and select an active Game from `GET /api/games`.
2. Create a Draft with `POST /api/retrospectives`.
3. Read all owner statuses at `GET /api/account/retrospectives`.
4. Update content using the current Base64 `rowVersion`.
5. Publish or unpublish through `PUT /api/retrospectives/{id}/status`.
6. Clear the bearer token and browse shared published content anonymously with `sort=newest` or
   `sort=best`; drafts and unpublished reviews must remain hidden.
7. Archive by sending the current token as `If-Match: "<rowVersion>"` to DELETE.

## Performance Result

Recorded on 2026-07-20 using .NET 8 runtime through SDK 10.0.301, migration-backed SQL Server
LocalDB, ASP.NET Core `WebApplicationFactory`, 200 retrospectives distributed across five games and
all five statuses, three warm-up requests per path, and 20 sequential samples per path:

- Published retrospective newest browse p95: 15.24 ms
- Published retrospective best-sort browse p95: 12.25 ms
- Published retrospective game-filtered best-sort p95: 12.92 ms
- Constitutional target: below 500 ms

This is a local development baseline, not a production load-capacity result.

## Recorded Validation

Completed on 2026-07-20:

- Migration `20260719184344_AddRetrospectiveManagement` applied to
  `(localdb)\DwpFinals` / database `DwpFinals`.
- EF pending-model check: no changes since the latest migration.
- `dotnet format --verify-no-changes`: passed for API and test projects.
- API/test build: passed with 0 warnings and 0 errors.
- Full migration-backed suite after independent-review remediation: 65 passed, 0 failed, 0 skipped.
- Retrospective-focused service/API/Swagger/performance tests: 24 passed.
- Redocly recommended OpenAPI lint: valid with 0 warnings.
- No persistence model changed during review remediation, so no migration was generated; EF reported
  no pending model changes and `(localdb)\DwpFinals` was already up to date.

The full test log includes pre-existing SQL Server MARS savepoint warnings and expected logged
unique-index exceptions from account race-condition tests; these did not produce failures.
