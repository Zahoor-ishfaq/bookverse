import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { BookClub, Challenge, Debate, DiaryEntry, ReadingRoom, Story, User } from '@/types/community'
import type { Review, Highlight } from '@/types/book'
import { usePeopleStore } from '@/store/peopleStore'

const MIN = 60_000
// Community data changes under other people's hands: keep it fresh.
const LIVE = { staleTime: 3_000, refetchOnMount: 'always' as const, refetchOnWindowFocus: true }

export interface FeedItem {
  id: string; kind: 'activity' | 'diary' | 'story' | 'club' | 'debate'; userId?: string; verb?: string; bookId?: number | null; text?: string | null; rating?: number | null
  createdAt: string; followed?: boolean; entry?: DiaryEntry; story?: Story; club?: BookClub; debate?: Debate
}

export interface Profile extends User {
  isFollowing: boolean; shelfBookIds: number[]; reviewsList: Review[]; stories: Story[]; books: import('@/types/book').Book[]; diary: DiaryEntry[]; highlights: Highlight[]; readingDays: string[]; mutualFollowerIds?: string[]; published: number
}

export const useClubs = () => useQuery({ queryKey: ['clubs'], queryFn: () => api.get<BookClub[]>('/api/clubs'), ...LIVE })
export const useClub = (id?: string) => useQuery({ queryKey: ['club', id], queryFn: () => api.get<BookClub>(`/api/clubs/${id}`), enabled: !!id, ...LIVE })
export const useRooms = () => useQuery({ queryKey: ['rooms'], queryFn: () => api.get<ReadingRoom[]>('/api/rooms'), ...LIVE })
export const useRoom = (id?: string) => useQuery({ queryKey: ['room', id], queryFn: () => api.get<ReadingRoom>(`/api/rooms/${id}`), enabled: !!id, ...LIVE })
export const useDebates = () => useQuery({ queryKey: ['debates'], queryFn: () => api.get<Debate[]>('/api/debates'), ...LIVE })
export const useDebate = (id?: string) => useQuery({ queryKey: ['debate', id], queryFn: () => api.get<Debate>(`/api/debates/${id}`), enabled: !!id, ...LIVE })
export const useStories = () => useQuery({ queryKey: ['stories'], queryFn: () => api.get<Story[]>('/api/stories'), ...LIVE })
export const useStory = (id?: string) => useQuery({ queryKey: ['story', id], queryFn: () => api.get<Story & { commentsList: { id: string; userId: string; chapter: number; body: string; createdAt: string }[] }>(`/api/stories/${id}`), enabled: !!id, ...LIVE })
export const useChallenges = () => useQuery({ queryKey: ['challenges'], queryFn: () => api.get<(Challenge & { joined: boolean })[]>('/api/challenges'), ...LIVE })
export const usePublicDiary = (mood?: string | null) => useQuery({ queryKey: ['diary', mood ?? ''], queryFn: () => api.get<DiaryEntry[]>(`/api/diary${mood ? `?mood=${mood}` : ''}`), ...LIVE })
export const useFeed = () => useQuery({ queryKey: ['feed'], queryFn: () => api.get<FeedItem[]>('/api/feed'), ...LIVE })
export const useSearch = (q: string) => useQuery({ queryKey: ['search', q], queryFn: () => api.get<{ users: User[]; stories: Story[]; clubs: BookClub[]; communityBooks: import('@/types/book').Book[] }>(`/api/search?q=${encodeURIComponent(q)}`), enabled: q.trim().length > 1, ...LIVE })
export const useSuggested = () => useQuery({ queryKey: ['suggested'], queryFn: () => api.get<User[]>('/api/users/suggested/list'), ...LIVE })
export const useBookReviews = (bookId?: number) => useQuery({ queryKey: ['reviews', bookId], queryFn: () => api.get<{ reviews: Review[]; average: number | null; count: number }>(`/api/books/${bookId}/reviews`), enabled: !!bookId, ...LIVE })
export const useBookHighlights = (bookId?: number) => useQuery({ queryKey: ['book-highlights', bookId], queryFn: () => api.get<Highlight[]>(`/api/books/${bookId}/highlights`), enabled: !!bookId, ...LIVE })
export const useCommunityBooks = () => useQuery({ queryKey: ['community-books'], queryFn: () => api.get<import('@/types/book').Book[]>('/api/books/community'), ...LIVE })
export const useStats = () => useQuery({ queryKey: ['stats'], queryFn: () => api.get<{ members: number; reviews: number; books: number }>('/api/stats'), staleTime: 5 * MIN })

export function useProfile(username?: string) {
  const remember = usePeopleStore((s) => s.remember)
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => { const p = await api.get<Profile>(`/api/users/${username}`); remember([p]); return p },
    enabled: !!username,
    ...LIVE,
  })
}

export function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
}
