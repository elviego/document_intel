const BASE_URL = import.meta.env.VITE_API_URL ?? ''

console.log('[api] BASE_URL =', BASE_URL || '(empty — VITE_API_URL not set, using same origin)')

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
    throw new Error(`Network error — cannot reach API at ${BASE_URL}. Check VITE_API_URL and CORS_ORIGIN.`)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body.message ?? body.error ?? `${res.status} ${res.statusText}`
    console.error(`[api] ${method} ${url} →`, res.status, body)
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
