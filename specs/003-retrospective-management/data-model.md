# Data Model: Retrospective Management

## Retrospective

| Field | Type | Rules |
|---|---|---|
| Id | GUID | Primary key |
| GameId | GUID | Required FK to Games; restricted delete |
| AuthorUserId | GUID | Required FK to the Identity-backed Users table; restricted delete |
| Title | string | Required, trimmed, 1-200 |
| ReviewContent | string | Required, trimmed, 1-20,000 |
| ImageUrl | string? | Absolute HTTP/HTTPS, max 2,048 |
| Rating | integer | 1-10 database check |
| Status | string enum | Draft, Review, Published, Unpublished, Archived |
| UnpublishedReason | string? | Required trimmed 1-500 when Unpublished |
| CreatedAtUtc | timestamp | Set once on creation |
| UpdatedAtUtc | timestamp | Set on every mutation |
| PublishedAtUtc | timestamp? | Latest transition into Published |
| UnpublishedAtUtc | timestamp? | Latest transition into Unpublished |
| ArchivedAtUtc | timestamp? | Required only when Archived |
| RowVersion | SQL rowversion | Optimistic concurrency token |

Indexes support `Status + PublishedAtUtc`, `GameId + Status`, and
`AuthorUserId + Status + UpdatedAtUtc`. Database checks enforce rating, unpublished reason, and the
Archived timestamp invariant.

Create/update validates active Game state and persists the retrospective in one serializable
transaction. Concurrent Game archival therefore occurs wholly before or after that operation.

## Relationships

- One Game has zero or more Retrospectives.
- One ApplicationUser authors zero or more Retrospectives.
- Both foreign keys use restricted deletion so attribution survives Game archival and User
  deactivation.

## State Transitions

```text
Missing -> Draft | Review | Published | Unpublished   author creates for active Game
Draft | Review | Published | Unpublished -> any author-managed status
Any non-archived status -> Archived                    owner archive endpoint
Archived -> Archived                                   repeated archive, idempotent
Archived -> any other status                           forbidden, terminal
```

Publishing and unpublishing update their respective latest-event timestamps. Moving to Draft or
Review does not erase prior publish/unpublish timestamps or the latest unpublish reason.

## API Projections

- `PublishedRetrospectiveResponse`: published content, Game title, safe Author display name, rating,
  and publish time. It omits status, unpublish history, archive history, and rowversion.
- `RetrospectiveResponse`: full owner-safe lifecycle data and Base64 rowversion. It omits email,
  Identity internals, and persistence navigation objects.
- Paged responses contain `items`, `page`, `pageSize`, and `totalCount`.
