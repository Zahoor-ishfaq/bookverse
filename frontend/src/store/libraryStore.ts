import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bookmark, Highlight, HighlightColor, ReadingProgress, Review, ShelfEntry, ShelfType } from '@/types/book'
import type { DiaryEntry, Notification } from '@/types/community'
import { api, session } from '@/services/api'
import { registerLibraryHooks } from './authStore'
import { toast } from '@/components/ui'

// The user's personal library. The store is the working copy for instant UI;
// every change is written to the API when signed in. Guests keep a local copy
// (so reading position survives) which is replaced by the server copy on login.

const uid = () => `local_${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const signedIn = () => Boolean(session.token)
const needLogin = () => { toast('Log in to save this to your account', 'info'); return false }
const swallow = (p: Promise<unknown>) => p.catch((e) => toast(e?.message || 'Could not save — check your connection', 'error'))

interface Streak { current: number; longest: number; lastDate: string | null; days: string[] }

interface LibraryState {
  hydrated: boolean
  shelves: ShelfEntry[]
  progress: Record<number, ReadingProgress>
  highlights: Highlight[]
  bookmarks: Bookmark[]
  reviews: Review[]
  diary: DiaryEntry[]
  following: string[]
  votes: Record<string, 'a' | 'b'>
  clubs: string[]
  likedStories: string[]
  likedReviews: string[]
  likedDiary: string[]
  notifications: Notification[]
  streak: Streak
  searchHistory: string[]

  hydrate: () => Promise<void>
  reset: () => void
  shelfFor: (bookId: number) => ShelfEntry | undefined
  setShelf: (bookId: number, shelf: ShelfType | null, extra?: { dnfReason?: string }) => boolean
  updateProgress: (p: Omit<ReadingProgress, 'lastReadAt' | 'minutes'>) => void
  logMinutes: (bookId: number, minutes: number) => void
  addHighlight: (h: { bookId: number; chapter: number; text: string; color: HighlightColor; note?: string }) => boolean
  removeHighlight: (id: string) => void
  toggleBookmark: (b: { bookId: number; chapter: number; paragraph: number; snippet: string }) => boolean
  addReview: (r: { bookId: number; rating: number; title: string; body: string; spoilers: boolean }) => Promise<boolean>
  addDiary: (d: { bookId?: number; title: string; body: string; mood: DiaryEntry['mood']; location?: string; isPublic: boolean }) => Promise<boolean>
  deleteDiary: (id: string) => void
  toggleFollow: (userId: string, username: string) => boolean
  vote: (debateId: string, side: 'a' | 'b', argument?: string) => Promise<boolean>
  toggleClub: (clubId: string) => Promise<boolean>
  toggleLikeStory: (id: string) => boolean
  toggleLikeReview: (id: string) => boolean
  toggleLikeDiary: (id: string) => boolean
  loadNotifications: () => Promise<void>
  markRead: (id?: string) => void
  pushSearch: (q: string) => void
}

const empty = () => ({
  shelves: [], progress: {}, highlights: [], bookmarks: [], reviews: [], diary: [], following: [], votes: {}, clubs: [], likedStories: [], likedReviews: [], likedDiary: [], notifications: [],
  streak: { current: 0, longest: 0, lastDate: null, days: [] } as Streak,
})

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...empty(),
      searchHistory: [],

      hydrate: async () => {
        const local = get()
        const data = await api.get<Omit<LibraryState, 'hydrated' | 'searchHistory'>>('/api/me/library')
        // Guest reading positions for books the account hasn't started yet are kept.
        const merged: Record<number, ReadingProgress> = { ...data.progress }
        for (const [k, p] of Object.entries(local.progress)) {
          const id = Number(k)
          if (!merged[id] && p.percentage > 0) {
            merged[id] = p
            swallow(api.put('/api/progress', { bookId: id, chapter: p.chapter, paragraph: p.paragraph, percentage: p.percentage }))
          }
        }
        set({ ...data, progress: merged, hydrated: true })
        get().loadNotifications().catch(() => {})
      },
      reset: () => set({ ...empty(), hydrated: false }),

      shelfFor: (bookId) => get().shelves.find((s) => s.bookId === bookId),
      setShelf: (bookId, shelf, extra) => {
        if (!signedIn()) return needLogin()
        set((s) => {
          const rest = s.shelves.filter((e) => e.bookId !== bookId)
          if (!shelf) return { shelves: rest }
          const prev = s.shelves.find((e) => e.bookId === bookId)
          return { shelves: [{ bookId, shelf, addedAt: prev?.addedAt ?? now(), startedAt: shelf === 'reading' ? prev?.startedAt ?? now() : prev?.startedAt, finishedAt: shelf === 'finished' ? now() : undefined, dnfReason: extra?.dnfReason }, ...rest] }
        })
        swallow(api.put('/api/shelves', { bookId, shelf, dnfReason: extra?.dnfReason }))
        return true
      },
      updateProgress: (p) => {
        set((s) => {
          const prev = s.progress[p.bookId]
          const shelves = s.shelves.some((e) => e.bookId === p.bookId) || p.percentage < 1 ? s.shelves : [{ bookId: p.bookId, shelf: 'reading' as const, addedAt: now(), startedAt: now() }, ...s.shelves]
          return { progress: { ...s.progress, [p.bookId]: { ...p, minutes: prev?.minutes ?? 0, lastReadAt: now() } }, shelves }
        })
        if (signedIn()) swallow(api.put('/api/progress', { bookId: p.bookId, chapter: p.chapter, paragraph: p.paragraph, percentage: p.percentage }))
      },
      logMinutes: (bookId, minutes) => {
        set((s) => {
          const prev = s.progress[bookId]
          if (!prev) return {}
          const t = today()
          const days = s.streak.days.includes(t) ? s.streak.days : [t, ...s.streak.days]
          const current = s.streak.lastDate === t ? s.streak.current : s.streak.current + 1
          return { progress: { ...s.progress, [bookId]: { ...prev, minutes: prev.minutes + minutes, lastReadAt: now() } }, streak: { current, longest: Math.max(current, s.streak.longest), lastDate: t, days } }
        })
        const p = get().progress[bookId]
        if (signedIn() && p) swallow(api.put('/api/progress', { bookId, chapter: p.chapter, paragraph: p.paragraph, percentage: p.percentage, minutesDelta: minutes }))
      },
      addHighlight: (h) => {
        if (!signedIn()) return needLogin()
        const tempId = uid()
        set((s) => ({ highlights: [{ ...h, id: tempId, isPublic: true, createdAt: now() }, ...s.highlights] }))
        swallow(api.post<Highlight>('/api/highlights', h).then((saved) => set((s) => ({ highlights: s.highlights.map((x) => (x.id === tempId ? saved : x)) }))))
        return true
      },
      removeHighlight: (id) => { set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })); if (signedIn()) swallow(api.del(`/api/highlights/${id}`)) },
      toggleBookmark: (b) => {
        if (!signedIn()) return needLogin()
        const existing = get().bookmarks.find((x) => x.bookId === b.bookId && x.chapter === b.chapter && x.paragraph === b.paragraph)
        if (existing) set((s) => ({ bookmarks: s.bookmarks.filter((x) => x.id !== existing.id) }))
        else set((s) => ({ bookmarks: [{ ...b, id: uid(), createdAt: now() }, ...s.bookmarks] }))
        swallow(api.post<Bookmark & { removed?: string }>('/api/bookmarks/toggle', b).then((r) => { if (!r.removed) set((s) => ({ bookmarks: s.bookmarks.map((x) => (x.bookId === b.bookId && x.chapter === b.chapter && x.paragraph === b.paragraph ? r : x)) })) }))
        return true
      },
      addReview: async (r) => {
        if (!signedIn()) return needLogin()
        try {
          const saved = await api.put<Review>('/api/reviews', r)
          set((s) => ({ reviews: [saved, ...s.reviews.filter((x) => x.bookId !== r.bookId)] }))
          return true
        } catch (e) { toast((e as Error).message, 'error'); return false }
      },
      addDiary: async (d) => {
        if (!signedIn()) return needLogin()
        try {
          const saved = await api.post<DiaryEntry>('/api/diary', d)
          set((s) => ({ diary: [saved, ...s.diary] }))
          return true
        } catch (e) { toast((e as Error).message, 'error'); return false }
      },
      deleteDiary: (id) => { set((s) => ({ diary: s.diary.filter((d) => d.id !== id) })); swallow(api.del(`/api/diary/${id}`)) },
      toggleFollow: (userId, username) => {
        if (!signedIn()) return needLogin()
        const on = get().following.includes(userId)
        set((s) => ({ following: on ? s.following.filter((u) => u !== userId) : [...s.following, userId] }))
        swallow(on ? api.del(`/api/users/${username}/follow`) : api.post(`/api/users/${username}/follow`))
        return true
      },
      vote: async (debateId, side, argument) => {
        if (!signedIn()) return needLogin()
        set((s) => ({ votes: { ...s.votes, [debateId]: side } }))
        try { await api.post(`/api/debates/${debateId}/vote`, { side, argument }); return true } catch (e) { toast((e as Error).message, 'error'); return false }
      },
      toggleClub: async (clubId) => {
        if (!signedIn()) return needLogin()
        const on = get().clubs.includes(clubId)
        set((s) => ({ clubs: on ? s.clubs.filter((c) => c !== clubId) : [...s.clubs, clubId] }))
        try { await (on ? api.del(`/api/clubs/${clubId}/join`) : api.post(`/api/clubs/${clubId}/join`)); return true } catch (e) { set((s) => ({ clubs: on ? [...s.clubs, clubId] : s.clubs.filter((c) => c !== clubId) })); toast((e as Error).message, 'error'); return false }
      },
      toggleLikeStory: (id) => { if (!signedIn()) return needLogin(); set((s) => ({ likedStories: s.likedStories.includes(id) ? s.likedStories.filter((x) => x !== id) : [...s.likedStories, id] })); swallow(api.post(`/api/stories/${id}/like`)); return true },
      toggleLikeReview: (id) => { if (!signedIn()) return needLogin(); set((s) => ({ likedReviews: s.likedReviews.includes(id) ? s.likedReviews.filter((x) => x !== id) : [...s.likedReviews, id] })); swallow(api.post(`/api/reviews/${id}/like`)); return true },
      toggleLikeDiary: (id) => { if (!signedIn()) return needLogin(); set((s) => ({ likedDiary: s.likedDiary.includes(id) ? s.likedDiary.filter((x) => x !== id) : [...s.likedDiary, id] })); swallow(api.post(`/api/diary/${id}/like`)); return true },
      loadNotifications: async () => { if (!signedIn()) return; set({ notifications: await api.get<Notification[]>('/api/notifications') }) },
      markRead: (id) => { set((s) => ({ notifications: s.notifications.map((n) => (id == null || n.id === id ? { ...n, isRead: true } : n)) })); if (signedIn()) swallow(api.post('/api/notifications/read', id ? [id] : null)) },
      pushSearch: (q) => set((s) => ({ searchHistory: [q, ...s.searchHistory.filter((x) => x !== q)].slice(0, 8) })),
    }),
    { name: 'bookverse.library.v2' },
  ),
)

registerLibraryHooks({ hydrate: () => useLibrary.getState().hydrate(), reset: () => useLibrary.getState().reset() })
