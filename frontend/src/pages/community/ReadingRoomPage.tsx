import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Pin, Quote, Send, Smile, Square } from 'lucide-react'
import { Avatar, toast } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { useBook } from '@/hooks/useBooks'
import { useInvalidate, useRoom } from '@/hooks/useCommunity'
import { useAuth } from '@/store/authStore'
import { usePeople } from '@/store/peopleStore'
import { api, wsUrl } from '@/services/api'
import { ReportButton } from '@/components/ReportButton'
import { cn, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'
import type { RoomMessage } from '@/types/community'

const REACTIONS = ['😱', '😭', '🔥', '📖', '☕', '👏', '🕯️', '🤯']

export default function ReadingRoomPage() {
  const { id } = useParams()
  const { data: room, isLoading } = useRoom(id)
  const { data: book } = useBook(room?.bookId)
  const user = useAuth((s) => s.user)
  const invalidate = useInvalidate()
  const [live, setLive] = useState<RoomMessage[]>([])
  const [online, setOnline] = useState<number | null>(null)
  const [pinned, setPinned] = useState<string | null | undefined>(undefined)
  const [ended, setEnded] = useState(false)
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<'text' | 'quote'>('text')
  const [joined, setJoined] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  useSEO({ title: room?.title ?? 'Reading room', description: room?.description })

  // Join once (adds you to the participant list) and open the socket.
  useEffect(() => {
    if (!room?.id) return
    if (user && !joined) { api.post(`/api/rooms/${room.id}/join`).then(() => setJoined(true)).catch(() => {}) }
    const ws = new WebSocket(wsUrl(`/api/ws/rooms/${room.id}`))
    wsRef.current = ws
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data)
      if (data.kind === 'message') setLive((l) => (l.some((m) => m.id === data.message.id) ? l : [...l, data.message]))
      else if (data.kind === 'presence') setOnline(data.online)
      else if (data.kind === 'pin') setPinned(data.quote)
      else if (data.kind === 'ended') setEnded(true)
    }
    return () => { ws.close(); wsRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, user?.id])

  const messages = useMemo(() => { const seen = new Set<string>(); return [...(room?.messages ?? []), ...live].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))) }, [room, live])
  const person = usePeople([...(room?.participantIds ?? []), ...messages.map((m) => m.userId), room?.hostId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  if (isLoading) return <div className="mx-auto max-w-6xl"><div className="skeleton h-[70vh]" /></div>
  if (!room) return <div className="card mx-auto max-w-md p-10 text-center"><h2 className="text-2xl">Room not found</h2><Link to="/community?tab=rooms" className="btn btn-primary mt-4">Back</Link></div>
  const isLive = room.isLive && !ended
  const isHost = user?.id === room.hostId
  const pin = pinned === undefined ? room.pinnedQuote : pinned

  const send = async (text = draft, type: RoomMessage['type'] = mode) => {
    if (!text.trim()) return
    if (!user) { toast('Log in to join the conversation', 'info'); return }
    const payload = { text: text.trim(), type: type === 'quote' ? 'quote' : REACTIONS.includes(text.trim()) ? 'reaction' : 'text' }
    setDraft(''); setMode('text')
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
    else { try { const m = await api.post<RoomMessage>(`/api/rooms/${room.id}/messages`, payload); setLive((l) => [...l, m]) } catch (e) { toast((e as Error).message, 'error') } }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:h-[calc(100vh-7rem)] lg:grid-cols-[1fr_280px]">
      <div className="card flex min-h-[70vh] flex-col overflow-hidden lg:min-h-0">
        <header className="flex items-center gap-4 border-b p-4" style={{ borderColor: 'var(--border)' }}>
          {book && <Link to={bookPath(book)} className="w-10 shrink-0 overflow-hidden rounded shadow-cover"><BookCover book={book} rounded="rounded" /></Link>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{isLive ? <><span className="live-dot" /><span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>LIVE</span> · {online ?? room.participants} here now</> : room.scheduledAt && !room.endedAt && !ended ? `Scheduled for ${new Date(room.scheduledAt).toLocaleString()}` : 'Room ended · transcript'}</div>
            <h1 className="truncate text-lg">{room.title}</h1>
          </div>
          {isHost && isLive && <button onClick={async () => { await api.post(`/api/rooms/${room.id}/end`); setEnded(true); invalidate('rooms') }} className="btn btn-secondary btn-sm"><Square size={12} /> End room</button>}
        </header>
        {pin && (
          <div className="flex items-start gap-3 border-b px-5 py-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <Pin size={14} className="mt-1 shrink-0" style={{ color: 'var(--accent-secondary)' }} />
            <div className="min-w-0 flex-1"><p className="eyebrow">Pinned by host</p><p className="font-quote text-lg italic leading-snug">“{pin}”</p></div>
            {isHost && <button onClick={() => api.post(`/api/rooms/${room.id}/pin`, { quote: null }).then(() => setPinned(null))} className="btn btn-ghost btn-sm">Unpin</button>}
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>{isLive ? 'The room is open. Say hello.' : 'No messages were posted.'}</p>}
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const u = person(m.userId); const me = m.userId === user?.id; const host = m.userId === room.hostId
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', me && 'flex-row-reverse')}>
                  <Avatar user={u} size={30} />
                  <div className={cn('max-w-[78%]', me && 'text-right')}>
                    <p className="group/msg text-[11px]" style={{ color: 'var(--text-muted)' }}><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{u.displayName}</span>{host && <span className="ml-1 rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}>host</span>} · {timeAgo(m.createdAt)}{!me && m.type !== 'reaction' && <ReportButton type="message" id={m.id} label="" className="ml-1 opacity-0 group-hover/msg:opacity-100" />}</p>
                    {m.type === 'reaction' ? <p className="mt-0.5 text-3xl">{m.text}</p>
                    : m.type === 'quote' ? <blockquote className="relative mt-1 rounded-2xl border-l-4 px-4 py-3 text-left" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent-secondary)' }}><Quote size={12} className="absolute right-3 top-3 opacity-40" /><p className="font-quote text-lg italic leading-snug">“{m.text}”</p>{book && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>— {book.title}</p>}{isHost && <button onClick={() => api.post(`/api/rooms/${room.id}/pin`, { quote: m.text }).then(() => setPinned(m.text))} className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-secondary)' }}>Pin</button>}</blockquote>
                    : <p className={cn('mt-0.5 inline-block rounded-2xl px-3.5 py-2 text-left text-sm', me ? 'rounded-tr-sm' : 'rounded-tl-sm')} style={{ background: me ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: me ? 'var(--accent-primary-ink)' : 'var(--text-primary)' }}>{m.text}</p>}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <div className="no-scrollbar mb-2 flex items-center gap-1 overflow-x-auto">
            {REACTIONS.map((r) => <button type="button" key={r} disabled={!isLive} onClick={() => send(r, 'reaction')} className="rounded-full px-2 py-1 text-lg transition-transform hover:scale-125 disabled:opacity-40">{r}</button>)}
            <button type="button" onClick={() => setMode(mode === 'quote' ? 'text' : 'quote')} className={cn('btn btn-sm ml-auto shrink-0', mode === 'quote' ? 'chip-active' : 'btn-secondary')}><Quote size={12} /> Quote a passage</button>
          </div>
          <div className="flex items-center gap-2 rounded-full border p-1 pl-4" style={{ background: 'var(--bg-elev)', borderColor: mode === 'quote' ? 'var(--accent-secondary)' : 'var(--border)' }}>
            <Smile size={16} style={{ color: 'var(--text-muted)' }} />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={!user ? 'Log in to join the conversation' : mode === 'quote' ? 'Paste the passage…' : isLive ? 'Say something to the room…' : 'This room has ended'} disabled={!isLive || !user} className="w-full bg-transparent text-sm outline-none" />
            <button disabled={!isLive || !user} className="btn btn-primary btn-icon h-9 w-9" aria-label="Send"><Send size={15} /></button>
          </div>
        </form>
      </div>

      <aside className="card h-fit p-5">
        <p className="eyebrow mb-3">In the room</p>
        <ul className="space-y-3">
          {room.participantIds.map((pid) => { const u = person(pid); return <li key={pid} className="flex items-center gap-3 text-sm"><Link to={`/u/${u.username}`}><Avatar user={u} size={32} /></Link><span className="min-w-0"><span className="block truncate font-medium">{u.displayName}{pid === room.hostId && <span className="ml-1 text-[10px] font-bold uppercase" style={{ color: 'var(--accent-primary)' }}>host</span>}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>u/{u.username}</span></span></li> })}
        </ul>
        <div className="divider my-5" />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{room.description}</p>
      </aside>
    </div>
  )
}
