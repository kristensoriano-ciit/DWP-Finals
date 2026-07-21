import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../../api/authApi'
import { ApiError } from '../../api/http'
import { FieldErrorSummary, LiveStatus } from '../../components/feedback/Feedback'
import { safeReturnPath } from '../../auth/safeReturnPath'
import { useSession } from '../../auth/useSession'

type LoginLocationState = { returnPath?: unknown; expired?: boolean; passwordChanged?: boolean }

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LoginLocationState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [passwordChanged] = useState(() => {
    const wasChanged = state?.passwordChanged === true || sessionStorage.getItem('checkpoint.passwordChanged') === 'true'
    sessionStorage.removeItem('checkpoint.passwordChanged')
    return wasChanged
  })

  if (session.status === 'authenticated' && session.user) {
    const defaultPath = session.user.role === 'Admin' ? '/admin' : '/dashboard/retrospectives'
    return <Navigate to={state?.returnPath ? safeReturnPath(state.returnPath, session.user.role) : defaultPath} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const nextErrors: Record<string, string[]> = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = ['Enter a valid email address.']
    if (!password) nextErrors.password = ['Enter your password.']
    setErrors(nextErrors)
    setMessage('')
    if (Object.keys(nextErrors).length) return

    setPending(true)
    try {
      const auth = await login({ email: email.trim(), password })
      session.signIn(auth)
      navigate(safeReturnPath(state?.returnPath, auth.user.role), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setMessage(error.status === 401 ? 'Email or password is incorrect.' : error.message)
      } else setMessage('Sign in is unavailable. Try again.')
    } finally {
      setPending(false)
    }
  }

  return <section className="auth-page">
    <div className="auth-page__intro"><p className="eyebrow">Account access</p><h1>Sign in</h1><p>Return to your Checkpoint workspace.</p></div>
    <form className="account-form" onSubmit={submit} noValidate>
      {state?.expired && <p className="notice" role="status">Your session expired. Sign in to continue.</p>}
      {passwordChanged && <p className="notice" role="status">Password changed. Sign in with your new password.</p>}
      <FieldErrorSummary errors={errors} />
      {message && <p className="form-message form-message--error" role="alert">{message}</p>}
      <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email?.length ? 'email-error' : undefined} />
      {errors.email?.map((error, index) => <p id={index === 0 ? 'email-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password?.length ? 'password-error' : undefined} />
      {errors.password?.map((error, index) => <p id={index === 0 ? 'password-error' : undefined} className="field-error" role="alert" key={error}>{error}</p>)}
      <button type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Sign in'}</button>
      {pending && <LiveStatus>Signing in...</LiveStatus>}
      <p>New to Checkpoint? <Link to="/register">Create an account</Link>.</p>
    </form>
  </section>
}
