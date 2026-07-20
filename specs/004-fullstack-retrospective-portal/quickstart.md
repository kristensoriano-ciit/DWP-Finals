# Quickstart: Full-Stack Retrospective Portal

This guide validates the complete local portal. It does not define a production hosting provider.
Run commands from the stated working directory and keep all credentials out of tracked files.

## Prerequisites

- Windows with SQL Server LocalDB and a named `DwpFinals` instance.
- A .NET SDK capable of building the `net8.0` projects.
- Node.js supported by Vite 8 and npm.
- A trusted ASP.NET Core development HTTPS certificate.
- Current migrations and the repository package lock file.

Check the tools from the repository root:

```powershell
dotnet --info
node --version
npm --version
dotnet dev-certs https --trust
SqlLocalDB start DwpFinals
```

## Configure the Backend

From `dotnet-backend/dotnet-backend`, store development secrets outside tracked settings:

```powershell
dotnet user-secrets set "Jwt:Key" "<random-development-key-at-least-32-characters>"
dotnet user-secrets set "AdminSeed:Email" "<development-admin-email>"
dotnet user-secrets set "AdminSeed:Password" "<development-admin-password>"
dotnet user-secrets set "AdminSeed:DisplayName" "Development Admin"
```

The development database connection already targets `(localdb)\DwpFinals`. Override it with user
secrets when a different local database is required:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=(localdb)\DwpFinals;Database=DwpFinals;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
```

Never put the JWT key, database credential, or Admin password in `appsettings*.json` or a frontend
environment file.

## Apply Migrations

From `dotnet-backend/dotnet-backend`:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet restore
dotnet tool restore
dotnet tool run dotnet-ef database update --project dotnet-backend.csproj --startup-project dotnet-backend.csproj
```

Feature 004 adds no migration. This applies the existing account, game, and retrospective schema.

## Configure the Frontend

After implementation, copy `react-frontend/.env.example` to an untracked
`react-frontend/.env.local`. Its local value is:

```dotenv
VITE_API_BASE_URL=https://localhost:7047
```

This URL is public browser configuration, not a secret. The API CORS allow-list must include the
exact frontend origin. Development uses `http://localhost:5173`; local preview uses
`http://localhost:4173` when explicitly added to the backend configuration for that run.

## Start Both Applications

In one terminal, from `dotnet-backend/dotnet-backend`:

```powershell
dotnet run --launch-profile https
```

Expected API and documentation addresses:

```text
https://localhost:7047
https://localhost:7047/swagger
```

In a second terminal, from `react-frontend`:

```powershell
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Open `http://localhost:5173`.

## Prepare Demonstration Data

1. Sign in with the configured Development Admin.
2. Create at least two active games and one future game from Admin game management.
3. Register a separate Author account through the public registration page.
4. Sign in as the Author and create retrospectives in Draft, Review, Published, and Unpublished.
5. Give at least two published retrospectives different ratings so newest and best order can differ.
6. Archive one game only after publishing a retrospective about it to verify retained attribution.

No tracked default password or automatic production data seeder is introduced.

## P1 Public Discovery Validation

While signed out, verify:

1. Home reuses the newest result as the featured retrospective and shows bounded newest and best
   selections.
2. Games can be searched and filtered without authentication.
3. Active game detail shows game information and a bounded related-retrospective section.
4. Archived games return Not Found, while their retained published retrospective remains readable.
5. Retrospectives support search, game filtering, newest/best sorting, pagination, and empty results.
6. Draft, Review, Unpublished, and Archived retrospectives never appear publicly.
7. Direct route entry, refresh, browser back, and browser forward reconstruct the current route and
   query.
8. Missing, HTTP, malformed, and failed HTTPS images show the labeled fallback without layout shift.

Anonymous API smoke checks can be run from PowerShell:

```powershell
Invoke-RestMethod "https://localhost:7047/api/games?page=1&pageSize=20"
Invoke-RestMethod "https://localhost:7047/api/retrospectives?sort=newest&page=1&pageSize=20"
```

Neither request should need an Authorization header.

## Account and Role Validation

1. Register an Author, sign in, refresh a protected page, and confirm the session restores before the
   page decides access.
2. Enter invalid credentials and confirm the response does not reveal whether an email exists.
3. Update display name/email and confirm navigation reflects the returned profile.
4. Change the password and confirm the session ends immediately.
5. Open an Author route as Admin and an Admin route as Author; each must show Forbidden without
   treating the current session as anonymous.
6. Let or force a session to expire during a protected request; the site must clear it and offer Sign
   in with a safe return path. When this happens in the Retrospective editor, its safe draft must be
   temporarily stored, restored after sign-in, and removed after restoration or explicit discard.

## Author Lifecycle and Conflict Validation

1. Create a Draft for an active game and confirm it appears only in the owner dashboard.
2. Edit the title, content, game, image URL, and rating and verify the returned row version replaces
   the previous one.
3. Publish directly and verify immediate public visibility.
4. Unpublish without a reason and confirm validation; then provide a reason and confirm public
   removal.
5. Open the same Retrospective in two browser tabs, save in the first, then save stale content in the
   second. The second tab must preserve its draft and present conflict recovery without overwriting
   the first save.
6. Attempt to leave a dirty editor and confirm both in-app and browser navigation warnings.
7. Archive after confirmation and confirm the item cannot be reopened for owner editing.

## Admin Validation

1. Create, search, edit, and archive a game as Admin.
2. Attempt the same mutations while signed out and as Author; the backend must deny them.
3. Browse users, cancel one deactivation, then confirm another user's deactivation.
4. Confirm the deactivated user's current session stops working.
5. Attempt Admin self-deactivation and confirm it is prevented.

## Accessibility and Responsive Validation

Run the primary public, account, Author, and Admin journeys using only a keyboard at widths 320, 768,
and 1280 CSS pixels. Confirm:

- The mobile menu exposes every permitted navigation destination.
- Focus remains visible and follows a logical order.
- Every form control has a visible label and associated feedback.
- Error summaries and asynchronous success/failure messages are announced.
- Dialogs identify the affected resource, contain focus while open, close with cancellation, and
  restore focus to their trigger.
- Status, rating, role, error, and disabled behavior do not depend on color alone.
- No primary route requires horizontal page scrolling.

## Automated Validation

From `dotnet-backend`:

```powershell
dotnet restore dotnet-backend.Tests/dotnet-backend.Tests.csproj
dotnet format dotnet-backend/dotnet-backend.csproj --verify-no-changes
dotnet format dotnet-backend.Tests/dotnet-backend.Tests.csproj --verify-no-changes
dotnet build dotnet-backend.Tests/dotnet-backend.Tests.csproj --no-restore
dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --no-build
```

From `dotnet-backend/dotnet-backend`:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet tool run dotnet-ef migrations has-pending-model-changes --project dotnet-backend.csproj --startup-project dotnet-backend.csproj
```

From `react-frontend` after the planned test setup is implemented:

```powershell
npm ci
npm run lint
npm run test -- --run
npm run build
```

From the repository root:

```powershell
npx --yes @redocly/cli lint specs/004-fullstack-retrospective-portal/contracts/portal-api.yaml
npx --yes @redocly/cli lint specs/002-game-management/contracts/games-api.yaml
```

## Performance Validation

Use the deterministic dataset defined in [data-model.md](./data-model.md): 100 games, 200
retrospectives, and 100 users. Use migration-backed SQL Server with no debugger attached.

1. Warm each measured path with three unrecorded requests.
2. Record at least 20 sequential samples for public game list/detail, public retrospective
   newest/best/filter/detail, Author dashboard, and Admin user list.
3. Record at least 20 home and primary-page visits at desktop and mobile widths.
4. Record OS, processor, memory, SDK/runtime, Node/browser, SQL Server version, build mode, dataset
   seed, and commit.
5. Confirm primary data operations remain below 500 ms p95 and primary content below 2.5 seconds p95.

The result is a local development baseline, not a production capacity claim.

## Local Production Build Preview

From `react-frontend`:

```powershell
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

For this preview only, add `http://localhost:4173` to the API CORS allow-list before starting the API.
A real deployment must additionally provide HTTPS, a production SQL Server, explicit migration and
rollback procedures, secret storage, exact CORS origins, and SPA history fallback to `index.html`.
Provider-specific deployment is outside feature 004.

## Automated Browser Validation

After the Playwright tasks are implemented, use only the isolated `DwpFinalsE2E` database. The
provisioning command refuses every other database name.

Set temporary values in the current PowerShell session from the repository root:

```powershell
$env:E2E_CONNECTION_STRING = "Server=(localdb)\DwpFinals;Database=DwpFinalsE2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
$env:E2E_JWT_KEY = "<temporary-e2e-key-at-least-32-characters>"
$env:E2E_PASSWORD = "<temporary-complex-e2e-password>"
$env:E2E_ALLOW_DATABASE_RESET = "YES"
```

Prepare dependencies and Chromium:

```powershell
cd react-frontend
npm ci
npx playwright install chromium
```

Run the deterministic end-to-end and accessibility suite:

```powershell
npm run test:e2e
```

Expected outcomes:

- The guarded E2E utility accepts only `(localdb)\DwpFinals`, `DwpFinalsE2E`, and explicit reset opt-in.
- The clean-setup project starts empty, validates environment-driven Admin preparation, and creates
  demonstration data through the UI before deterministic reseeding.
- The journey API starts at `https://localhost:7047` with Admin seeding disabled.
- The production frontend preview starts at `http://localhost:4173`.
- Visitor, account, Author, Admin Game, and Admin User journeys pass in separate contexts.
- Axe, keyboard, focus, reduced-motion, image fallback, and overflow checks pass at 320, 768, and
  1280 CSS pixels.
- Anonymous failures retain traces and screenshots under ignored Playwright artifact directories;
  authenticated projects suppress traces/video to avoid recording bearer headers or form values.

Run the isolated browser performance suite from `react-frontend`:

```powershell
npm run test:e2e:performance
```

The performance command reseeds before measurement, warms each route three times, records 20 visits
per route at 320px and 1280px, writes raw samples to
`react-frontend/test-results/performance-results.json`, and fails if any route p95 is 2.5 seconds or
more. Record the authoritative local result in `performance.md`; hosted CI timing is regression
evidence only.

Generated directories that must remain untracked:

```text
react-frontend/playwright-report/
react-frontend/test-results/
react-frontend/blob-report/
```

The detailed route, accessibility, and timing requirements are defined in
[contracts/browser-validation.md](./contracts/browser-validation.md).
