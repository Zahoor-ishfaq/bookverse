import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, Lock, MapPin, PenLine, Trash2 } from 'lucide-react'
import { Avatar, EmptyState, Modal, MoodBadge, Tabs, toast } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { useBook, useBooksByIds } from '@/hooks/useBooks'
import { useInvalidate, usePublicDiary } from '@/hooks/useCommunity'
import { useAuth } from '@/store/authStore'
import { useLibrary } from '@/store/libraryStore'
import { usePeople } from '@/store/peopleStore'
import { MOODS } from '@/data/seed'
import { cn, moodMeta, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'
import type { Mood } from '@/types/book'
import type { DiaryEntry, User } from '@/types/community'

function Cover({ id }: { id: number }) { const { data } = useBook(id); return <Link to={data ? bookPath(data) : `/books/${id}`} className="block w-14 shrink-0 overflow-hidden rounded-md shadow-cover">{data ? <BookCover book={data} rounded="rounded-md" /> : <div className="skeleton aspect-[2/3]" />}</Link> }

function Entry({ e, author, mine, onDelete }: { e: DiaryEntry; author: User; mine?: boolean; onDelete?: () => void }) {
  const liked = useLibrary((s) => s.likedDiary.includes(e.id))
  const toggleLike = useLibrary((s) => s.toggleLikeDiary)
  const m = moodMeta(e.mood)
  return (
    <article className="card relative overflow-hidden p-5 md:p-6" style={{ borderLeft: `4px solid ${m.color}` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Link to={`/u/${author.username}`}><Avatar user={author} size={36} /></Link><div className="text-sm"><p className="font-semibold">{author.displayName}</p><p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(e.createdAt)}{e.location && <><span>·</span><MapPin size={10} />{e.location}</>}{!e.isPublic && <><span>·</span><Lock size={10} /> private</>}</p></div></div>
        <MoodBadge mood={e.mood} small />
      </div>
      <div className="mt-4 flex gap-4">
        {e.bookId && <Cover id={e.bookId} />}
        <div className="min-w-0"><h3 className="text-lg font-semibold leading-snug">{e.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{e.body}</p></div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <button onClick={() => toggleLike(e.id)} className={cn('flex items-center gap-1', liked && 'font-semibold')} style={{ color: liked ? 'var(--accent-tertiary)' : undefined }}><Heart size={13} fill={liked ? 'currentColor' : 'none'} /> {e.likes + (liked ? 1 : 0)}</button>
        {mine && <button onClick={onDelete} className="ml-auto flex items-center gap-1 hover:text-[var(--accent-tertiary)]"><Trash2 size={13} /> Delete</button>}
      </div>
    </article>
  )
}

export default function DiaryPage() {
  useSEO({ title: 'Reading diary', description: 'A journal of your reading life, and the community diary of readers around the world.' })
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as 'public' | 'mine') ?? 'public'
  const user = useAuth((s) => s.user)
  const myEntries = useLibrary((s) => s.diary)
  const addDiary = useLibrary((s) => s.addDiary)
  const deleteDiary = useLibrary((s) => s.deleteDiary)
  const shelves = useLibrary((s) => s.shelves)
  const invalidate = useInvalidate()
  const [moodFilter, setMoodFilter] = useState<Mood | null>(null)
  const publicDiary = usePublicDiary(moodFilter)
  const person = usePeople((publicDiary.data ?? []).map((d) => d.userId))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ title: string; body: string; mood: Mood; bookId?: number; location: string; isPublic: boolean }>({ title: '', body: '', mood: 'calm', location: '', isPublic: true })
  const shelfBooks = useBooksByIds(shelves.slice(0, 12).map((s) => s.bookId))
  const mine = myEntries.filter((e) => !moodFilter || e.mood === moodFilter)

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-1">Reading life</p><h1 className="text-3xl md:text-4xl">Diary</h1></div>
        <button onClick={() => (user ? setOpen(true) : toast('Log in to write', 'info'))} className="btn btn-primary"><PenLine size={15} /> New entry</button>
      </div>
      <Tabs value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ key: 'public', label: 'Community diary' }, { key: 'mine', label: 'My diary', count: myEntries.length }]} />
      <div className="no-scrollbar my-5 flex gap-2 overflow-x-auto">
        <button onClick={() => setMoodFilter(null)} className={cn('chip shrink-0', !moodFilter && 'chip-active')}>All moods</button>
        {MOODS.map((m) => <MoodBadge key={m.key} mood={m.key} active={moodFilter === m.key} onClick={() => setMoodFilter(moodFilter === m.key ? null : m.key)} />)}
      </div>
      <div className="space-y-5">
        {tab === 'public' ? (publicDiary.isLoading ? <div className="skeleton h-40" /> : (publicDiary.data ?? []).map((e) => <Entry key={e.id} e={e} author={person(e.userId)} />))
          : mine.length ? mine.map((e) => <Entry key={e.id} e={e} author={user!} mine onDelete={() => { deleteDiary(e.id); invalidate('diary'); toast('Entry deleted', 'info') }} />)
          : <EmptyState icon="📓" title="Your diary is blank" body="Write about what you read today, or what you didn't." action={<button onClick={() => (user ? setOpen(true) : toast('Log in to write', 'info'))} className="btn btn-primary">Write the first entry</button>} />}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New diary entry" wide>
        <div className="space-y-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input text-lg" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} placeholder="What happened between you and the book today?" className="input resize-none" />
          <div><p className="label">Mood</p><div className="flex flex-wrap gap-1.5">{MOODS.map((m) => <MoodBadge key={m.key} mood={m.key} active={form.mood === m.key} onClick={() => setForm({ ...form, mood: m.key })} />)}</div></div>
          {(shelfBooks.data?.length ?? 0) > 0 && <div><p className="label">Link a book (optional)</p><div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{(shelfBooks.data ?? []).map((b) => <button key={b.id} onClick={() => setForm({ ...form, bookId: form.bookId === b.id ? undefined : b.id })} className={cn('w-12 shrink-0 overflow-hidden rounded-md border-2', form.bookId === b.id ? '' : 'opacity-70 hover:opacity-100')} style={{ borderColor: form.bookId === b.id ? 'var(--accent-primary)' : 'transparent' }}><BookCover book={b} rounded="rounded" /></button>)}</div></div>}
          <div className="grid gap-3 sm:grid-cols-2"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location (optional)" className="input" /><label className="flex items-center justify-between rounded-lg border px-4 text-sm" style={{ borderColor: 'var(--border)' }}>{form.isPublic ? 'Public — in the community diary' : 'Private — only you'}<input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="h-4 w-4 accent-[var(--accent-primary)]" /></label></div>
          <button disabled={!form.title.trim() || !form.body.trim()} onClick={async () => { const ok = await addDiary({ ...form, location: form.location || undefined }); if (ok) { setOpen(false); setForm({ title: '', body: '', mood: 'calm', location: '', isPublic: true }); setParams({ tab: 'mine' }); invalidate('diary', 'feed'); toast('Entry saved') } }} className="btn btn-primary w-full">Save entry</button>
        </div>
      </Modal>
    </div>
  )
}
