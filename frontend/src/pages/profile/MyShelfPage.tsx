import { useMemo, useState } from 'react'
import { useSEO } from '@/lib/seo'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Grid3X3, LayoutList, Library as LibIcon, BookOpen } from 'lucide-react'
import { BookCard, BookListItem, SHELF_LABELS, ShelfRow } from '@/components/book/BookCard'
import { EmptyState, ProgressRing, SectionHead, Stars } from '@/components/ui'
import { useBooksByIds } from '@/hooks/useBooks'
import { useAuth } from '@/store/authStore'
import { useLibrary } from '@/store/libraryStore'
import { cn, minutesLabel } from '@/lib/utils'
import type { Book, ShelfType } from '@/types/book'

const ORDER: ShelfType[] = ['reading', 'want_to_read', 'finished', 'did_not_finish', 'favorites']

export default function MyShelfPage() {
  useSEO({ title: 'My shelf', noindex: true })
  const user = useAuth((s) => s.user)
  const shelves = useLibrary((s) => s.shelves)
  const progress = useLibrary((s) => s.progress)
  const streak = useLibrary((s) => s.streak)
  const reviews = useLibrary((s) => s.reviews)
  const [view, setView] = useState<'shelf' | 'grid' | 'list'>('shelf')
  const ids = useMemo(() => Array.from(new Set(shelves.map((s) => s.bookId))), [shelves])
  const { data: books } = useBooksByIds(ids)
  const byId = useMemo(() => new Map((books ?? []).map((b) => [b.id, b])), [books])
  const goal = user?.readingGoal ?? 24
  const year = new Date().getFullYear()
  const finishedThisYear = shelves.filter((s) => s.shelf === 'finished' && s.finishedAt?.startsWith(String(year)))
  const totalMinutes = Object.values(progress).reduce((n, p) => n + p.minutes, 0)
  const avgRating = reviews.length ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1) : '—'
  const topGenre = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of books ?? []) counts[b.genre] = (counts[b.genre] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [books])

  const grouped = ORDER.map((type) => ({ type, entries: shelves.filter((s) => s.shelf === type), books: shelves.filter((s) => s.shelf === type).map((s) => byId.get(s.bookId)).filter(Boolean) as Book[] }))

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-1">Your library</p><h1 className="text-4xl md:text-5xl">My Shelf</h1></div>
        <div className="flex rounded-full border p-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {([['shelf', LibIcon, 'Shelf'], ['grid', Grid3X3, 'Grid'], ['list', LayoutList, 'List']] as const).map(([k, Icon, l]) => <button key={k} onClick={() => setView(k)} className={cn('btn btn-sm gap-1.5', view === k ? 'chip-active' : 'btn-ghost')}><Icon size={13} />{l}</button>)}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card col-span-2 flex items-center gap-5 p-5 md:col-span-1 md:flex-col md:items-start">
          <ProgressRing value={(finishedThisYear.length / goal) * 100} size={72} stroke={7}><span className="text-center font-display text-sm font-bold leading-none">{finishedThisYear.length}<span className="block text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>of {goal}</span></span></ProgressRing>
          <div><p className="eyebrow">{year} goal</p><p className="text-sm font-medium">{goal - finishedThisYear.length > 0 ? `${goal - finishedThisYear.length} to go` : 'Goal reached!'}</p></div>
        </motion.div>
        {[
          { l: 'All time', v: shelves.filter((s) => s.shelf === 'finished').length, s: 'books finished' },
          { l: 'Streak', v: `${streak.current}🔥`, s: `longest ${streak.longest}` },
          { l: 'Avg rating', v: avgRating, s: `${reviews.length} reviews` },
          { l: 'Top genre', v: topGenre, s: minutesLabel(totalMinutes) + ' read' },
        ].map((x, i) => (
          <motion.div key={x.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * (i + 1) }} className="card p-5"><p className="eyebrow">{x.l}</p><p className="mt-2 truncate font-display text-3xl font-bold">{x.v}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{x.s}</p></motion.div>
        ))}
      </div>

      {shelves.length === 0 ? (
        <EmptyState icon="🪵" title="An empty shelf is a promise" body="Add a book from Discover and it will stand right here." action={<Link to="/discover" className="btn btn-primary">Browse books</Link>} />
      ) : (
        <div className="space-y-12">
          {grouped.filter((g) => g.entries.length).map((g) => (
            <section key={g.type}>
              <SectionHead title={SHELF_LABELS[g.type]} eyebrow={`${g.entries.length} book${g.entries.length > 1 ? 's' : ''}`} />
              {!books ? <div className="flex gap-3">{g.entries.map((e) => <div key={e.bookId} className="skeleton h-40 w-[100px]" />)}</div>
              : view === 'shelf' ? (
                <div className="panel px-2 pb-6 pt-2">
                  <ShelfRow books={g.books} height={g.type === 'reading' ? 190 : 150}>
                    {g.type === 'reading' && <Link to="/discover" className="ml-2 flex h-[150px] w-[90px] shrink-0 items-center justify-center rounded-md border-2 border-dashed text-xs" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>+ add</Link>}
                  </ShelfRow>
                  {g.type === 'reading' && (
                    <div className="mt-5 flex flex-wrap gap-3 px-4">
                      {g.books.map((b) => <Link key={b.id} to={`/read/${b.id}`} className="card flex items-center gap-3 px-4 py-2.5 transition-transform hover:-translate-y-0.5"><ProgressRing value={progress[b.id]?.percentage ?? 0} size={36} stroke={4} /><span className="text-sm"><span className="block max-w-[180px] truncate font-title italic">{b.title}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Continue <BookOpen size={11} className="inline" /></span></span></Link>)}
                    </div>
                  )}
                </div>
              ) : view === 'grid' ? (
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">{g.books.map((b) => <BookCard key={b.id} book={b} />)}</div>
              ) : (
                <div className="card-flat divide-y p-2" style={{ borderColor: 'var(--border)' }}>
                  {g.books.map((b) => { const e = g.entries.find((x) => x.bookId === b.id)!; return <BookListItem key={b.id} book={b} right={<div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>{e.finishedAt ? <>Finished {new Date(e.finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</> : e.startedAt ? <>Started {new Date(e.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<br />{Math.round(progress[b.id]?.percentage ?? 0)}%</> : e.dnfReason ? <span className="italic">“{e.dnfReason}”</span> : <>Added {new Date(e.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>}</div>} /> })}
                </div>
              )}
              {g.type === 'did_not_finish' && view !== 'list' && <p className="mt-3 text-xs italic" style={{ color: 'var(--text-muted)' }}>{g.entries.map((e) => e.dnfReason).filter(Boolean).join(' · ')}</p>}
            </section>
          ))}

          {/* Annual challenge */}
          <section className="panel grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8">
            <ProgressRing value={(finishedThisYear.length / goal) * 100} size={140} stroke={12} color="var(--accent-secondary)"><span className="text-center"><span className="block font-display text-4xl font-bold">{finishedThisYear.length}</span><span className="eyebrow">of {goal}</span></span></ProgressRing>
            <div>
              <p className="eyebrow mb-1">{year} reading challenge</p>
              <h2 className="text-3xl">{finishedThisYear.length >= goal ? 'You did it. Set a bigger one?' : `${goal - finishedThisYear.length} more books by December.`}</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>That’s roughly one every {Math.max(1, Math.round((365 - (Date.now() - new Date(year, 0, 1).getTime()) / 864e5) / Math.max(1, goal - finishedThisYear.length)))} days. Very doable.</p>
              <div className="mt-4 flex flex-wrap gap-2">{finishedThisYear.map((e) => { const b = byId.get(e.bookId); return b ? <Link key={e.bookId} to={`/books/${b.id}`} className="chip">{b.title} <Stars value={5} size={9} /></Link> : null })}</div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
