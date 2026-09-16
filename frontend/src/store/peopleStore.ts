import { useEffect } from 'react'
import { create } from 'zustand'
import type { User } from '@/types/community'
import { api } from '@/services/api'
import { useAuth } from './authStore'

// Cache of public profiles keyed by id so feeds, threads and rooms can render
// names and avatars without each item fetching separately.
interface PeopleState {
  people: Record<string, User>
  pending: Set<string>
  remember: (users: User[]) => void
  ensure: (ids: string[]) => void
}

export const PLACEHOLDER: User = { id: '', username: 'member', displayName: 'Member', avatar: 'M', avatarColor: '#8B949A', bio: '', location: '', followers: 0, following: 0, booksRead: 0, reviews: 0, streak: 0, favoriteGenres: [], favoriteMoods: [], readingGoal: 0, joinedYear: new Date().getFullYear() }

let flushTimer: number | undefined
const queue = new Set<string>()

export const usePeopleStore = create<PeopleState>()((set, get) => ({
  people: {},
  pending: new Set(),
  remember: (users) => set((s) => ({ people: { ...s.people, ...Object.fromEntries(users.filter(Boolean).map((u) => [u.id, u])) } })),
  ensure: (ids) => {
    const { people, pending } = get()
    ids.forEach((id) => { if (id && !people[id] && !pending.has(id)) queue.add(id) })
    if (!queue.size) return
    window.clearTimeout(flushTimer)
    flushTimer = window.setTimeout(async () => {
      const batch = [...queue]; queue.clear()
      batch.forEach((id) => pending.add(id))
      try {
        const res = await api.get<Record<string, User>>(`/api/people/${batch.join(',')}`)
        set((s) => ({ people: { ...s.people, ...res } }))
      } catch { /* leave placeholders */ } finally { batch.forEach((id) => pending.delete(id)) }
    }, 30)
  },
}))

/** Subscribe to the people cache and make sure the given ids are loaded. */
export function usePeople(ids: (string | undefined | null)[]) {
  const people = usePeopleStore((s) => s.people)
  const ensure = usePeopleStore((s) => s.ensure)
  const me = useAuth((s) => s.user)
  const key = ids.filter(Boolean).join(',')
  useEffect(() => { ensure(key ? key.split(',') : []) }, [key, ensure])
  return (id: string | undefined | null): User => (id && me?.id === id ? me : id ? people[id] ?? { ...PLACEHOLDER, id, displayName: '…' } : PLACEHOLDER)
}
