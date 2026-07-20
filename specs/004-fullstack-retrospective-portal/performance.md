# Performance Baseline

## API Data Operations

Measured on 2026-07-21 as a local development baseline. This is not a production capacity or
concurrency result.

### Environment

- Commit: `297d161981dddc914144cf34ad2c31ac8e8c529d`, with the T081-T082 working-tree changes applied
- OS: Microsoft Windows 11 Home Single Language, 64-bit, version 10.0.26200
- Processor: AMD Ryzen 7 7435HS, 8 cores and 16 logical processors
- Memory: 20,648,664 KiB visible (approximately 19.7 GiB)
- SDK: .NET SDK 10.0.301
- Runtime: Microsoft.NETCore.App and Microsoft.AspNetCore.App 8.0.28, x64
- Database: SQL Server 2025 Express LocalDB, 17.0.4025.3, instance `(localdb)\DwpFinals`
- Build mode: Release, no debugger attached
- Browser and Node: not involved in these API measurements; Node v24.14.0 was installed

### Method

- Command: `dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj -c Release --filter "FullyQualifiedName~PerformanceTests" --logger "console;verbosity=detailed"`
- Host: ASP.NET Core `WebApplicationFactory` and its in-process test server
- Persistence: a uniquely named SQL Server LocalDB database deleted, recreated, and upgraded with
  the application EF Core migrations before the test
- Dataset seed: `NormalPerformanceDatasetSeeder`, fixed timestamp `2026-01-01T12:00:00Z` and stable
  entity IDs
- Dataset: 100 games (90 active, 10 archived); 100 users (1 active Admin, 89 active Authors, 10
  inactive Authors); 200 retrospectives (80 Published, 40 Draft, 30 Review, 30 Unpublished, 20
  Archived)
- Additional distribution: retrospective ownership spans 65 Authors, ratings span 1-10, created
  dates span 398 days, and 10 Published retrospectives retain archived-game relationships
- Client pattern: one sequential simulated client, three unrecorded warm-up requests followed by 20
  measured requests for each path
- Timing: elapsed client request time measured with `Stopwatch`; p95 is the 19th value after sorting
  20 samples
- Authentication: game and published-retrospective requests were sent without an Authorization
  header; Author dashboard and Admin users requests used role-appropriate bearer tokens
- Target: p95 below 500 ms for every primary data operation

### Results

| Operation | Path shape | p95 | Result |
|-----------|------------|----:|--------|
| Public game list | `GET /api/games?page=1&pageSize=20` | 5.36 ms | Pass |
| Public game detail | `GET /api/games/{id}` | 3.50 ms | Pass |
| Public retrospectives, newest | `GET /api/retrospectives?...&sort=newest` | 5.21 ms | Pass |
| Public retrospectives, best | `GET /api/retrospectives?...&sort=best` | 6.02 ms | Pass |
| Public retrospectives, game-filtered best | `GET /api/retrospectives?gameId={id}...&sort=best` | 4.70 ms | Pass |
| Public retrospective detail | `GET /api/retrospectives/{id}` | 3.01 ms | Pass |
| Author dashboard | `GET /api/account/retrospectives?...&sort=newest` | 9.09 ms | Pass |
| Admin users | `GET /api/admin/users?page=1&pageSize=20` | 5.64 ms | Pass |

All eight measured API operations passed the 500 ms p95 requirement. The focused test completed
successfully with 1 test passed in 20.3226 seconds; that duration includes build/test-host startup,
migrations, seeding, authentication, warm-ups, measurements, and cleanup, so it is not an endpoint
latency measurement.

## Browser Content Visibility

Not measured by T081-T082. Desktop/mobile primary-content visibility remains the separate T091
validation scope and no browser timing claim is made here.
