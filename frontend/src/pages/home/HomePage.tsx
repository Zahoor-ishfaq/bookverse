import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Heart } from 'lucide-react'
import { Avatar, MoodBadge, ProgressRing, Stars } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { BookListItem } from '@/components/book/BookCard'
import { DebateVoteBar } from '@/components/community/DebateVoteBar'
import { useBook, useBooksByIds } from '@/hooks/useBooks'
import { useClubs, useFeed, useRooms, useSuggested, type FeedItem } from '@/hooks/useCommunity'
import { useAuth } from '@/store/authStore'
import { useLibrary } from '@/store/libraryStore'
import { usePeople } from '@/store/peopleStore'
import { TRENDING_IDS } from '@/data/seed'
import { cn, formatNumber, minutesLabel, moodMeta, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'
import type { Book } from '@/types/book'

function Card({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.article initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.35, delay }} className={cn('card p-5 md:p-6', className)}>{children}</motion.article>
}

function CoverLink({ id, className }: { id: number; className?: string }) {
  const { data } = useBook(id)
  return <Link to={data ? bookPath(data) : `/books/${id}`} className={cn('block shrink-0 overflow-hidden rounded-lg shadow-cover', className)}>{data ? <BookCover book={data} rounded="rounded-lg" /> : <div className="skeleton aspect-[2/3]" />}</Link>
}

function BookLine({ id }: { id: number }) {
  const { data } = useBook(id)
  return data ? <Link to={bookPath(data)} className="font-title italic underline underline-offset-2">{data.title}</Link> : <span className="skeleton inline-block h-3 w-24 align-middle" />
}

export default function HomePage() {
  useSEO({ title: 'Home', noindex: true })
  const user = useAuth((s) => s.user)
  const nav = useNavigate()
  const shelves = useLibrary((s) => s.shelves)
  const progress = useLibrary((s) => s.progress)
  const following = useLibrary((s) => s.following)
  const toggleFollow = useLibrary((s) => s.toggleFollow)
  const myClubs = useLibrary((s) => s.clubs)
  const feed = useFeed()
  const rooms = useRooms()
  const clubs = useClubs()
  const suggested = useSuggested()
  const reading = shelves.filter((s) => s.shelf === 'reading')
  const current = useBook(reading[0]?.bookId)
  const trending = useBooksByIds(TRENDING_IDS.slice(0, 5))
  const items = feed.data ?? []
  const person = usePeople([...items.map((i) => i.userId ?? i.entry?.userId ?? i.story?.authorId), ...(suggested.data ?? []).map((u) => u.id)])
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const Who = ({ userId, action, at }: { userId: string; action: React.ReactNode; at: string }) => {
    const u = person(userId)
    return (
      <div className="flex items-center gap-3">
        <Link to={`/u/${u.username}`}><Avatar user={u} size={40} /></Link>
        <div className="min-w-0 text-sm"><p className="truncate"><Link to={`/u/${u.username}`} className="font-semibold">{u.displayName}</Link> <span style={{ color: 'var(--text-secondary)' }}>{action}</span></p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(at)}</p></div>
      </div>
    )
  }

  const renderItem = (item: FeedItem, i: number) => {
    const delay = (i % 3) * 0.04
    if (item.kind === 'activity' && item.userId) {
      const verb = ({ started: 'started reading', finished: 'finished', reviewed: 'reviewed', highlighted: 'highlighted a passage in', published: 'published a book', club_created: 'started a club' } as Record<string, string>)[item.verb ?? ''] ?? item.verb
      return (
        <Card key={item.id} delay={delay}>
          <Who userId={item.userId} action={<>{verb}{item.bookId ? <> <BookLine id={item.bookId} /></> : null}</>} at={item.createdAt} />
          <div className="mt-4 flex gap-4">
            {item.bookId && <CoverLink id={item.bookId} className="w-20" />}
            <div className="min-w-0 flex-1">
              {item.rating ? <Stars value={item.rating} /> : null}
              {item.verb === 'highlighted' ? <p className="font-quote text-xl italic leading-snug">“{item.text}”</p> : item.text ? <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.text}</p> : null}
            </div>
          </div>
        </Card>
      )
    }
    if (item.kind === 'diary' && item.entry) {
      const e = item.entry; const m = moodMeta(e.mood)
      return (
        <Card key={item.id} delay={delay} className="relative overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-1" style={{ background: m.color }} />
          <Who userId={e.userId} action={<>wrote in their diary{e.location ? ` from ${e.location}` : ''}</>} at={e.createdAt} />
          <div className="mt-4 flex items-start gap-4">
            {e.bookId && <CoverLink id={e.bookId} className="hidden w-14 sm:block" />}
            <div><MoodBadge mood={e.mood} small /><h3 className="mt-2 text-lg font-semibold">{e.title}</h3><p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{e.body}</p></div>
          </div>
          <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}><span className="flex items-center gap-1"><Heart size={13} /> {e.likes}</span><Link to="/diary" className="ml-auto flex items-center gap-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Community diary <ArrowRight size={12} /></Link></div>
        </Card>
      )
    }
    if (item.kind === 'debate' && item.debate) {
      const d = item.debate
      return (
        <Card key={item.id} delay={delay}>
          <div className="flex items-center justify-between"><p className="eyebrow">Live debate</p><Link to={`/community/debates/${d.id}`} className="text-xs font-medium underline" style={{ color: 'var(--text-secondary)' }}>Arguments</Link></div>
          <div className="mt-2 flex items-start gap-4"><CoverLink id={d.bookId} className="w-12" /><h3 className="text-xl">{d.question}</h3></div>
          <div className="mt-4"><DebateVoteBar debate={d} /></div>
        </Card>
      )
    }
    if (item.kind === 'club' && item.club) {
      const c = item.club
      return (
        <Card key={item.id} delay={delay}>
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: c.coverColor }}>{c.coverEmoji}</span><div className="text-sm"><p><Link to={`/community/clubs/${c.id}`} className="font-semibold">{c.name}</Link></p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(item.createdAt)} · {c.memberCount} members</p></div></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.text || c.description}</p>
          <Link to={`/community/clubs/${c.id}`} className="btn btn-secondary btn-sm mt-3">Open club</Link>
        </Card>
      )
    }
    if (item.kind === 'story' && item.story) {
      const s = item.story; const chNum = Number(item.text) || s.chapters.length; const ch = s.chapters.find((c) => c.number === chNum) ?? s.chapters[s.chapters.length - 1]
      return (
        <Card key={item.id} delay={delay}>
          <Who userId={s.authorId} action={<>{item.verb === 'chapter' ? 'published a new chapter of' : 'published'} <Link to={`/stories/${s.id}`} className="font-title italic">{s.title}</Link></>} at={item.createdAt} />
          {ch && (
            <div className="mt-4 rounded-xl p-5" style={{ background: s.coverColor, color: '#fff' }}>
              <p className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Chapter {ch.number}</p><p className="text-xl font-bold">{ch.title}</p>
              <p className="mt-2 font-title text-sm italic opacity-90" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ch.content[0]}</p>
              <Link to={`/stories/${s.id}?ch=${ch.number}`} className="btn btn-sm mt-4" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>Read chapter <ArrowRight size={13} /></Link>
            </div>
          )}
        </Card>
      )
    }
    return null
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <header className="mb-6">
          <p className="eyebrow mb-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-3xl">{greet}{user ? `, ${user.displayName.split(' ')[0]}` : ''}.</h1>
        </header>
        {current.data && (
          <div className="panel mb-6 flex items-center gap-5 p-5 lg:hidden">
            <div className="w-16 shrink-0 overflow-hidden rounded-md shadow-cover"><BookCover book={current.data} rounded="rounded-md" /></div>
            <div className="min-w-0 flex-1"><p className="eyebrow">Continue reading</p><p className="truncate font-title italic">{current.data.title}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(progress[current.data.id]?.percentage ?? 0)}% · {minutesLabel(progress[current.data.id]?.minutes ?? 0)}</p></div>
            <button onClick={() => nav(`/read/${current.data!.id}`)} className="btn btn-primary btn-sm"><BookOpen size={14} /> Read</button>
          </div>
        )}
        <div className="space-y-5">
          {feed.isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-40" />)}
          {items.map(renderItem)}
          {!feed.isLoading && items.length === 0 && <div className="card p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Nothing here yet. Follow a few readers or join a club and their activity will show up.</div>}
          {items.length > 0 && <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>You're all caught up.</p>}
        </div>
      </div>

      <aside className="hidden space-y-5 lg:block">
        {current.data ? (
          <div className="card p-5">
            <p className="eyebrow mb-3">Currently reading</p>
            <div className="flex gap-4">
              <div className="w-20 shrink-0 overflow-hidden rounded-md shadow-cover"><BookCover book={current.data} rounded="rounded-md" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-snug">{current.data.title}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{current.data.authorName}</p><div className="mt-3 flex items-center gap-3"><ProgressRing value={progress[current.data.id]?.percentage ?? 0} size={48} stroke={5} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{minutesLabel(progress[current.data.id]?.minutes ?? 0)} read</span></div></div>
            </div>
            <button onClick={() => nav(`/read/${current.data!.id}`)} className="btn btn-primary mt-4 w-full"><BookOpen size={15} /> Continue</button>
          </div>
        ) : (
          <div className="card p-5 text-center"><p className="text-sm font-semibold">Nothing on the nightstand</p><Link to="/discover" className="btn btn-primary btn-sm mt-3">Pick a book</Link></div>
        )}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><p className="eyebrow">Trending this week</p><Link to="/discover" className="text-xs font-medium underline" style={{ color: 'var(--text-secondary)' }}>All</Link></div>
          <div className="-mx-3">{(trending.data ?? []).map((b: Book, i) => <BookListItem key={b.id} book={b} right={<span className="text-2xl font-bold" style={{ color: 'var(--border-strong)' }}>{i + 1}</span>} />)}</div>
        </div>
        <div className="card p-5">
          <p className="eyebrow mb-3">Reading rooms</p>
          <ul className="space-y-3">{(rooms.data ?? []).filter((r) => r.isLive).slice(0, 4).map((r) => <li key={r.id}><Link to={`/community/rooms/${r.id}`} className="flex items-center gap-3 text-sm"><span className="live-dot shrink-0" /><span className="min-w-0"><span className="block truncate font-medium">{r.title}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.participants} inside</span></span></Link></li>)}</ul>
        </div>
        {(suggested.data ?? []).filter((u) => !following.includes(u.id)).length > 0 && (
          <div className="card p-5">
            <p className="eyebrow mb-3">People to follow</p>
            <ul className="space-y-3">{(suggested.data ?? []).filter((u) => !following.includes(u.id)).slice(0, 3).map((u) => <li key={u.id} className="flex items-center gap-3"><Avatar user={u} size={36} /><div className="min-w-0 flex-1 text-sm"><Link to={`/u/${u.username}`} className="block truncate font-medium">{u.displayName}</Link><p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{formatNumber(u.followers)} followers</p></div><button onClick={() => toggleFollow(u.id, u.username)} className="btn btn-secondary btn-sm">Follow</button></li>)}</ul>
          </div>
        )}
        <div className="card p-5">
          <p className="eyebrow mb-3">Your clubs</p>
          <ul className="space-y-2">{(clubs.data ?? []).filter((c) => myClubs.includes(c.id)).map((c) => <li key={c.id}><Link to={`/community/clubs/${c.id}`} className="flex items-center gap-3 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: c.coverColor }}>{c.coverEmoji}</span><span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.memberCount} members</span></span></Link></li>)}</ul>
          <Link to="/community" className="btn btn-ghost btn-sm mt-3 w-full">Find more clubs</Link>
        </div>
      </aside>
    </div>
  )
}
