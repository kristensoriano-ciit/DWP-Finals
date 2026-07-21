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

Measured on 2026-07-21 from commit `aae6c77` with the follow-up browser-validation worktree applied.
This is a local primary-content baseline, not a production capacity or network-latency claim.

### Environment and Method

- Node: v24.14.0
- Browser: Chromium 149.0.7827.55
- Build mode: ASP.NET Core Release API and Vite production preview
- Machine: Windows x64 with 16 logical processors
- Database: SQL Server LocalDB `(localdb)\DwpFinals`, isolated database `DwpFinalsE2E`
- Dataset: exactly 100 games (90 active, 10 archived), 100 users (1 active Admin, 89 active Authors,
  10 inactive Authors), and 200 retrospectives (80 Published, 40 Draft, 30 Review, 30 Unpublished,
  20 Archived)
- Dataset distribution: ownership across 65 Authors, ratings from 1 through 10, created dates across
  398 days, and 10 Published retrospectives retaining archived-game relationships
- Sampling: three unrecorded warmups followed by 20 sequential samples for each route/viewport pair
- Viewports: 320x900 and 1280x900 CSS pixels
- Timing boundary: navigation start through visible API-backed primary content, with runtime console,
  page, request, and HTTP failures treated as test failures
- Requirement: every route/viewport p95 below 2,500 ms

The ignored source artifact was `react-frontend/test-results/performance-results.json`. It remains
untracked because it contains raw samples; this record intentionally includes only reproducible
method details and summarized p95 evidence.

### Results

| Route | 320px p95 | 1280px p95 | Result |
|-------|----------:|-----------:|--------|
| Home | 90.95 ms | 67.99 ms | Pass |
| Games | 67.62 ms | 62.78 ms | Pass |
| Retrospectives | 80.93 ms | 73.27 ms | Pass |
| Author dashboard | 93.50 ms | 97.45 ms | Pass |
| Admin Games | 89.38 ms | 94.92 ms | Pass |
| Admin Users | 89.36 ms | 86.50 ms | Pass |

All 12 route/viewport measurements passed. The aggregate p95 across the 240 recorded samples was
92.69 ms, and the maximum route/viewport p95 was 97.45 ms (Author dashboard at 1280px).
