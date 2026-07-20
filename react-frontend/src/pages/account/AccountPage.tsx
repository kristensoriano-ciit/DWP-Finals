import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { updateProfile } from '../../api/authApi'
import { ApiError } from '../../api/http'
import { FieldErrorSummary, LiveStatus, LoadingState, PageError } from '../../components/feedback/Feedback'
import { useSession } from '../../auth/useSession'

export function AccountPage() {
  const session = useSession()
  const [displayName, setDisplayName] = useState(session.user?.displayName ?? '')
  const [email, setEmail] = useState(session.user?.email ?? '')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  if (session.status === 'restoring') return <LoadingState label="Loading your account..." />
  if (session.status !== 'authenticated' || !session.token) return <PageError message={session.sessionExpired ? 'Your session expired. Sign in again.' : 'Sign in to view your account.'} />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || !session.token) return
    const nextErrors: Record<string, string[]> = {}
    const name = displayName.trim()
    if (name.length < 2 || name.length > 50) nextErrors.displayName = ['Display name must contain between 2 and 50 characters.']
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = ['Enter a valid email address.']
    setErrors(nextErrors)
    setMessage('')
    if (Object.keys(nextErrors).length) return
    setPending(true)
    try {
      const updated = await updateProfile({ displayName: name, email: email.trim() }, session.token, session.onUnauthorized)
      session.updateUser(updated)
      setMessage('Profile updated.')
    } catch (error) {
      if (error instanceof ApiError) { setErrors(error.fieldErrors); setMessage(error.message) }
      else setMessage('Your profile could not be updated. Try again.')
    } finally { setPending(false) }
  }

  return <section className="account-page">
    <header className="page-heading"><p className="eyebrow">Your account</p><h1>Profile</h1><p>Keep your public Author identity and sign-in email current.</p></header>
    <form className="account-form" onSubmit={submit} noValidate>
      <FieldErrorSummary errors={errors} />
      {message && <p className={Object.keys(errors).length ? 'form-message form-message--error' : 'form-message'} role="status">{message}</p>}
      <label htmlFor="displayName">Display name</label><input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} aria-invalid={!!errors.displayName} aria-describedby={errors.displayName?.length ? 'displayName-error' : undefined} />
      {errors.displayName?.map((error, index) => <p id={index === 0 ? 'displayName-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email?.length ? 'email-error' : undefined} />
      {errors.email?.map((error, index) => <p id={index === 0 ? 'email-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save profile'}</button>
      {pending && <LiveStatus>Saving profile...</LiveStatus>}
      <Link className="account-form__secondary" to="/account/password">Change password</Link>
    </form>
  </section>
}
