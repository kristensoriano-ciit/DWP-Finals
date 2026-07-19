# Research: User Account Management

## ASP.NET Core Identity for credentials

**Decision**: Use ASP.NET Core Identity with a custom `ApplicationUser` and GUID keys.

**Rationale**: Identity provides maintained password hashing, password verification, role
management, normalized email handling, security stamps, and lockout primitives. Reimplementing
these security-sensitive operations would add risk and code that is difficult for a student to
verify.

**Alternatives considered**:

- A custom user table and manual password hashing was rejected because authentication security
  would become application-owned.
- Identity's generated UI was rejected because this project exposes a backend API to React.

## JWT bearer authentication

**Decision**: Issue a short-lived JWT access token after successful sign-in and validate it with
ASP.NET Core JWT bearer authentication. Include user ID, email, and role claims. On token
validation, confirm that the user still exists and is active.

**Rationale**: JWT bearer authentication fits the separate React client while the active-user
check ensures an administrator's deactivation takes effect on subsequent requests instead of only
after token expiration.

**Alternatives considered**:

- Cookie authentication was not selected because the agreed client contract uses bearer tokens.
- Refresh tokens were deferred to avoid expanding the first account slice; users sign in again
  after access-token expiration.

## SQL Server LocalDB and EF Core

**Decision**: Use Entity Framework Core 8 with the SQL Server provider and SQL Server LocalDB for
development. Manage schema changes through migrations.

**Rationale**: LocalDB integrates with Visual Studio and SQL Server Object Explorer, while EF Core
supports Identity's schema and async queries cleanly.

**Alternatives considered**:

- SQLite was considered for simpler setup but rejected as the primary store because the user chose
  Visual Studio's SQL Server tooling.
- A full remote SQL Server instance is unnecessary for local development and can be configured
  later through the same connection-string contract.

## Account removal semantics

**Decision**: Interpret removal as soft deactivation. Keep the user row, set inactive and
deactivation timestamps, create an audit record, and deny future authentication. Repeating the
operation is idempotent.

**Rationale**: Retrospectives need durable author attribution. Hard deletion or cascading deletion
would cause avoidable data loss.

**Alternatives considered**:

- Hard deletion was rejected because it would break or erase retrospective ownership.
- Blocking removal whenever content exists was rejected because administrators still need to
  disable access.

## Service and persistence boundaries

**Decision**: Use one injected `IUserAccountService` backed by `UserManager<ApplicationUser>`,
`RoleManager<IdentityRole<Guid>>`, and `ApplicationDbContext`. Do not create a user repository.

**Rationale**: Controllers stay thin, business outcomes are testable, and Identity already acts as
the account persistence abstraction. A second repository would hide simple operations and make the
learning path harder to follow.

**Alternatives considered**:

- Logic directly in controllers was rejected because it mixes HTTP and account rules.
- A repository plus service plus manager stack was rejected as duplicate abstraction.

## Testing strategy

**Decision**: Use xUnit for service tests and `WebApplicationFactory` for HTTP integration tests.
Create a uniquely named SQL Server LocalDB database for each integration-test run, reset state
between test cases, and delete the test database when the run finishes.

**Rationale**: Authentication middleware, Identity, uniqueness constraints, authorization, and EF
Core behavior need integration coverage. Focused service tests still provide fast feedback for
normalization and rule outcomes.

**Alternatives considered**:

- EF Core's non-relational in-memory provider was rejected for integration tests because it does
  not reproduce relational indexes and constraints.
- Manual Swagger-only testing was rejected because it cannot provide repeatable regression
  coverage.

## Performance measurement

**Decision**: Measure profile and administration endpoint p95 latency separately from register,
sign-in, and password-change operations. Report authentication timing without reducing secure
password-hashing cost.

**Rationale**: Password hashing is deliberately expensive. Combining those requests with ordinary
queries would make the metric misleading and could encourage unsafe tuning.

**Alternatives considered**:

- One global latency number was rejected because the endpoint workloads are materially different.
