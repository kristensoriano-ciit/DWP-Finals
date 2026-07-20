# Feature Specification: Full-Stack Retrospective Portal

**Feature Branch**: `004-fullstack-retrospective-portal`

**Created**: 2026-07-21

**Status**: Ready for Implementation

**Input**: User description: "Create feature 004-fullstack-retrospective-portal. Build a full-stack game retrospective website with public game and retrospective browsing, authentication, author publishing tools, profile management, and Admin dashboards for games and users. Authors publish directly. Use the existing ASP.NET Core APIs and current Checkpoint React design. Include accessibility, responsive layouts, API failure states, concurrency handling, tests, environment configuration, and setup documentation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Published Retrospectives (Priority: P1)

A visitor uses the Checkpoint site without an account to discover active games, browse published
retrospectives, search and refine the available content, and read a complete retrospective. The
visitor can also open a game to see its information and related published retrospectives.

**Why this priority**: Reading published retrospectives is the site's primary public value and
provides a useful release even before account and management screens are available.

**Independent Test**: Seed active and archived games plus retrospectives in several statuses, then
browse as a signed-out visitor and verify that active games and only published, non-archived
retrospectives can be found and opened through bounded lists.

**Acceptance Scenarios**:

1. **Given** published retrospectives exist, **When** a visitor opens the home page, **Then** the
   newest published retrospective is presented prominently and bounded newest and best selections
   are available.
2. **Given** active and archived games exist, **When** a visitor browses or searches games, **Then**
   only matching active games are displayed with bounded pagination.
3. **Given** published retrospectives for several games exist, **When** a visitor searches, filters
   by game, changes between newest and best sorting, or changes page, **Then** the displayed results
   and visible query controls reflect those choices.
4. **Given** a published retrospective exists, **When** a visitor opens it, **Then** its game,
   author, title, full content, image when available, rating, and publication date are displayed.
5. **Given** an active game exists, **When** a visitor opens it, **Then** the game's public details
   and its published retrospectives are displayed.
6. **Given** no content matches the current query, **When** results finish loading, **Then** the
   visitor sees a clear empty state and a way to clear or change the query.

---

### User Story 2 - Access and Maintain an Account (Priority: P2)

A visitor registers as an Author or signs in to an existing account. An authenticated user can
view and update their profile, change their password, sign out, and return to an intended protected
destination after successful sign-in.

**Why this priority**: Authentication establishes the identity and role required by every author
and administrative workflow while still delivering useful account-management capability alone.

**Independent Test**: Register a new Author, sign out, sign in, update the profile, change the
password, and verify that protected content follows the current account and session state.

**Acceptance Scenarios**:

1. **Given** a visitor provides valid unique account details, **When** registration succeeds,
   **Then** an active Author account is created and the visitor can proceed to sign in.
2. **Given** an active user provides valid credentials, **When** sign-in succeeds, **Then** the site
   shows role-appropriate navigation and returns the user to their intended safe destination.
3. **Given** invalid, incomplete, or rejected credentials, **When** registration or sign-in is
   attempted, **Then** the user receives actionable feedback without account-sensitive details.
4. **Given** an authenticated user, **When** they update valid profile information, **Then** the
   updated identity is shown consistently throughout the site.
5. **Given** an authenticated user changes their password, **When** the change succeeds, **Then**
   the current session ends and the new password is required for the next sign-in.
6. **Given** an authenticated session expires or becomes invalid, **When** a protected action is
   attempted, **Then** the session is cleared, the user is sent to sign-in, and a clear explanation
   is shown.

---

### User Story 3 - Author and Publish Retrospectives (Priority: P3)

An Author uses a private dashboard to browse their retrospectives in every active status, create a
retrospective for an active game, edit its content, publish or unpublish it directly, and archive it
when it is no longer needed.

**Why this priority**: Author publishing supplies the content readers consume and completes the
site's main end-to-end business journey.

**Independent Test**: Sign in as an Author, create a draft, edit it, publish it, confirm its public
visibility, unpublish it with a reason, and archive it while verifying ownership and stale-edit
protection throughout.

**Acceptance Scenarios**:

1. **Given** an Author and an active game, **When** the Author submits valid retrospective content,
   **Then** a new owned retrospective is saved in the selected initial status.
2. **Given** an Author has retrospectives in several statuses, **When** they open or filter their
   dashboard, **Then** only their non-archived retrospectives in the requested status are shown.
3. **Given** an Author owns a retrospective, **When** they change its game, title, content, image,
   or rating using the latest version, **Then** the normalized changes are saved and the displayed
   version is refreshed.
4. **Given** an Author owns a valid retrospective, **When** they publish it, **Then** it becomes
   publicly readable without administrative approval.
5. **Given** an Author owns a published retrospective, **When** they provide a valid reason and
   unpublish it, **Then** it leaves public results and the private dashboard retains the reason.
6. **Given** an Author confirms archival with the latest version, **When** archival succeeds,
   **Then** the retrospective leaves active owner and public views and cannot be edited again.
7. **Given** a retrospective changed after the Author loaded it, **When** the Author attempts a
   stale edit or status change, **Then** the site preserves the Author's entered text, explains the
   conflict, and offers a safe way to load the current version.
8. **Given** an Author has unsaved edits, **When** they try to leave the editor, **Then** the site
   warns that those changes will be lost.

---

### User Story 4 - Administer Games (Priority: P4)

An Admin uses a protected dashboard to browse, search, create, update, and archive games that
support public discovery and Author retrospective creation.

**Why this priority**: A maintained game catalog is required for long-term authoring, but existing
seed data permits the reader and Author journeys to deliver value first.

**Independent Test**: Sign in as an Admin, add a unique game, find and update it, verify public and
Author visibility, then archive it and verify that retained published retrospective attribution is
not broken.

**Acceptance Scenarios**:

1. **Given** an Admin provides valid unique game information, **When** they create the game, **Then**
   it becomes available in active game browsing and Author selection.
2. **Given** an active game, **When** an Admin saves valid changes, **Then** its updated information
   appears wherever that game is shown.
3. **Given** an active game, **When** an Admin confirms archival, **Then** it leaves active game and
   Author-selection results while retained published retrospectives remain readable and attributed.
4. **Given** duplicate or invalid game information, **When** an Admin submits it, **Then** no change
   is made and field-specific or form-level corrective feedback is shown.
5. **Given** a non-Admin user, **When** they attempt a game-management action, **Then** the action is
   denied even if its screen was reached directly.

---

### User Story 5 - Administer User Access (Priority: P5)

An Admin uses a protected dashboard to browse paged user accounts and deactivate another user who
should no longer have access.

**Why this priority**: User access administration supports safe operation but is less frequent than
public reading, authoring, and catalog maintenance.

**Independent Test**: Sign in as an Admin, browse users, deactivate a different active user, and
verify that the target loses authenticated access while the Admin cannot deactivate themselves.

**Acceptance Scenarios**:

1. **Given** active and inactive accounts exist, **When** an Admin browses users, **Then** bounded
   results identify each user's role and current access state.
2. **Given** another active user, **When** an Admin confirms deactivation, **Then** that user becomes
   inactive and their existing authenticated access stops working.
3. **Given** an Admin selects their own account, **When** deactivation is attempted, **Then** the
   operation is prevented and the reason is explained.
4. **Given** a non-Admin user, **When** they attempt to browse or deactivate users, **Then** access is
   denied even if they navigate directly to the administrative location.

### Edge Cases

- A direct link or browser refresh must restore the requested public location and must restore a
  still-valid authenticated session before deciding access to a protected location.
- A broken, missing, or non-secure image address must not break the surrounding page; a consistent
  fallback must preserve the content's label and layout.
- If the service is unreachable, times out, or returns an unexpected response, the current page must
  show a recoverable error without replacing valid user-entered form content.
- Repeated submission while a save is in progress must not create duplicate accounts, games, or
  retrospectives or apply a lifecycle action twice.
- A session that expires during editing must temporarily preserve the safe Retrospective draft,
  require sign-in, restore the draft after a safe return to the editor, and retry only after explicit
  Author action.
- Archived games must be unavailable for new or updated retrospectives, while already-published
  retrospectives retain readable game attribution.
- Archived and unpublished retrospectives must never appear in public results, including when an
  old direct address is used.
- Extremely high page numbers must produce a valid empty result rather than an error or unbounded
  operation.
- An empty site or a game with no published retrospectives must show an intentional empty state
  rather than incomplete controls or placeholder content.
- Administrative confirmation must identify the selected game or user and permit cancellation
  without side effects.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST provide consistent navigation to public games, public retrospectives,
  account access, Author tools, and Admin tools that are available to the current user.
- **FR-002**: The home experience MUST prominently display the newest published retrospective and
  bounded selections of newest and best published retrospectives.
- **FR-003**: Visitors MUST be able to browse and open active games without an account.
- **FR-004**: Visitors MUST be able to browse and open published, non-archived retrospectives without
  an account.
- **FR-005**: Public game and retrospective collections MUST support bounded pagination and relevant
  search, game filtering, and newest or best sorting controls.
- **FR-006**: A public game detail MUST include its public game information and a bounded collection
  of its published retrospectives.
- **FR-007**: A public retrospective detail MUST include its game and Author attribution, title,
  full review content, optional image, rating, and publication date without private workflow data.
- **FR-008**: The site MUST provide clear not-found behavior for unknown, inactive, archived,
  unpublished, or otherwise unavailable public resources.
- **FR-009**: A visitor MUST be able to register a unique active Author account with valid profile
  information and credentials.
- **FR-010**: An active user MUST be able to sign in, sign out, and retain authenticated access
  across a page refresh until the authenticated session expires or becomes invalid.
- **FR-011**: The site MUST return a successfully authenticated user only to an intended internal
  location that their role permits.
- **FR-012**: An authenticated user MUST be able to view and update their own display name and email
  without changing their role or active state.
- **FR-013**: An authenticated user MUST be able to change their password, and a successful password
  change MUST end existing authenticated access.
- **FR-014**: Protected Author and Admin operations MUST enforce identity, role, active-account, and
  ownership rules independently of which controls the site displays.
- **FR-015**: An Author MUST be able to browse and filter only their own non-archived retrospectives
  across Draft, Review, Published, and Unpublished statuses.
- **FR-016**: An Author MUST be able to create a retrospective for an active game with a trimmed
  title and content, an integer rating from 1 through 10, and an optional secure image address.
- **FR-017**: An Author MUST be able to update the game, title, content, rating, and optional image
  of only their own non-archived retrospective using its current version.
- **FR-018**: An Author MUST be able to move their own retrospective directly among Draft, Review,
  Published, and Unpublished without Admin approval.
- **FR-019**: Moving a retrospective to Unpublished MUST require a non-blank reason, and publishing
  or unpublishing MUST update its public visibility immediately after success.
- **FR-020**: An Author MUST be able to archive only their own non-archived retrospective after an
  explicit confirmation using its current version, and archival MUST be terminal.
- **FR-021**: A stale retrospective update or lifecycle action MUST be rejected without overwriting
  newer work, and the Author's current unsaved text MUST remain available for reconciliation.
- **FR-022**: The retrospective editor MUST warn an Author before navigation would discard unsaved
  changes.
- **FR-023**: An Admin MUST be able to browse, search, filter, create, and update active games using
  the catalog's validation and uniqueness rules.
- **FR-024**: An Admin MUST be able to archive an active game after explicit confirmation; archived
  games MUST leave active browsing and Author selection without breaking retained retrospective
  attribution.
- **FR-025**: An Admin MUST be able to browse a bounded collection of active and inactive users with
  their display name, role, and access state.
- **FR-026**: An Admin MUST be able to deactivate another active user after explicit confirmation,
  and the deactivated user's authenticated access MUST stop working.
- **FR-027**: An Admin MUST NOT be able to deactivate their own account.
- **FR-028**: Failed form submissions MUST associate correctable validation feedback with the
  relevant fields and preserve all safe user-entered values.
- **FR-029**: The site MUST prevent repeated activation of a submission or destructive action while
  that operation is still pending.
- **FR-030**: Public and protected requests MUST distinguish validation, unauthenticated, forbidden,
  not-found, conflict, and unexpected failures so the user receives an appropriate recovery action.
- **FR-031**: Setup documentation MUST explain required configuration, data preparation, account
  preparation, startup, testing, and production-preview steps without including secrets.
- **FR-032**: Example configuration MUST identify every required environment-specific value and MUST
  use non-secret placeholders for sensitive values.

### User Experience Requirements *(mandatory when the feature has a user interface)*

- **UXR-001**: The feature MUST reuse the Checkpoint visual identity, navigation patterns, spacing,
  color treatment, rating presentation, and editorial hierarchy established by the current site.
- **UXR-002**: User-facing terminology MUST consistently use Retrospective, Author, Admin, Game,
  Draft, Review, Published, and Unpublished with the same meanings throughout the site.
- **UXR-003**: Every data-driven screen MUST define applicable loading, empty, success, validation,
  unauthenticated, forbidden, not-found, conflict, and unexpected-error states.
- **UXR-004**: Interactive controls MUST have meaningful labels, visible keyboard focus, and complete
  keyboard-operable behavior in a logical focus order.
- **UXR-005**: Form feedback and important asynchronous status changes MUST be available to assistive
  technology without moving focus unexpectedly.
- **UXR-006**: The feature MUST remain usable without horizontal page scrolling from 320-pixel-wide
  mobile screens through common large desktop screens.
- **UXR-007**: Destructive actions MUST require a clearly labeled confirmation that identifies the
  affected resource, describes the consequence, and allows cancellation.
- **UXR-008**: Missing or failed images MUST use a consistent fallback that preserves meaningful
  alternative text and stable layout dimensions.
- **UXR-009**: User-facing errors MUST explain what happened and the next available action without
  exposing internal diagnostics, credentials, or private account data.
- **UXR-010**: Role-inappropriate navigation and controls MUST be hidden while direct access remains
  protected and results in a clear access-denied experience.

### Performance Requirements *(mandatory)*

- **PR-001**: Performance-sensitive journeys are the initial home display, game and retrospective
  browsing, retrospective detail display, Author dashboard display, and Admin list display.
- **PR-002**: Under normal conditions with 100 games, 200 retrospectives distributed across statuses,
  100 users, a warmed service, one sequential simulated client, and a stable local network, 95% of
  primary data operations MUST complete in under 500 milliseconds.
- **PR-003**: Under the same normal conditions, primary page content MUST become visible within 2.5
  seconds for at least 95% of measured page visits on supported desktop and mobile viewports.
- **PR-004**: Every game, retrospective, and user collection MUST be bounded to no more than 100
  records per request and MUST provide pagination when additional records exist.
- **PR-005**: A single user action MUST NOT cause repeated equivalent data requests unless the user
  explicitly retries or refreshes the data.

### Key Entities *(include if feature involves data)*

- **User**: A registered identity with a display name, email, active state, and Author or Admin role;
  Authors own retrospectives and Admins manage games and user access.
- **Game**: A catalog entry with a title, description, release date, optional cover image, and active
  lifecycle state; active games can receive new retrospectives.
- **Retrospective**: An Author-owned assessment of one game containing a title, full review content,
  optional image, rating, publication lifecycle, timestamps, and a version used to prevent stale
  writes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test participants can find and open a retrospective matching
  a specified game and sort order within 2 minutes without assistance.
- **SC-002**: At least 90% of test Authors can create, publish, and verify public visibility of a
  valid retrospective within 5 minutes without assistance.
- **SC-003**: At least 90% of test Admins can create or update a game and verify its active catalog
  visibility within 3 minutes without assistance.
- **SC-004**: All tested attempts to access another Author's content or an Admin operation without
  the required identity and role are denied without exposing protected data.
- **SC-005**: All tested stale retrospective writes preserve the newer saved version and retain the
  current Author's unsaved text for recovery.
- **SC-006**: Primary content is visible within 2.5 seconds for at least 95% of measured visits under
  the documented normal conditions.
- **SC-007**: Primary data operations complete within 500 milliseconds at the 95th percentile under
  the documented normal conditions.
- **SC-008**: All primary visitor, Author, account, and Admin journeys can be completed using only a
  keyboard at both a 320-pixel-wide viewport and a common desktop viewport.
- **SC-009**: Every specified loading, empty, validation, access, not-found, conflict, and unexpected
  failure scenario presents an actionable user-facing state during acceptance testing.
- **SC-010**: A new developer can configure required non-secret values, prepare data, start both
  application parts, and reach the home page by following the setup guide without undocumented
  steps.

## Assumptions

- Existing account, game, retrospective, role, ownership, lifecycle, paging, and concurrency
  capabilities remain the source of truth and will be reused rather than duplicated.
- All public registrations create Authors; Admin accounts are prepared through the documented
  trusted environment setup rather than public registration.
- Authors publish directly, and the Review status is an Author-controlled workflow label rather
  than an editorial approval queue.
- Public read access will be extended to active games so signed-out visitors can browse games and
  use complete game filters; all game-management actions remain Admin-only.
- Account recovery, email verification, multi-factor authentication, session renewal, and external
  identity providers are outside this feature.
- Comments, reader ratings, likes, favorites, notifications, analytics, editorial approval, and a
  separate Staff role are outside this feature.
- Images continue to use optional secure external addresses; uploading and storing media are outside
  this feature.
- English is the only supported language for this release.
- Supported clients are current mainstream desktop and mobile browsers with scripting enabled.
- The current uncommitted Checkpoint visual prototype is the design baseline and will be preserved
  while its mock content is replaced with live behavior.
