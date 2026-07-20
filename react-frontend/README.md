# Checkpoint React Frontend

This React 19 and Vite 8 SPA is the browser client for the Checkpoint Retrospective Portal. It
provides public discovery, account management, Author publishing, and Admin management routes while
the ASP.NET Core API remains the authentication, authorization, validation, and persistence boundary.

## Setup

Complete the [repository setup](../README.md#local-setup) and start the API at
`https://localhost:7047`. Create an untracked `.env.local` in this directory:

```dotenv
VITE_API_BASE_URL=https://localhost:7047
```

Install and run from `react-frontend/`:

```powershell
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Open `http://localhost:5173`. The backend CORS allow-list must contain that exact origin.

## Configuration

| Setting | Secret? | Development/preview | Production |
|---------|---------|---------------------|------------|
| Backend `ConnectionStrings:DefaultConnection` | Yes when credentialed | LocalDB default or User Secret | Secret-store `<production-sql-connection-string>` |
| Backend `Jwt:Key` | Yes | User Secret with at least 32 random characters | Rotatable platform secret |
| Backend `Jwt:Issuer` | No | `DwpFinals.Api` | `<production-api-issuer>` |
| Backend `Jwt:Audience` | No | `DwpFinals.ReactClient` | `<production-portal-audience>` |
| Backend `Jwt:AccessTokenMinutes` | No | `60` | Explicit approved `<production-token-minutes>` |
| Backend `Cors:AllowedOrigins:0` | No | `http://localhost:5173` | Exact `https://<portal-host>` origin |
| Backend `Cors:AllowedOrigins:1` | No | Add `http://localhost:4173` only for preview | Omit unless another exact HTTPS origin is required |
| Backend `AdminSeed:Enabled` | No | `true` in Development | `false` |
| Backend `AdminSeed:Email` | Sensitive account data | User Secret `<development-admin-email>` | Unset when seeding is disabled |
| Backend `AdminSeed:Password` | Yes | User Secret `<development-admin-password>` | Unset when seeding is disabled |
| Backend `AdminSeed:DisplayName` | No | `Development Admin` | Unset when seeding is disabled |
| `VITE_API_BASE_URL` | No, public build-time value | `https://localhost:7047` | `https://<api-host>` |

`VITE_API_BASE_URL` is required and must be an absolute origin. Vite embeds it into browser assets,
so changing it requires a rebuild. Never place a database connection, JWT key, Admin credential, or
other secret in `.env*` or any `VITE_*` setting. ASP.NET Core environment-variable names replace
`:` with `__`, and array indexes become `__0`, `__1`, and so on. The detailed matrix and secret setup
commands are in the [root README](../README.md#configuration-matrix).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint across the frontend |
| `npm run test -- --run` | Run the Vitest suite once |
| `npm run test` | Run Vitest in watch mode |
| `npm run build` | Type-check and create `dist/` production assets |
| `npm run preview` | Serve the production build locally |

Tests use Vitest, jsdom, React Testing Library, user-event, and jest-dom. They are colocated as
`*.test.ts` or `*.test.tsx` beside the API module, auth guard, hook, component, or page under test;
shared setup is in `src/test/setup.ts`.

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Featured, newest, and best published Retrospectives |
| `/games`, `/games/:gameId` | Public | Browse active Games and related published Retrospectives |
| `/retrospectives`, `/retrospectives/:retrospectiveId` | Public | Browse and read published Retrospectives |
| `/login`, `/register` | Anonymous preferred | Account access |
| `/account`, `/account/password` | Authenticated | Profile and password management |
| `/dashboard/retrospectives` | Author | Browse owned Retrospectives |
| `/dashboard/retrospectives/new` | Author | Create a Retrospective |
| `/dashboard/retrospectives/:retrospectiveId/edit` | Owning Author | Edit and manage lifecycle |
| `/admin` | Admin | Administration overview |
| `/admin/games`, `/admin/games/new`, `/admin/games/:gameId/edit` | Admin | Game management |
| `/admin/users` | Admin | User access management |
| `/forbidden`, unmatched routes | Public | Access-denied and not-found recovery |

List filters, sorting, status, and pagination are URL-owned. `RequireSession` restores or redirects
the browser session, and `RequireRole` handles role navigation; neither replaces API authorization.
Production hosting must serve `index.html` for unknown non-file paths so direct links and refreshes
work. See the [route contract](../specs/004-fullstack-retrospective-portal/contracts/frontend-routes.md)
for all states and the [architecture guide](../docs/fullstack-architecture.md) for boundaries.

## Validation and Preview

```powershell
npm ci
npm run lint
npm run test -- --run
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

Add `http://localhost:4173` to the API CORS allow-list only for the local preview run. Complete data,
role, accessibility, responsive, and full-stack checks are in the
[feature quickstart](../specs/004-fullstack-retrospective-portal/quickstart.md).
