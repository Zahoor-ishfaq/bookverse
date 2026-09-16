import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchBook, fetchBooks, fetchBooksByIds, fetchBookText, type BookQuery } from '@/services/gutenberg'
import { parseBook } from '@/lib/parseBook'
import type { Book, ParsedBook } from '@/types/book'

const DAY = 1000 * 60 * 60 * 24

export function useBook(id: number | undefined) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: () => fetchBook(id!),
    enabled: id != null && !Number.isNaN(id),
    staleTime: DAY,
  })
}

export function useBooksByIds(ids: number[]) {
  return useQuery({
    queryKey: ['books', 'ids', ids.join(',')],
    queryFn: () => fetchBooksByIds(ids),
    enabled: ids.length > 0,
    staleTime: DAY,
  })
}

export function useBookList(q: BookQuery, enabled = true) {
  return useQuery({
    queryKey: ['books', 'list', q],
    queryFn: () => fetchBooks(q),
    enabled,
    staleTime: DAY,
    placeholderData: (prev) => prev,
  })
}

export function useInfiniteBooks(q: Omit<BookQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['books', 'infinite', q],
    queryFn: ({ pageParam }) => fetchBooks({ ...q, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    staleTime: DAY,
  })
}

export const textQuery = (book: Book) => ({
  queryKey: ['book-text', book.id] as const,
  queryFn: async (): Promise<ParsedBook> => {
    const t = await fetchBookText(book)
    if (typeof t === 'string') return parseBook(t)
    const chapters = t.chapters.map((c, i) => ({ index: i, title: c.title || `Chapter ${i + 1}`, paragraphs: c.paragraphs, words: c.paragraphs.join(' ').split(/\s+/).filter(Boolean).length }))
    return { chapters, totalWords: chapters.reduce((n, c) => n + c.words, 0) }
  },
  staleTime: Infinity,
  gcTime: DAY,
  retry: 1,
})

export function useBookText(book: Book | undefined) {
  return useQuery<ParsedBook>({
    queryKey: ['book-text', book?.id],
    queryFn: () => textQuery(book!).queryFn(),
    enabled: !!book,
    staleTime: Infinity,
    gcTime: DAY,
    retry: 1,
  })
}

// Warm the text cache while the reader is still a click away.
export function usePrefetchBookText(book: Book | undefined, delayMs = 800) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!book) return
    const t = window.setTimeout(() => { qc.prefetchQuery(textQuery(book)).catch(() => {}) }, delayMs)
    return () => window.clearTimeout(t)
  }, [book, qc, delayMs])
}
