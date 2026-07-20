import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  const blocker = useBlocker(isDirty)
  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => { if (blocker.state === 'blocked') blocker.proceed() },
    reset: () => { if (blocker.state === 'blocked') blocker.reset() },
  }
}
