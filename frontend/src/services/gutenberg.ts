import type { Book, GutendexResponse, RawBook, Mood } from '@/types/book'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { catalogGet, filterCatalog, loadCatalog, PAGE_SIZE } from './catalog'
export const USER_BOOK_BASE = 10_000_000
export const isUserBookId = (id: number) => id >= USER_BOOK_BASE

// All catalogue traffic goes through the BookVerse API, which proxies and
// caches Gutendex/Gutenberg server-side. Covers are plain <img> tags and load
// straight from gutenberg.org (no CORS needed for images).
import { API_BASE } from './api'
const BOOKS = `${API_BASE}/api/books`
const GUTENBERG_ASSETS = 'https://www.gutenberg.org'

export const coverUrlFor = (id: number) =>
  `${GUTENBERG_ASSETS}/cache/epub/${id}/pg${id}.cover.medium.jpg`

// ---------- Mood + genre heuristics (stand-in for zero-shot classifier) ----------
const MOOD_RULES: [Mood, RegExp][] = [
  ['adventurous', /adventure|sea|voyage|pirate|travel|expedition|western|quest|island|treasure|war/i],
  ['dark', /horror|gothic|crime|murder|ghost|detective|mystery|supernatural|vampire|terror|tragedy|death/i],
  ['romantic', /love|romance|marriage|courtship|domestic|sisters|passion|betrothal/i],
  ['philosophical', /philosoph|ethics|political|essay|religion|metaphysic|psycholog|treatise|science|logic|economics/i],
  ['funny', /humor|humour|satire|comedy|comic|wit|parody|farce|nonsense/i],
  ['calm', /poetry|poems|nature|garden|pastoral|children|fairy|folklore|walden|meditation|letters/i],
]

const GENRE_RULES: [string, RegExp][] = [
  ['Mystery', /detective|mystery|crime|murder/i],
  ['Horror', /horror|gothic|ghost|vampire|supernatural/i],
  ['Romance', /love stories|romance|courtship/i],
  ['Philosophy', /philosoph|ethics|metaphysic/i],
  ['Poetry', /poetry|poems/i],
  ['Science', /science|biology|physics|evolution|astronomy/i],
  ['History', /history|historical|biography|memoir/i],
  ['Adventure', /adventure|sea stories|pirates|voyages/i],
  ['Fantasy', /fantasy|fairy|folklore|mythology|magic/i],
  ['Drama', /drama|plays|tragedies|comedies/i],
  ['Fiction', /fiction/i],
]

function seededRand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export function enrich(raw: RawBook): Book {
  const haystack = [...raw.subjects, ...raw.bookshelves].join(' | ')
  const moods = MOOD_RULES.filter(([, re]) => re.test(haystack)).map(([m]) => m)
  if (moods.length === 0) moods.push('calm')
  const genre = GENRE_RULES.find(([, re]) => re.test(haystack))?.[0] ?? 'Classics'
  const author = raw.authors[0]
  const birth = author?.birth_year ?? null
  const era = birth == null ? 'unknown' : birth < 1770 ? 'pre-1800s' : birth < 1870 ? '1800s' : '1900s'
  const r = seededRand(raw.id)
  return {
    ...raw,
    coverUrl: raw.formats['image/jpeg'] ?? coverUrlFor(raw.id),
    authorName: author ? author.name.split(', ').reverse().join(' ') : 'Unknown',
    moods: moods.slice(0, 3),
    genre,
    era,
    rating: Math.round((3.6 + r * 1.3) * 10) / 10,
    ratingCount: Math.floor(40 + r * 900),
    readers: Math.floor(raw.download_count / 9 + r * 120),
  }
}

// ---------- Fetching ----------
export interface BookQuery {
  search?: string
  topic?: string
  languages?: string
  sort?: 'popular' | 'ascending' | 'descending'
  page?: number
  ids?: number[]
  authorYearStart?: number
  authorYearEnd?: number
}

export async function fetchBooks(q: BookQuery = {}): Promise<{ books: Book[]; count: number; hasMore: boolean }> {
  // Serve browsing (no free-text search) from the local catalogue when it can.
  if (!q.search && !q.ids?.length) {
    const catalog = await loadCatalog()
    if (catalog.length) {
      const all = filterCatalog(catalog, q)
      const page = q.page ?? 1
      const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      // Enough local results → answer instantly. Otherwise fall through to the API.
      if (slice.length >= (q.topic ? 8 : PAGE_SIZE) || (page > 1 && all.length > (page - 1) * PAGE_SIZE)) {
        return { books: slice, count: all.length, hasMore: all.length > page * PAGE_SIZE }
      }
    }
  }
  const params = new URLSearchParams()
  if (q.search) params.set('search', q.search)
  if (q.topic) params.set('topic', q.topic)
  params.set('languages', q.languages ?? 'en')
  params.set('mime_type', 'text/plain')
  if (q.sort) params.set('sort', q.sort)
  if (q.page) params.set('page', String(q.page))
  if (q.ids?.length) params.set('ids', q.ids.join(','))
  if (q.authorYearStart) params.set('author_year_start', String(q.authorYearStart))
  if (q.authorYearEnd) params.set('author_year_end', String(q.authorYearEnd))
  const res = await fetch(`${BOOKS}?${params}`)
  if (!res.ok) throw new Error('The catalogue is temporarily unavailable')
  const data: GutendexResponse = await res.json()
  return { books: data.results.map(enrich), count: data.count, hasMore: Boolean(data.next) }
}

export async function fetchBook(id: number): Promise<Book> {
  if (!isUserBookId(id)) {
    await loadCatalog()
    const hit = catalogGet(id)
    if (hit) return hit
  }
  const res = await fetch(`${BOOKS}/${id}`)
  if (!res.ok) throw new Error('Book not found')
  const data = await res.json()
  return isUserBookId(id) ? (data as Book) : enrich(data)
}

export async function fetchBooksByIds(ids: number[]): Promise<Book[]> {
  if (!ids.length) return []
  await loadCatalog()
  const map = new Map<number, Book>()
  const missing: number[] = []
  for (const id of ids) {
    const b = catalogGet(id)
    if (b) map.set(id, b); else missing.push(id)
  }
  const gutenbergMissing = missing.filter((id) => !isUserBookId(id))
  if (gutenbergMissing.length) {
    const { books } = await fetchBooks({ ids: gutenbergMissing })
    books.forEach((b) => map.set(b.id, b))
  }
  await Promise.all(missing.filter(isUserBookId).map(async (id) => { try { map.set(id, await fetchBook(id)) } catch { /* removed */ } }))
  return ids.map((id) => map.get(id)).filter(Boolean) as Book[]
}

const TEXT_TTL = 7 * 864e5

/** Raw text for Gutenberg books, or {chapters} JSON for member-published ones. */
export async function fetchBookText(book: Book): Promise<string | { chapters: { title: string; paragraphs: string[] }[] }> {
  const key = `text:${book.id}`
  if (!isUserBookId(book.id)) {
    try {
      const cached = await idbGet<{ t: number; v: string }>(key)
      if (cached && Date.now() - cached.t < TEXT_TTL) return cached.v
    } catch { /* IndexedDB unavailable */ }
  }
  const res = await fetch(`${BOOKS}/${book.id}/text`)
  if (!res.ok) throw new Error('Text not available for this edition')
  if ((res.headers.get('content-type') || '').includes('application/json')) return res.json()
  const text = await res.text()
  idbSet(key, { t: Date.now(), v: text }).catch(() => {})
  return text
}
