# Data Model: Game Management

## Game

| Field | Type | Rules |
|---|---|---|
| Id | GUID | Primary key |
| Title | string | Required, trimmed, 1-200 characters |
| NormalizedTitle | string | Uppercase normalized title, max 200 |
| Description | string? | Trimmed, max 2,000 |
| ReleaseDate | date | Required |
| CoverImageUrl | string? | Absolute HTTP/HTTPS URL, max 2,048 |
| IsActive | boolean | Defaults true |
| CreatedAtUtc | timestamp | Set on creation |
| UpdatedAtUtc | timestamp | Updated on mutation |
| ArchivedAtUtc | timestamp? | Required when inactive |

`NormalizedTitle + ReleaseDate` has a unique index. `IsActive + ReleaseDate` and
`NormalizedTitle` are indexed for panel and search queries. Future retrospectives reference the
game with restricted deletion.

## State transitions

```text
Missing -> Active       administrator creates
Active  -> Active       administrator updates
Active  -> Archived     administrator archives
Archived -> Archived    repeated archive is idempotent
```
