# Quickstart: User Account Management

This guide describes how to validate the planned Users backend after implementation.

## Prerequisites

- .NET 8 SDK
- Visual Studio SQL Server LocalDB
- The repository opened at its root directory
- A development JWT signing key and admin seed credentials stored outside tracked settings files

## Development configuration

From `dotnet-backend/dotnet-backend`, initialize Secret Manager if needed and configure values
equivalent to:

```powershell
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=(localdb)\DwpFinals;Database=DwpFinals;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
dotnet user-secrets set "Jwt:Key" "<a-development-key-with-at-least-32-random-characters>"
dotnet user-secrets set "AdminSeed:Email" "<development-admin-email>"
dotnet user-secrets set "AdminSeed:Password" "<development-admin-password>"
dotnet user-secrets set "AdminSeed:DisplayName" "Development Admin"
```

Do not commit real passwords or signing keys. Prefer entering secret values through Visual Studio's
Manage User Secrets editor so they are not left in terminal history.

## Prepare the database

From `dotnet-backend/dotnet-backend`:

```powershell
dotnet restore
dotnet tool restore
dotnet tool run dotnet-ef database update
```

Confirm the database appears in Visual Studio SQL Server Object Explorer under
`(localdb)\DwpFinals`. If the instance does not exist, create it with
`SqlLocalDB create DwpFinals -s` before applying migrations.

## Run automated validation

From `dotnet-backend`:

```powershell
dotnet build dotnet-backend.Tests/dotnet-backend.Tests.csproj
dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj
```

Expected result: the API and test project build successfully, and service plus integration tests
pass.

## Run the API

From `dotnet-backend/dotnet-backend`:

```powershell
dotnet run
```

Open Swagger at the development URL printed by the application.

## End-to-end scenarios

Use the request and response definitions in [contracts/users-api.yaml](contracts/users-api.yaml).

1. Register a new account and confirm its role is `Author`.
2. Sign in and copy the returned bearer token into Swagger authorization.
3. Retrieve and update the current profile.
4. Change the password, then confirm the old password fails and the new password succeeds.
5. Sign in with the seeded administrator and list users with `page=1&pageSize=20`.
6. Deactivate the author account and confirm its later sign-in and authenticated requests fail.
7. Confirm the administrator cannot deactivate their own account.

## Performance validation

Run a repeatable local request sample after a warm-up period and record machine, database, sample
size, and concurrency. Profile and administration endpoints target p95 below 500 milliseconds.
Record register, sign-in, and password-change timing separately because secure password hashing is
intentionally expensive and MUST NOT be weakened to satisfy the ordinary-query target.

### Recorded local result (2026-07-20)

- Runtime: .NET 8 application executed by SDK 10.0.301
- Database: SQL Server 2025 LocalDB 17.0.4025.3 using the named `DwpFinals` instance
- Host: ASP.NET Core `WebApplicationFactory` on the local development machine
- Sample: 3 warm-up requests followed by 20 sequential requests per endpoint
- Profile endpoint p95: 9.88 ms
- Admin user-list endpoint p95: 20.97 ms

These measurements validate the development baseline, not production capacity. Repeat the same
measurement with production-like hosting, data volume, and concurrency before deployment.
