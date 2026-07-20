export type GameDraft = {
  title: string
  description: string
  releaseDate: string
  coverImageUrl: string
}

export function emptyGameDraft(): GameDraft {
  return { title: '', description: '', releaseDate: '', coverImageUrl: '' }
}

export function validateGameDraft(draft: GameDraft) {
  const errors: Record<string, string[]> = {}
  const title = draft.title.trim()
  const description = draft.description.trim()
  const cover = draft.coverImageUrl.trim()
  if (!title) errors.title = ['Enter a game title.']
  else if (title.length > 200) errors.title = ['Title cannot exceed 200 characters.']
  if (description.length > 2000) errors.description = ['Description cannot exceed 2,000 characters.']
  if (!draft.releaseDate) errors.releaseDate = ['Choose a release date.']
  if (cover) {
    try {
      if (new URL(cover).protocol !== 'https:') errors.coverImageUrl = ['Use an HTTPS cover image URL.']
    } catch {
      errors.coverImageUrl = ['Use a valid HTTPS cover image URL.']
    }
    if (cover.length > 2048) errors.coverImageUrl = ['Cover image URL cannot exceed 2,048 characters.']
  }
  return errors
}
