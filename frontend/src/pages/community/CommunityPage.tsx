import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Lock, Plus, Search, Users } from 'lucide-react'
import { Avatar, AvatarStack, Modal, Tabs, toast } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { DebateVoteBar } from '@/components/community/DebateVoteBar'
import { useBook, useBookList, useBooksByIds } from '@/hooks/useBooks'
import { useClubs, useDebates, useInvalidate, useRooms } from '@/hooks/useCommunity'
import { useLibrary } from '@/store/libraryStore'
import { useAuth } from '@/store/authStore'
import { usePeople } from '@/store/peopleStore'
import { api } from '@/services/api'
import { cn, timeUntil } from '@/lib/utils'
import { useSEO } from '@/lib/seo'
import type { Book } from '@/types/book'
import type { BookClub } from '@/types/community'

type Tab = 'clubs' | 'rooms' | 'debates'

function Cover({ id, className }: { id: number; className?: string }) {
  const { data } = useBook(id)
  return <div className={cn('overflow-hidden rounded-md shadow-cover', className)}>{data ? <BookCover book={data} rounded="rounded-md" /> : <div className="skeleton aspect-[2/3]" />}</div>
}
function Title({ id }: { id: number }) { const { data } = useBook(id); return <>{data?.title ?? '…'}</> }

export default function CommunityPage() {
  useSEO({ title: 'Community', description: 'Join book clubs that read one chapter at a time, live reading rooms, and debates about the books everyone argues about.' })
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'clubs'
  const myClubs = useLibrary((s) => s.clubs)
  const toggleClub = useLibrary((s) => s.toggleClub)
  const user = useAuth((s) => s.user)
  const nav = useNavigate()
  const clubs = useClubs()
  const rooms = useRooms()
  const debates = useDebates()
  const invalidate = useInvalidate()
  const person = usePeople([...(clubs.data ?? []).flatMap((c) => c.memberIds), ...(rooms.data ?? []).map((r) => r.hostId)])
  const [createOpen, setCreateOpen] = useState(params.get('new') === '1')
  const [roomOpen, setRoomOpen] = useState(false)
  const [debateOpen, setDebateOpen] = useState(false)
  useEffect(() => { if (params.get('new') === '1') setCreateOpen(true) }, [params])
  const requireUser = (fn: () => void) => (user ? fn() : nav('/login?next=' + encodeURIComponent('/community?tab=' + tab + '&new=1')))

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-1">Together</p><h1 className="text-3xl md:text-4xl">Community</h1><p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--text-secondary)' }}>Clubs that read one chapter at a time, rooms that read out loud, and debates that never quite end.</p></div>
        {tab === 'clubs' && <button onClick={() => requireUser(() => setCreateOpen(true))} className="btn btn-primary"><Plus size={16} /> Start a book club</button>}
        {tab === 'rooms' && <button onClick={() => requireUser(() => setRoomOpen(true))} className="btn btn-primary"><Plus size={16} /> Open a reading room</button>}
        {tab === 'debates' && <button onClick={() => requireUser(() => setDebateOpen(true))} className="btn btn-primary"><Plus size={16} /> Start a debate</button>}
      </div>
      <Tabs<Tab> value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ key: 'clubs', label: 'Book clubs', count: clubs.data?.length }, { key: 'rooms', label: 'Reading rooms', count: rooms.data?.filter((r) => r.isLive).length }, { key: 'debates', label: 'Debates', count: debates.data?.length }]} />

      <div className="pt-8">
        {tab === 'clubs' && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <button onClick={() => requireUser(() => setCreateOpen(true))} className="group flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary-soft)]" style={{ borderColor: 'var(--border-strong)' }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105" style={{ background: 'var(--accent-primary)', color: '#fff' }}><Plus size={26} /></span>
              <p className="mt-4 text-lg font-bold">Start a book club</p>
              <p className="mt-1 max-w-[220px] text-sm" style={{ color: 'var(--text-secondary)' }}>Pick a book, set a schedule and invite readers. Takes about a minute.</p>
              <span className="btn btn-secondary btn-sm mt-5">Create club</span>
            </button>
            {clubs.isLoading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton min-h-[280px]" />)}
            {(clubs.data ?? []).map((c, i) => {
              const joined = myClubs.includes(c.id)
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="card group flex flex-col overflow-hidden">
                  <div className="relative flex h-28 items-end p-5" style={{ background: c.coverColor }}>
                    <span className="absolute right-4 top-4 text-4xl opacity-90">{c.coverEmoji}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: 'rgba(0,0,0,.25)' }}>{c.activity === 'buzzing' ? '● buzzing' : c.activity}</span>
                    {c.isPrivate && <span className="ml-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: 'rgba(0,0,0,.25)' }}><Lock size={10} /> private</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <Link to={`/community/clubs/${c.id}`}><h3 className="text-xl">{c.name}</h3></Link>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.description}</p>
                    <div className="mt-4 flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                      <Cover id={c.currentBookId} className="w-9" />
                      <div className="min-w-0 text-xs"><p className="eyebrow">Now reading</p><p className="truncate font-title italic"><Title id={c.currentBookId} /></p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}><AvatarStack users={c.memberIds.slice(0, 3).map(person)} size={22} max={3} /><Users size={12} /> {c.memberCount}/{c.maxMembers}</span>
                      <button onClick={async () => { const ok = await toggleClub(c.id); if (ok) { invalidate('clubs'); toast(joined ? 'Left the club' : 'Welcome to the club') } }} className={cn('btn btn-sm', joined ? 'btn-secondary' : 'btn-primary')}>{joined ? 'Joined' : c.isPrivate ? 'Request' : 'Join club'}</button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {tab === 'rooms' && (
          <div className="space-y-8">
            {rooms.isLoading && <div className="skeleton h-40" />}
            {[{ label: 'Live now', items: (rooms.data ?? []).filter((r) => r.isLive) }, { label: 'Scheduled', items: (rooms.data ?? []).filter((r) => !r.isLive && r.scheduledAt && !r.endedAt) }, { label: 'Recent', items: (rooms.data ?? []).filter((r) => !r.isLive && (r.endedAt || !r.scheduledAt)) }].map((grp) => grp.items.length > 0 && (
              <section key={grp.label}>
                <p className="eyebrow mb-3">{grp.label}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {grp.items.map((r) => (
                    <Link key={r.id} to={`/community/rooms/${r.id}`} className="card flex gap-4 p-4 transition-transform hover:-translate-y-0.5">
                      <Cover id={r.bookId} className="w-16 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.isLive ? <><span className="live-dot" /> <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>LIVE</span> · {r.participants} inside</> : r.scheduledAt && !r.endedAt ? <><Calendar size={11} /> {new Date(r.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</> : 'Ended · transcript available'}</div>
                        <h3 className="mt-1 text-lg leading-snug">{r.title}</h3>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs"><Avatar user={person(r.hostId)} size={18} /> hosted by {person(r.hostId).displayName}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'debates' && (
          <div className="grid gap-5 md:grid-cols-2">
            {debates.isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-56" />)}
            {(debates.data ?? []).map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-6">
                <div className="flex items-start gap-4">
                  <Cover id={d.bookId} className="w-14 shrink-0" />
                  <div className="min-w-0 flex-1"><p className="eyebrow" style={{ color: 'var(--accent-tertiary)' }}>{timeUntil(d.endsAt)}</p><h3 className="mt-1 text-xl leading-snug">{d.question}</h3></div>
                </div>
                <div className="mt-5"><DebateVoteBar debate={d} /></div>
                <div className="mt-4 flex items-center justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.arguments.length} top arguments</span><Link to={`/community/debates/${d.id}`} className="btn btn-secondary btn-sm">Read arguments</Link></div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <CreateClubModal open={createOpen} onClose={() => { setCreateOpen(false); if (params.get('new')) setParams({ tab: 'clubs' }) }} />
      <CreateRoomModal open={roomOpen} onClose={() => setRoomOpen(false)} />
      <CreateDebateModal open={debateOpen} onClose={() => setDebateOpen(false)} />
    </div>
  )
}

const COLORS = ['#1B6B4A', '#2F5D8A', '#7A4B8A', '#8A5A2F', '#3D6B6B', '#A64D62', '#3F4F5C']
const ICONS = ['📚', '🕯️', '☕', '🔍', '🌊', '🏛️', '🌙', '🌿']
const FREQ = ['Weekly', 'Fortnightly', 'Monthly']

export function BookPicker({ value, onChange }: { value: Book | null; onChange: (b: Book | null) => void }) {
  const shelves = useLibrary((s) => s.shelves)
  const [q, setQ] = useState('')
  const shelfBooks = useBooksByIds(shelves.slice(0, 8).map((s) => s.bookId))
  const results = useBookList({ search: q }, q.trim().length > 1)
  const candidates = q.trim().length > 1 ? results.data?.books.slice(0, 6) ?? [] : shelfBooks.data ?? []
  if (value) return <div className="flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: 'var(--accent-primary)' }}><div className="w-9 overflow-hidden rounded"><BookCover book={value} rounded="rounded" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{value.title}</p><p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{value.authorName}</p></div><button onClick={() => onChange(null)} className="btn btn-ghost btn-sm">Change</button></div>
  return (
    <>
      <div className="input flex items-center gap-2 py-0"><Search size={14} style={{ color: 'var(--text-muted)' }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalogue" className="h-10 w-full bg-transparent text-sm outline-none" /></div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{q.trim().length > 1 ? (results.isFetching ? 'Searching…' : `${candidates.length} results`) : shelfBooks.data?.length ? 'From your shelf' : 'Search for a title or author'}</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {candidates.map((b) => <button key={b.id} onClick={() => onChange(b)} className="flex items-center gap-2 rounded-lg border p-1.5 text-left hover:bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border)' }}><div className="w-7 shrink-0 overflow-hidden rounded"><BookCover book={b} rounded="rounded" /></div><span className="min-w-0"><span className="block truncate text-xs font-semibold">{b.title}</span><span className="block truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{b.authorName}</span></span></button>)}
      </div>
    </>
  )
}

function CreateClubModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const invalidate = useInvalidate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [book, setBook] = useState<Book | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [maxMembers, setMaxMembers] = useState(50)
  const [frequency, setFrequency] = useState('Weekly')
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState(ICONS[0])
  const [busy, setBusy] = useState(false)
  const canCreate = name.trim().length >= 3 && !!book && !busy

  const submit = async () => {
    if (!canCreate || !book) return
    setBusy(true)
    const step = frequency === 'Fortnightly' ? 14 : frequency === 'Monthly' ? 28 : 7
    const schedule = Array.from({ length: 4 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + step * (i + 1)); return { week: i + 1, chapters: `Part ${i + 1}`, date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } })
    try {
      const club = await api.post<BookClub>('/api/clubs', { name: name.trim(), description: description.trim() || `Reading ${book.title} together.`, coverColor: color, coverEmoji: icon, currentBookId: book.id, maxMembers, frequency, isPrivate, schedule })
      useLibrary.setState((s) => ({ clubs: [...s.clubs, club.id] }))
      invalidate('clubs', 'feed')
      toast('Your club is live')
      onClose()
      nav(`/community/clubs/${club.id}`)
    } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Start a book club" wide>
      <div className="grid gap-5 md:grid-cols-[1fr_200px]">
        <div className="space-y-4">
          <div><label className="label">Club name</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Sunday Russians" maxLength={60} autoFocus /></div>
          <div><label className="label">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input resize-none" placeholder="What you read, how fast, and who it's for." maxLength={240} /></div>
          <div><label className="label">First book</label><BookPicker value={book} onChange={setBook} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Meets</label><select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input">{FREQ.map((f) => <option key={f}>{f}</option>)}</select></div>
            <div><label className="label">Max members</label><input type="number" min={2} max={1000} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))} className="input" /></div>
          </div>
          <label className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}><span><span className="block font-semibold">Private club</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Members join by request or invitation only.</span></span><input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-4 w-4 accent-[var(--accent-primary)]" /></label>
        </div>
        <div>
          <p className="label">Cover</p>
          <div className="flex h-24 items-end rounded-xl p-3" style={{ background: color }}><span className="text-3xl">{icon}</span></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full border-2" style={{ background: c, borderColor: color === c ? 'var(--text-primary)' : 'transparent' }} aria-label={c} />)}</div>
          <div className="mt-3 flex flex-wrap gap-1">{ICONS.map((i) => <button key={i} onClick={() => setIcon(i)} className={cn('rounded-md px-1.5 py-1 text-lg', icon === i && 'bg-[var(--bg-tertiary)]')}>{i}</button>)}</div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={!canCreate} className="btn btn-primary"><Plus size={15} /> {busy ? 'Creating…' : 'Create club'}</button></div>
    </Modal>
  )
}

function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const invalidate = useInvalidate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [book, setBook] = useState<Book | null>(null)
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Open a reading room" wide>
      <div className="space-y-4">
        <div><label className="label">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Chapter 12 together, tonight" autoFocus /></div>
        <div><label className="label">What will you read?</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input resize-none" /></div>
        <div><label className="label">Book</label><BookPicker value={book} onChange={setBook} /></div>
        <div><label className="label">Start</label><div className="flex flex-wrap gap-2"><button onClick={() => setWhen('')} className={cn('chip', !when && 'chip-active')}>Go live now</button><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="input w-auto" /></div></div>
      </div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={title.trim().length < 3 || !book || busy} onClick={async () => { setBusy(true); try { const r = await api.post<{ id: string }>('/api/rooms', { title: title.trim(), description: description.trim(), bookId: book!.id, scheduledAt: when ? new Date(when).toISOString() : null }); invalidate('rooms'); onClose(); nav(`/community/rooms/${r.id}`) } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) } }} className="btn btn-primary">{when ? 'Schedule room' : 'Go live'}</button></div>
    </Modal>
  )
}

function CreateDebateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const invalidate = useInvalidate()
  const [question, setQuestion] = useState('')
  const [sideA, setSideA] = useState('Yes')
  const [sideB, setSideB] = useState('No')
  const [book, setBook] = useState<Book | null>(null)
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Start a debate" wide>
      <div className="space-y-4">
        <div><label className="label">Question</label><input value={question} onChange={(e) => setQuestion(e.target.value)} className="input" placeholder="Was the ending earned?" autoFocus /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="label">Side A</label><input value={sideA} onChange={(e) => setSideA(e.target.value)} className="input" /></div><div><label className="label">Side B</label><input value={sideB} onChange={(e) => setSideB(e.target.value)} className="input" /></div></div>
        <div><label className="label">Book</label><BookPicker value={book} onChange={setBook} /></div>
        <div><label className="label">Runs for</label><select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input w-auto">{[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</select></div>
      </div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={question.trim().length < 5 || !book || busy} onClick={async () => { setBusy(true); try { const d = await api.post<{ id: string }>('/api/debates', { bookId: book!.id, question: question.trim(), sideA: sideA.trim(), sideB: sideB.trim(), days }); invalidate('debates', 'feed'); onClose(); nav(`/community/debates/${d.id}`) } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) } }} className="btn btn-primary">Open debate</button></div>
    </Modal>
  )
}
