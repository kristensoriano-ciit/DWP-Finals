import { act, render, renderHook } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useUnsavedChanges } from './useUnsavedChanges'

describe('useUnsavedChanges', () => {
  it('registers browser unload only while dirty', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    function Page({ dirty }: { dirty: boolean }) { useUnsavedChanges(dirty); return null }
    const router = createMemoryRouter([{ path: '/', element: <Page dirty /> }])
    const view = render(<RouterProvider router={router} />)
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    view.unmount()
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('blocks in-app navigation until confirmed or discarded', async () => {
    let controls: ReturnType<typeof useUnsavedChanges> | undefined
    function Page() { controls = useUnsavedChanges(true); return <p>Editor</p> }
    const router = createMemoryRouter([{ path: '/', element: <Page /> }, { path: '/away', element: <p>Away</p> }])
    renderHook(() => null, { wrapper: () => <RouterProvider router={router} /> })
    await act(() => router.navigate('/away'))
    expect(controls?.isBlocked).toBe(true)
    act(() => controls?.proceed())
    expect(router.state.location.pathname).toBe('/away')
  })
})
