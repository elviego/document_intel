const BASE_URL = import.meta.env.VITE_API_URL ?? ''

console.log('[api] BASE_URL =', BASE_URL || '(empty — VITE_API_URL not set, using same origin)')

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly reqId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isUnauthorized() { return this.status === 401 }
  get isForbidden()    { return this.status === 403 }
  get isNotFound()     { return this.status === 404 }
  get isConflict()     { return this.status === 409 }
  get isValidation()   { return this.status === 400 }
  get isServerError()  { return this.status >= 500 }

  /** User-facing message with optional request ID for support */
  get userMessage(): string {
    if (this.isUnauthorized) return 'Session expired — please log in again.'
    if (this.isForbidden)    return 'You do not have permission to perform this action.'
    if (this.isNotFound)     return 'The requested resource was not found.'
    if (this.isConflict)     return this.message
    if (this.isValidation)   return this.message
    if (this.isServerError)  return `Server error${this.reqId ? ` (ref: ${this.reqId})` : ''}. Please try again or contact support.`
    return this.message
  }
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const token = localStorage.getItem('access_token')
  const url = `${BASE_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    })
  } catch (err) {
    throw new Error(`Network error — cannot reach API at ${BASE_URL || 'same origin'}. Check your connection.`)
  }
  if (!res.ok) {
    const b   = await res.json().catch(() => ({}))
    const msg = b.message ?? b.error ?? `${res.status} ${res.statusText}`
    throw new ApiError(res.status, b.code ?? 'UNKNOWN', msg, b.reqId)
  }
  return res.json() as Promise<T>
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token')
  const url = `${BASE_URL}${path}`
  const method = options?.method ?? 'GET'

  console.log(`[api] ${method} ${url}`)

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    })
  } catch (err) {
    console.error(`[api] ${method} ${url} → network error:`, err)
    throw new Error(`Network error — cannot reach API at ${BASE_URL || 'same origin'}. Check your connection.`)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body.message ?? body.error ?? `${res.status} ${res.statusText}`
    const code    = body.code ?? 'UNKNOWN'
    const reqId   = body.reqId
    console.error(`[api] ${method} ${url} → ${res.status}`, { code, reqId, body })
    throw new ApiError(res.status, code, message, reqId)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T
  return res.json() as Promise<T>
}

/** Returns the best user-facing message from any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.userMessage
  if (err instanceof Error)    return err.message
  return 'An unexpected error occurred.'
}

export const apiClient = {
  get:      <T>(path: string)                   => request<T>(path),
  post:     <T>(path: string, body: unknown)    => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:      <T>(path: string, body: unknown)    => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:    <T>(path: string, body: unknown)    => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:   <T>(path: string)                   => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, body: FormData)   => requestForm<T>(path, body),
}
