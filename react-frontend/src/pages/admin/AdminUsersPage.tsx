import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deactivateUser, listUsers } from '../../api/usersApi'
import { ApiError } from '../../api/http'
import type { PagedResponse, User } from '../../api/types'
import { useSession } from '../../auth/useSession'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { ConfirmDialog } from '../../components/forms/ConfirmDialog'
import { Pagination } from '../../components/layout/Pagination'
import { positivePage, updateQuery } from '../public/query'

export function AdminUsersPage() {
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const page = positivePage(params.get('page'))
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${page}|${retryKey}`
  const [response, setResponse] = useState<{ key: string; result: PagedResponse<User> | null; error: unknown }>({ key: '', result: null, error: null })
  const [selected, setSelected] = useState<User | null>(null)
  const [deactivationPending, setDeactivationPending] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!session.token) return
    const controller = new AbortController()
    listUsers({ page, pageSize: 20 }, session.token, { signal: controller.signal, onUnauthorized: session.onUnauthorized })
      .then((result) => setResponse({ key: requestKey, result, error: null }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setResponse({ key: requestKey, result: null, error }) })
    return () => controller.abort()
  }, [page, retryKey, requestKey, session.token, session.onUnauthorized])

  async function confirmDeactivation() {
    if (!selected || !session.token || deactivationPending || selected.id === session.user?.id) return
    setDeactivationPending(true)
    try {
      await deactivateUser(selected.id, session.token, { onUnauthorized: session.onUnauthorized })
      setResponse((current) => current.result ? {
        ...current,
        result: {
          ...current.result,
          items: current.result.items.map((user) => user.id === selected.id
            ? { ...user, isActive: false, deactivatedAtUtc: new Date().toISOString() }
            : user),
        },
      } : current)
      setNotice(`${selected.displayName}'s access was deactivated. Their existing session can no longer access protected features.`)
      setSelected(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) setNotice('You do not have permission to deactivate users.')
      else if (error instanceof ApiError && error.status === 409) setNotice(error.message)
      else setNotice(`${selected.displayName}'s access could not be deactivated. Try again.`)
    } finally {
      setDeactivationPending(false)
    }
  }

  const loading = response.key !== requestKey
  const forbidden = response.error instanceof ApiError && response.error.status === 403

  return <section className="admin-users">
    <header className="page-heading"><p className="eyebrow">Administration</p><h1>Users</h1><p>Review account roles and access, then deactivate accounts that should no longer sign in.</p></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <LoadingState label="Loading users for administration..." />
      : forbidden ? <PageError message="You do not have permission to administer users." />
        : response.error ? <PageError message="Users could not be loaded." onRetry={() => setRetryKey((value) => value + 1)} />
          : response.result?.items.length ? <>
            <div className="admin-user-list">
              {response.result.items.map((user) => {
                const isCurrentUser = user.id === session.user?.id
                return <article className="admin-user-row" key={user.id}>
                  <div className="admin-user-row__identity"><h2>{user.displayName}</h2><p>{user.email}</p><p>Joined <time dateTime={user.createdAtUtc}>{new Date(user.createdAtUtc).toLocaleDateString()}</time></p></div>
                  <div className="admin-user-row__access"><span className="role-label">{user.role}</span><span className={`status ${user.isActive ? 'status--active' : 'status--inactive'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></div>
                  <div className="admin-user-row__action">
                    <button className="button--danger" type="button" disabled={!user.isActive || isCurrentUser} aria-label={`Deactivate ${user.displayName}`} onClick={() => setSelected(user)}>Deactivate</button>
                    {isCurrentUser && <small>This is your account. You cannot deactivate yourself.</small>}
                    {!user.isActive && <small>Access is already deactivated.</small>}
                  </div>
                </article>
              })}
            </div>
            <Pagination page={response.result.page} pageSize={response.result.pageSize} totalCount={response.result.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} />
          </> : <EmptyState title="No users found"><p>No user accounts are available on this page.</p></EmptyState>}
    <ConfirmDialog isOpen={!!selected} title={`Deactivate ${selected?.displayName}?`} description={`${selected?.displayName} will no longer be able to sign in, and their existing authenticated session will stop working. Their published attribution will be retained.`} confirmLabel="Deactivate user" isPending={deactivationPending} onConfirm={confirmDeactivation} onCancel={() => { if (!deactivationPending) setSelected(null) }} />
  </section>
}
