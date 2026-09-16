export type Mood =
  | 'adventurous'
  | 'dark'
  | 'romantic'
  | 'philosophical'
  | 'funny'
  | 'calm'

export interface Author {
  name: string
  birth_year: number | null
  death_year: number | null
}

export interface Book {
  id: number
  title: string
  authors: Author[]
  subjects: string[]
  bookshelves: string[]
  languages: string[]
  formats: Record<string, string>
  download_count: number
  copyright: boolean | null
  summaries?: string[]
  // Derived client-side
  coverUrl: string
  authorName: string
  moods: Mood[]
  genre: string
  era: 'pre-1800s' | '1800s' | '1900s' | 'unknown'
  // Community numbers (seeded / local)
  rating: number
  ratingCount: number
  readers: number
  // Present for member-published books
  selfPublished?: { ownerId: string; subtitle?: string | null; publishedAt: string; isPublic: boolean; words: number; chapters: number }
}

export interface GutendexResponse {
  count: number
  next: string | null
  previous: string | null
  results: RawBook[]
}

export type RawBook = Omit<
  Book,
  'coverUrl' | 'authorName' | 'moods' | 'genre' | 'era' | 'rating' | 'ratingCount' | 'readers' | 'selfPublished'
>

export interface Chapter {
  index: number
  title: string
  paragraphs: string[]
  words: number
}

export interface ParsedBook {
  chapters: Chapter[]
  totalWords: number
}

export type ShelfType =
  | 'reading'
  | 'want_to_read'
  | 'finished'
  | 'did_not_finish'
  | 'favorites'

export interface ShelfEntry {
  bookId: number
  shelf: ShelfType
  addedAt: string
  startedAt?: string
  finishedAt?: string
  dnfReason?: string
}

export interface ReadingProgress {
  bookId: number
  chapter: number
  paragraph: number
  percentage: number
  minutes: number
  lastReadAt: string
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'

export interface Highlight {
  id: string
  bookId: number
  userId?: string
  likes?: number
  chapter: number
  text: string
  color: HighlightColor
  note?: string
  isPublic: boolean
  createdAt: string
}

export interface Bookmark {
  id: string
  bookId: number
  chapter: number
  paragraph: number
  snippet: string
  createdAt: string
}

export interface Review {
  id: string
  bookId: number
  userId: string
  rating: number
  title: string
  body: string
  spoilers: boolean
  sentiment: 'positive' | 'negative' | 'mixed'
  likes: number
  createdAt: string
}
