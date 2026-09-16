import { useEffect } from 'react'
import type { Book } from '@/types/book'

// Per-page document head without a dependency: title, description, canonical,
// Open Graph / Twitter cards and optional JSON-LD structured data.

export const SITE = 'BookVerse'
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '')
const DEFAULT_DESC = 'Read 75,000 free public-domain books in a beautiful reader, join book clubs and live reading rooms, keep a reading diary, and publish your own book. Free forever.'

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
export const bookPath = (b: Pick<Book, 'id' | 'title'>) => `/books/${b.id}/${slugify(b.title)}`

interface SEO {
  title?: string
  description?: string
  path?: string
  image?: string
  type?: 'website' | 'article' | 'book' | 'profile'
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.content = content
}

export function useSEO({ title, description = DEFAULT_DESC, path, image, type = 'website', noindex, jsonLd }: SEO) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE}` : `${SITE} — Read. Connect. Remember.`
    document.title = full
    const url = SITE_URL + (path ?? window.location.pathname)
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow')
    upsertMeta('property', 'og:site_name', SITE)
    upsertMeta('property', 'og:title', full)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', image ?? `${SITE_URL}/og-default.png`)
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', full)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image ?? `${SITE_URL}/og-default.png`)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = url

    const id = 'ld-json-page'
    document.getElementById(id)?.remove()
    if (jsonLd) {
      const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = id
      s.text = JSON.stringify(jsonLd); document.head.appendChild(s)
    }
    return () => { document.getElementById(id)?.remove() }
  }, [title, description, path, image, type, noindex, JSON.stringify(jsonLd)]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function bookJsonLd(b: Book, opts: { url: string; description?: string; reviewCount?: number }) {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: b.title,
    author: b.authors.map((a) => ({ '@type': 'Person', name: a.name.split(', ').reverse().join(' ') })),
    inLanguage: b.languages[0],
    genre: b.subjects.slice(0, 5),
    image: b.coverUrl || undefined,
    url: opts.url,
    description: opts.description,
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: SITE },
  }
  if (b.rating > 0) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: b.rating, bestRating: 5, ratingCount: b.ratingCount + (opts.reviewCount ?? 0) }
  return ld
}

export const orgJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE,
  url: SITE_URL,
  potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
})

export const faqJsonLd = (faqs: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})
