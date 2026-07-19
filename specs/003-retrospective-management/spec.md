# Feature Specification: Retrospective Management

**Feature Branch**: `main`

**Created**: 2026-07-20

**Status**: Implemented

**Input**: Add the complete backend feature for author-owned game retrospectives.

## User Scenarios & Testing

### User Story 1 - Browse Published Retrospectives (Priority: P1)

Any visitor, including a user without an account, browses and opens published reviews, searches review text, filters
by game, and sorts by newest or best rating.

**Independent Test**: Seed published and private reviews, then verify only published reviews appear
in bounded shared list/detail results in the requested order.

**Acceptance Scenarios**:

1. **Given** reviews in several statuses, **When** shared browse is requested, **Then** only
   published, non-archived reviews are returned.
2. **Given** published reviews for several games, **When** game/search filters are supplied, **Then**
   only matching reviews are returned.
3. **Given** reviews with different ratings and publish times, **When** best sort is requested,
   **Then** rating descending and publish time descending determine order.
4. **Given** a game is archived after publication, **When** its review is opened, **Then** the
   retained review and game attribution remain readable.

### User Story 2 - Author and Maintain a Review (Priority: P2)

An authenticated Author creates a review for an active game, updates only their own review, and
sees every non-archived status in their private dashboard.

**Independent Test**: Create an Author review, update normalized content, list it privately, and
verify another Author and an Admin cannot edit it.

**Acceptance Scenarios**:

1. **Given** an active game and valid content, **When** an Author creates a retrospective, **Then**
   the review is owned by that Author and receives lifecycle timestamps and a concurrency token.
2. **Given** an Author's non-archived review, **When** valid content is updated with its current
   token, **Then** normalized content and update time are saved.
3. **Given** an archived or unknown game, **When** create or content update is attempted, **Then**
   validation fails without changing the review.
4. **Given** another user's review, **When** an Author or Admin attempts an owner operation, **Then**
   the backend denies access.

### User Story 3 - Control Publication Lifecycle (Priority: P3)

An Author moves their review among Draft, Review, Published, and Unpublished at any time without
administrator approval, then may archive it permanently from active use.

**Independent Test**: Exercise every author status, verify publish/unpublish timestamps and reason,
archive twice, and verify archived content is terminal and hidden.

**Acceptance Scenarios**:

1. **Given** an owned review, **When** its status becomes Published, **Then** it receives a publish
   timestamp and becomes shared-visible.
2. **Given** an owned review, **When** it becomes Unpublished with a trimmed reason, **Then** it
   receives an unpublish timestamp and becomes shared-hidden.
3. **Given** an owned review, **When** it is archived, **Then** the retained row becomes terminal;
   repeating archive succeeds idempotently.
4. **Given** a stale concurrency token, **When** update, status, or archive is attempted, **Then** a
   conflict is returned instead of overwriting newer work.

### Edge Cases

- Whitespace-only title, content, and unpublish reasons are invalid after trimming.
- Image URLs accept only absolute HTTP/HTTPS values and no upload payload.
- Page values outside 1-100 size bounds are rejected; very large page numbers return empty pages
  without integer overflow.
- Published timestamps record the latest transition into Published; unpublished timestamps record
  the latest transition into Unpublished. Prior publish/unpublish history fields are not cleared by
  later Draft or Review transitions.
- Archived reviews are excluded from shared and own reads and cannot be restored or edited.
- Retrospective relationships survive later Game archival and User deactivation.

## Requirements

### Functional Requirements

- **FR-001**: A retrospective MUST store ID, Game ID, Author User ID, title, review content, optional
  image URL, integer rating, status, optional unpublished reason, lifecycle timestamps, and a SQL
  rowversion concurrency token.
- **FR-002**: Status MUST be one of Draft, Review, Published, Unpublished, or Archived.
- **FR-003**: Authors MUST control Draft, Review, Published, and Unpublished for only their own
  reviews without administrator approval.
- **FR-004**: Only archive/delete MUST set Archived, and Archived MUST be terminal.
- **FR-005**: Publishing MUST set `PublishedAtUtc`; unpublishing MUST require a trimmed 1-500
  character reason and set `UnpublishedAtUtc`.
- **FR-005a**: Status-change requests MUST explicitly provide one author-controlled status;
  omission MUST fail validation without changing the retrospective.
- **FR-006**: Create/update MUST require an existing active Game. Later Game archival MUST NOT hide
  existing published retrospectives or break attribution.
- **FR-007**: Shared list/detail MUST return only Published, non-archived reviews.
- **FR-007a**: Shared published list/detail MUST allow anonymous access without an account or JWT.
- **FR-008**: Own list/detail MUST return only the current Author's non-archived reviews in every
  author-managed status.
- **FR-009**: Shared and own lists MUST support bounded paging, text search, Game filtering, newest
  sorting, and best sorting by Rating descending then PublishedAtUtc descending.
- **FR-010**: Title MUST be trimmed and 1-200 characters; review content MUST be trimmed and
  1-20,000 characters; rating MUST be 1-10.
- **FR-011**: Optional image URL MUST be an absolute HTTP/HTTPS URL no longer than 2,048 characters.
- **FR-012**: The backend MUST enforce ownership. Admin MUST have no retrospective editing override.
- **FR-013**: Public responses MUST omit unpublished reason, rowversion, status, identity secrets,
  and account contact data.
- **FR-014**: Validation, unauthenticated, forbidden, not-found, and concurrency conflict responses
  MUST use distinguishable Problem Details outcomes.
- **FR-015**: There MUST be no reader-comments feature; `ReviewContent` is the Author's review.

### Performance Requirements

- **PR-001**: Published browse MUST target p95 below 500 ms under documented local conditions.
- **PR-002**: Collection queries MUST use no-tracking projections, indexed filters, and a maximum
  page size of 100.

### Key Entities

- **Retrospective**: Author-owned game review and lifecycle record.
- **Game**: Existing retained catalog record selected by a retrospective.
- **Application User**: Existing Author identity retained for attribution.

## Success Criteria

- **SC-001**: Every tested non-published review is absent from shared browse and detail.
- **SC-002**: Every tested cross-owner and Admin mutation is denied by the backend.
- **SC-003**: Every tested valid lifecycle transition preserves expected timestamps and visibility.
- **SC-004**: Every tested stale token returns a conflict without overwriting newer content.
- **SC-005**: Published browse p95 remains below 500 ms under documented local conditions.

## Assumptions

- Shared published list/detail routes allow anonymous access. Owner views and every mutation require
  an active JWT, and mutation routes additionally require the Author role.
- Search covers retrospective title and review content, not game or author names.
- `PublishedAtUtc` and `UnpublishedAtUtc` store the latest transition of each type; reason stores the
  latest unpublish reason for useful owner history.
- Archive uses `If-Match` because DELETE has no request body; update/status carry Base64 rowversion
  in their explicit request DTOs.
- Author-facing create, status-change, and own-list filter contracts expose only Draft, Review,
  Published, and Unpublished. Archived remains server-controlled and appears only in lifecycle
  responses or persistence.
