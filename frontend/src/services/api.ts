// Thin fetch client: bearer token, one automatic refresh on 401, JSON errors
// surfaced as ApiError with the server's message.
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

interface Session { access: string; refresh: string }
const KEY = 'bookverse.session'

export const session = {
  get(): Session | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } },
  set(s: Session | null) { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) },
  get token() { return session.get()?.access ?? null },
}

let refreshing: Promise<boolean> | null = null
async function refresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const s = session.get()
    if (!s?.refresh) return false
    try {
      const r = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: s.refresh }) })
      if (!r.ok) { session.set(null); return false }
      const d = await r.json()
      session.set({ access: d.accessToken, refresh: d.refreshToken })
      window.dispatchEvent(new CustomEvent('bookverse:session', { detail: d.user }))
      return true
    } catch { return false } finally { refreshing = null }
  })()
  return refreshing
}

async function request<T>(method: string, path: string, body?: unknown, opts: { retry?: boolean; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = session.token
  if (token) headers.Authorization = `Bearer ${token}`
  if (!opts.form) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: opts.form ?? (body !== undefined ? JSON.stringify(body) : undefined) })
  if (res.status === 401 && opts.retry !== false && token) {
    if (await refresh()) return request<T>(method, path, body, { ...opts, retry: false })
    window.dispatchEvent(new CustomEvent('bookverse:logout'))
  }
  if (!res.ok) {
    let msg = res.statusText
    try { const d = await res.json(); msg = typeof d.detail === 'string' ? d.detail : Array.isArray(d.detail) ? d.detail.map((x: { msg: string }) => x.msg).join(', ') : msg } catch { /* not json */ }
    throw new ApiError(res.status, msg)
  }
  const ct = res.headers.get('content-type') || ''
  return (ct.includes('application/json') ? res.json() : res.text()) as Promise<T>
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string, b?: unknown) => request<T>('DELETE', p, b),
  upload: <T>(p: string, file: File, field = 'file') => { const f = new FormData(); f.append(field, file); return request<T>('POST', p, undefined, { form: f }) },
}

export const wsUrl = (path: string) => {
  const base = API_BASE || window.location.origin
  return base.replace(/^http/, 'ws') + path + (session.token ? `?token=${encodeURIComponent(session.token)}` : '')
}
