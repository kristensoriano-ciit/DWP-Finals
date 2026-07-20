export type UserRole = 'Author' | 'Admin'

export type User = {
  id: string
  displayName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAtUtc: string
  deactivatedAtUtc: string | null
}

export type AuthResponse = {
  accessToken: string
  expiresAtUtc: string
  user: User
}

export type RegisterRequest = { displayName: string; email: string; password: string }
export type LoginRequest = { email: string; password: string }
export type UpdateProfileRequest = { displayName: string; email: string }
export type ChangePasswordRequest = { currentPassword: string; newPassword: string }

export type Game = {
  id: string
  title: string
  description: string | null
  releaseDate: string
  coverImageUrl: string | null
  isActive: boolean
  createdAtUtc: string
  updatedAtUtc: string
  archivedAtUtc: string | null
}

export type GameReleaseWindow = 'all' | 'new' | 'upcoming'
export type GameRequest = {
  title: string
  description: string | null
  releaseDate: string
  coverImageUrl: string | null
}

export type RetrospectiveSort = 'newest' | 'best'
export type RetrospectiveStatus = 'draft' | 'review' | 'published' | 'unpublished' | 'archived'
export type AuthorRetrospectiveStatus = Exclude<RetrospectiveStatus, 'archived'>

export type PublishedRetrospective = {
  id: string
  gameId: string
  gameTitle: string
  authorUserId: string
  authorDisplayName: string
  title: string
  reviewContent: string
  imageUrl: string | null
  rating: number
  publishedAtUtc: string
}

export type Retrospective = Omit<PublishedRetrospective, 'publishedAtUtc'> & {
  status: RetrospectiveStatus
  unpublishedReason: string | null
  createdAtUtc: string
  updatedAtUtc: string
  publishedAtUtc: string | null
  unpublishedAtUtc: string | null
  archivedAtUtc: string | null
  rowVersion: string
}

export type RetrospectiveRequest = {
  gameId: string
  title: string
  reviewContent: string
  imageUrl: string | null
  rating: number
}

export type CreateRetrospectiveRequest = RetrospectiveRequest & {
  status?: AuthorRetrospectiveStatus
  unpublishedReason?: string | null
}

export type UpdateRetrospectiveRequest = RetrospectiveRequest & { rowVersion: string }
export type ChangeRetrospectiveStatusRequest = {
  status: AuthorRetrospectiveStatus
  unpublishedReason?: string | null
  rowVersion: string
}

export type PagedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  traceId?: string
  errors?: Record<string, string[]>
}
