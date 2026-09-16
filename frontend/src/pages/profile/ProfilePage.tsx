import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, BadgeCheck, Calendar, Share2, Settings, ExternalLink } from 'lucide-react'
import { Avatar, AvatarStack, Stars, Tabs, toast } from '@/components/ui'
import { BookCard } from '@/components/book/BookCard'
import { BookCover } from '@/components/book/BookCover'
import { StoryCard } from '@/components/story/StoryCard'
import { useBook, useBooksByIds } from '@/hooks/useBooks'
import { useInvalidate, useProfile } from '@/hooks/useCommunity'
import { useAuth } from '@/store/authStore'
import { useLibrary } from '@/store/libraryStore'
import { usePeople } from '@/store/peopleStore'
import { ACHIEVEMENTS } from '@/data/seed'
import { cn, formatNumber, moodMeta, timeAgo } from '@/lib/utils'
import { LINK_FIELDS, linkHref } from '@/pages/SettingsPage'
import { ReportButton } from '@/components/ReportButton'
import { bookPath, useSEO } from '@/lib/seo'
import type { SocialLinks } from '@/types/community'

type Tab = 'overview' | 'shelf' | 'books' | 'reviews' | 'stories' | 'diary' | 'achievements'

function Heatmap({ days }: { days: string[] }) {
  const set = new Set(days)
  const today = new Date()
  const cells = Array.from({ length: 26 * 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (26 * 7 - 1 - i)); return d.toISOString().slice(0, 10) })
  return <div className="grid grid-flow-col grid-rows-7 gap-[3px]">{cells.map((key) => <span key={key} title={key} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: set.has(key) ? 'var(--accent-primary)' : 'var(--bg-secondary)' }} />)}</div>
}

function SmallCover({ id }: { id: number }) { const { data } = useBook(id); return <div className="w-14 overflow-hidden rounded shadow-cover">{data ? <BookCover book={data} rounded="rounded" /> : <div className="skeleton aspect-[2/3]" />}</div> }

function Links({ links }: { links?: SocialLinks }) {
  const entries = LINK_FIELDS.filter((f) => links?.[f.key])
  if (!entries.length) return null
  return <div className="mt-3 flex flex-wrap gap-2">{entries.map(({ key, label, Icon }) => <a key={key} href={linkHref(key, links![key]!)} target="_blank" rel="noreferrer me" className="chip gap-1.5 hover:bg-[var(--bg-tertiary)]"><Icon size={13} />{key === 'website' ? links![key]!.replace(/^https?:\/\//, '').replace(/\/$/, '') : label}<ExternalLink size={10} style={{ color: 'var(--text-muted)' }} /></a>)}</div>
}

export default function ProfilePage() {
  const { username } = useParams()
  const me = useAuth((s) => s.user)
  const name = username ?? me?.username
  const isMe = !!me && name === me.username
  const { data: profile, isLoading, isError } = useProfile(name)
  const following = useLibrary((s) => s.following)
  const toggleFollow = useLibrary((s) => s.toggleFollow)
  const myShelves = useLibrary((s) => s.shelves)
  const myReviews = useLibrary((s) => s.reviews)
  const myDiary = useLibrary((s) => s.diary)
  const myHighlights = useLibrary((s) => s.highlights)
  const streak = useLibrary((s) => s.streak)
  const invalidate = useInvalidate()
  const [tab, setTab] = useState<Tab>('overview')
  const person = usePeople(profile?.mutualFollowerIds ?? [])
  useSEO({ title: profile ? `${profile.displayName} (u/${profile.username})` : 'Profile', description: profile?.headline || profile?.bio || undefined, type: 'profile', path: `/u/${name}`, noindex: isMe })

  const shelfIds = isMe ? myShelves.map((s) => s.bookId) : profile?.shelfBookIds ?? []
  const { data: shelfBooks } = useBooksByIds(shelfIds)
  const reviews = isMe ? myReviews : profile?.reviewsList ?? []
  const reviewBooks = useBooksByIds(reviews.map((r) => r.bookId))

  if (isLoading) return <div className="mx-auto max-w-5xl"><div className="skeleton h-72" /></div>
  if (isError || !profile) return <div className="card mx-auto max-w-md p-10 text-center"><h2 className="text-2xl">This member doesn’t exist</h2><Link to="/discover" className="btn btn-primary mt-4">Back to Discover</Link></div>

  const user = isMe && me ? { ...profile, ...me, followers: profile.followers, following: profile.following } : profile
  const isFollowing = following.includes(user.id)
  const diary = isMe ? myDiary.filter((d) => d.isPublic) : profile.diary
  const highlights = isMe ? myHighlights : profile.highlights
  const streakDays = isMe ? streak.days : profile.readingDays
  const currentStreak = isMe ? streak.current : profile.streak
  const stats = [{ v: profile.booksRead, l: 'Books read' }, { v: profile.reviews, l: 'Reviews' }, { v: profile.published + profile.stories.length, l: 'Published' }, { v: profile.followers, l: 'Followers' }, { v: profile.following, l: 'Following' }]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="card overflow-hidden">
        <div className="h-28 md:h-36" style={{ background: `linear-gradient(90deg, ${user.avatarColor}, ${user.avatarColor}bb)` }} />
        <div className="px-5 pb-5 md:px-8">
          <div className="-mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <span className="rounded-full p-1" style={{ background: 'var(--bg-card)' }}><Avatar user={user} size={96} /></span>
              <div className="pb-1">
                <h1 className="flex items-center gap-1.5 text-2xl md:text-3xl">{user.displayName}{user.isVerified && <BadgeCheck size={20} style={{ color: 'var(--accent-primary)' }} />}</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>u/{user.username}{(profile.published > 0 || profile.stories.length > 0) && <span className="stamp ml-2">Author</span>}</p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              {isMe ? <Link to="/settings" className="btn btn-secondary btn-sm"><Settings size={14} /> Edit profile</Link> : <button onClick={() => { if (toggleFollow(user.id, user.username)) setTimeout(() => invalidate('profile'), 400) }} className={cn('btn btn-sm', isFollowing ? 'btn-secondary' : 'btn-primary')}>{isFollowing ? 'Following' : 'Follow'}</button>}
              <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/u/${user.username}`); toast('Profile link copied') }} className="btn btn-ghost btn-icon h-8 w-8" aria-label="Share"><Share2 size={15} /></button>
              {!isMe && <ReportButton type="user" id={user.id} label="" className="btn btn-ghost btn-icon h-8 w-8" />}
            </div>
          </div>
          {user.headline && <p className="mt-4 text-[15px] font-medium">{user.headline}</p>}
          {user.bio && <p className={cn('max-w-2xl text-sm', user.headline ? 'mt-1' : 'mt-4')} style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {user.location && <span className="flex items-center gap-1"><MapPin size={12} /> {user.location}</span>}
            <span className="flex items-center gap-1"><Calendar size={12} /> Joined {user.joinedYear}</span>
          </div>
          <Links links={user.links} />
          {!isMe && (profile.mutualFollowerIds?.length ?? 0) > 0 && <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><AvatarStack users={profile.mutualFollowerIds!.map(person)} size={20} /> Followed by {profile.mutualFollowerIds!.map((id) => person(id).displayName.split(' ')[0]).join(', ')}</div>}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 sm:grid-cols-5" style={{ borderColor: 'var(--border)' }}>
            {stats.map((s) => <div key={s.l}><p className="text-xl font-bold">{formatNumber(s.v)}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.l}</p></div>)}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'shelf', label: 'Shelf', count: shelfIds.length }, { key: 'books', label: 'Books', count: profile.books.length }, { key: 'reviews', label: 'Reviews', count: reviews.length }, { key: 'stories', label: 'Stories', count: profile.stories.length }, { key: 'diary', label: 'Diary', count: diary.length }, { key: 'achievements', label: 'Achievements' }]} />
        <div className="pt-6">
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-6">
                {profile.books.length > 0 && (
                  <section className="card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base">Published books</h2><button onClick={() => setTab('books')} className="text-xs font-medium underline">All</button></div>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{profile.books.slice(0, 5).map((b) => <Link key={b.id} to={bookPath(b)} className="block"><div className="overflow-hidden rounded shadow-cover"><BookCover book={b} rounded="rounded" /></div><p className="mt-1.5 truncate text-xs font-medium">{b.title}</p></Link>)}</div>
                  </section>
                )}
                <section className="card p-5">
                  <div className="mb-3 flex items-center justify-between"><h2 className="text-base">Reading activity</h2><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Current streak {currentStreak} day{currentStreak === 1 ? '' : 's'}</span></div>
                  <div className="overflow-x-auto"><Heatmap days={streakDays} /></div>
                </section>
                {(shelfBooks?.length ?? 0) > 0 && (
                  <section className="card p-5"><h2 className="mb-4 text-base">On the shelf</h2><div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">{(shelfBooks ?? []).slice(0, 10).map((b) => <Link key={b.id} to={bookPath(b)} className="w-[72px] shrink-0"><SmallCover id={b.id} /><p className="mt-1.5 truncate text-[11px]">{b.title}</p></Link>)}</div></section>
                )}
                {highlights.length > 0 && (
                  <section className="card p-5"><h2 className="mb-3 text-base">Recent highlights</h2><div className="space-y-3">{highlights.slice(0, 3).map((h) => <blockquote key={h.id} className="border-l-2 pl-3 font-title text-[15px] italic" style={{ borderColor: 'var(--accent-secondary)', color: 'var(--text-secondary)' }}>“{h.text}”</blockquote>)}</div></section>
                )}
              </div>
              <aside className="space-y-4">
                <div className="card p-5"><h3 className="text-sm font-semibold">Favourite genres</h3><div className="mt-2 flex flex-wrap gap-1.5">{user.favoriteGenres.length ? user.favoriteGenres.map((g) => <Link key={g} to={`/discover?genre=${g}`} className="chip">{g}</Link>) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not set</span>}</div><h3 className="mt-4 text-sm font-semibold">Reads for</h3><div className="mt-2 flex flex-wrap gap-1.5">{user.favoriteMoods.map((m) => <span key={m} className="chip" style={{ color: moodMeta(m).color }}>{moodMeta(m).label}</span>)}</div></div>
                <div className="card p-5"><h3 className="text-sm font-semibold">{new Date().getFullYear()} goal</h3><p className="mt-1 text-2xl font-bold">{profile.booksRead} <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>of {user.readingGoal}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-secondary)' }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (profile.booksRead / Math.max(1, user.readingGoal)) * 100)}%`, background: 'var(--accent-primary)' }} /></div></div>
              </aside>
            </div>
          )}
          {tab === 'shelf' && ((shelfBooks?.length ?? 0) ? <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">{(shelfBooks ?? []).map((b) => <BookCard key={b.id} book={b} />)}</div> : <Empty text="Nothing on the shelf yet." />)}
          {tab === 'books' && (profile.books.length ? <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">{profile.books.map((b) => <Link key={b.id} to={bookPath(b)} className="block"><div className="cover-3d overflow-hidden rounded-lg shadow-cover"><BookCover book={b} rounded="rounded-lg" /></div><p className="mt-2 truncate text-sm font-medium">{b.title}</p></Link>)}</div> : <Empty text={isMe ? 'You have not published a book yet.' : 'No published books.'} cta={isMe ? <Link to="/publish" className="btn btn-primary btn-sm">Publish a book</Link> : undefined} />)}
          {tab === 'reviews' && (reviews.length ? <div className="grid gap-4 md:grid-cols-2">{reviews.map((r) => { const b = reviewBooks.data?.find((x) => x.id === r.bookId); return <div key={r.id} className="card flex gap-4 p-5">{b && <Link to={bookPath(b)} className="w-14 shrink-0 overflow-hidden rounded shadow-cover"><BookCover book={b} rounded="rounded" /></Link>}<div><Stars value={r.rating} /><h3 className="mt-1 text-[15px] font-semibold">{r.title}</h3><p className="mt-1 line-clamp-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.body}</p><p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.createdAt)}</p></div></div> })}</div> : <Empty text="No reviews yet." />)}
          {tab === 'stories' && (profile.stories.length ? <div className="grid gap-5 md:grid-cols-3">{profile.stories.map((s) => <StoryCard key={s.id} story={s} author={user} />)}</div> : <Empty text="No stories published yet." />)}
          {tab === 'diary' && (diary.length ? <div className="grid gap-4 md:grid-cols-2">{diary.map((e) => <div key={e.id} className="card p-5" style={{ borderLeft: `3px solid ${moodMeta(e.mood).color}` }}><h3 className="text-[15px] font-semibold">{e.title}</h3><p className="mt-1 line-clamp-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{e.body}</p><p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(e.createdAt)}</p></div>)}</div> : <Empty text="Nothing public in the diary." />)}
          {tab === 'achievements' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">{ACHIEVEMENTS.map((a) => { const earned = a.key === 'first_book' ? profile.booksRead >= 1 : a.key === 'bookworm' ? profile.booksRead >= 10 : a.key === 'century' ? profile.booksRead >= 100 : a.key === 'first_review' ? profile.reviews >= 1 : a.key === 'critic' ? profile.reviews >= 50 : a.key === 'streak7' ? currentStreak >= 7 : a.key === 'streak30' ? currentStreak >= 30 : a.key === 'writer' ? profile.stories.length + profile.books.length > 0 : false; return <div key={a.key} className={cn('card flex flex-col items-center p-4 text-center', !earned && 'opacity-50 grayscale')}><span className="flex h-14 w-14 items-center justify-center rounded-full text-2xl" style={{ background: 'var(--bg-secondary)' }}>{a.icon}</span><p className="mt-2 text-sm font-semibold">{a.name}</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.desc}</p></div> })}</div>}
        </div>
      </div>
    </div>
  )
}

function Empty({ text, cta }: { text: string; cta?: React.ReactNode }) {
  return <div className="card px-6 py-12 text-center"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</p>{cta && <div className="mt-3">{cta}</div>}</div>
}
