# Data Model: Full-Stack Retrospective Portal

## Persistence Impact

Feature 004 reuses the existing User, Game, and Retrospective schema. It adds no table, column,
relationship, index, or migration. The only backend behavior change is anonymous access to active
game reads. Browser session and form models described below are transient and are not database data.

## User

Represents an authenticated identity and retrospective attribution.

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Server assigned and immutable |
| displayName | text | Trimmed, 2–50 characters |
| email | email | Trimmed, valid, unique without case sensitivity |
| role | `Author` or `Admin` | Assigned by trusted backend rules; public registration creates Author |
| isActive | boolean | Inactive users cannot authenticate or use an existing session |
| createdAtUtc | timestamp | Server assigned |
| deactivatedAtUtc | optional timestamp | Set when an Admin deactivates the user |

Relationships:

- One User can own many Retrospectives.
- An Admin can deactivate another User but cannot deactivate themselves.
- User deactivation retains retrospective attribution.

Account request rules:

- Registration and profile update require display name and email.
- Passwords are 8–128 characters and never returned or retained in browser storage.
- A successful password change invalidates all previously issued authenticated sessions.

## Game

Represents one retained catalog entry that can be selected for a Retrospective.

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Server assigned and immutable |
| title | text | Trimmed, 1–200 characters |
| description | optional text | Trimmed, maximum 2,000 characters |
| releaseDate | date | Required calendar date |
| coverImageUrl | optional URL | Absolute HTTP/HTTPS URL, maximum 2,048 characters; portal renders HTTPS only |
| isActive | boolean | Only active games appear in game reads and Author selection |
| createdAtUtc | timestamp | Server assigned |
| updatedAtUtc | timestamp | Server assigned |
| archivedAtUtc | optional timestamp | Set at archival |

Relationships and uniqueness:

- One Game can have many Retrospectives.
- Normalized title plus release date is unique across active and archived games.
- Archival hides the game from active game reads and future Author selection.
- Existing published Retrospectives retain the archived game's title and relationship.

Lifecycle:

```text
Active ── Admin archives ──> Archived
```

Archived is terminal in feature 004.

## Retrospective

Represents one Author-owned game review and its publication lifecycle.

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Server assigned and immutable |
| gameId | UUID | Must reference an active Game during create/update |
| gameTitle | text | Read-only attribution returned with the response |
| authorUserId | UUID | Set from authenticated Author; immutable |
| authorDisplayName | text | Read-only attribution |
| title | text | Trimmed, 1–200 characters |
| reviewContent | text | Trimmed, 1–20,000 characters |
| imageUrl | optional URL | Absolute HTTP/HTTPS URL, maximum 2,048 characters; portal renders HTTPS only |
| rating | integer | 1–10 inclusive |
| status | enum | Draft, Review, Published, Unpublished, or server-controlled Archived |
| unpublishedReason | optional text | Required and trimmed to 1–500 characters when moving to Unpublished |
| createdAtUtc | timestamp | Server assigned |
| updatedAtUtc | timestamp | Server assigned |
| publishedAtUtc | optional timestamp | Latest transition to Published |
| unpublishedAtUtc | optional timestamp | Latest transition to Unpublished |
| archivedAtUtc | optional timestamp | Terminal archival time |
| rowVersion | Base64 token | Owner-only current version required for update, status change, and archive |

Relationships:

- Every Retrospective belongs to exactly one User and one Game.
- Only the owning active Author can read the owner projection or mutate it.
- Public projections expose only Published, non-archived Retrospectives and omit status, reason,
  rowVersion, private lifecycle values, and account contact information.

Author-controlled lifecycle:

```text
Draft ───────┬────────> Review
  │          │            │
  │          ├────────> Published
  │          │            │
  │          └────────> Unpublished
  │
  └─ any non-archived status may move directly to any other author-controlled status

Draft / Review / Published / Unpublished ── archive ──> Archived (terminal)
```

Concurrency behavior:

- The owner detail response supplies the current row version.
- Content update and status change submit the version in their request body.
- Archive submits the version as `If-Match`.
- A stale version returns conflict and does not alter the persisted Retrospective.

## Browser Session State

Transient discriminated state owned by the session provider:

```text
Restoring
Anonymous(reason: none | expired | invalid)
Authenticated(accessToken, expiresAtUtc, user)
```

Persistence rules:

- `sessionStorage` normally contains only `accessToken` and `expiresAtUtc`.
- The current User is validated from the service at startup before protected routes render.
- A Retrospective draft may be stored temporarily only after session expiry under
  `checkpoint:retrospective-draft:{retrospectiveId-or-new}` so sign-in navigation does not destroy it.
- Passwords, other form drafts, Problem Details, and User objects are not persisted in web storage.
- Logout, expiry, rejected authentication, password change, and deactivation clear stored session
  credentials. Draft recovery values are cleared after restoration, successful save, explicit
  discard, archive, or invalid stored data.

## Temporary Retrospective Draft

Transient recovery data used only when authentication expires during Author editing.

| Field | Type | Rules |
|-------|------|-------|
| retrospectiveId | UUID or `new` | Namespaces one existing or new Retrospective draft |
| gameId | UUID | Safe editable value |
| title | text | Safe editable value |
| reviewContent | text | Safe editable value, maximum 20,000 characters |
| imageUrl | optional text | Safe editable value |
| rating | integer | Safe editable value |
| status | author status | Safe editable initial status for create mode |
| unpublishedReason | optional text | Included only when create mode selects Unpublished |
| savedAtUtc | timestamp | Used to identify stale recovery data |

The recovery record never contains an access token, password, User object, row version, server error,
or unrelated form value. Malformed records are discarded rather than partially restored.

## Retrospective Editor State

Transient state owned by the editor page:

| State | Purpose |
|-------|---------|
| loadedRetrospective | Last confirmed server snapshot including rowVersion |
| draft | Editable game, title, content, image, and rating values |
| fieldErrors | Corrective messages keyed to draft fields |
| isSubmitting | Prevents repeated operations |
| conflictVersion | Newly loaded server version after an explicit conflict recovery action |
| isDirty | Editable draft differs from the loaded snapshot |

The draft remains intact after validation, network, authentication, and conflict failures. Loading a
conflict version must not silently replace the draft.

## Query State

Public and owner collection state is encoded in the URL so direct links and browser navigation are
deterministic.

| Collection | Query values |
|------------|--------------|
| Games | `search`, `releaseWindow`, `page` |
| Published Retrospectives | `search`, `gameId`, `sort`, `page` |
| Own Retrospectives | `search`, `gameId`, `status`, `sort`, `page` |
| Admin Users | `page` |

`pageSize` uses a page-owned bounded constant not exceeding 100. A filter or sort change resets page
to 1. Unknown query values fall back to documented defaults rather than breaking the page.

## Normal Performance Dataset

| Entity | Distribution |
|--------|--------------|
| Games | 100 total: 90 active and 10 archived |
| Users | 100 total: 1 active Admin, 89 active Authors, and 10 inactive Authors |
| Retrospectives | 200 total: 80 Published, 40 Draft, 30 Review, 30 Unpublished, and 20 Archived |

Retrospective ownership is spread across at least 50 Authors, ratings cover 1–10, dates span at least
one year, common queries span multiple pages, and at least 10 Published Retrospectives retain an
archived Game relationship.

## E2E Fixture State

Browser validation uses a separate SQL Server database named exactly `DwpFinalsE2E`. A guarded
test-only utility recreates it before each journey or performance command and refuses any other
database name.

The normal performance distribution remains authoritative. Dedicated deterministic fixture identities
replace entries within the 1 Admin and 89 active Authors; they do not increase the total above 100.
They provide isolated credentials for performance reads, account/profile/password journeys, Author
lifecycle/conflict journeys, Admin game management, and user deactivation with an already-issued
target session.

Emails and display names may be stable fixture labels. Passwords, JWT keys, tokens, and certificate
material are environment values and are never written to source, reports, screenshots, or traces.
Journey suites may mutate only their dedicated records; the performance suite always reseeds before
measurement.
