// Google Identity Services. Renders Google's own button when a client id is
// configured; the caller decides what to show otherwise.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export interface GoogleProfile { name: string; email: string; picture?: string; sub: string; credential: string }

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (o: Record<string, unknown>) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void; prompt: () => void } } }
  }
}

export const googleConfigured = Boolean(CLIENT_ID)

let loading: Promise<void> | null = null
let callbackRef: ((p: GoogleProfile) => void) | null = null
let initialised = false
function loadScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('gsi'))
    document.head.appendChild(s)
  })
  return loading
}

function decodeJwt(token: string): GoogleProfile {
  // Only used for display; the server verifies the token itself.
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(atob(payload).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
  const p = JSON.parse(json)
  return { name: p.name, email: p.email, picture: p.picture, sub: p.sub, credential: token }
}

export async function renderGoogleButton(el: HTMLElement, onProfile: (p: GoogleProfile) => void, theme: 'outline' | 'filled_black' = 'outline') {
  if (!CLIENT_ID) return false
  await loadScript()
  // GIS warns if initialize() runs twice (React StrictMode mounts effects twice),
  // so initialise once and route callbacks through a swappable reference.
  callbackRef = onProfile
  if (!initialised) {
    window.google!.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (res: { credential: string }) => callbackRef?.(decodeJwt(res.credential)),
      ux_mode: 'popup',
      auto_select: false,
    })
    initialised = true
  }
  window.google!.accounts.id.renderButton(el, { theme, size: 'large', shape: 'pill', width: el.clientWidth || 360, text: 'continue_with', logo_alignment: 'left' })
  return true
}
