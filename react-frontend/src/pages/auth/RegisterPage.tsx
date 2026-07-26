import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { login, register } from '../../api/authApi'
import { ApiError } from '../../api/http'
import { FieldErrorSummary, LiveStatus } from '../../components/feedback/Feedback'
import { useSession } from '../../auth/useSession'

export function RegisterPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  if (session.status === 'authenticated' && session.user) return <Navigate to={session.user.role === 'Admin' ? '/admin' : '/dashboard/retrospectives'} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const nextErrors: Record<string, string[]> = {}
    const name = displayName.trim()
    if (name.length < 2 || name.length > 50) nextErrors.displayName = ['Display name must contain between 2 and 50 characters.']
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = ['Enter a valid email address.']
    if (password.length < 8 || password.length > 128) nextErrors.password = ['Password must contain between 8 and 128 characters.']
    setErrors(nextErrors)
    setMessage('')
    if (Object.keys(nextErrors).length) return
    setPending(true)
    try {
      const normalizedEmail = email.trim()
      await register({ displayName: name, email: normalizedEmail, password })
      try {
        const auth = await login({ email: normalizedEmail, password })
        session.signIn(auth)
        navigate('/dashboard/retrospectives', { replace: true })
      } catch {
        setMessage('Account created, but automatic sign-in failed. Please sign in.')
        setPassword('')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setMessage(error.status === 409 ? 'An account with this email already exists.' : error.message)
      } else setMessage('Registration is unavailable. Try again.')
    } finally {
      setPending(false)
    }
  }

  return <section className="auth-page">
    <div className="auth-page__intro"><p className="eyebrow">Join Checkpoint</p><h1>Create an account</h1><p>Every new account starts with Author access.</p></div>
    <form className="account-form" onSubmit={submit} noValidate>
      <FieldErrorSummary errors={errors} />
      {message && <p className="form-message form-message--error" role="status">{message}</p>}
      <label htmlFor="displayName">Display name</label><input id="displayName" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} aria-invalid={!!errors.displayName} aria-describedby={errors.displayName?.length ? 'displayName-error' : undefined} />
      {errors.displayName?.map((error, index) => <p id={index === 0 ? 'displayName-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email?.length ? 'email-error' : undefined} />
      {errors.email?.map((error, index) => <p id={index === 0 ? 'email-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password?.length ? 'password-error' : undefined} />
      {errors.password?.map((error, index) => <p id={index === 0 ? 'password-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <button type="submit" disabled={pending}>{pending ? 'Creating account...' : 'Create account'}</button>
      {pending && <LiveStatus>Creating your account...</LiveStatus>}
      <p>Already registered? <Link to="/login">Sign in</Link>.</p>
    </form>
  </section>
}
