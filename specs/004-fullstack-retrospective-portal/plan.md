# Implementation Plan: Full-Stack Retrospective Portal

**Branch**: `004-fullstack-retrospective-portal` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-fullstack-retrospective-portal/spec.md`

## Summary

Turn the existing Checkpoint visual prototype into a routed full-stack portal that consumes the
implemented account, game, and retrospective capabilities. Public visitors will browse active games
and published retrospectives; authenticated Authors will manage and directly publish their own
retrospectives; authenticated Admins will manage games and user access. The backend change is limited
to making active-game list and detail reads anonymous while retaining existing service filtering and
Admin-only mutations. The frontend will use a small typed fetch boundary, session context, focused
route guards, pages, components, and hooks. Existing row-version behavior will protect Author edits.

## Technical Context

**Language/Version**: C# 12 targeting .NET 8; TypeScript 6.0 and React 19

**Primary Dependencies**: ASP.NET Core controllers, ASP.NET Core Identity, Entity Framework Core 8,
SQL Server provider, JWT bearer authentication, React Router, native Fetch API, Vite 8, Playwright
for Chromium, and Axe for automated accessibility checks

**Storage**: Existing SQL Server database through Entity Framework Core; browser `sessionStorage`
for the access token, expiry, and a temporary resource-keyed Retrospective draft only during
session-expiry recovery; no schema migration

**Testing**: xUnit with ASP.NET Core integration testing and migration-backed SQL Server; Vitest,
jsdom, React Testing Library, user-event, and jest-dom for focused frontend behavior; Playwright
against an isolated migration-backed `DwpFinalsE2E` database for Chromium journeys, keyboard,
responsive, Axe, and primary-content timing validation

**Target Platform**: ASP.NET Core service on Windows development hosts and current mainstream
desktop/mobile browsers; local development uses `https://localhost:7047` and
`http://localhost:5173`, while browser validation uses the production frontend preview at
`http://localhost:4173`

**Project Type**: Web application with an ASP.NET Core JSON backend and React single-page frontend

**Performance Goals**: Primary data operations below 500 ms p95 and primary page content visible
within 2.5 seconds p95 under the specification's 100-game, 200-retrospective, 100-user conditions

**Constraints**: Maximum page size 100; anonymous responses must not expose owner-only data; backend
remains the authorization boundary; no refresh token, media upload, comments, or editorial approval;
unsaved Author text must survive network, authentication, and concurrency failures; browser suites
run serially against only the guarded `DwpFinalsE2E` database and never reset developer data

**Scale/Scope**: Five independently testable user stories, approximately 15 application routes,
three existing domain entities, two existing roles, one backend authorization adjustment, and no
new persistence entity

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- **Code boundaries — PASS**: `GamesController` owns the public-read HTTP authorization adjustment
  while the existing `GameService` retains filtering rules. Frontend route pages own orchestration,
  domain API modules own requests, `SessionProvider` owns session restoration, and focused
  components/hooks own reusable UI behavior. No repository, generic state store, or duplicate domain
  layer is introduced.
- **Testing — PASS**: Backend integration tests cover anonymous reads, protected mutations, CORS,
  OpenAPI security, and measured query journeys. Frontend component tests cover the HTTP boundary,
  session restoration, route guards, mobile/role navigation, forms, query controls, conflicts,
  confirmations, and image fallback. Playwright validates complete role journeys against the real
  local boundary. Existing backend service tests continue to cover domain validation and ownership.
- **User experience — PASS**: The route contract defines loading, empty, success, validation,
  unauthenticated, forbidden, not-found, conflict, and unexpected-error states. Semantic controls,
  live status feedback, visible focus, keyboard operation, image fallbacks, and 320/768/1280-pixel
  checks are required while preserving the Checkpoint design.
- **Performance — DESIGN COMPLETE, EXECUTION PENDING**: Backend journeys are measured after warm-up
  against the documented normal dataset. A separate Playwright suite resets and reseeds the same
  distribution, warms each desktop/mobile route three times, records 20 sequential primary-content
  samples, fails any route at or above 2.5 seconds p95, and writes raw JSON plus the feature performance
  record.
  URL-owned filters, bounded requests, request cancellation, and reuse of the newest response for
  the featured item prevent duplicate or unbounded work.
- **Small delivery slice — PASS**: Delivery follows public discovery, account access, Author tools,
  Admin games, then Admin users. Native fetch and controlled forms are used directly. React Router
  owns application navigation; Playwright and Axe are justified by the three remaining explicit
  real-browser validation tasks and remain test-only dependencies.

### Post-Design Re-check

The research, data model, API delta contract, route/browser contracts, and quickstart preserve the
boundaries above. The E2E reset command requires the approved LocalDB instance, exact
`DwpFinalsE2E` database, and an explicit destructive-test opt-in; secrets remain environment-only,
role contexts are isolated, and generated browser artifacts are ignored. There are no feature-level
constitution violations or unresolved clarifications. The pre-existing constitution ratification
date TODO is a governance follow-up outside feature 004. Production hosting remains outside scope.

## Project Structure

### Documentation (this feature)

```text
specs/004-fullstack-retrospective-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── accessibility-validation.md
├── contracts/
│   ├── portal-api.yaml
│   ├── authorization-matrix.md
│   ├── browser-validation.md
│   └── frontend-routes.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
dotnet-backend/
├── dotnet-backend/
│   ├── Controllers/
│   │   └── GamesController.cs
│   └── Program.cs
├── dotnet-backend.Tests/
    ├── GamesApiTests.cs
    ├── OpenApiContractTests.cs
    ├── CorsApiTests.cs
    ├── PerformanceTests.cs
    └── Infrastructure/
        └── NormalPerformanceDatasetSeeder.cs
└── dotnet-backend.E2E/
    ├── dotnet-backend.E2E.csproj
    ├── Program.cs
    └── NormalPerformanceDatasetSeeder.cs

react-frontend/
├── .env.example
├── e2e/
│   ├── accessibility.spec.ts
│   ├── fixtures.ts
│   ├── helpers.ts
│   ├── journeys.spec.ts
│   └── performance.spec.ts
├── playwright.config.ts
├── scripts/
│   └── run-e2e.ps1
├── src/
│   ├── api/
│   │   ├── http.ts
│   │   ├── authApi.ts
│   │   ├── gamesApi.ts
│   │   ├── retrospectivesApi.ts
│   │   ├── usersApi.ts
│   │   └── types.ts
│   ├── auth/
│   │   ├── SessionProvider.tsx
│   │   ├── RequireSession.tsx
│   │   ├── RequireRole.tsx
│   │   └── useSession.ts
│   ├── components/
│   │   ├── admin/
│   │   ├── feedback/
│   │   ├── forms/
│   │   ├── games/
│   │   ├── layout/
│   │   └── retrospectives/
│   ├── hooks/
│   │   ├── useSessionDraft.ts
│   │   └── useUnsavedChanges.ts
│   ├── pages/
│   │   ├── account/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── author/
│   │   └── public/
│   ├── test/
│   │   ├── setup.ts
│   │   └── renderWithRouter.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── App.css
│   └── index.css
├── package.json
└── vite.config.ts

.github/workflows/
└── e2e.yml

docs/
└── fullstack-architecture.md

README.md
```

Frontend tests are colocated with the component, page, hook, or API module that owns the tested
behavior. Existing backend contracts under `specs/001-*`, `specs/002-*`, and `specs/003-*` remain
the authoritative complete endpoint contracts; feature 004 records only its API security delta and
frontend route contract.

**Structure Decision**: Keep the repository's existing application layout instead of moving code to
the currently empty `apps/` directory. Add one test-only .NET provisioning utility because an
external browser cannot use the in-process `WebApplicationFactory` database and public APIs cannot
create the exact inactive/lifecycle dataset safely. Add one flat Playwright directory without page
objects or a second frontend architecture. Product source remains unchanged unless browser tests
expose a real defect.
