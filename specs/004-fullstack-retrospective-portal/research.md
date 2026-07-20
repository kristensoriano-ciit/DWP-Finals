# Research: Full-Stack Retrospective Portal

## Existing Capability Reuse

**Decision**: Reuse the account, game, and retrospective entities, services, contracts, and database
schema from features 001–003. Change only game read authorization in the backend.

**Rationale**: Authentication, role enforcement, active-game filtering, public retrospective
filtering, Author ownership, direct publication, archival, paging, and retrospective concurrency are
already implemented and integration tested. Duplicating them would create conflicting rules.

**Alternatives considered**: A new portal service or combined dashboard controller was rejected
because it would duplicate existing use cases. A separate Review entity was rejected because a
Retrospective already is the product's game review.

## Public Game Reads

**Decision**: Keep controller-level authentication as the default and explicitly allow anonymous
access on only the game list and active-game detail actions. Keep all game mutations Admin-only.

**Rationale**: `GameService` already performs bounded no-tracking queries and excludes archived
games. This mirrors the established public-read pattern in `RetrospectivesController` and requires no
service, model, or migration change.

**Alternatives considered**: A separate public games controller was rejected as duplication. Making
the whole controller anonymous was rejected because mutation policies should retain a secure default.

## Game Detail Composition

**Decision**: Load game information and its related published retrospectives through two bounded
existing requests.

**Rationale**: Both operations already exist, can fail independently with clear UI states, and keep
game and retrospective ownership separate.

**Alternatives considered**: A composite game-page endpoint was rejected because it couples two
services for presentation convenience and is not required at the specified scale.

## Home Composition

**Decision**: Request a small newest page and a small best page. Use the first newest item as the
featured retrospective and reuse that response for the newest section.

**Rationale**: This implements deterministic featured content without a new editorial data model or
an equivalent duplicate request.

**Alternatives considered**: A dedicated home endpoint and caching layer were rejected until measured
performance demonstrates a need. Manual featured-story administration was rejected as out of scope.

## Routing

**Decision**: Add React Router with browser-history routes, nested layouts, role guards, and URL search
parameters as the source of truth for filters, sorting, status, and paging.

**Rationale**: The feature requires direct links, refresh restoration, safe return destinations,
protected layouts, navigation blocking, and predictable browser back/forward behavior. React Router
solves those current requirements with one focused runtime dependency.

**Alternatives considered**: Hash routing was rejected because it weakens public URLs. A custom
History API router was rejected because it would add complex application infrastructure and tests.

## API Boundary

**Decision**: Use native `fetch` through one typed `request` function and small domain modules for
authentication, games, retrospectives, and users.

**Rationale**: The common function can consistently add JSON and bearer headers, handle cancellation
and empty responses, parse Problem Details, normalize field names, and report protected-request 401s.
Pages remain responsible for user-facing messages and navigation.

**Alternatives considered**: Axios was rejected because native fetch provides the required behavior.
Calling fetch directly from every page was rejected because it duplicates authentication and error
handling. A generic repository abstraction was rejected as harder to trace.

## Session Model

**Decision**: Store the access token and expiration in `sessionStorage`; keep the validated user in a
`SessionProvider`. On startup, clear expired data or validate it by loading the current account before
resolving protected routes. Sign-out is client-side. If a protected Retrospective save receives 401,
temporarily store only that safe draft under a resource-specific session key before navigating to
sign-in, restore it after a successful safe return, and remove it after restoration, successful save,
explicit discard, or archive.

**Rationale**: The existing backend has stateless bearer authentication with no refresh-token or
logout endpoint. Session storage satisfies refresh restoration while limiting persistence compared
with local storage. Loading the current account verifies active state and authentication version
instead of trusting decoded token claims. The narrowly scoped temporary draft prevents route unmount
from destroying up to 20,000 characters of Author work; passwords, errors, User objects, and unrelated
forms are never stored.

**Alternatives considered**: Memory-only storage was rejected because refresh restoration is a
requirement. Local storage was rejected because it persists beyond the browser session. Cookie and
refresh-token authentication were rejected because they require a separate security feature.
Keeping every protected route mounted behind an in-place login overlay was rejected because it adds a
second authentication presentation flow and complicates route guards.

## Safe Return Navigation

**Decision**: Accept a return destination only when it is a normalized internal path beginning with
one slash, is not protocol-relative, and is permitted for the authenticated role.

**Rationale**: This supports intended-destination restoration without creating an open redirect or
sending a valid user to a forbidden area.

**Alternatives considered**: Always returning to the home page was rejected as disruptive. Accepting
an arbitrary URL was rejected as unsafe.

## Forms and Validation

**Decision**: Use controlled forms, native input constraints, small feature-specific validation
functions, and mapped server validation. Disable repeated submission while pending and preserve safe
field values after failure.

**Rationale**: The forms are conventional, and explicit controlled state makes unsaved text and
error recovery easy for students to follow.

**Alternatives considered**: A form library was rejected because current complexity does not justify
another abstraction. Browser validation alone was rejected because it cannot represent all domain
rules or backend field errors.

## Retrospective Concurrency

**Decision**: Keep the loaded owner response separate from the editable draft. Submit its Base64 row
version in the existing body or `If-Match` location. On conflict, retain the draft and let the Author
explicitly load the current server version before deciding what to copy or resubmit.

**Rationale**: This meets the no-overwrite rule without silently discarding either user's work.

**Alternatives considered**: Automatic retry was rejected because it could overwrite an intervening
change. Replacing the form with the server response was rejected because it loses the Author's text.
Adding game edit concurrency was rejected because feature 004 requires conflict recovery only for
retrospectives and the current game contract exposes no token.

## Image Policy

**Decision**: Preserve the existing API's absolute HTTP/HTTPS validation for compatibility, but render
only HTTPS images in the portal. Missing, HTTP, malformed, or failed HTTPS images use one labeled,
fixed-ratio fallback. Author and Admin forms recommend and validate HTTPS before submission.

**Rationale**: Browsers may block HTTP images on an HTTPS site. Existing records and contracts can
remain readable without a migration or breaking earlier API clients.

**Alternatives considered**: Tightening all backend writes to HTTPS was rejected because it changes
features 002 and 003 and could strand existing data. Rendering HTTP was rejected because it creates
mixed-content behavior.

## Frontend Testing

**Decision**: Keep Vitest, jsdom, React Testing Library, user-event, and jest-dom for focused behavior,
and add Chromium-only Playwright plus Axe for the remaining complete browser, responsive,
accessibility, and timing checks. Run browser suites serially with fresh contexts and retain traces,
screenshots, and video only on failure.

**Rationale**: Component tests remain the fastest owner-level proof, but T086, T087, and T091 now
demonstrate a concrete need for a real browser across the HTTPS API boundary. Chromium alone supplies
the required evidence without multiplying runtime across engines.

**Alternatives considered**: Snapshot-heavy tests remain rejected as low-value. Cypress and a network
mocking server were rejected because Playwright covers the current boundary directly. The earlier
Playwright deferral is superseded by the explicit remaining browser-validation tasks. Multiple browser
engines remain deferred until compatibility defects demonstrate a need.

## Browser Test Data

**Decision**: Add a test-only .NET provisioning utility that refuses destructive work unless the
server is the approved `(localdb)\DwpFinals` instance, the database is exactly `DwpFinalsE2E`, and
`E2E_ALLOW_DATABASE_RESET=YES`. It applies migrations and creates the same deterministic 100-game,
200-Retrospective, 100-user distribution used by backend performance tests. Dedicated login-capable
journey identities replace accounts within the 89 active-Author slots rather than increasing totals.

**Rationale**: Public APIs cannot create inactive users, fixed timestamps, archived history, or exact
status distributions. `WebApplicationFactory` is in-process and deletes its random database when
disposed, so an external Chromium process cannot reuse it reliably.

**Alternatives considered**: A production seeding endpoint and application startup flag were rejected
as security and boundary violations. The normal development database was rejected because browser
tests are destructive. API-only setup was rejected as nondeterministic and incomplete.

The clean-setup browser project runs before deterministic seeding: it starts from an empty migrated
`DwpFinalsE2E` database, enables the existing Development Admin seed with environment credentials,
creates Games through the Admin UI, registers an Author publicly, and creates/publishes demonstration
content through the UI. The orchestrator then resets and seeds the deterministic dataset for stable
journey and performance projects.

## Browser Sessions and Servers

**Decision**: Build in Release, seed `DwpFinalsE2E`, start the API at
`https://localhost:7047` with preview-only CORS, and serve the frontend production preview at
`http://localhost:4173`. Use one Playwright worker and fresh browser contexts. Role fixtures log in
through the API and populate the application's token/expiry session keys through an initialization
script; the account journey still uses the visible login form.

Authenticated projects disable Playwright trace and video because those artifacts can contain bearer
headers or form values. Anonymous projects may retain traces. Failure screenshots use only synthetic
E2E identities and content. All report, result, trace, screenshot, and video directories are ignored.

**Rationale**: Production preview validates direct-route hosting and gives timing runs a stable build.
Fresh contexts isolate the application's `sessionStorage`, which Playwright storage-state files do not
preserve.

**Alternatives considered**: The Vite development server was rejected for authoritative timing. HTTP
API hosting was rejected because it skips the documented HTTPS boundary. Parallel browser workers
were rejected because they share one mutable database and login rate limits.

## Browser Performance Evidence

**Decision**: Measure Home, Games, Retrospectives, Author dashboard, Admin Games, and Admin Users at
320 and 1280 CSS pixels. Warm each route three times, record 20 sequential visits from navigation
start until deterministic API-backed primary content is visible, and calculate per-route p95. Store
raw samples in ignored test results and record the authoritative local summary in `performance.md`.

**Rationale**: Application-defined readiness directly tests SC-006; generic Lighthouse metrics do not
prove that the expected server content is usable. Per-route thresholds prevent a fast aggregate from
hiding one failing screen.

**Alternatives considered**: Lighthouse was rejected because its paint metrics do not identify the
specified primary content. CI timings remain a regression signal rather than the authoritative result
because hosted-runner contention is uncontrolled.

## Accessibility and Responsive Design

**Decision**: Preserve Checkpoint's visual language while using semantic landmarks, native controls,
explicit labels, an error summary, polite live regions, visible focus, reduced-motion support, and an
operable mobile menu. Validate at 320, 768, and 1280 CSS pixels.

**Rationale**: The prototype already establishes the desired identity and focus style, but its hidden
mobile navigation must be replaced rather than extended.

**Alternatives considered**: A component library was rejected because it would replace the current
design and add unnecessary abstractions. Custom ARIA widgets were rejected where native controls
provide better behavior.

## Environment and CORS

**Decision**: Configure the frontend through `VITE_API_BASE_URL`, use the backend HTTPS development
origin directly, and retain an explicit CORS allow-list for the Vite development and local preview
origins. Secrets remain in user secrets or environment variables.

**Rationale**: Direct cross-origin development tests the same boundary production must configure.
The API base URL is public browser configuration, while database, JWT, and Admin credentials are not.

**Alternatives considered**: A Vite proxy was rejected because it hides CORS during development and
does not decide production deployment. Allowing every origin was rejected as unsafe.

## Deployment Boundary

**Decision**: Define and validate local development plus a local production build/preview. Record
requirements for SPA history fallback, HTTPS, SQL Server, migrations, secrets, and exact CORS origins,
but defer provider-specific deployment files.

**Rationale**: No frontend, API, or production database host has been selected, and LocalDB is not a
deployable database. Guessing providers would add unusable configuration.

**Alternatives considered**: Docker and cloud-provider files were rejected until a target environment
is selected. Automatic startup migrations were rejected in favor of explicit deployment migrations.

## Performance Validation

**Decision**: Extend the existing migration-backed performance fixture to the documented 100-game,
200-retrospective, 100-user deterministic dataset. Warm each measured path three times and take at
least 20 sequential samples. Record local environment details and treat results as a development
baseline.

**Rationale**: This matches the feature specification and reuses existing timing infrastructure.

**Alternatives considered**: Adding caching, telemetry, or a separate benchmark project before
measurement was rejected. In-memory persistence was rejected because it does not represent the query
boundary.

## Documentation Strategy

**Decision**: Make this feature's quickstart the authoritative full-stack run and validation guide,
add a frontend environment example, update root/frontend READMEs, and document the real two-project
architecture.

**Rationale**: Existing quickstarts describe backend features separately, while current README files
do not explain the application that now exists.

**Alternatives considered**: Duplicating setup instructions in every prior feature was rejected;
prior contracts remain linked as the detailed source of truth.
