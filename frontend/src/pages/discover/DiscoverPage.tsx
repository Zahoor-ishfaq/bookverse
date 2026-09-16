import { useMemo, useState } from 'react'
import { useSEO } from '@/lib/seo'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { BookCarousel, MasonryGrid } from '@/components/book/BookCard'
import { BookCover } from '@/components/book/BookCover'
import { SectionHead } from '@/components/ui'
import { useBooksByIds, useInfiniteBooks } from '@/hooks/useBooks'
import { FEATURED_IDS, GENRE_TOPICS, MOODS, MOOD_TOPICS } from '@/data/seed'
import { cn } from '@/lib/utils'
import type { Mood } from '@/types/book'
import { coverUrlFor } from '@/services/gutenberg'
import { useCommunityBooks } from '@/hooks/useCommunity'

const SORTS = [
  { key: 'popular', label: 'Most popular this week' },
  { key: 'descending', label: 'New additions' },
  { key: 'ascending', label: 'Oldest first' },
] as const
const ERAS = [{ key: '', label: 'Any era' }, { key: 'pre', label: 'Pre-1800s' }, { key: '1800', label: '1800s' }, { key: '1900', label: '1900s' }]
const LANGS = [{ key: 'en', label: 'English' }, { key: 'fr', label: 'French' }, { key: 'de', label: 'German' }, { key: 'es', label: 'Spanish' }, { key: 'it', label: 'Italian' }]

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const mood = (params.get('mood') as Mood | null) ?? null
  const genre = params.get('genre') ?? ''
  const q = params.get('q') ?? ''
  const era = params.get('era') ?? ''
  const lang = params.get('lang') ?? 'en'
  const sort = (params.get('sort') as (typeof SORTS)[number]['key']) ?? 'popular'
  const [draft, setDraft] = useState(q)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const setP = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }

  const topic = mood ? MOOD_TOPICS[mood] : genre ? GENRE_TOPICS.find((g) => g.name === genre)?.topic : undefined
  const eraRange = era === 'pre' ? { authorYearEnd: 1769 } : era === '1800' ? { authorYearStart: 1770, authorYearEnd: 1869 } : era === '1900' ? { authorYearStart: 1870 } : {}
  const list = useInfiniteBooks({ search: q || undefined, topic, sort, languages: lang, ...eraRange })
  const featured = useBooksByIds(FEATURED_IDS.slice(0, 12))
  const books = useMemo(() => {
    const all = list.data?.pages.flatMap((p) => p.books) ?? []
    const seen = new Set<number>()
    return all.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)))
  }, [list.data])
  const total = list.data?.pages[0]?.count ?? 0
  const filtering = Boolean(mood || genre || q || era)
  const activeMood = MOODS.find((m) => m.key === mood)
  useSEO({ title: activeMood ? `${activeMood.label} books` : genre ? `${genre} books` : q ? `Search: ${q}` : 'Discover free books', description: 'Browse more than 75,000 free public-domain books by mood, genre, era and language. Read any of them instantly in the BookVerse reader.' })
  const communityBooks = useCommunityBooks().data ?? []

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl">
          {q ? <>Results for “{q}”</> : activeMood ? <>{activeMood.label} reads</> : genre ? genre : 'Discover'}
        </motion.h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{activeMood ? activeMood.blurb : 'Seventy-five thousand books, none of them behind a paywall.'}</p>

        <form onSubmit={(e) => { e.preventDefault(); setP('q', draft.trim() || null) }} className="mt-5 flex max-w-2xl items-center gap-1 rounded-full border p-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
          <div className="relative hidden sm:block">
            <select value={genre} onChange={(e) => setP('genre', e.target.value || null)} className="appearance-none bg-transparent py-2 pl-4 pr-8 text-sm font-medium outline-none">
              <option value="">All categories</option>
              {GENRE_TOPICS.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <span className="absolute right-0 top-1/2 h-5 w-px -translate-y-1/2" style={{ background: 'var(--border)' }} />
          </div>
          <Search size={16} className="ml-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search by title, author or subject" className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
          {q && <button type="button" onClick={() => { setDraft(''); setP('q', null) }} className="btn btn-ghost btn-icon h-8 w-8"><X size={14} /></button>}
          <button className="btn btn-primary">Search</button>
        </form>
      </div>

      {/* Mood selector */}
      <div className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <span className="eyebrow mr-1 shrink-0 self-center">Mood</span>
        {MOODS.map((m) => {
          const active = mood === m.key
          return (
            <button key={m.key} onClick={() => setP('mood', active ? null : m.key)} className="flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors" style={{ background: active ? m.color : 'var(--bg-card)', borderColor: active ? m.color : 'var(--border-strong)', color: active ? '#fff' : 'var(--text-primary)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: active ? '#fff' : m.color }} />{m.label}
            </button>
          )
        })}
      </div>

      {!filtering && (
        <>
          {communityBooks.length > 0 && (
            <section className="mb-12">
              <SectionHead eyebrow="New on BookVerse" title="Published by our members" action={<Link to="/publish" className="btn btn-secondary btn-sm">Publish yours</Link>} />
              <BookCarousel books={communityBooks} itemWidth={150} />
            </section>
          )}
          <section className="mb-12">
            <SectionHead eyebrow="Curated" title="Recommended for you" action={<Link to="/discover?sort=popular&q=classic" className="btn btn-secondary btn-sm">View all <ArrowRight size={13} /></Link>} />
            {featured.data ? <BookCarousel books={featured.data} itemWidth={170} /> : <div className="flex gap-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3] w-[170px]" />)}</div>}
          </section>

          <section className="mb-14">
            <SectionHead eyebrow="Browse by" title="Category" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
              {GENRE_TOPICS.map((g, i) => (
                <motion.div key={g.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/discover?genre=${encodeURIComponent(g.name)}`} className="group block text-center">
                    <div className="relative mx-auto h-36 w-full">
                      <div className="absolute inset-x-1 bottom-0 h-20 rounded-2xl transition-colors" style={{ background: 'var(--bg-secondary)' }} />
                      {g.ids.slice(0, 3).map((id, j) => (
                        <img key={id} src={coverUrlFor(id)} alt="" loading="lazy" className="absolute bottom-3 h-28 w-auto rounded-[3px] shadow-cover transition-transform duration-300 group-hover:-translate-y-1.5"
                          style={{ left: `calc(50% - ${(1 - j) * 18 + 36}px)`, zIndex: j === 1 ? 3 : 1, transform: `rotate(${(j - 1) * 6}deg) translateY(${j === 1 ? 0 : 6}px)`, transitionDelay: `${j * 40}ms` }} />
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-semibold">{g.name}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Filter bar + masonry */}
      <section>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm" style={{ color: 'var(--text-secondary)' }}>
            {list.isLoading ? 'Counting books…' : <><strong style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()}</strong> books</>}
          </p>
          <button onClick={() => setFiltersOpen((o) => !o)} className={cn('btn btn-secondary btn-sm', filtersOpen && 'chip-active')}><SlidersHorizontal size={13} /> Filters</button>
          <div className="relative">
            <select value={sort} onChange={(e) => setP('sort', e.target.value)} className="btn btn-secondary btn-sm appearance-none pr-8">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        {filtersOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card-flat mb-6 grid gap-5 p-5 sm:grid-cols-3">
            <div><p className="eyebrow mb-2">Genre</p><div className="flex flex-wrap gap-1.5">{GENRE_TOPICS.map((g) => <button key={g.name} onClick={() => setP('genre', genre === g.name ? null : g.name)} className={cn('chip', genre === g.name && 'chip-active')}>{g.name}</button>)}</div></div>
            <div><p className="eyebrow mb-2">Era</p><div className="flex flex-wrap gap-1.5">{ERAS.map((e) => <button key={e.key} onClick={() => setP('era', e.key || null)} className={cn('chip', era === e.key && 'chip-active')}>{e.label}</button>)}</div></div>
            <div><p className="eyebrow mb-2">Language</p><div className="flex flex-wrap gap-1.5">{LANGS.map((l) => <button key={l.key} onClick={() => setP('lang', l.key)} className={cn('chip', lang === l.key && 'chip-active')}>{l.label}</button>)}</div></div>
          </motion.div>
        )}
        {filtering && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            {mood && <button className="chip chip-active" onClick={() => setP('mood', null)}>{MOODS.find((m) => m.key === mood)?.label} <X size={11} /></button>}
            {genre && <button className="chip chip-active" onClick={() => setP('genre', null)}>{genre} <X size={11} /></button>}
            {era && <button className="chip chip-active" onClick={() => setP('era', null)}>{ERAS.find((e) => e.key === era)?.label} <X size={11} /></button>}
            {q && <button className="chip chip-active" onClick={() => { setDraft(''); setP('q', null) }}>“{q}” <X size={11} /></button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setParams({})}>Clear all</button>
          </div>
        )}
        {list.isLoading ? (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">{Array.from({ length: 15 }).map((_, i) => <div key={i} className="skeleton mb-5 w-full break-inside-avoid" style={{ aspectRatio: '2/3', height: 180 + (i % 4) * 40 }} />)}</div>
        ) : list.isError ? (
          <div className="card p-8 text-center"><p className="text-xl font-semibold">We couldn’t load the catalogue.</p><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Please check your connection and try again.</p><button onClick={() => list.refetch()} className="btn btn-secondary mt-4">Retry</button></div>
        ) : books.length === 0 ? (
          <div className="card p-10 text-center"><p className="mt-2 text-xl font-semibold">No books match these filters</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Try a different mood or loosen a filter.</p></div>
        ) : (
          <>
            <MasonryGrid books={books} />
            {list.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <button onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage} className="btn btn-secondary btn-lg">{list.isFetchingNextPage ? 'Fetching more…' : 'Show more books'}</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export { BookCover }
