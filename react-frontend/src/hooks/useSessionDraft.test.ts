import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionDraft } from './useSessionDraft'

const draft = { gameId: 'game-1', title: 'Title', reviewContent: 'Body', imageUrl: '', rating: 8, status: 'draft' as const, unpublishedReason: '' }

beforeEach(() => sessionStorage.clear())

describe('useSessionDraft', () => {
  it('isolates resources, restores once, and supports cleanup', () => {
    const first = renderHook(() => useSessionDraft('retro-1', 'user-1')).result.current
    first.save(draft)
    expect(renderHook(() => useSessionDraft('retro-2', 'user-1')).result.current.restore()).toBeNull()
    expect(renderHook(() => useSessionDraft('retro-1', 'user-1')).result.current.restore()).toMatchObject({ title: 'Title' })
    expect(renderHook(() => useSessionDraft('retro-1', 'user-1')).result.current.restore()).toBeNull()
  })

  it('discards malformed and stale records', () => {
    sessionStorage.setItem('checkpoint:retrospective-draft:user-1:new', '{bad')
    expect(renderHook(() => useSessionDraft('new', 'user-1')).result.current.restore()).toBeNull()
    sessionStorage.setItem('checkpoint:retrospective-draft:user-1:new', JSON.stringify({ ...draft, retrospectiveId: 'new', userId: 'user-1', savedAtUtc: '2020-01-01T00:00:00Z' }))
    expect(renderHook(() => useSessionDraft('new', 'user-1')).result.current.restore()).toBeNull()
    expect(sessionStorage.getItem('checkpoint:retrospective-draft:user-1:new')).toBeNull()
  })

  it('does not expose or delete another account draft', () => {
    const owner = renderHook(() => useSessionDraft('new', 'user-1')).result.current
    owner.save(draft)
    const other = renderHook(() => useSessionDraft('new', 'user-2')).result.current
    expect(other.restore()).toBeNull()
    other.discard()
    expect(sessionStorage.getItem('checkpoint:retrospective-draft:user-1:new')).toContain('user-1')
    expect(sessionStorage.getItem('checkpoint:retrospective-draft:user-2:new')).toBeNull()
    expect(owner.restore()).toMatchObject({ title: 'Title' })
  })
})
