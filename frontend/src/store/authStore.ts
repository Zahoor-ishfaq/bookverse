import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mood } from '@/types/book'
import type { User } from '@/types/community'
import { api, session } from '@/services/api'

export interface Me extends User {
  email: string
  emailVerified: boolean
  onboardingCompleted: boolean
  isAdmin: boolean
}

interface SessionResponse { accessToken: string; refreshToken: string; user: Me }
interface Consents { acceptedTerms: boolean; marketingOptIn: boolean }

interface AuthState {
  user: Me | null
  ready: boolean
  onboarded: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<Me>
  register: (name: string, email: string, password: string, consents: Consents) => Promise<Me>
  loginWithGoogle: (credential: string, consents?: Consents) => Promise<Me>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  completeOnboarding: (data: { genres: string[]; moods: Mood[]; goal: number }) => Promise<void>
  updateProfile: (patch: Partial<Me> & { avatarUrl?: string }) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  setUser: (u: Me) => void
}

let libraryHooks: { hydrate: () => Promise<void>; reset: () => void } | null = null
export const registerLibraryHooks = (h: typeof libraryHooks) => { libraryHooks = h }

async function accept(r: SessionResponse) {
  session.set({ access: r.accessToken, refresh: r.refreshToken })
  useAuth.setState({ user: r.user, onboarded: r.user.onboardingCompleted, ready: true })
  await libraryHooks?.hydrate()
  return r.user
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      ready: false,
      onboarded: false,
      init: async () => {
        if (!session.token) { set({ ready: true }); return }
        try {
          const me = await api.get<Me>('/api/auth/me')
          set({ user: me, onboarded: me.onboardingCompleted, ready: true })
          await libraryHooks?.hydrate()
        } catch {
          // token invalid and refresh failed → api dispatched logout
          set({ user: null, ready: true })
        }
      },
      login: async (email, password) => accept(await api.post<SessionResponse>('/api/auth/login', { email, password })),
      register: async (name, email, password, consents) => accept(await api.post<SessionResponse>('/api/auth/register', { name, email, password, consents })),
      loginWithGoogle: async (credential, consents) => accept(await api.post<SessionResponse>('/api/auth/google', { credential, consents })),
      logout: async () => {
        const s = session.get()
        if (s) api.post('/api/auth/logout', { refreshToken: s.refresh }).catch(() => {})
        session.set(null)
        libraryHooks?.reset()
        set({ user: null, onboarded: false })
      },
      deleteAccount: async () => {
        await api.del('/api/me')
        session.set(null)
        libraryHooks?.reset()
        Object.keys(localStorage).filter((k) => k.startsWith('bookverse.') && k !== 'bookverse.consent').forEach((k) => localStorage.removeItem(k))
        set({ user: null, onboarded: false })
      },
      completeOnboarding: async ({ genres, moods, goal }) => {
        const me = await api.post<Me>('/api/me/onboarding', { genres, moods, goal })
        set({ user: me, onboarded: true })
      },
      updateProfile: async (patch) => {
        const me = await api.patch<Me>('/api/me', patch)
        set({ user: me })
      },
      uploadAvatar: async (file) => {
        const me = await api.upload<Me>('/api/me/avatar', file)
        set({ user: me })
      },
      setUser: (u) => set({ user: u, onboarded: u.onboardingCompleted }),
    }),
    { name: 'bookverse.auth', partialize: (s) => ({ user: s.user, onboarded: s.onboarded }) },
  ),
)

if (typeof window !== 'undefined') {
  window.addEventListener('bookverse:logout', () => { session.set(null); libraryHooks?.reset(); useAuth.setState({ user: null, onboarded: false, ready: true }) })
  window.addEventListener('bookverse:session', (e) => { const u = (e as CustomEvent<Me>).detail; if (u) useAuth.setState({ user: u }) })
}
