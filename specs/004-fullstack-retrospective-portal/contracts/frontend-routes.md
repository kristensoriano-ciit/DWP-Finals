# Frontend Route Contract

The route contract describes externally visible navigation, access, data ownership, and recovery
states. The backend remains the security boundary even when navigation or controls are hidden.

| Route | Access | Primary data | Required states |
|-------|--------|--------------|-----------------|
| `/` | Public | Newest and best published retrospectives | Loading, empty, partial failure, unexpected error |
| `/games` | Public | Active games | Loading, results, empty, invalid query, unexpected error |
| `/games/:gameId` | Public | Active game and related published retrospectives | Loading, partial loading, empty related list, not found, unexpected error |
| `/retrospectives` | Public | Published retrospectives | Loading, results, empty, invalid query, unexpected error |
| `/retrospectives/:retrospectiveId` | Public | Published retrospective | Loading, not found, unexpected error |
| `/login` | Anonymous preferred | Authentication form | Idle, validation error, rejected credentials, submitting, success |
| `/register` | Anonymous preferred | Registration form | Idle, validation error, duplicate email, submitting, success |
| `/account` | Authenticated | Current profile | Restoring, loading, validation error, submitting, success, expired session |
| `/account/password` | Authenticated | Password-change form | Idle, validation error, rejected current password, submitting, success/sign-out |
| `/dashboard/retrospectives` | Author | Owned retrospectives plus new, upcoming, and best discovery panels | Restoring, loading, results, empty, partial failure, invalid query, forbidden, unexpected error |
| `/dashboard/retrospectives/unpublished` | Author | Owned unpublished retrospectives and their saved reasons | Restoring, loading, results, empty, forbidden, unexpected error |
| `/dashboard/retrospectives/new` | Author | Active games and new draft | Loading games, validation error, submitting, success, expired session |
| `/dashboard/retrospectives/:retrospectiveId/edit` | Owning Author | Owner retrospective and active games | Loading, not found/forbidden, dirty, validation error, submitting, conflict, success |
| `/admin` | Admin | Admin navigation plus new, upcoming, and best discovery panels | Restoring, loading, ready, empty, partial failure, forbidden |
| `/admin/games` | Admin | Active games | Loading, results, empty, invalid query, forbidden, unexpected error |
| `/admin/games/new` | Admin | New game form | Validation error, duplicate conflict, submitting, success |
| `/admin/games/:gameId/edit` | Admin | Active game | Loading, not found, validation error, duplicate conflict, submitting, success |
| `/admin/users` | Admin | Active and inactive users | Loading, results, empty, confirming, submitting, forbidden, unexpected error |
| `/forbidden` | Public | Access explanation | Ready with safe onward navigation |
| `*` | Public | No data required | Not found with home navigation |

## Navigation Rules

- Public navigation always exposes Home, Games, and Retrospectives.
- Anonymous navigation exposes Sign in and Register.
- Authenticated navigation exposes Account and Sign out.
- Author navigation exposes My Retrospectives.
- Admin navigation exposes Admin, Games management, and Users management.
- Mobile navigation exposes the same permitted destinations through an operable labeled menu; links
  must not simply disappear at narrow widths.
- A safe intended destination survives sign-in only when it is an internal route permitted for the
  authenticated role.
- An already authenticated user visiting Login or Register is returned to their role-appropriate
  landing route.

## Collection Rules

- Search, filter, sort, status, and page values are represented in the URL.
- Changing search, filter, sort, or status resets the page to 1.
- Browser back, forward, refresh, and shared links reconstruct the visible query.
- Pagination identifies the current page and disables unavailable previous/next actions.
- Empty results retain the page heading and relevant controls and offer a query-reset action.

## Protected Route Rules

- Protected routes remain in a restoring state until session validation finishes.
- Anonymous access stores only a safe intended route and redirects to Login.
- A valid user with the wrong role keeps their session and is sent to Forbidden.
- A protected request returning unauthenticated clears the session and offers Sign in.
- A protected request returning forbidden does not clear an otherwise valid session.
- Ownership denial does not reveal whether another Author's Retrospective exists.

## Form and Feedback Rules

- Every input has a visible label and associated field feedback.
- Rejected submission presents a focusable error summary and preserves safe values.
- Pending submission disables repeated activation without hiding progress.
- Success is announced before navigation or reflected on the current page.
- Confirmation identifies the selected Game, Retrospective, or User and returns focus to the trigger
  when cancelled.
- The Retrospective editor warns on browser or in-app navigation when its draft is dirty.
- Conflict recovery preserves the draft and requires explicit action before loading the newer server
  snapshot.

## Responsive and Image Rules

- Required validation widths are 320, 768, and 1280 CSS pixels.
- No primary route requires horizontal page scrolling at those widths.
- Wide administrative rows become stacked labeled content on narrow screens.
- Missing, malformed, non-HTTPS, or failed images use a fixed-ratio labeled fallback.
- Status, rating, errors, roles, and disabled behavior never rely on color alone.
