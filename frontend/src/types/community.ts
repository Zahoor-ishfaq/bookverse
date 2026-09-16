import type { Mood } from './book'

export interface SocialLinks {
  website?: string
  x?: string
  instagram?: string
  linkedin?: string
  goodreads?: string
  youtube?: string
}

export interface User {
  id: string
  username: string
  displayName: string
  avatar: string // initials fallback
  avatarColor: string
  avatarUrl?: string
  headline?: string
  bio: string
  links?: SocialLinks
  acceptedTermsAt?: string
  marketingOptIn?: boolean
  location: string
  followers: number
  following: number
  booksRead: number
  reviews: number
  streak: number
  favoriteGenres: string[]
  favoriteMoods: Mood[]
  readingGoal: number
  joinedYear: number
  isAuthor?: boolean
  isVerified?: boolean
}

export interface BookClub {
  id: string
  name: string
  description: string
  coverColor: string
  coverEmoji: string
  currentBookId: number
  memberCount: number
  maxMembers: number
  activity: 'buzzing' | 'active' | 'quiet'
  frequency: string
  isPrivate: boolean
  createdBy?: string
  threads: Thread[]
  memberIds: string[]
  schedule: { week: number; chapters: string; date: string }[]
}

export interface Thread {
  id: string
  userId: string
  chapter: number
  title: string
  body: string
  replies: Reply[]
  likes: number
  spoilers: boolean
  createdAt: string
  pinned?: boolean
}

export interface Reply {
  id: string
  userId: string
  body: string
  likes: number
  createdAt: string
}

export interface ReadingRoom {
  id: string
  title: string
  description: string
  bookId: number
  hostId: string
  isLive: boolean
  participants: number
  scheduledAt?: string | null
  endedAt?: string | null
  pinnedQuote?: string | null
  participantIds: string[]
  messages: RoomMessage[]
}

export interface RoomMessage {
  id: string
  userId: string
  text: string
  type: 'text' | 'quote' | 'reaction'
  createdAt: string
}

export interface Debate {
  id: string
  bookId: number
  question: string
  sideA: string
  sideB: string
  countA: number
  countB: number
  endsAt: string
  createdBy?: string
  arguments: DebateArgument[]
}

export interface DebateArgument {
  id: string
  userId: string
  side: 'a' | 'b'
  text: string
  likes: number
}

export interface Story {
  id: string
  authorId: string
  title: string
  tagline: string
  coverColor: string
  coverPattern: 'stripes' | 'dots' | 'waves' | 'grid'
  genres: string[]
  inspiredByBookId?: number
  isSerial: boolean
  isComplete: boolean
  wordCount: number
  views: number
  likes: number
  bookmarks: number
  comments: number
  featured?: boolean
  publishedAt: string
  chapters: StoryChapter[]
}

export interface StoryChapter {
  number: number
  title: string
  content: string[] // paragraphs
  publishedAt: string
  comments: number
}

export interface DiaryEntry {
  id: string
  userId: string
  bookId?: number
  title: string
  body: string
  mood: Mood
  location?: string
  isPublic: boolean
  likes: number
  createdAt: string
}

export interface Challenge {
  id: string
  title: string
  description: string
  type: 'books' | 'pages' | 'genre_bingo' | 'streak' | 'writing'
  target: number
  startDate: string
  endDate: string
  participants: number
  leaderboard: { userId: string; value: number }[]
  prompt?: string
}

export interface Notification {
  id: string
  type:
    | 'like'
    | 'comment'
    | 'follow'
    | 'finished'
    | 'chapter'
    | 'club'
    | 'debate'
    | 'streak'
    | 'digest'
  title: string
  body: string
  actionUrl: string
  isRead: boolean
  createdAt: string
  fromUserId?: string | null
}

export type FeedItem =
  | { kind: 'activity'; id: string; userId: string; verb: 'started' | 'finished' | 'reviewed' | 'highlighted'; bookId: number; text?: string; rating?: number; createdAt: string }
  | { kind: 'diary'; id: string; entryId: string; createdAt: string }
  | { kind: 'debate'; id: string; debateId: string; createdAt: string }
  | { kind: 'club'; id: string; clubId: string; text: string; createdAt: string }
  | { kind: 'recommendation'; id: string; bookIds: number[]; reason: string; createdAt: string }
  | { kind: 'story'; id: string; storyId: string; chapter: number; createdAt: string }
