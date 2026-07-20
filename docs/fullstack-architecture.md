# Full-Stack Architecture

Checkpoint is a two-project web application: an ASP.NET Core JSON API and a React single-page
application (SPA). The API is the business-rule, persistence, authentication, and authorization
boundary. The SPA owns browser navigation, user interaction, and presentation, but never replaces
server-side validation or authorization.

## Repository Layout

| Path | Responsibility |
|------|----------------|
| `dotnet-backend/dotnet-backend/` | ASP.NET Core API, services, EF Core context, models, migrations, and development identity seeding |
| `dotnet-backend/dotnet-backend.Tests/` | xUnit service, API integration, OpenAPI, CORS, and performance tests |
| `react-frontend/src/` | React pages, components, routing, session handling, typed API modules, and colocated Vitest tests |
| `specs/` | Feature requirements, API/route contracts, quickstarts, and validation records |
| `docs/` | Cross-feature architecture and supporting diagrams |
| `.opencode/` | Local agent, skill, and repeatable command definitions |

The projects remain at these paths; `apps/` is not the application root.

## Request Flow

```text
Browser route/page
  -> domain API module
  -> shared fetch boundary
  -> HTTPS + JSON / Problem Details
  -> ASP.NET Core controller
  -> injected domain service
  -> EF Core ApplicationDbContext
  -> SQL Server
```

Responses travel back through the same boundary. Pages convert typed success or `ApiError` results
into loading, empty, validation, access, conflict, not-found, and retry states. Controllers translate
HTTP input and service results; services own validation, lifecycle, ownership, concurrency, and data
access rules.

## Backend Boundaries

- `Controllers/` is the HTTP boundary. Controllers bind requests, identify the caller, invoke one
  injected service, and map outcomes to JSON, Problem Details, and HTTP status codes.
- `Services/` owns account, game, and Retrospective business rules and asynchronous EF Core access.
  `IUserAccountService`, `IGameService`, and `IRetrospectiveService` are the controller seams.
- `Contracts/` contains external request and response shapes. API clients must depend on these
  shapes rather than EF Core entities.
- `Data/ApplicationDbContext.cs` and `Migrations/` own SQL Server persistence. Controllers do not
  query the context directly.
- `Models/` contains persisted entities. Retrospective row versions provide client-supplied stale-write
  protection; the Game row version is an internal EF Core concurrency token and is not exposed to or
  accepted from clients.
- `Program.cs` is the composition root for configuration, Identity, JWT bearer authentication,
  role policies, CORS, rate limiting, JSON, Swagger, services, and middleware order.

Public reads are deliberately narrow: active Games and published, non-archived Retrospectives are
anonymous. Account operations require an active JWT; Author operations also enforce ownership;
Admin operations are limited to Game and user administration. Admin is not an Author override.

## Frontend Boundaries

- `src/pages/` owns route-level loading and orchestration. Public, account, Author, and Admin pages
  call API modules and compose focused components.
- `src/api/http.ts` is the only generic transport boundary. It validates `VITE_API_BASE_URL`, sends
  JSON with optional bearer authentication, parses JSON/204 responses, normalizes Problem Details,
  and reports authenticated 401 responses to the session owner.
- `src/api/authApi.ts`, `gamesApi.ts`, `retrospectivesApi.ts`, and `usersApi.ts` own endpoint paths,
  query serialization, and typed requests for their domains.
- `src/auth/SessionProvider.tsx` owns browser session state. Route guards consume that state but do
  not grant server permissions.
- `src/components/` owns reusable presentation, forms, feedback, navigation, pagination, images, and
  confirmation behavior. Components do not duplicate domain authorization.
- `src/hooks/` owns the focused unsaved-change warning and temporary session-expiry draft recovery.
- Tests are colocated with the API module, guard, hook, component, or page they exercise. Shared test
  setup lives in `src/test/`.

## Session Boundary

The login response supplies an access token, expiry, and current user. The SPA stores only the token
and expiry in `sessionStorage` (`checkpoint.accessToken` and `checkpoint.expiresAtUtc`), so closing
the browser tab ends that browser session. On refresh, `SessionProvider` checks the expiry and calls
`GET /api/account/me` before protected routes decide access.

The API validates issuer, audience, signature, lifetime, active account state, and the token's
`auth_version` on every protected request. Password changes and deactivation invalidate already
issued tokens by changing server-side account state/version. A protected 401 clears browser session
state; a 403 preserves the valid session and displays Forbidden. There is no refresh token.

Retrospective text may be placed temporarily in resource-keyed `sessionStorage` only to recover from
session expiry. It is validated before restoration and removed after restoration or explicit
discard. Passwords and backend secrets are never browser configuration.

## Routing Boundary

`src/router.tsx` defines browser routes under `SiteLayout`. Public routes are available immediately;
`RequireSession` waits for restoration and redirects anonymous users to login with a validated local
return path; `RequireRole` sends authenticated users with the wrong role to `/forbidden`.

Search, filter, sort, status, and page state belongs in the URL so direct entry, refresh, sharing,
back, and forward reproduce the view. Production SPA hosting must return `index.html` for unknown
non-file browser paths. The complete route and state contract is in
[`specs/004-fullstack-retrospective-portal/contracts/frontend-routes.md`](../specs/004-fullstack-retrospective-portal/contracts/frontend-routes.md).

## Security Boundary

- TLS is required outside local HTTP frontend development. External content images are HTTPS-only.
- JWT keys, database credentials, and Admin seed credentials belong in User Secrets locally and a
  deployment secret store in production. They must not enter Git or `VITE_*` variables.
- CORS is an exact API allow-list of browser origins, not an authentication mechanism. Each deployed
  frontend origin must be configured explicitly; wildcards and credential-bearing origins are not
  used.
- Backend policies and ownership checks are authoritative. Hidden links and route guards improve UX
  only.
- Login is rate-limited. Validation and failures use bounded, non-sensitive Problem Details.
- Collection endpoints cap `pageSize` at 100, and public projections exclude owner-only workflow
  data.

The capability-level rules are recorded in the
[`authorization matrix`](../specs/004-fullstack-retrospective-portal/contracts/authorization-matrix.md).

## Deployment Boundary

Feature 004 defines local development and local production-preview behavior, not a hosting provider.
The API and SPA may be deployed separately if these contracts are preserved:

1. The API receives a production SQL Server connection string, a random JWT signing key of at least
   32 characters, issuer, audience, token lifetime, and exact frontend CORS origins from deployment
   configuration.
2. Admin seeding is disabled in production. Any trusted bootstrap process must use protected,
   environment-specific credentials and be removed or disabled after use.
3. The SPA is built with the public HTTPS API origin in `VITE_API_BASE_URL`; Vite embeds this value at
   build time, so changing it requires a new frontend build.
4. The API host terminates HTTPS and applies migrations through an explicit release/rollback process.
5. The static SPA host serves generated `dist/` assets, applies history fallback to `index.html`, and
   does not expose source configuration or secrets.
6. Swagger is available only in Development and Testing under the current composition root.

See the root [`README.md`](../README.md) for configuration and setup, and the feature
[`quickstart`](../specs/004-fullstack-retrospective-portal/quickstart.md) for complete local journeys
and validation commands.
