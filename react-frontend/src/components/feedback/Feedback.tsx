import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading content...' }: { label?: string }) {
  return <p className="feedback feedback--loading" role="status">{label}</p>
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <section className="feedback" aria-labelledby="empty-title"><h2 id="empty-title">{title}</h2>{children}</section>
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="feedback feedback--error" role="alert"><h2>Something went wrong</h2><p>{message}</p>{onRetry && <button onClick={onRetry}>Try again</button>}</section>
}

export function FieldErrorSummary({ errors }: { errors: Record<string, string[]> }) {
  const entries = Object.entries(errors)
  if (!entries.length) return null
  return <section className="error-summary" role="alert" tabIndex={-1}><h2>Check the following</h2><ul>{entries.flatMap(([field, messages]) => messages.map((message) => <li key={`${field}-${message}`}><a href={`#${field}`}>{message}</a></li>))}</ul></section>
}

export function LiveStatus({ children }: { children: ReactNode }) {
  return <p className="live-status" role="status" aria-live="polite">{children}</p>
}
