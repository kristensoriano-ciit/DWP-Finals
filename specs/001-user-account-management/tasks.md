# Tasks: User Account Management

**Input**: Design documents from `specs/001-user-account-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/users-api.yaml`, and `quickstart.md`

**Tests**: Automated service and API integration tests are required by the DWP Finals
constitution and are included in each user story.

**Organization**: Tasks are grouped by user story so registration and sign-in can be delivered as
the first backend MVP before profile and administration behavior is added.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel because it affects different files and has no incomplete dependency.
- **[Story]**: Maps the task to its owning user story.
- Every task names the exact file or directory it changes or validates.

## Phase 1: Setup

**Purpose**: Add the backend and test dependencies required by the approved technical plan.

- [X] T001 Add Identity, JWT bearer, EF Core SQL Server, EF design-time, and User Secrets dependencies to `dotnet-backend/dotnet-backend/dotnet-backend.csproj`
- [X] T002 [P] Create the xUnit integration test project with WebApplicationFactory and project references in `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj`
- [X] T003 [P] Add non-secret connection-string, JWT issuer/audience, token lifetime, and admin-seed configuration keys to `dotnet-backend/dotnet-backend/appsettings.json` and `dotnet-backend/dotnet-backend/appsettings.Development.json`

---

## Phase 2: Foundational Infrastructure

**Purpose**: Establish shared identity, persistence, API contracts, authentication, and test
infrastructure that block all user stories.

**⚠️ CRITICAL**: No user-story endpoint work begins until this phase builds successfully.

- [X] T004 [P] Create the Identity-based user entity with display name and lifecycle fields in `dotnet-backend/dotnet-backend/Models/ApplicationUser.cs`
- [X] T005 [P] Create the administrator deactivation audit entity and relationships in `dotnet-backend/dotnet-backend/Models/UserDeactivation.cs`
- [X] T006 Create the Identity EF Core context, indexes, constraints, and restricted delete rules in `dotnet-backend/dotnet-backend/Data/ApplicationDbContext.cs`
- [X] T007 [P] Create validated registration, login, profile, password, and paging request DTOs in `dotnet-backend/dotnet-backend/Contracts/Users/Requests.cs`
- [X] T008 [P] Create safe user, authentication, paging, and service-outcome response DTOs in `dotnet-backend/dotnet-backend/Contracts/Users/Responses.cs`
- [X] T009 Configure EF Core, Identity password rules, JWT validation with active-user checks, role policies, Problem Details, controller validation, CORS, and middleware order in `dotnet-backend/dotnet-backend/Program.cs`
- [X] T010 [P] Create an optional development seeder for Author/Admin roles and secret-backed initial administrator credentials in `dotnet-backend/dotnet-backend/Data/DevelopmentIdentitySeeder.cs`
- [X] T011 Generate the initial Identity and user-deactivation schema migration under `dotnet-backend/dotnet-backend/Migrations/`
- [X] T012 [P] Create the WebApplicationFactory, unique LocalDB test database lifecycle, test authentication helpers, and cleanup fixture in `dotnet-backend/dotnet-backend.Tests/Infrastructure/UserApiFactory.cs`

**Checkpoint**: The API starts with an Identity database, role setup, JWT middleware, and isolated
integration-test host, but no user-facing account endpoints yet.

---

## Phase 3: User Story 1 - Register and Sign In (Priority: P1) 🎯 MVP

**Goal**: Visitors can create active Author accounts, sign in, and receive authenticated access
without exposing credential data or account existence during failed login.

**Independent Test**: Register a unique user, sign in, use the bearer token to retrieve identity
claims, and confirm duplicate registration, bad credentials, and inactive access are rejected.

### Tests for User Story 1

- [X] T013 [P] [US1] Add service tests for normalization, Author assignment, duplicate email, password validation, and generic login failure in `dotnet-backend/dotnet-backend.Tests/UserAccountServiceTests.cs`
- [X] T014 [P] [US1] Add HTTP contract tests for register, login, safe responses, JWT claims, duplicate conflict, and invalid credentials in `dotnet-backend/dotnet-backend.Tests/AuthApiTests.cs`

### Implementation for User Story 1

- [X] T015 [US1] Define registration, login, profile, password, listing, and deactivation service operations in `dotnet-backend/dotnet-backend/Services/IUserAccountService.cs`
- [X] T016 [P] [US1] Implement short-lived JWT creation with user ID, email, and role claims in `dotnet-backend/dotnet-backend/Services/JwtTokenService.cs`
- [X] T017 [US1] Implement normalized registration, Author role assignment, secure login, and explicit service outcomes in `dotnet-backend/dotnet-backend/Services/UserAccountService.cs`
- [X] T018 [US1] Implement `POST /api/auth/register` and `POST /api/auth/login` with contract-matching responses in `dotnet-backend/dotnet-backend/Controllers/AuthController.cs`
- [X] T019 [US1] Register the account and token services, invoke development identity seeding, and add JWT authorization support to Swagger in `dotnet-backend/dotnet-backend/Program.cs`
- [X] T020 [US1] Run the US1 service and API tests from `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj` and correct contract deviations in `specs/001-user-account-management/contracts/users-api.yaml`

**Checkpoint**: User Story 1 is a complete backend MVP that supports registration and authenticated
sign-in independently of profile and admin endpoints.

---

## Phase 4: User Story 2 - Maintain Own Account (Priority: P2)

**Goal**: An authenticated user can read and update their own profile and change their password
without changing role or active status.

**Independent Test**: Sign in as an Author, read and update the profile, change the password, and
verify duplicate email, wrong current password, and attempts to alter protected fields fail.

### Tests for User Story 2

- [X] T021 [P] [US2] Add service tests for own-profile projection, trimmed updates, duplicate email, immutable role/status, and password changes in `dotnet-backend/dotnet-backend.Tests/UserAccountServiceTests.cs`
- [X] T022 [P] [US2] Add authenticated HTTP tests for profile retrieval, profile update, password change, unauthorized access, and validation errors in `dotnet-backend/dotnet-backend.Tests/AccountApiTests.cs`

### Implementation for User Story 2

- [X] T023 [US2] Implement current-user lookup, safe profile mapping, normalized profile update, conflict handling, and password change in `dotnet-backend/dotnet-backend/Services/UserAccountService.cs`
- [X] T024 [US2] Implement `GET /api/account/me`, `PUT /api/account/me`, and `PUT /api/account/password` in `dotnet-backend/dotnet-backend/Controllers/AccountController.cs`
- [X] T025 [US2] Run the US2 service and API tests from `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj` and confirm responses against `specs/001-user-account-management/contracts/users-api.yaml`

**Checkpoint**: User Stories 1 and 2 work together; users control only their own safe profile and
credentials.

---

## Phase 5: User Story 3 - Administer User Access (Priority: P3)

**Goal**: Administrators can list bounded pages of users and deactivate another account while
retaining identity, audit history, and future retrospective attribution.

**Independent Test**: Sign in as the seeded administrator, list users, deactivate an Author, and
confirm author requests fail while self-deactivation and Author access to admin routes are denied.

### Tests for User Story 3

- [X] T026 [P] [US3] Add service tests for paged projection, role enforcement, idempotent deactivation, self-deactivation conflict, and audit creation in `dotnet-backend/dotnet-backend.Tests/UserAccountServiceTests.cs`
- [X] T027 [P] [US3] Add HTTP tests for admin paging, maximum page size, forbidden Author access, deactivation, inactive JWT rejection, not found, and self-conflict in `dotnet-backend/dotnet-backend.Tests/AdminUsersApiTests.cs`

### Implementation for User Story 3

- [X] T028 [US3] Implement no-tracking paged user projection and transactional idempotent deactivation with audit records in `dotnet-backend/dotnet-backend/Services/UserAccountService.cs`
- [X] T029 [US3] Implement Admin-role `GET /api/admin/users` and `DELETE /api/admin/users/{userId}` endpoints in `dotnet-backend/dotnet-backend/Controllers/AdminUsersController.cs`
- [X] T030 [US3] Run the US3 service and API tests from `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj` and confirm responses against `specs/001-user-account-management/contracts/users-api.yaml`

**Checkpoint**: All three user stories are independently testable and the complete Users backend
meets the role, deactivation, and data-retention requirements.

---

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Verify security, documentation, performance, and full-project quality after all desired
user stories are complete.

- [X] T031 [P] Review generated Swagger against every operation and schema in `specs/001-user-account-management/contracts/users-api.yaml`
- [X] T032 [P] Verify no signing keys, seed passwords, hashes, security stamps, or internal exceptions appear in tracked settings or responses under `dotnet-backend/dotnet-backend/`
- [X] T033 Apply the migration and execute every documented scenario, then record any corrected commands in `specs/001-user-account-management/quickstart.md`
- [X] T034 Measure profile and admin endpoint p95 latency separately from password-hash operations and record test conditions/results in `specs/001-user-account-management/quickstart.md`
- [X] T035 Run the complete build and automated test suite from `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj` and resolve all failures before completion

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational Infrastructure (Phase 2)**: Depends on Setup and blocks every user story.
- **User Story 1 (Phase 3)**: Depends on Foundational Infrastructure and delivers the MVP.
- **User Story 2 (Phase 4)**: Depends on User Story 1 authentication but remains independently
  testable as an account-maintenance journey.
- **User Story 3 (Phase 5)**: Depends on User Story 1 authentication and seeded roles; it does not
  depend on User Story 2.
- **Polish (Phase 6)**: Depends on all user stories selected for delivery.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 Register and Sign In -> US2 Maintain Own Account
                                           └----> US3 Administer User Access
US2 + US3 -> Polish and Cross-Cutting Validation
```

### Within Each User Story

1. Add focused service and HTTP tests for the story.
2. Implement or extend the account service business operations.
3. Add the owning controller endpoints.
4. Run the story-specific test project and compare the API with the contract.
5. Stop at the checkpoint before moving to the next priority.

## Parallel Opportunities

### Setup and Foundation

- T002 and T003 can run in parallel after T001 begins because they use separate files.
- T004, T005, T007, and T008 can run in parallel before context and middleware integration.
- T010 and T012 can run in parallel after the shared context and Program setup exist.

### User Story 1

```text
Parallel: T013 service tests | T014 authentication API tests | T016 JWT token service
Then: T015 -> T017 -> T018 -> T019 -> T020
```

### User Story 2

```text
Parallel: T021 profile service tests | T022 account API tests
Then: T023 -> T024 -> T025
```

### User Story 3

```text
Parallel: T026 administration service tests | T027 administration API tests
Then: T028 -> T029 -> T030
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational Infrastructure.
2. Complete User Story 1 only.
3. Stop and validate registration, sign-in, JWT access, duplicate email, and inactive access.
4. Demonstrate the backend MVP through Swagger before adding profile or administration behavior.

### Incremental Delivery

1. **MVP**: Registration and sign-in establish secure identity.
2. **Increment 2**: Own-profile and password maintenance add account self-service.
3. **Increment 3**: Paged listing and deactivation add administrator moderation.
4. **Final validation**: Contract, secret handling, migration, quickstart, and performance checks.

## Notes

- Identity's managers are the persistence abstraction; do not add a duplicate user repository.
- Controllers map HTTP only; account and deactivation rules remain in `UserAccountService`.
- All database and Identity operations use async APIs and accept cancellation where supported.
- Account removal means deactivation. Do not physically delete users or authored content.
- Store the JWT key and seeded administrator password with User Secrets, never tracked JSON files.

---

## Phase 7: Security and Contract Review Remediation

**Purpose**: Resolve findings from the final independent implementation review.

- [X] T036 Add login lockout, endpoint rate limiting, and equivalent unknown-email password work in `dotnet-backend/dotnet-backend/Program.cs` and `dotnet-backend/dotnet-backend/Services/UserAccountService.cs`
- [X] T037 Handle concurrent unique-email conflicts without HTTP 500 responses in `dotnet-backend/dotnet-backend/Services/UserAccountService.cs`
- [X] T038 Revoke existing JWTs after password changes using an account authentication version and migration under `dotnet-backend/dotnet-backend/Models/ApplicationUser.cs` and `dotnet-backend/dotnet-backend/Migrations/`
- [X] T039 Make HTTP validation operate on normalized display names and emails in `dotnet-backend/dotnet-backend/Contracts/Users/Requests.cs`
- [X] T040 Prevent page-offset integer overflow in `dotnet-backend/dotnet-backend/Services/UserAccountService.cs`
- [X] T041 Align generated Swagger security requirements with anonymous and authorized operations in `dotnet-backend/dotnet-backend/OpenApi/AuthorizeOperationFilter.cs`
- [X] T042 Validate integration tests through actual EF migrations in `dotnet-backend/dotnet-backend.Tests/Infrastructure/UserApiFactory.cs`
- [X] T043 Add regression coverage for review findings and rerun the complete suite in `dotnet-backend/dotnet-backend.Tests/dotnet-backend.Tests.csproj`
