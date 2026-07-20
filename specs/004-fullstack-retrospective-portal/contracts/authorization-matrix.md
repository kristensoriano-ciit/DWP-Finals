# Authorization Matrix

The backend enforces this matrix independently of route visibility. Public read access does not grant
mutation access, and Admin does not override Author ownership.

| Capability | Anonymous | Active Author | Owning Author | Active Admin | Inactive account |
|------------|-----------|---------------|---------------|--------------|------------------|
| Register or sign in | Yes | Yes | Yes | Yes | Sign-in denied |
| Read published Retrospectives | Yes | Yes | Yes | Yes | Yes as anonymous public access |
| Read active Games | Yes | Yes | Yes | Yes | Yes as anonymous public access |
| Read/update own profile or password | No | Yes | Yes | Yes | No |
| Read own Retrospective dashboard/detail | No | Yes, own items only | Yes | No | No |
| Create a Retrospective | No | Yes | Yes | No | No |
| Update/status/archive a Retrospective | No | No for another Author | Yes | No | No |
| Create/update/archive a Game | No | No | No | Yes | No |
| List/deactivate users | No | No | No | Yes, except self-deactivation | No |

Required denial behavior:

- Missing authentication returns an unauthenticated result for protected operations.
- A valid account with the wrong role returns forbidden without clearing that session.
- Cross-owner Retrospective reads and writes do not expose the other Author's protected content.
- Deactivation invalidates already-issued authenticated access.
- UI guards and hidden controls improve navigation but are never the authorization boundary.
