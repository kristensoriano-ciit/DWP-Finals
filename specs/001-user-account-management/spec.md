# Feature Specification: User Account Management

**Feature Branch**: `main`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Create backend user account management. Users can register, log in,
view and update their profile, and change their password. Users have either an author or admin
role. Admins can list and remove users. Email addresses must be unique. Return clear validation
and authorization errors. This feature is backend-only."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Sign In (Priority: P1)

A visitor creates an author account with a display name, email address, and password, then signs in
to receive authenticated access to protected account operations.

**Why this priority**: Every protected author and admin capability depends on reliable account
identity and sign-in behavior.

**Independent Test**: Register a new account, sign in with its credentials, and verify the
authenticated result contains the new user's identity and Author role without credential data.

**Acceptance Scenarios**:

1. **Given** a visitor provides a valid display name, unused email address, and valid password,
   **When** registration is submitted, **Then** an active author account is created without
   returning password data.
2. **Given** an active account and correct credentials, **When** the user signs in, **Then** the
   system grants authenticated access and returns the user's identity and role.
3. **Given** an email address that is already registered, **When** registration is submitted,
   **Then** the request is rejected and no duplicate account is created.
4. **Given** invalid credentials or a deactivated account, **When** sign-in is attempted, **Then**
   access is denied without revealing whether the email address exists.

---

### User Story 2 - Maintain Own Account (Priority: P2)

An authenticated user views and updates their display name or email address and changes their
password after confirming the current password.

**Why this priority**: Account maintenance lets users keep their information and credentials
accurate without administrator intervention.

**Independent Test**: Sign in as an author, update the profile, change the password, and verify
that the updated profile and new password work while the old password no longer works.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** the current profile is requested, **Then** only that
   user's safe account details are returned.
2. **Given** a valid display name and unused email address, **When** an authenticated user updates
   their profile, **Then** the normalized values are saved without changing the user's role.
3. **Given** the correct current password and a valid new password, **When** a password change is
   submitted, **Then** the new password is accepted for future sign-ins and the old password is
   rejected.
4. **Given** an incorrect current password or duplicate new email address, **When** an update is
   submitted, **Then** the change is rejected and existing account data remains unchanged.

---

### User Story 3 - Administer User Access (Priority: P3)

An administrator views a paged user list and removes a user from active access by deactivating the
account while preserving historical content and attribution.

**Why this priority**: Administration is necessary for account moderation, but it depends on the
registration, authentication, and profile foundation.

**Independent Test**: Sign in as an administrator, retrieve a page of users, deactivate an author,
and verify that the author can no longer sign in while existing retrospective attribution remains.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** the user list is requested, **Then** a bounded
   page of users is returned without password or credential data.
2. **Given** an active author account, **When** an administrator removes that user, **Then** the
   account is deactivated, access is denied, and historical retrospective records remain intact.
3. **Given** an authenticated author, **When** the author attempts an administrator operation,
   **Then** access is forbidden.
4. **Given** an administrator targets their own account for removal, **When** the request is
   submitted, **Then** the operation is rejected to avoid accidental administrator lockout.

---

### Edge Cases

- Email uniqueness is checked without regard to letter casing or surrounding whitespace.
- Display names containing only whitespace are rejected after normalization.
- Concurrent registrations or profile updates using the same email result in only one successful
  owner of that email address.
- Password changes do not partially apply when credential validation fails.
- Requests from expired, invalid, or deactivated authenticated sessions are denied.
- Deactivating an already inactive user returns an idempotent success result without changing
  historical data.
- Page sizes below one or above the allowed maximum are rejected or normalized consistently.
- Requests for nonexistent users return a not-found outcome without exposing sensitive data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow visitors to register with a display name, email address, and
  password.
- **FR-002**: New public registrations MUST receive the author role and an active status; public
  registration MUST NOT create administrators.
- **FR-003**: Email addresses MUST be normalized and unique without regard to casing.
- **FR-004**: Display names MUST be trimmed and contain between 2 and 50 characters.
- **FR-005**: Passwords MUST contain between 8 and 128 characters.
- **FR-006**: Passwords MUST be stored using an approved one-way password hashing mechanism and
  MUST never be returned by account operations.
- **FR-007**: Active users MUST be able to sign in using their email address and password.
- **FR-008**: Failed sign-in responses MUST NOT reveal whether an email address is registered.
- **FR-009**: Authenticated users MUST be able to retrieve only their own safe profile details.
- **FR-010**: Authenticated users MUST be able to update their display name and email address but
  MUST NOT be able to change their own role or active status.
- **FR-011**: Authenticated users MUST provide their correct current password before setting a new
  password.
- **FR-012**: Only administrators MUST be allowed to list users or deactivate another user.
- **FR-013**: User listing MUST be paginated with a default page size of 20 and a maximum page size
  of 100.
- **FR-014**: Deactivation MUST prevent future authenticated access while retaining the user's
  identity and historical retrospective attribution.
- **FR-015**: Administrators MUST NOT be allowed to deactivate their own account through this
  operation.
- **FR-016**: Deactivation attempts MUST be recorded with the acting administrator, affected user,
  and timestamp.
- **FR-017**: Validation, unauthenticated, forbidden, conflict, and not-found outcomes MUST be
  distinguishable without exposing credentials or internal exception details.
- **FR-018**: All account and administration operations MUST complete atomically so failed
  operations do not leave partial changes.

### Performance Requirements *(mandatory)*

- **PR-001**: Registration, sign-in, profile, password, and administration operations are the
  performance-sensitive journeys for this feature; normal test conditions MUST be documented in
  the implementation plan.
- **PR-002**: At least 95 percent of primary account operations MUST return an outcome within
  500 milliseconds under documented normal test conditions, excluding intentional password-hash
  work that is documented and measured separately.
- **PR-003**: User listing MUST use a bounded page size and MUST NOT load the complete user set.

### Key Entities

- **User Account**: Represents an author or administrator, including identity, display name,
  normalized email, role, active status, creation time, and optional deactivation time. Credential
  data is private and never part of a public account representation.
- **User Deactivation Record**: Represents an administrator's account-removal action, including the
  acting administrator, affected user, and timestamp.
- **Retrospective**: Existing authored content that retains its relationship to a deactivated user
  for attribution and data integrity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete registration and successful sign-in in under two minutes.
- **SC-002**: All tested duplicate-email attempts result in one account per normalized email.
- **SC-003**: All tested unauthenticated and wrong-role requests are denied without returning
  protected account data.
- **SC-004**: At least 95 percent of primary account operations complete within 500 milliseconds
  under documented normal test conditions.
- **SC-005**: An administrator can locate and deactivate a user in under one minute, and the
  deactivated user is denied access on every subsequent tested request.
- **SC-006**: Existing retrospective attribution remains available after every tested account
  deactivation.

## Assumptions

- The first administrator account is provisioned through controlled application setup rather than
  public registration.
- "Remove user" means deactivate account access, not physically delete the user row or authored
  content.
- Email verification, forgotten-password recovery, account reactivation, and permanent erasure are
  outside this initial feature.
- Game administration and retrospective publishing are separate features.
- Normal test conditions and expected account volume will be documented during technical planning.
