# Feature Specification: Game Management

**Feature Branch**: `main`

**Created**: 2026-07-20

**Status**: Draft

**Input**: Create the Games backend before starting the frontend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Games (Priority: P1)

An authenticated user browses active games, searches by title, views one game, and filters games
into new and upcoming release panels.

**Why this priority**: Authors need a game to select before creating retrospectives, and the
dashboard requires release panels.

**Independent Test**: Create games with past, recent, and future dates; verify paging, title search,
new releases, upcoming releases, and detail retrieval return only active games.

**Acceptance Scenarios**:

1. **Given** active games exist, **When** an authenticated user requests a page, **Then** a bounded
   page ordered by title is returned.
2. **Given** recent and future games exist, **When** new or upcoming filtering is requested,
   **Then** games are selected and ordered by release date correctly.
3. **Given** a partial title, **When** search is requested, **Then** matching active games are
   returned without case sensitivity.
4. **Given** an archived or unknown game, **When** ordinary detail is requested, **Then** the game
   is not returned.

### User Story 2 - Maintain Game Catalog (Priority: P2)

An administrator creates games and updates catalog details while authors are forbidden from making
catalog changes.

**Why this priority**: A controlled catalog prevents duplicate and inconsistent game records.

**Independent Test**: Sign in as an administrator, create and update a game, verify duplicate title
and release-date combinations are rejected, and verify an author receives forbidden responses.

**Acceptance Scenarios**:

1. **Given** valid game details, **When** an administrator creates a game, **Then** an active game
   is returned.
2. **Given** an existing game, **When** an administrator updates valid details, **Then** the catalog
   reflects the normalized values.
3. **Given** the same normalized title and release date, **When** a duplicate is created or updated,
   **Then** the request returns a conflict.
4. **Given** an author, **When** a catalog mutation is attempted, **Then** access is forbidden.

### User Story 3 - Archive Games (Priority: P3)

An administrator removes a game from active use by archiving it without deleting the database row
or future retrospective relationships.

**Why this priority**: Catalog mistakes must be removable without destroying retrospective history.

**Independent Test**: Archive a game twice, verify both operations succeed, and verify the game no
longer appears in active listing or detail results.

**Acceptance Scenarios**:

1. **Given** an active game, **When** an administrator removes it, **Then** it is archived with a
   timestamp and is no longer selectable.
2. **Given** an archived game, **When** removal is repeated, **Then** the operation succeeds without
   creating another record or changing history.
3. **Given** an unknown game identifier, **When** removal is requested, **Then** not found is
   returned.

### Edge Cases

- Title uniqueness ignores casing and surrounding whitespace but includes release date so remakes
  can share a title when released on different dates.
- New releases are active games released today or during the previous 90 days.
- Upcoming releases are active games with a release date after today.
- Empty search text behaves like no search filter.
- Page values below one or page sizes outside 1-100 are rejected.
- Extremely large page numbers return an empty page without numeric overflow.
- Cover URLs must use HTTP or HTTPS when supplied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Games MUST contain an ID, title, optional description, release date, optional cover
  image URL, active status, creation time, update time, and optional archive time.
- **FR-002**: Titles MUST be trimmed, contain 1-200 characters, and have a normalized value used
  for case-insensitive uniqueness.
- **FR-003**: The normalized title and release date combination MUST be unique.
- **FR-004**: Descriptions MUST contain no more than 2,000 characters after trimming.
- **FR-005**: Cover URLs MUST be empty or absolute HTTP/HTTPS URLs containing at most 2,048
  characters.
- **FR-006**: Authenticated users MUST be able to list, search, filter, and retrieve active games.
- **FR-007**: Lists MUST be paginated with a default size of 20 and maximum size of 100.
- **FR-008**: New-release filtering MUST include today and the previous 90 days, newest first.
- **FR-009**: Upcoming filtering MUST include dates after today, soonest first.
- **FR-010**: Only administrators MUST create, update, or archive games.
- **FR-011**: Archive operations MUST retain the game row and MUST be idempotent.
- **FR-012**: Archived games MUST not appear in ordinary lists or detail lookup.
- **FR-013**: Validation, conflict, forbidden, and not-found outcomes MUST be distinguishable.

### Performance Requirements *(mandatory)*

- **PR-001**: Active game list and detail operations MUST target p95 below 500 milliseconds under
  documented local test conditions.
- **PR-002**: Game listing MUST use bounded database queries and MUST not load the full catalog.

### Key Entities

- **Game**: Catalog record selected by retrospectives and displayed in release panels.
- **User Account**: Existing Author or Admin identity; Admin role controls catalog mutations.
- **Retrospective**: Future content that references a retained game even after archival.

## Success Criteria *(mandatory)*

- **SC-001**: Users can find an active game by title in under 30 seconds.
- **SC-002**: All tested duplicate title/date attempts produce one persisted game and one conflict.
- **SC-003**: All tested author mutation attempts are denied.
- **SC-004**: Archived games disappear from every tested active lookup while their rows remain.
- **SC-005**: Game list and detail operations remain below 500 milliseconds p95 locally.

## Assumptions

- Game reads require authentication because the current flow places panels after the dashboard.
- Admins own create, update, and archive operations.
- Removal means archival, not physical deletion.
- Description and cover image URL are optional.
- Genre, developer, platform, and external game-provider integration are outside this first slice.
