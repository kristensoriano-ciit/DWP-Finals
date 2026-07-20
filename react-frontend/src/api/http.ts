import type { ProblemDetails } from './types'

type RequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  body?: unknown
  token?: string
  signal?: AbortSignal
  onUnauthorized?: () => void
}

function apiBaseUrl() {
  const value = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!value) throw new Error('VITE_API_BASE_URL is not configured.')

  try {
    return new URL(value).origin
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute URL.')
  }
}

function normalizeErrors(errors: unknown): Record<string, string[]> {
  if (!errors || typeof errors !== 'object') return {}
  return Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      key.replace(/^\$\.?/, '').replace(/^(.)/, (letter) => letter.toLowerCase()),
      Array.isArray(value) ? value.map(String) : [String(value)],
    ]),
  )
}

export class ApiError extends Error {
  status: number
  problem: ProblemDetails
  fieldErrors: Record<string, string[]>

  constructor(status: number, problem: ProblemDetails = {}) {
    super(problem.detail || problem.title || `Request failed with status ${status}.`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
    this.fieldErrors = normalizeErrors(problem.errors)
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('The service returned malformed JSON.')
  }
}

export async function request<T>(path: string, options: RequestOptions = {}, validate?: (value: unknown) => value is T): Promise<T> {
  const { body, token, onUnauthorized, headers: suppliedHeaders, ...init } = options
  const headers = new Headers(suppliedHeaders)
  headers.set('Accept', 'application/json')
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(new URL(path, `${apiBaseUrl()}/`), {
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.()
    let payload: unknown
    try { payload = await readJson(response) } catch { payload = undefined }
    const problem = payload && typeof payload === 'object' ? payload as ProblemDetails : {}
    throw new ApiError(response.status, problem)
  }
  const payload = await readJson(response)
  if (validate && !validate(payload)) throw new Error('The service returned an unexpected response.')
  return payload as T
}
