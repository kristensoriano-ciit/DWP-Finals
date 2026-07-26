---

description: "Implementation tasks for the full-stack retrospective portal"
---

# Tasks: Full-Stack Retrospective Portal

**Input**: Design documents from `/specs/004-fullstack-retrospective-portal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Automated tests are required by the feature specification and constitution. Tests for new
behavior MUST fail for the expected reason before implementation. Characterization and regression
tests for reused behavior MAY pass immediately and MUST remain passing.

**Organization**: Tasks are grouped by user story so every story can be implemented and validated as
an independently useful slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no incomplete dependency.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Every task includes the exact file path it creates or changes.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add only the routing and test dependencies required by the approved plan and establish
reproducible frontend configuration.

- [X] T001 Add `react-router-dom`, Vitest, jsdom, React Testing Library, user-event, jest-dom, and `test` scripts in `react-frontend/package.json` and update `react-frontend/package-lock.json`
- [X] T002 Configure the jsdom test environment and setup module in `react-frontend/vite.config.ts` and `react-frontend/src/test/setup.ts`
- [X] T003 [P] Document the non-secret API origin as `VITE_API_BASE_URL=https://localhost:7047` in `react-frontend/.env.example`
- [X] T004 Run `npm run test -- --run` and `npm run build` from `react-frontend/` after the setup edit and resolve only setup-related failures in `react-frontend/package.json`, `react-frontend/vite.config.ts`, and `react-frontend/src/test/setup.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared request, feedback, routing, and layout behavior required by every user
story.

**⚠️ CRITICAL**: No user story implementation begins until this phase passes frontend tests and build.

- [X] T005 Define explicit User, Auth, Game, Retrospective, paged-response, request, and Problem Details types matching existing JSON contracts in `react-frontend/src/api/types.ts`
- [X] T006 [P] Add request-boundary tests for JSON, 204, malformed content, Problem Details field normalization, cancellation, bearer headers, and 401 notification in `react-frontend/src/api/http.test.ts`
- [X] T007 Implement the typed native-fetch boundary, `ApiError`, API-base validation, optional bearer token, `AbortSignal`, and protected-request 401 callback in `react-frontend/src/api/http.ts`, then immediately run `npm run test -- src/api/http.test.ts --run` from `react-frontend/`
- [X] T008 [P] Add accessibility tests for loading, empty, error-summary, and live-status feedback in `react-frontend/src/components/feedback/Feedback.test.tsx` plus mobile-menu keyboard/focus and anonymous/Author/Admin link visibility tests in `react-frontend/src/components/layout/SiteLayout.test.tsx`
- [X] T009 Implement reusable loading, empty, page-error, field-error-summary, and live-status components in `react-frontend/src/components/feedback/Feedback.tsx`
- [X] T010 [P] Add keyboard, current-page, and disabled-state tests for bounded pagination in `react-frontend/src/components/layout/Pagination.test.tsx`
- [X] T011 Implement semantic bounded pagination with URL-safe page callbacks in `react-frontend/src/components/layout/Pagination.tsx`
- [X] T012 [P] Add focus, cancellation, confirmation, labeling, and focus-restoration tests in `react-frontend/src/components/forms/ConfirmDialog.test.tsx`
- [X] T013 Implement the native keyboard-operable destructive-action dialog in `react-frontend/src/components/forms/ConfirmDialog.tsx`
- [X] T014 Replace the single-page mount with a browser router, public Checkpoint layout, keyboard-operable mobile menu with focus restoration, Forbidden page, and Not Found page in `react-frontend/src/router.tsx`, `react-frontend/src/App.tsx`, `react-frontend/src/components/layout/SiteLayout.tsx`, `react-frontend/src/pages/ForbiddenPage.tsx`, and `react-frontend/src/pages/NotFoundPage.tsx`, then immediately run `npm run test -- src/components/layout/SiteLayout.test.tsx --run` from `react-frontend/`
- [X] T015 Preserve the Checkpoint design while adding shared form, feedback, layout, mobile-menu, and responsive primitives in `react-frontend/src/App.css` and `react-frontend/src/index.css`, then run `npm run test -- --run` and `npm run build` from `react-frontend/`

**Checkpoint**: Typed requests, common feedback, reusable confirmation, browser routing, and the public
layout are ready.

---

## Phase 3: User Story 1 - Discover Published Retrospectives (Priority: P1) 🎯 MVP

**Goal**: A signed-out visitor can browse active games and published retrospectives, refine bounded
results, and open complete game and retrospective pages.

**Independent Test**: Seed active/archived games and retrospectives across statuses, browse without a
token, and verify that only active games and published retrospectives are discoverable through home,
list, filtered, paged, and detail routes.

### Tests for User Story 1

- [X] T016 [P] [US1] Change game API integration expectations to cover anonymous list/detail, archived-game exclusion, and anonymous mutation denial in `dotnet-backend/dotnet-backend.Tests/GamesApiTests.cs`
- [X] T017 [P] [US1] Add generated-OpenAPI assertions that game GET operations are anonymous while POST, PUT, and DELETE remain bearer-protected in `dotnet-backend/dotnet-backend.Tests/OpenApiContractTests.cs`
- [X] T018 [P] [US1] Add allowed-origin and rejected-origin preflight integration coverage for `http://localhost:5173` in `dotnet-backend/dotnet-backend.Tests/CorsApiTests.cs`
- [X] T019 [P] [US1] Add URL-query, cancellation, paged-response, and detail-response tests in `react-frontend/src/api/gamesApi.test.ts` and `react-frontend/src/api/retrospectivesApi.test.ts`
- [X] T020 [P] [US1] Add missing, malformed, HTTP, failed HTTPS, accessible-label, and stable-fallback tests in `react-frontend/src/components/layout/ContentImage.test.tsx`
- [X] T021 [P] [US1] Add rendering tests for game cards, retrospective cards, ratings, publication metadata, and secure links in `react-frontend/src/components/games/GameCard.test.tsx` and `react-frontend/src/components/retrospectives/RetrospectiveCard.test.tsx`
- [X] T022 [P] [US1] Add loading, success, empty, invalid-query fallback, unexpected/partial failure, not-found, search/filter/sort interaction, page reset, URL synchronization, back/forward restoration, stale-request cancellation, related-list pagination, and extreme-page tests in `react-frontend/src/pages/public/HomePage.test.tsx`, `react-frontend/src/pages/public/GamesPage.test.tsx`, `react-frontend/src/pages/public/GameDetailPage.test.tsx`, `react-frontend/src/pages/public/RetrospectivesPage.test.tsx`, and `react-frontend/src/pages/public/RetrospectiveDetailPage.test.tsx`

### Implementation for User Story 1

- [X] T023 [US1] Add `AllowAnonymous` only to game list/detail actions and remove their obsolete 401 response metadata in `dotnet-backend/dotnet-backend/Controllers/GamesController.cs`
- [X] T024 [US1] Immediately run `dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --filter "FullyQualifiedName~GamesApiTests|FullyQualifiedName~OpenApiContractTests"` from `dotnet-backend/` and fix only public-read authorization regressions in `dotnet-backend/dotnet-backend/Controllers/GamesController.cs`
- [X] T025 [US1] Update anonymous GET security, complete schemas, and supersession notes in `specs/002-game-management/contracts/games-api.yaml` while keeping mutations protected and consistent with `specs/004-fullstack-retrospective-portal/contracts/portal-api.yaml`
- [X] T026 [P] [US1] Implement bounded game list/detail requests and query serialization in `react-frontend/src/api/gamesApi.ts`, then immediately run `npm run test -- src/api/gamesApi.test.ts --run` from `react-frontend/`
- [X] T027 [P] [US1] Implement published retrospective list/detail requests and newest/best/game query serialization in `react-frontend/src/api/retrospectivesApi.ts`
- [X] T028 [US1] Implement the HTTPS-only display image with fixed-ratio labeled fallback in `react-frontend/src/components/layout/ContentImage.tsx`
- [X] T029 [P] [US1] Implement public game presentation in `react-frontend/src/components/games/GameCard.tsx` and `react-frontend/src/components/games/GameGrid.tsx`
- [X] T030 [P] [US1] Implement public rating and retrospective presentation in `react-frontend/src/components/retrospectives/Rating.tsx`, `react-frontend/src/components/retrospectives/RetrospectiveCard.tsx`, and `react-frontend/src/components/retrospectives/RetrospectiveGrid.tsx`
- [X] T031 [US1] Implement home newest/best loading with newest-response reuse and partial-failure handling in `react-frontend/src/pages/public/HomePage.tsx`
- [X] T032 [US1] Implement URL-owned search, release-window, pagination, active-game detail, related-retrospective pagination, invalid-query fallback, extreme-page empty state, and recoverable failures in `react-frontend/src/pages/public/GamesPage.tsx` and `react-frontend/src/pages/public/GameDetailPage.tsx`
- [X] T033 [US1] Implement URL-owned search, game filter, newest/best sort, pagination, published detail, invalid-query fallback, stale-request cancellation, and recoverable failures in `react-frontend/src/pages/public/RetrospectivesPage.tsx` and `react-frontend/src/pages/public/RetrospectiveDetailPage.tsx`
- [X] T034 [US1] Register all public routes, replace hash links, and expose Home, Games, and Retrospectives navigation in `react-frontend/src/router.tsx` and `react-frontend/src/components/layout/SiteLayout.tsx`
- [X] T035 [US1] Add responsive public page, query-control, card, article, image-fallback, and mobile-navigation styles without horizontal overflow in `react-frontend/src/App.css`
- [X] T036 [US1] Run `dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --filter "FullyQualifiedName~GamesApiTests|FullyQualifiedName~OpenApiContractTests|FullyQualifiedName~CorsApiTests"` from `dotnet-backend/`, then run `npm run lint`, `npm run test -- --run`, and `npm run build` from `react-frontend/`

**Checkpoint**: User Story 1 is a signed-out, independently demonstrable MVP.

---

## Phase 4: User Story 2 - Access and Maintain an Account (Priority: P2)

**Goal**: Visitors can register and sign in; authenticated users can restore a valid session, manage
their profile/password, safely return to intended routes, and sign out.

**Independent Test**: Register an Author, sign in, refresh a protected route, update profile and
password, and verify expiry, logout, role denial, and safe-return behavior.

### Tests for User Story 2

- [X] T037 [P] [US2] Add registration, login, current-profile, profile-update, and password-change request tests in `react-frontend/src/api/authApi.test.ts`
- [X] T038 [P] [US2] Add valid, expired, rejected, logout, password-change, and 401-invalidation session tests in `react-frontend/src/auth/SessionProvider.test.tsx`
- [X] T039 [P] [US2] Add restoring, anonymous redirect, Author/Admin role, forbidden-session, and safe return-path tests that reject absolute, protocol-relative, encoded/backslash, malformed, and role-forbidden destinations while accepting permitted paths with query/fragment in `react-frontend/src/auth/RequireSession.test.tsx` and `react-frontend/src/auth/RequireRole.test.tsx`
- [X] T040 [P] [US2] Add form validation, rejected credentials, duplicate email, pending submission, and safe-value preservation tests in `react-frontend/src/pages/auth/LoginPage.test.tsx` and `react-frontend/src/pages/auth/RegisterPage.test.tsx`
- [X] T041 [P] [US2] Add restoring/loading, field validation, success/error, expired-session, pending/repeated-submit protection, and password-change forced-sign-out tests in `react-frontend/src/pages/account/AccountPage.test.tsx` and `react-frontend/src/pages/account/PasswordPage.test.tsx`

### Implementation for User Story 2

- [X] T042 [US2] Implement registration, login, profile, profile-update, and password-change requests in `react-frontend/src/api/authApi.ts`, then immediately run `npm run test -- src/api/authApi.test.ts --run` from `react-frontend/`
- [X] T043 [US2] Implement restoring/anonymous/authenticated session state, `sessionStorage` token/expiry handling, account validation, 401 invalidation, and client logout in `react-frontend/src/auth/SessionProvider.tsx` and `react-frontend/src/auth/useSession.ts`
- [X] T044 [US2] Implement normalized internal return-path validation and authenticated/role route guards in `react-frontend/src/auth/safeReturnPath.ts`, `react-frontend/src/auth/RequireSession.tsx`, and `react-frontend/src/auth/RequireRole.tsx`
- [X] T045 [P] [US2] Implement controlled login and registration forms with explicit validation and Problem Details mapping in `react-frontend/src/pages/auth/LoginPage.tsx` and `react-frontend/src/pages/auth/RegisterPage.tsx`
- [X] T046 [P] [US2] Implement profile update and password change pages with restoring/loading states, pending/repeated-submit protection, accessible success/error feedback, expired-session handling, and forced sign-out after password change in `react-frontend/src/pages/account/AccountPage.tsx` and `react-frontend/src/pages/account/PasswordPage.tsx`
- [X] T047 [US2] Add session-aware navigation, sign-out, account routes, safe login return, and role-protected layout registration in `react-frontend/src/components/layout/SiteLayout.tsx` and `react-frontend/src/router.tsx`
- [X] T048 [US2] Add responsive authentication, account, role-navigation, error-summary, and pending-control styles in `react-frontend/src/App.css`
- [X] T049 [US2] Run `npm run test -- --run`, `npm run lint`, and `npm run build` from `react-frontend/` to validate `react-frontend/src/api/authApi.test.ts`, `react-frontend/src/auth/SessionProvider.test.tsx`, `react-frontend/src/auth/RequireSession.test.tsx`, `react-frontend/src/auth/RequireRole.test.tsx`, `react-frontend/src/pages/auth/LoginPage.test.tsx`, `react-frontend/src/pages/auth/RegisterPage.test.tsx`, `react-frontend/src/pages/account/AccountPage.test.tsx`, and `react-frontend/src/pages/account/PasswordPage.test.tsx`

**Checkpoint**: User Story 2 works with the existing C# authentication and remains independently
testable with seeded Author and Admin accounts.

---

## Phase 5: User Story 3 - Author and Publish Retrospectives (Priority: P3)

**Goal**: An Author can browse owned work, create/edit a Retrospective, directly control publication,
archive it, and recover safely from stale writes or navigation with unsaved changes.

**Independent Test**: With a seeded Author and active game, create Draft, edit, publish, verify public
visibility, unpublish with reason, force a two-tab conflict, and archive without losing unsaved text.

### Tests for User Story 3

- [X] T050 [P] [US3] Add owner list/detail, create, update, status, row-version, and `If-Match` archive request tests in `react-frontend/src/api/retrospectivesApi.owner.test.ts` plus every Retrospective denial case defined by `specs/004-fullstack-retrospective-portal/contracts/authorization-matrix.md`, including cross-owner read/update/status/archive, Admin-no-override, inactive-account, and non-disclosure integration tests in `dotnet-backend/dotnet-backend.Tests/RetrospectivesApiTests.cs`
- [X] T051 [P] [US3] Add title/content/rating/HTTPS-image/field-error tests plus Draft-default, Review, Published, Unpublished, reason visibility/requirement, and reason clearing tests in `react-frontend/src/components/retrospectives/RetrospectiveForm.test.tsx`
- [X] T052 [P] [US3] Add URL filter, loading, empty, invalid-query fallback, ownership-safe error, and status display tests in `react-frontend/src/pages/author/AuthorRetrospectivesPage.test.tsx`
- [X] T053 [P] [US3] Add dirty-state, browser unload, in-app navigation, successful-reset tests in `react-frontend/src/hooks/useUnsavedChanges.test.tsx` plus resource isolation, 401/sign-in restoration, successful cleanup, explicit discard, and malformed-record tests in `react-frontend/src/hooks/useSessionDraft.test.ts`
- [X] T054 [P] [US3] Add create/edit, repeated-submit, all four initial statuses and lifecycle transitions, archive-confirmation, validation/network/timeout/malformed/unexpected failure draft preservation, expired-session sign-in/return restoration, and preserved-draft conflict tests in `react-frontend/src/pages/author/RetrospectiveEditorPage.test.tsx`

### Implementation for User Story 3

- [X] T055 [US3] Extend `react-frontend/src/api/retrospectivesApi.ts` with owner list/detail, create, update, status-change, and `If-Match` archive operations using the latest row version, then immediately run `npm run test -- src/api/retrospectivesApi.owner.test.ts --run` from `react-frontend/`
- [X] T056 [P] [US3] Implement explicit Retrospective draft validation, labeled fields, game selection, rating, HTTPS image guidance, Draft-default/Review/Published/Unpublished initial status, conditional reason, reason clearing, and mapped errors in `react-frontend/src/components/retrospectives/RetrospectiveForm.tsx`
- [X] T057 [P] [US3] Implement status controls, required unpublish reason, status labels, and archive confirmation in `react-frontend/src/components/retrospectives/RetrospectiveLifecycle.tsx`
- [X] T058 [US3] Implement URL-owned owner search/game/status/sort/paging with loading, empty, and safe-error states in `react-frontend/src/pages/author/AuthorRetrospectivesPage.tsx`
- [X] T059 [US3] Implement new/edit orchestration with all initial statuses, separate loaded snapshot/draft, refreshed row versions, pending protection, safe-value preservation for every failure class, session-expiry draft save/restore, and non-destructive conflict recovery in `react-frontend/src/pages/author/RetrospectiveEditorPage.tsx`
- [X] T060 [US3] Implement browser/in-app dirty-navigation warnings in `react-frontend/src/hooks/useUnsavedChanges.ts` and resource-keyed temporary expiry recovery with validation and cleanup in `react-frontend/src/hooks/useSessionDraft.ts`
- [X] T061 [US3] Register Author-only dashboard/new/edit routes and My Retrospectives navigation in `react-frontend/src/router.tsx` and `react-frontend/src/components/layout/SiteLayout.tsx`
- [X] T062 [US3] Add responsive Author dashboard, editor, status, conflict, and destructive-confirmation styles in `react-frontend/src/App.css`
- [X] T063 [US3] Run `npm run test -- --run`, `npm run lint`, and `npm run build` from `react-frontend/` to validate the owner API, form, dashboard, unsaved-change, session-draft, and editor tests, then run `dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --filter "FullyQualifiedName~RetrospectivesApiTests"` from `dotnet-backend/`

**Checkpoint**: User Story 3 completes the reader-to-Author publishing journey without Admin approval.

---

## Phase 6: User Story 4 - Administer Games (Priority: P4)

**Goal**: An Admin can browse, search, create, edit, and archive active games while non-Admins remain
denied and retained Retrospective attribution remains intact.

**Independent Test**: Sign in as Admin, create a unique game, find/edit/archive it, and verify public
and Author visibility; repeat mutations as anonymous and Author users and verify denial.

### Tests for User Story 4

- [X] T064 [P] [US4] Add create, update, archive, duplicate conflict, validation, bearer-header, and forbidden-response request tests in `react-frontend/src/api/gamesApi.admin.test.ts`
- [X] T065 [P] [US4] Add title/description/date/HTTPS-cover validation, field feedback, pending state, and safe-value preservation tests in `react-frontend/src/components/admin/GameForm.test.tsx`
- [X] T066 [P] [US4] Add Admin game list loading/empty/invalid-query/forbidden/retry/unexpected-error states, create/edit success, duplicate failure, not-found, named archive-confirmation, Author-selection removal, and retained published-attribution tests in `react-frontend/src/pages/admin/AdminGamesPage.test.tsx` and `react-frontend/src/pages/admin/AdminGameEditorPage.test.tsx`

### Implementation for User Story 4

- [X] T067 [US4] Extend `react-frontend/src/api/gamesApi.ts` with authenticated Admin create, update, and archive operations, then immediately run `npm run test -- src/api/gamesApi.admin.test.ts --run` from `react-frontend/`
- [X] T068 [P] [US4] Implement the controlled reusable game form with existing catalog limits and HTTPS cover guidance in `react-frontend/src/components/admin/GameForm.tsx`
- [X] T069 [US4] Implement Admin game list/search/release filtering, loading/empty/invalid-query/forbidden/retry/unexpected-error states, and named archive confirmation in `react-frontend/src/pages/admin/AdminGamesPage.tsx`
- [X] T070 [US4] Implement shared create/edit orchestration with loading, duplicate conflict, validation, pending, success, and not-found states in `react-frontend/src/pages/admin/AdminGameEditorPage.tsx`
- [X] T071 [US4] Add the Admin overview plus Admin-only game list/new/edit routes and navigation in `react-frontend/src/pages/admin/AdminPage.tsx`, `react-frontend/src/router.tsx`, and `react-frontend/src/components/layout/SiteLayout.tsx`
- [X] T072 [US4] Add responsive Admin overview, game rows, game form, and archive-confirmation styles in `react-frontend/src/App.css`
- [X] T073 [US4] Run `npm run test -- --run`, `npm run lint`, and `npm run build` from `react-frontend/` to validate Admin game API/form/page tests, then run `dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --filter "FullyQualifiedName~GamesApiTests|FullyQualifiedName~RetrospectivesApiTests"` from `dotnet-backend/`

**Checkpoint**: User Story 4 independently manages the catalog through existing Admin-protected APIs.

---

## Phase 7: User Story 5 - Administer User Access (Priority: P5)

**Goal**: An Admin can browse bounded active/inactive users and deactivate another user, while
self-deactivation and non-Admin access remain prevented.

**Independent Test**: Browse users as Admin, cancel then confirm another user's deactivation, verify
their current session stops working, and verify Admin self-deactivation and non-Admin access fail.

### Tests for User Story 5

- [X] T074 [P] [US5] Add paged Admin user list, authenticated deactivation, 204 response, and Problem Details request tests in `react-frontend/src/api/usersApi.test.ts` plus already-issued-session invalidation coverage in `dotnet-backend/dotnet-backend.Tests/AdminUsersApiTests.cs`
- [X] T075 [P] [US5] Add loading, empty, active/inactive display, paging, named confirmation, cancellation, pending state, self-protection, forbidden, retry, and unexpected-failure tests in `react-frontend/src/pages/admin/AdminUsersPage.test.tsx`

### Implementation for User Story 5

- [X] T076 [US5] Implement paged Admin user list and deactivation requests in `react-frontend/src/api/usersApi.ts`, then immediately run `npm run test -- src/api/usersApi.test.ts --run` from `react-frontend/`
- [X] T077 [US5] Implement loading/empty/forbidden/retry/unexpected-error states, responsive user rows, role/access labels, self-deactivation protection, and named confirmation in `react-frontend/src/pages/admin/AdminUsersPage.tsx`
- [X] T078 [US5] Register the Admin-only users route and navigation in `react-frontend/src/router.tsx` and `react-frontend/src/components/layout/SiteLayout.tsx`
- [X] T079 [US5] Add responsive user-list, status, confirmation, and pending styles in `react-frontend/src/App.css`
- [X] T080 [US5] Run `npm run test -- --run`, `npm run lint`, and `npm run build` from `react-frontend/` to validate `react-frontend/src/api/usersApi.test.ts` and `react-frontend/src/pages/admin/AdminUsersPage.test.tsx`, then run `dotnet test dotnet-backend.Tests/dotnet-backend.Tests.csproj --filter "FullyQualifiedName~AdminUsersApiTests"` from `dotnet-backend/`

**Checkpoint**: All five stories are independently functional and the planned portal scope is complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate full-stack quality, align repository documentation, and record measured behavior
without adding out-of-scope product features.

- [X] T081 [P] Create the deterministic 100-game, 200-retrospective, 100-user test fixture with documented distributions in `dotnet-backend/dotnet-backend.Tests/Infrastructure/NormalPerformanceDatasetSeeder.cs`
- [X] T082 Extend warm p95 coverage for anonymous game list/detail, retrospective list/detail, Author dashboard, and Admin users in `dotnet-backend/dotnet-backend.Tests/PerformanceTests.cs` and record results in `specs/004-fullstack-retrospective-portal/performance.md`
- [X] T083 [P] Document controller/service, page/API-module, session, routing, security, and deployment boundaries in `docs/fullstack-architecture.md` and correct the real application paths in `AGENTS.md`
- [X] T084 [P] Replace scaffold instructions with portal overview, setup links, scripts, route guidance, and a complete secret/public configuration matrix covering database connection, JWT key/issuer/audience/lifetime, development/preview CORS origins, Admin seed settings, frontend API base URL, and production placeholders in `README.md` and `react-frontend/README.md`
- [X] T085 [P] Replace the stale weather request with public browse and authenticated examples in `dotnet-backend/dotnet-backend/dotnet-backend.http` and mark authenticated-game-read instructions as superseded in `specs/002-game-management/quickstart.md` and `specs/003-retrospective-management/quickstart.md`
- [X] T086 Validate keyboard-only journeys, visible focus, live feedback, image fallbacks, reduced motion, and no horizontal overflow at 320, 768, and 1280 pixels using `specs/004-fullstack-retrospective-portal/quickstart.md`, recording date, commit, browser, routes, viewports, pass/fail results, and defects in `specs/004-fullstack-retrospective-portal/accessibility-validation.md` (automated Chromium evidence recorded; the separate human spot check remains documented as pending)
- [X] T087 Validate local setup, Admin preparation, demo-data creation, public smoke checks, all five journeys, and local preview from a clean environment using `specs/004-fullstack-retrospective-portal/quickstart.md`
- [X] T088 Run backend format verification, build, full migration-backed test suite, and pending-model check using commands in `specs/004-fullstack-retrospective-portal/quickstart.md`
- [X] T089 Run `npm ci`, frontend lint, all frontend tests, production build, and local preview using commands in `specs/004-fullstack-retrospective-portal/quickstart.md`
- [X] T090 Run `npx --yes @redocly/cli lint specs/002-game-management/contracts/games-api.yaml`, `npx --yes @redocly/cli lint specs/004-fullstack-retrospective-portal/contracts/portal-api.yaml`, and `git diff --check` from the repository root
- [X] T091 Measure primary-content visibility for at least 20 visits at 320px and 1280px on Home, Games, Retrospectives, Author dashboard, and Admin lists; calculate desktop/mobile p95 and record browser, build mode, dataset seed, sample counts, pass/fail results, and approved exceptions in `specs/004-fullstack-retrospective-portal/performance.md`

---

## Phase 9: Automated Browser Validation

**Purpose**: Replace the remaining manual-only validation with isolated, repeatable Chromium evidence
without modifying production behavior or developer data.

- [X] T092 Add `@playwright/test`, `@axe-core/playwright`, browser-test scripts, generated-artifact ignores, and Chromium setup documentation in `react-frontend/package.json`, `react-frontend/package-lock.json`, `react-frontend/.gitignore`, and `react-frontend/README.md`
- [X] T093 Create the guarded `DwpFinalsE2E` reset/migration/seed utility with approved-LocalDB, exact-database, and explicit-opt-in checks in `dotnet-backend/dotnet-backend.E2E/dotnet-backend.E2E.csproj`, `dotnet-backend/dotnet-backend.E2E/Program.cs`, and `dotnet-backend/dotnet-backend.E2E/NormalPerformanceDatasetSeeder.cs`
- [X] T094 Reuse the deterministic E2E dataset from backend performance tests without changing the 100-game, 200-Retrospective, 100-user totals in `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj`, `dotnet-backend/dotnet-backend.Tests/PerformanceTests.cs`, and `dotnet-backend/dotnet-backend.Tests/Infrastructure/NormalPerformanceDatasetSeeder.cs`
- [X] T095 Configure serial Chromium projects, Release API/preview servers, synthetic-only artifacts, and clean-setup versus deterministic-seed orchestration in `react-frontend/playwright.config.ts` and `react-frontend/scripts/run-e2e.ps1`
- [X] T096 Implement role-isolated sessionStorage contexts, deterministic fixture identities, content readiness, keyboard/focus, overflow, and p95 helpers in `react-frontend/e2e/fixtures.ts` and `react-frontend/e2e/helpers.ts`
- [X] T097 Implement clean setup plus Visitor, Account, Author, Admin Game, and Admin User browser journeys in `react-frontend/e2e/journeys.spec.ts`
- [X] T098 Implement Axe WCAG A/AA, keyboard, focus, modal, live-region, reduced-motion, image-fallback, and 320/768/1280 overflow validation in `react-frontend/e2e/accessibility.spec.ts`
- [X] T099 Implement three-warmup, 20-sample, 320/1280 per-route primary-content p95 validation and raw JSON output in `react-frontend/e2e/performance.spec.ts`
- [X] T100 Add Windows LocalDB browser-validation CI and document the E2E project/workflow in `.github/workflows/e2e.yml`, `AGENTS.md`, `README.md`, and `docs/fullstack-architecture.md`
- [X] T101 Run the complete Playwright journey/accessibility suite and record date, commit, Chromium, routes, viewports, results, limitations, and defects in `specs/004-fullstack-retrospective-portal/accessibility-validation.md`
- [X] T102 Run the isolated Playwright performance suite, record all required environment/sample/p95 evidence in `specs/004-fullstack-retrospective-portal/performance.md`, and mark T086, T087, and T091 complete only when their contracts pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependency and starts immediately.
- **Foundational (Phase 2)** depends on Setup and blocks every user story.
- **US1 (Phase 3)** depends only on Foundational and is the MVP.
- **US2 (Phase 4)** depends only on Foundational and can be tested with existing seeded accounts.
- **US3 (Phase 5)** depends on US2 for a usable browser journey; its components may be developed in parallel with seeded session fixtures after Foundational.
- **US4 (Phase 6)** depends on US2 for a usable browser journey; its components may be developed in parallel with a seeded Admin session after Foundational.
- **US5 (Phase 7)** depends on US2 for a usable browser journey; its components may be developed in parallel with a seeded Admin session after Foundational.
- **Polish (Phase 8)** depends on every story selected for release.
- **Automated Browser Validation (Phase 9)** depends on the completed portal and Phase 8 automated checks; T093-T094 precede T095-T099, and T101-T102 run last.

### User Story Completion Order

```text
Setup → Foundation → US1 (public MVP)
                   └→ US2 (accounts)
                       ├→ US3 (Author tools)
                       ├→ US4 (Admin games)
                       └→ US5 (Admin users)

US1 + US2 + US3 + US4 + US5 → Polish and full validation
```

### Within Each User Story

- Add focused tests first and verify they fail for the missing behavior.
- Implement the closest owning controller, API module, component, page, or hook.
- Run the narrowest relevant test immediately after the first implementation edit.
- Complete route and styling integration only after core behavior passes.
- Run the story's focused tests, lint, and build before its checkpoint.

### Parallel Opportunities

- T003 can run independently of T001–T002.
- T006, T008, T010, and T012 can be authored in parallel before their paired implementations.
- T016–T022 can be authored in parallel because they target separate backend and frontend test files.
- T026–T027 can run in parallel, T029–T030 can then run in parallel, and T031–T033 follow after those shared request and presentation prerequisites.
- T037–T041 can run in parallel before US2 implementation.
- T050–T054 can run in parallel before US3 implementation.
- T064–T066 can run in parallel before US4 implementation.
- T074–T075 can run in parallel before US5 implementation.
- T081, T083, T084, and T085 can run in parallel after story behavior stabilizes; T091 follows a complete local build and deterministic dataset.

---

## Parallel Example: User Story 1

```text
Task T016: Backend anonymous game API tests
Task T017: Generated OpenAPI security tests
Task T018: CORS preflight tests
Task T019: Frontend public API-module tests
Task T020: Image fallback tests
Task T021: Public card tests
Task T022: Public page-state tests
```

## Parallel Example: User Story 2

```text
Task T037: Authentication API tests
Task T038: Session restoration tests
Task T039: Route guard tests
Task T040: Login and registration tests
Task T041: Account and password tests
```

## Parallel Example: User Story 3

```text
Task T050: Owner API and row-version tests
Task T051: Retrospective form tests
Task T052: Author dashboard tests
Task T053: Unsaved-change tests
Task T054: Editor lifecycle and conflict tests
```

## Parallel Example: User Story 4

```text
Task T064: Admin game API tests
Task T065: Game form tests
Task T066: Admin game page tests
```

## Parallel Example: User Story 5

```text
Task T074: Admin users API tests
Task T075: Admin users page tests
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 public discovery.
3. Stop and validate anonymous games, published Retrospectives, routes, query state, empty/error
   states, keyboard behavior, responsive layouts, backend tests, frontend tests, and builds.
4. Demonstrate the public Checkpoint portal before adding authenticated complexity.

### Incremental Delivery

1. Deliver US1 as the signed-out public MVP.
2. Add US2 to establish registration, authentication, profile, password, and role-aware navigation.
3. Add US3 to complete direct Author publication and concurrency-safe editing.
4. Add US4 to maintain the Game catalog.
5. Add US5 to administer user access.
6. Complete performance, documentation, accessibility, quickstart, and full-suite convergence.

### Student-Friendly Working Rule

1. Start at the closest owner named by the task.
2. Read the existing request/response contract before adding frontend types.
3. Keep controllers thin, use existing injected services, and use async I/O.
4. Keep pages focused on orchestration and move repeated presentation or stateful behavior into the
   named component or hook only when reuse is demonstrated.
5. Explain each backend-to-frontend data flow at the story checkpoint before proceeding.

---

## Notes

- `[P]` means the task changes different files and can proceed without an incomplete dependency.
- Story labels provide traceability to `spec.md` acceptance scenarios.
- Existing C# services remain the source of business rules; frontend validation improves feedback but
  never replaces backend authorization or validation.
- No task adds comments, likes, uploads, refresh tokens, editorial approval, Staff roles, deployment
  provider files, or a second Review model.
- Do not commit, amend, push, or create a pull request unless the user explicitly requests it.
