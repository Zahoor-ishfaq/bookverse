import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, Clock, Download, Heart, Share2, Sparkles, ThumbsUp, Users } from 'lucide-react'
import { BookCover } from '@/components/book/BookCover'
import { BookCarousel, ShelfMenu } from '@/components/book/BookCard'
import { StoryCard } from '@/components/story/StoryCard'
import { AIBadge, Avatar, BrewingLoader, GenreBadge, Modal, MoodBadge, ProgressRing, Stars, Tabs, toast } from '@/components/ui'
import { useBook, useBookList, useBookText, usePrefetchBookText } from '@/hooks/useBooks'
import { useBookHighlights, useBookReviews, useClubs, useDebates, useInvalidate, useStories } from '@/hooks/useCommunity'
import { usePeople } from '@/store/peopleStore'
import { useLibrary } from '@/store/libraryStore'
import { useAuth } from '@/store/authStore'
import { summarize } from '@/services/ai'
import { cn, formatNumber, minutesLabel, timeAgo, timeUntil } from '@/lib/utils'
import { readingMinutes } from '@/lib/parseBook'
import type { Book, Review } from '@/types/book'
import { DebateVoteBar } from '@/components/community/DebateVoteBar'
import { ReportButton } from '@/components/ReportButton'
import { bookJsonLd, bookPath, useSEO } from '@/lib/seo'

type Tab = 'reviews' | 'highlights' | 'clubs' | 'debates' | 'stories' | 'similar'

function RatingBars({ avg }: { avg: number }) {
  // Distribution shaped around the average.
  const dist = [5, 4, 3, 2, 1].map((s) => Math.max(2, Math.round(100 * Math.exp(-Math.pow(s - avg, 2) / 0.9))))
  const total = dist.reduce((a, b) => a + b, 0)
  return (
    <div className="space-y-1.5">
      {dist.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-3 text-right">{5 - i}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-secondary)' }}>
            <motion.div className="h-full rounded-full" style={{ background: 'var(--accent-secondary)' }} initial={{ width: 0 }} animate={{ width: `${(d / total) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
          </div>
          <span className="w-8">{Math.round((d / total) * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

function Sentiment({ s }: { s: Review['sentiment'] }) {
  const map = { positive: ['Positive', 'var(--accent-primary)'], negative: ['Negative', 'var(--accent-tertiary)'], mixed: ['Mixed', 'var(--accent-secondary)'] } as const
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: map[s][1] }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: map[s][1] }} />{map[s][0]}</span>
}

function AISummary({ book }: { book: Book }) {
  const [open, setOpen] = useState(false)
  const text = useBookText(open ? book : undefined)
  const summary = useQuery({ queryKey: ['summary', book.id], queryFn: () => summarize(book, text.data!), enabled: !!text.data, staleTime: Infinity })
  return (
    <div className="card-flat overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--bg-secondary)' }}><Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} /></span><span><span className="block text-base font-semibold">Summary</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>A short overview, generated automatically</span></span></span>
        <span className="flex items-center gap-2"><AIBadge label="Auto-generated" /><ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} /></span>
      </button>
      {open && (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: 'var(--border)' }}>
          {text.isLoading || summary.isLoading ? <BrewingLoader /> : text.isError ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>We couldn’t fetch the text to summarise. Try opening the reader first.</p> : (
            <>
              <div className="space-y-3 font-title text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{summary.data?.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
              <p className="mt-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{summary.data?.source === 'huggingface' ? 'Generated automatically from the text. May contain inaccuracies.' : 'Representative passages selected automatically from the text.'}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function BookDetailPage() {
  const { id } = useParams()
  const bookId = Number(id)
  const nav = useNavigate()
  const { data: book, isLoading, isError } = useBook(bookId)
  const user = useAuth((s) => s.user)
  const progress = useLibrary((s) => s.progress[bookId])
  const addReview = useLibrary((s) => s.addReview)
  const likedReviews = useLibrary((s) => s.likedReviews)
  const toggleLikeReview = useLibrary((s) => s.toggleLikeReview)
  const reviewsQ = useBookReviews(bookId)
  const highlightsQ = useBookHighlights(bookId)
  const clubsQ = useClubs(); const debatesQ = useDebates(); const storiesQ = useStories()
  const invalidate = useInvalidate()
  const reviews = reviewsQ.data?.reviews ?? []
  const highlights = highlightsQ.data ?? []
  const person = usePeople([...reviews.map((r) => r.userId), ...highlights.map((h) => h.userId ?? ''), ...(storiesQ.data ?? []).map((s) => s.authorId)])
  const [tab, setTab] = useState<Tab>('reviews')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [rating, setRating] = useState(4)
  const [rTitle, setRTitle] = useState('')
  const [rBody, setRBody] = useState('')
  const [spoil, setSpoil] = useState(false)

  usePrefetchBookText(book)
  const bookDesc = book?.summaries?.[0]?.replace(/\s*\(This is an automatically generated summary\.\)\s*$/i, '')
  useSEO({
    title: book ? `${book.title} by ${book.authorName}` : 'Book',
    description: book ? (bookDesc ? bookDesc.slice(0, 155) : `Read ${book.title} by ${book.authorName} free online on BookVerse.`) : undefined,
    path: book ? bookPath(book) : undefined,
    image: book?.coverUrl || undefined,
    type: 'book',
    jsonLd: book ? bookJsonLd(book, { url: `${location.origin}${bookPath(book)}`, description: bookDesc }) : undefined,
  })
  const selfPublished = book?.selfPublished
  const similarTopic = selfPublished ? book?.genre : book?.subjects[0]?.split(' -- ')[0]
  const similar = useBookList({ topic: similarTopic, sort: 'popular' }, !!similarTopic)
  const clubs = (clubsQ.data ?? []).filter((c) => c.currentBookId === bookId)
  const debates = (debatesQ.data ?? []).filter((d) => d.bookId === bookId)
  const stories = (storiesQ.data ?? []).filter((s) => s.inspiredByBookId === bookId)
  const myReview = reviews.find((r) => r.userId === user?.id)

  if (isLoading) return <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[280px_1fr]"><div className="skeleton aspect-[2/3]" /><div className="space-y-4"><div className="skeleton h-12 w-3/4" /><div className="skeleton h-5 w-1/3" /><div className="skeleton h-24" /></div></div>
  if (isError || !book) return <div className="card mx-auto max-w-md p-10 text-center"><p className="text-4xl">📕</p><h2 className="mt-3 text-2xl">This book slipped behind the shelf</h2><Link to="/discover" className="btn btn-primary mt-5">Back to Discover</Link></div>

  const displayRating = reviewsQ.data?.average ?? (selfPublished ? 0 : book.rating)
  const ratingCount = (reviewsQ.data?.count ?? 0) + (selfPublished ? 0 : book.ratingCount)
  const words = book.download_count > 0 ? Math.round(60000 + (book.id % 7) * 12000) : 70000
  const mins = readingMinutes(words)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Top */}
      <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-12 lg:grid-cols-[300px_1fr]">
        <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="mx-auto w-[220px] md:w-full">
          <div className="cover-3d shadow-lift rounded-2xl"><BookCover book={book} rounded="rounded-2xl" priority /></div>
          {progress && progress.percentage > 0 && (
            <div className="card mt-5 flex items-center gap-4 p-4">
              <ProgressRing value={progress.percentage} size={56} stroke={5} />
              <div><p className="text-sm font-semibold">You’re {Math.round(progress.percentage)}% through</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chapter {progress.chapter + 1} · {minutesLabel(progress.minutes)} read</p></div>
            </div>
          )}
          <div className="mt-5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {selfPublished ? <span className="stamp">Published on BookVerse</span> : <span className="flex items-center gap-1"><Download size={12} />{formatNumber(book.download_count)} downloads</span>}
            <span className="flex items-center gap-1"><Users size={12} />{formatNumber(book.readers)} reading</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <p className="eyebrow mb-2">{book.genre} · {selfPublished ? `Published ${new Date(selfPublished.publishedAt).getFullYear()}` : book.era === 'unknown' ? 'Classic' : book.era}</p>
          <h1 className="font-title text-3xl font-medium leading-[1.12] md:text-4xl lg:text-5xl">{book.title}</h1>
          {selfPublished?.subtitle && <p className="mt-2 font-title text-lg italic" style={{ color: 'var(--text-secondary)' }}>{selfPublished.subtitle}</p>}
          <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
            by <Link to={selfPublished ? `/u/${person(selfPublished.ownerId).username}` : `/discover?q=${encodeURIComponent(book.authors[0]?.name ?? '')}`} className="font-medium underline underline-offset-4" style={{ color: 'var(--text-primary)' }}>{book.authorName}</Link>
            {book.authors[0]?.birth_year && <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>({book.authors[0].birth_year}–{book.authors[0].death_year ?? ''})</span>}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {book.moods.map((m) => <MoodBadge key={m} mood={m} />)}
            {book.subjects.slice(0, 3).map((s) => <GenreBadge key={s}>{s.split(' -- ')[0]}</GenreBadge>)}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex items-center gap-4">
              <div><p className="text-5xl font-bold leading-none">{displayRating ? displayRating : '—'}</p><Stars value={displayRating} className="mt-1" /><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{ratingCount ? `${formatNumber(ratingCount)} rating${ratingCount === 1 ? '' : 's'}` : 'No ratings yet'}</p></div>
              {displayRating > 0 && <div className="w-40"><RatingBars avg={displayRating} /></div>}
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1.5"><Clock size={14} />~{minutesLabel(mins)}</span>
              <span className="flex items-center gap-1.5"><BookOpen size={14} />{book.languages.join(', ').toUpperCase()}</span>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={() => nav(`/read/${book.id}`)} className="btn btn-primary btn-lg"><BookOpen size={16} />{progress?.percentage ? 'Continue reading' : 'Start reading'}</button>
            <ShelfMenu book={book} />
            <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied') }} className="btn btn-secondary"><Share2 size={15} /> Share</button>
          </div>

          {reviews.length > 0 && (
            <div className="mt-6 flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex">{reviews.slice(0, 4).map((r, i) => <span key={r.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar user={person(r.userId)} size={26} /></span>)}</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>{person(reviews[0].userId).displayName.split(' ')[0]}</strong>{reviews.length > 1 ? ` and ${reviews.length - 1} other${reviews.length > 2 ? 's' : ''}` : ''} reviewed this</span>
            </div>
          )}

          {book.summaries?.[0] && (
            <p className="mt-7 max-w-2xl font-title text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {book.summaries[0].replace(/\s*\(This is an automatically generated summary\.\)\s*$/i, '')}
            </p>
          )}

          <div className="mt-8"><AISummary book={book} /></div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-14">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { key: 'reviews', label: 'Reviews', count: reviews.length }, { key: 'highlights', label: 'Community highlights', count: highlights.length },
          { key: 'clubs', label: 'Book clubs', count: clubs.length }, { key: 'debates', label: 'Debates', count: debates.length },
          { key: 'stories', label: 'Inspired stories', count: stories.length }, { key: 'similar', label: 'Similar books' },
        ]} />

        <div className="pt-8">
          {tab === 'reviews' && (
            <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4">
                {reviewsQ.isLoading && <div className="skeleton h-32" />}
                {!reviewsQ.isLoading && reviews.length === 0 && <div className="card p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No reviews yet. Be the first.</div>}
                {reviews.map((r) => {
                  const u = person(r.userId)
                  return (
                    <article key={r.id} className="card p-5 md:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3"><Avatar user={u} size={40} /><div><p className="text-sm font-semibold">{u.displayName}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.createdAt)}</p></div></div>
                        <div className="text-right"><Stars value={r.rating} /><div className="mt-1"><Sentiment s={r.sentiment} /></div></div>
                      </div>
                      <h3 className="mt-4 font-title text-lg italic">{r.title}</h3>
                      {r.spoilers ? <SpoilerBody body={r.body} /> : <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.body}</p>}
                      <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <button onClick={() => { if (toggleLikeReview(r.id)) setTimeout(() => invalidate('reviews'), 400) }} className={cn('flex items-center gap-1 hover:text-[var(--text-primary)]', likedReviews.includes(r.id) && 'font-semibold')} style={{ color: likedReviews.includes(r.id) ? 'var(--accent-primary)' : undefined }}><ThumbsUp size={13} /> Helpful · {r.likes}</button>
                        {r.userId !== user?.id && <ReportButton type="review" id={r.id} className="ml-auto" />}
                      </div>
                    </article>
                  )
                })}
              </div>
              <aside className="card h-fit p-5">
                <h3 className="text-xl">{myReview ? 'Your review' : 'Your take?'}</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{myReview ? 'You can update it any time.' : 'Half stars allowed. Spoilers get a warning label.'}</p>
                <button onClick={() => { if (!user) return nav(`/login?next=${encodeURIComponent(location.pathname)}`); if (myReview) { setRating(myReview.rating); setRTitle(myReview.title); setRBody(myReview.body); setSpoil(myReview.spoilers) } setReviewOpen(true) }} className="btn btn-primary mt-4 w-full">{myReview ? 'Edit your review' : 'Write a review'}</button>
                {reviewsQ.data?.average ? <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Community average {reviewsQ.data.average} from {reviewsQ.data.count} review{reviewsQ.data.count === 1 ? '' : 's'}.</p> : null}
              </aside>
            </div>
          )}

          {tab === 'highlights' && (
            highlights.length === 0 ? <EmptyBlock icon="🖍️" title="No highlights yet" body="Open the reader, select a line you love, and it will appear here." cta={<button onClick={() => nav(`/read/${book.id}`)} className="btn btn-primary">Open reader</button>} /> :
            <div className="grid gap-5 md:grid-cols-2">
              {highlights.map((h) => (
                <blockquote key={h.id} className="card relative overflow-hidden p-6">
                  <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: { yellow: '#E0B84C', green: '#7F9A7A', blue: '#5D6B7A', pink: '#C77A87' }[h.color] }} />
                  <p className="font-quote text-2xl italic leading-snug">“{h.text}”</p>
                  {h.note && <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{h.note}</p>}
                  <footer className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}><span className="flex items-center gap-2"><Avatar user={person(h.userId)} size={20} /> {person(h.userId).displayName} · Chapter {h.chapter + 1}</span><span className="flex items-center gap-1"><Heart size={12} /> {h.likes ?? 0}</span></footer>
                </blockquote>
              ))}
            </div>
          )}

          {tab === 'clubs' && (clubs.length === 0 ? <EmptyBlock icon="🕯️" title="No club is reading this right now" body="Start one. Two people and a schedule is all it takes." cta={<Link to="/community?tab=clubs" className="btn btn-primary">Browse clubs</Link>} /> :
            <div className="grid gap-5 md:grid-cols-2">{clubs.map((c) => <Link key={c.id} to={`/community/clubs/${c.id}`} className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5"><span className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: c.coverColor }}>{c.coverEmoji}</span><div><p className="font-display text-lg font-semibold">{c.name}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.memberCount} members · {c.frequency}</p></div></Link>)}</div>)}

          {tab === 'debates' && (debates.length === 0 ? <EmptyBlock icon="⚖️" title="No debates yet" body="Every good book deserves an argument." cta={<Link to="/community?tab=debates" className="btn btn-primary">See all debates</Link>} /> :
            <div className="grid gap-5 md:grid-cols-2">{debates.map((d) => <div key={d.id} className="card p-6"><p className="eyebrow mb-2">{timeUntil(d.endsAt)}</p><h3 className="text-xl">{d.question}</h3><div className="mt-4"><DebateVoteBar debate={d} /></div><Link to={`/community/debates/${d.id}`} className="btn btn-secondary btn-sm mt-4">Join the debate</Link></div>)}</div>)}

          {tab === 'stories' && (stories.length === 0 ? <EmptyBlock icon="🪶" title="Nobody has written back to this book yet" body="Retellings, prequels, a minor character’s diary — it all counts." cta={<Link to="/stories/write" className="btn btn-primary">Write a story</Link>} /> :
            <div className="grid gap-5 md:grid-cols-3">{stories.map((s) => <StoryCard key={s.id} story={s} author={person(s.authorId)} />)}</div>)}

          {tab === 'similar' && (
            <div>
              <div className="mb-4 flex items-center gap-2"><h3 className="text-xl">Readers also loved</h3></div>
              {similar.data ? <BookCarousel books={similar.data.books.filter((b) => b.id !== book.id)} /> : <div className="flex gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3] w-[150px]" />)}</div>}
            </div>
          )}
        </div>
      </div>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={`Review “${book.title}”`}>
        <div className="space-y-4">
          <div><p className="eyebrow mb-2">Your rating</p><div className="flex items-center gap-3"><Stars value={rating} size={28} onChange={setRating} /><span className="font-display text-xl font-bold">{rating}</span></div></div>
          <input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Title your review" className="input" />
          <textarea value={rBody} onChange={(e) => setRBody(e.target.value)} rows={5} placeholder="What stayed with you?" className="input resize-none" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={spoil} onChange={(e) => setSpoil(e.target.checked)} className="accent-[var(--accent-primary)]" /> Contains spoilers</label>
          <button disabled={!rTitle || !rBody} onClick={async () => { const ok = await addReview({ bookId: book.id, rating, title: rTitle, body: rBody, spoilers: spoil }); if (ok) { setReviewOpen(false); toast(myReview ? 'Review updated' : 'Review published'); setRTitle(''); setRBody(''); invalidate('reviews', 'feed') } }} className="btn btn-primary w-full disabled:opacity-50">{myReview ? 'Update review' : 'Publish review'}</button>
        </div>
      </Modal>
    </div>
  )
}

function SpoilerBody({ body }: { body: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mt-2">
      <p className={cn('text-sm leading-relaxed transition-all', !show && 'select-none blur-sm')} style={{ color: 'var(--text-secondary)' }}>{body}</p>
      {!show && <button onClick={() => setShow(true)} className="absolute inset-0 m-auto h-fit w-fit rounded-full border px-3 py-1 text-xs font-semibold" style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-tertiary)', color: 'var(--accent-tertiary)' }}>Contains spoilers — reveal</button>}
    </div>
  )
}

function EmptyBlock({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: React.ReactNode }) {
  return <div className="card px-6 py-14 text-center"><p className="text-4xl">{icon}</p><h3 className="mt-3 text-xl">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm" style={{ color: 'var(--text-secondary)' }}>{body}</p>{cta && <div className="mt-5">{cta}</div>}</div>
}
