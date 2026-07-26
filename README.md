# Checkpoint Retrospective Portal

Checkpoint is a full-stack game retrospective portal. Visitors browse active Games and published
Retrospectives, Authors manage and publish their own work, and Admins manage the Game catalog and
user access.

The repository contains an ASP.NET Core 8 API in `dotnet-backend/dotnet-backend/`, xUnit tests in
`dotnet-backend/dotnet-backend.Tests/`, a guarded browser-test provisioner in
`dotnet-backend/dotnet-backend.E2E/`, and a React 19/Vite SPA with Playwright tests in
`react-frontend/`.

## Documentation

- [Full-stack architecture](docs/fullstack-architecture.md)
- [ERD to physical schema mapping](docs/erd-schema-mapping.md)
- [Complete local setup and validation](specs/004-fullstack-retrospective-portal/quickstart.md)
- [Frontend setup, scripts, and routes](react-frontend/README.md)
- [Frontend route contract](specs/004-fullstack-retrospective-portal/contracts/frontend-routes.md)
- [Authorization matrix](specs/004-fullstack-retrospective-portal/contracts/authorization-matrix.md)
- [Portal API contract](specs/004-fullstack-retrospective-portal/contracts/portal-api.yaml)
- [Accessibility validation](specs/004-fullstack-retrospective-portal/accessibility-validation.md)
- [Performance baseline](specs/004-fullstack-retrospective-portal/performance.md)

## Prerequisites

- .NET SDK capable of building the `net8.0` projects
- Node.js supported by Vite 8 and npm
- SQL Server LocalDB with a named `DwpFinals` instance for the documented Windows setup
- Trusted ASP.NET Core development HTTPS certificate

## Configuration Matrix

Use .NET User Secrets for local secrets and the deployment platform's configuration/secret store in
production. ASP.NET Core environment-variable names replace `:` with `__`; array entries use numeric
indexes. Only `VITE_API_BASE_URL` is sent to the browser, and it must never contain a secret.

| Setting | Secret? | Development value/source | Production requirement |
|---------|---------|--------------------------|------------------------|
| `ConnectionStrings:DefaultConnection` / `ConnectionStrings__DefaultConnection` | Yes when it contains credentials | `appsettings.Development.json` targets `(localdb)\DwpFinals`; override with User Secrets | Secret-store SQL Server connection string, for example `<production-sql-connection-string>` |
| `Jwt:Key` / `Jwt__Key` | Yes | User Secret containing at least 32 random characters | Rotatable high-entropy secret from the platform secret store; never a tracked placeholder value |
| `Jwt:Issuer` / `Jwt__Issuer` | No | `DwpFinals.Api` from `appsettings.json` | Stable deployment identifier such as `<production-api-issuer>` |
| `Jwt:Audience` / `Jwt__Audience` | No | `DwpFinals.ReactClient` from `appsettings.json` | Intended client identifier such as `<production-portal-audience>` |
| `Jwt:AccessTokenMinutes` / `Jwt__AccessTokenMinutes` | No | `60` | Explicit positive lifetime approved for the environment, for example `<production-token-minutes>` |
| `Cors:AllowedOrigins:0` / `Cors__AllowedOrigins__0` | No | `http://localhost:5173` | Exact HTTPS SPA origin, for example `https://<portal-host>`; add indexed entries for every allowed origin |
| `Cors:AllowedOrigins:1` / `Cors__AllowedOrigins__1` | No | Add `http://localhost:4173` only while running local preview | Omit unless a second exact HTTPS frontend origin is required |
| `AdminSeed:Enabled` / `AdminSeed__Enabled` | No | `true` in Development; creates roles and optionally the configured Admin | `false`; use a controlled production account-provisioning process |
| `AdminSeed:Email` / `AdminSeed__Email` | Sensitive account data | User Secret such as `<development-admin-email>` | Unset when seeding is disabled; otherwise secret-store `<bootstrap-admin-email>` |
| `AdminSeed:Password` / `AdminSeed__Password` | Yes | User Secret such as `<development-admin-password>` | Unset when seeding is disabled; never retain a bootstrap password in tracked configuration |
| `AdminSeed:DisplayName` / `AdminSeed__DisplayName` | No | `Development Admin` | Unset when seeding is disabled, or `<bootstrap-admin-display-name>` for a controlled bootstrap |
| `VITE_API_BASE_URL` | No, public build-time value | `https://localhost:7047` in `react-frontend/.env.local` | Public HTTPS API origin such as `https://<api-host>`; rebuild the SPA when it changes |

The backend fails startup when the database connection, JWT key, issuer, or audience is absent or
invalid. Admin seed credentials are read only when seeding is enabled. Never place the JWT key,
database credentials, or Admin password in `appsettings*.json`, `.env*`, or any `VITE_*` value.

## Local Setup

From `dotnet-backend/dotnet-backend`:

```powershell
dotnet user-secrets set "Jwt:Key" "<random-development-key-at-least-32-characters>"
dotnet user-secrets set "AdminSeed:Email" "<development-admin-email>"
dotnet user-secrets set "AdminSeed:Password" "<development-admin-password>"
dotnet user-secrets set "AdminSeed:DisplayName" "Development Admin"
dotnet restore
dotnet tool restore
dotnet tool run dotnet-ef database update
dotnet run --launch-profile https
```

Create untracked `react-frontend/.env.local` with:

```dotenv
VITE_API_BASE_URL=https://localhost:7047
```

Then, from `react-frontend`:

```powershell
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Open `http://localhost:5173`. The API runs at `https://localhost:7047`; Development Swagger is at
`https://localhost:7047/swagger`. Follow the [feature quickstart](specs/004-fullstack-retrospective-portal/quickstart.md)
for LocalDB startup, demonstration data, role journeys, and production preview.

## Scripts and Tests

Backend commands run from `dotnet-backend/`:

```powershell
dotnet format dotnet-backend/dotnet-backend.csproj --verify-no-changes
dotnet build dotnet-backend.Tests/dotnet-backend.Tests.csproj
dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj
```

Frontend commands run from `react-frontend/`:

```powershell
npm run dev
npm run lint
npm run test -- --run
npm run build
npm run test:e2e
npm run test:e2e:performance
npm run preview
```

Frontend tests are colocated with their API modules, guards, hooks, components, and pages. Backend
tests include service and migration-backed API integration coverage. Detailed validation, OpenAPI
lint, and pending-migration commands are in the [quickstart](specs/004-fullstack-retrospective-portal/quickstart.md#automated-validation).

The Playwright commands build the Release API and production frontend preview, reset only the
guarded `DwpFinalsE2E` LocalDB database, and run serial Chromium projects. Configure the temporary
values documented in the
[browser-validation quickstart](specs/004-fullstack-retrospective-portal/quickstart.md#automated-browser-validation)
before running them. `.github/workflows/e2e.yml` performs the same flow on Windows with credentials
generated for that job and uploads generated reports, results, and failure diagnostics as a
short-lived artifact; runtime secrets are never committed or uploaded.

## Route Guidance

Public routes are `/`, `/games`, `/games/:gameId`, `/retrospectives`,
`/retrospectives/:retrospectiveId`, `/login`, and `/register`. Authenticated account routes are
`/account` and `/account/password`. Authors use `/dashboard/retrospectives`, its dedicated
`/dashboard/retrospectives/unpublished` reason view, and its new/edit routes. Admins use `/admin`,
`/admin/games` and its new/edit routes, and `/admin/users`. Both role landing pages display New
Releases, Upcoming Releases, and Best Retrospectives while keeping management permissions separate.

Route guards improve navigation but the API remains the authorization boundary. A production static
host must fall back to `index.html` for direct SPA route entry. See the
[route contract](specs/004-fullstack-retrospective-portal/contracts/frontend-routes.md) for access,
query-state, and failure-state requirements.
