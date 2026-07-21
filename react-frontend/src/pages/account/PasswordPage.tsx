import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../../api/authApi'
import { ApiError } from '../../api/http'
import { FieldErrorSummary, LiveStatus, LoadingState, PageError } from '../../components/feedback/Feedback'
import { useSession } from '../../auth/useSession'

export function PasswordPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  if (session.status === 'restoring') return <LoadingState label="Loading your account..." />
  if (session.status !== 'authenticated' || !session.token) return <PageError message="Your session expired. Sign in again." />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || !session.token) return
    const nextErrors: Record<string, string[]> = {}
    if (!currentPassword) nextErrors.currentPassword = ['Enter your current password.']
    if (newPassword.length < 8 || newPassword.length > 128) nextErrors.newPassword = ['New password must contain between 8 and 128 characters.']
    setErrors(nextErrors)
    setMessage('')
    if (Object.keys(nextErrors).length) return
    setPending(true)
    try {
      await changePassword({ currentPassword, newPassword }, session.token, session.onUnauthorized)
      setMessage('Password changed. Your session has ended.')
      sessionStorage.setItem('checkpoint.passwordChanged', 'true')
      session.signOut()
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (error) {
      if (error instanceof ApiError) { setErrors(error.fieldErrors); setMessage(error.message) }
      else setMessage('Your password could not be changed. Try again.')
    } finally { setPending(false) }
  }

  return <section className="account-page">
    <header className="page-heading"><p className="eyebrow">Account security</p><h1>Change password</h1><p>You will sign in again after this change.</p></header>
    <form className="account-form" onSubmit={submit} noValidate>
      <FieldErrorSummary errors={errors} />
      {message && <p className={Object.keys(errors).length ? 'form-message form-message--error' : 'form-message'} role="status">{message}</p>}
      <label htmlFor="currentPassword">Current password</label><input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} aria-invalid={!!errors.currentPassword} aria-describedby={errors.currentPassword?.length ? 'currentPassword-error' : undefined} />
      {errors.currentPassword?.map((error, index) => <p id={index === 0 ? 'currentPassword-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <label htmlFor="newPassword">New password</label><input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-invalid={!!errors.newPassword} aria-describedby={errors.newPassword?.length ? 'newPassword-error' : undefined} />
      {errors.newPassword?.map((error, index) => <p id={index === 0 ? 'newPassword-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <button type="submit" disabled={pending}>{pending ? 'Changing password...' : 'Change password'}</button>
      {pending && <LiveStatus>Changing password...</LiveStatus>}
      <Link className="account-form__secondary" to="/account">Back to profile</Link>
    </form>
  </section>
}
