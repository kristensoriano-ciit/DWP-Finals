# Quickstart: Game Management

## Prerequisites

- Complete the Users backend setup in `specs/001-user-account-management/quickstart.md`.
- Start the named SQL Server LocalDB instance with `SqlLocalDB start DwpFinals`.

## Apply the Game migration

From `dotnet-backend/dotnet-backend`:

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update
```

## Validate

From `dotnet-backend`:

```powershell
dotnet build dotnet-backend.Tests/dotnet-backend.Tests.csproj
dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj
```

## API sequence

1. Sign in as an Author and call `GET /api/games`.
2. Use `releaseWindow=New` or `releaseWindow=Upcoming` for dashboard panels.
3. Sign in as Admin and call `POST /api/games`.
4. Update it with `PUT /api/games/{gameId}`.
5. Archive it with `DELETE /api/games/{gameId}`.
6. Confirm the archived game no longer appears in list or detail responses.

## Performance result

The repeatable integration performance test uses three warm-up requests and 20 sequential samples
against the migration-backed LocalDB test database.

- Recorded on: 2026-07-20
- Games list p95: 10.76 ms
- Constitutional target: below 500 ms
