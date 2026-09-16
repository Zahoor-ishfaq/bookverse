import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Heart, MessageCircle, Pin, Send, Users } from 'lucide-react'
import { Avatar, Modal, ProgressRing, toast } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { useBook } from '@/hooks/useBooks'
import { useClub, useInvalidate } from '@/hooks/useCommunity'
import { useLibrary } from '@/store/libraryStore'
import { useAuth } from '@/store/authStore'
import { usePeople } from '@/store/peopleStore'
import { api } from '@/services/api'
import { ReportButton } from '@/components/ReportButton'
import { cn, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'
import type { Thread } from '@/types/community'

export default function BookClubPage() {
  const { id } = useParams()
  const { data: club, isLoading } = useClub(id)
  const { data: book } = useBook(club?.currentBookId)
  const user = useAuth((s) => s.user)
  const joined = useLibrary((s) => s.clubs.includes(id ?? ''))
  const toggleClub = useLibrary((s) => s.toggleClub)
  const myProgress = useLibrary((s) => (club ? s.progress[club.currentBookId] : undefined))
  const invalidate = useInvalidate()
  const person = usePeople([...(club?.memberIds ?? []), ...(club?.threads ?? []).flatMap((t) => [t.userId, ...t.replies.map((r) => r.userId)])])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [chapter, setChapter] = useState(1)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [revealed, setRevealed] = useState<string[]>([])
  useSEO({ title: club ? club.name : 'Book club', description: club?.description })

  if (isLoading) return <div className="mx-auto max-w-6xl space-y-4"><div className="skeleton h-48 rounded-[2rem]" /><div className="skeleton h-40" /></div>
  if (!club) return <div className="card mx-auto max-w-md p-10 text-center"><h2 className="text-2xl">Club not found</h2><Link to="/community" className="btn btn-primary mt-4">Back</Link></div>

  const chaptersRead = myProgress?.chapter ?? 0
  const byChapter = club.threads.reduce<Record<number, Thread[]>>((acc, t) => ((acc[t.chapter] ??= []).push(t), acc), {})
  const isOwner = user?.id === club.createdBy

  const postThread = async () => {
    try {
      await api.post(`/api/clubs/${club.id}/threads`, { chapter, title: title.trim(), body: body.trim() })
      invalidate('club'); setOpen(false); setTitle(''); setBody(''); toast('Thread posted')
    } catch (e) { toast((e as Error).message, 'error') }
  }
  const postReply = async (threadId: string) => {
    if (!replyText.trim()) return
    try { await api.post(`/api/threads/${threadId}/replies`, { body: replyText.trim() }); invalidate('club'); setReplyTo(null); setReplyText('') } catch (e) { toast((e as Error).message, 'error') }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative mb-8 overflow-hidden rounded-[1.5rem] p-6 text-white md:p-10" style={{ background: club.coverColor }}>
        <span className="absolute -right-4 -top-6 text-[140px] opacity-20">{club.coverEmoji}</span>
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Book club · {club.frequency}{club.isPrivate ? ' · Private' : ''}</p>
        <h1 className="mt-1 text-3xl md:text-5xl">{club.name}</h1>
        <p className="mt-3 max-w-xl text-sm opacity-90">{club.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!isOwner && <button onClick={async () => { const ok = await toggleClub(club.id); if (ok) { invalidate('club', 'clubs'); toast(joined ? 'Left the club' : 'Welcome to the club') } }} className={cn('btn', joined ? 'btn-secondary' : '')} style={joined ? undefined : { background: '#fff', color: club.coverColor }}>{joined ? 'Leave club' : club.isPrivate ? 'Request to join' : 'Join club'}</button>}
          {isOwner && <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)' }}>You run this club</span>}
          <span className="flex items-center gap-1.5 text-sm"><Users size={14} /> {club.memberCount} members</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl">Discussions by chapter</h2><button onClick={() => (joined ? setOpen(true) : toast('Join the club to post', 'info'))} className="btn btn-primary btn-sm">New thread</button></div>
          <p className="mb-6 rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Threads are grouped by chapter. Ones ahead of your reading position ({chaptersRead ? `chapter ${chaptersRead + 1}` : 'not started'}) are blurred — honour system.</p>
          <div className="space-y-8">
            {Object.entries(byChapter).sort(([a], [b]) => Number(a) - Number(b)).map(([ch, ts]) => (
              <section key={ch}>
                <p className="eyebrow mb-3">Chapter {ch}</p>
                <div className="space-y-4">
                  {ts.map((t) => {
                    const u = person(t.userId)
                    const locked = Number(ch) > chaptersRead + 1 && !revealed.includes(t.id)
                    return (
                      <article key={t.id} className="card relative overflow-hidden p-5">
                        {t.pinned && <span className="absolute right-4 top-4 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-secondary)' }}><Pin size={11} /> Pinned</span>}
                        <div className="flex items-center gap-3"><Link to={`/u/${u.username}`}><Avatar user={u} size={36} /></Link><div className="text-sm"><p className="font-semibold">{u.displayName}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.createdAt)}{t.spoilers && <span className="ml-2 font-semibold" style={{ color: 'var(--accent-tertiary)' }}>· spoilers</span>}</p></div></div>
                        <div className={cn('mt-3 transition-all', locked && 'select-none blur-[5px]')}>
                          <h3 className="text-lg font-semibold">{t.title}</h3>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.body}</p>
                          {t.replies.length > 0 && (
                            <div className="mt-4 space-y-3 border-l-2 pl-4" style={{ borderColor: 'var(--border)' }}>
                              {t.replies.map((r) => { const ru = person(r.userId); return <div key={r.id} className="flex gap-2.5 text-sm"><Avatar user={ru} size={26} /><div><p><span className="font-semibold">{ru.displayName}</span> <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.createdAt)}</span></p><p style={{ color: 'var(--text-secondary)' }}>{r.body}</p></div></div> })}
                            </div>
                          )}
                        </div>
                        {locked && <button onClick={() => setRevealed((r) => [...r, t.id])} className="absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-tertiary)', color: 'var(--accent-tertiary)' }}><AlertTriangle size={12} /> Ahead of where you are — reveal anyway</button>}
                        <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><Heart size={12} /> {t.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle size={12} /> {t.replies.length}</span>
                          {joined && <button onClick={() => setReplyTo(replyTo === t.id ? null : t.id)} className="font-medium underline">Reply</button>}
                          {t.userId !== user?.id && <ReportButton type="thread" id={t.id} className="ml-auto" />}
                        </div>
                        {replyTo === t.id && (
                          <form onSubmit={(e) => { e.preventDefault(); postReply(t.id) }} className="mt-3 flex gap-2"><input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} className="input" placeholder="Write a reply…" /><button className="btn btn-primary btn-icon"><Send size={14} /></button></form>
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
            {club.threads.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No threads yet. Be the first to start a discussion.</p>}
          </div>
        </div>

        <aside className="space-y-5">
          {book && (
            <div className="card p-5">
              <p className="eyebrow mb-3">Currently reading</p>
              <Link to={bookPath(book)} className="flex gap-4"><div className="w-20 shrink-0 overflow-hidden rounded-md shadow-cover"><BookCover book={book} rounded="rounded-md" /></div><div><p className="text-sm font-semibold leading-snug">{book.title}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{book.authorName}</p></div></Link>
              <Link to={`/read/${book.id}`} className="btn btn-primary btn-sm mt-4 w-full">Read along</Link>
            </div>
          )}
          <div className="card p-5">
            <p className="eyebrow mb-3">Schedule</p>
            {club.schedule.length ? <ol className="space-y-2">{club.schedule.map((s) => <li key={s.week} className="flex items-center justify-between text-sm"><span><span className="mr-2 font-bold" style={{ color: 'var(--accent-primary)' }}>W{s.week}</span>{s.chapters}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.date}</span></li>)}</ol> : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not published.</p>}
          </div>
          <div className="card p-5">
            <p className="eyebrow mb-3">Members</p>
            <ul className="space-y-3">{club.memberIds.map((mid) => { const m = person(mid); return <li key={mid} className="flex items-center gap-3 text-sm"><Link to={`/u/${m.username}`}><Avatar user={m} size={32} /></Link><span className="min-w-0 flex-1 truncate">{m.displayName}{mid === club.createdBy && <span className="ml-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--accent-primary)' }}>host</span>}</span>{mid === user?.id && <ProgressRing value={myProgress?.percentage ?? 0} size={30} stroke={3}><span className="text-[9px] font-bold">{Math.round(myProgress?.percentage ?? 0)}</span></ProgressRing>}</li> })}</ul>
            {club.memberCount > club.memberIds.length && <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>+{club.memberCount - club.memberIds.length} more</p>}
          </div>
        </aside>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Start a discussion">
        <div className="space-y-3">
          <div><p className="label">Chapter</p><input type="number" min={0} max={500} value={chapter} onChange={(e) => setChapter(Number(e.target.value))} className="input w-28" /></div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Your thoughts…" className="input resize-none" />
          <button disabled={!title.trim() || !body.trim()} onClick={postThread} className="btn btn-primary w-full">Post thread</button>
        </div>
      </Modal>
    </div>
  )
}
