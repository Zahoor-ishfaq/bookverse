import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Users } from 'lucide-react'
import { Avatar, Modal, ProgressRing, toast } from '@/components/ui'
import { useChallenges, useInvalidate } from '@/hooks/useCommunity'
import { useAuth } from '@/store/authStore'
import { usePeople } from '@/store/peopleStore'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'
import { useSEO } from '@/lib/seo'
import type { Challenge } from '@/types/community'

const TYPE_META: Record<Challenge['type'], { icon: string; color: string; unit: string }> = {
  books: { icon: '📚', color: '#8A5A2F', unit: 'books' }, pages: { icon: '📄', color: '#3F4F5C', unit: 'pages' }, genre_bingo: { icon: '🎯', color: '#7A4B8A', unit: 'squares' },
  streak: { icon: '🔥', color: '#8B3A3A', unit: 'days' }, writing: { icon: '🪶', color: '#1B6B4A', unit: 'votes' },
}

export default function ChallengesPage() {
  useSEO({ title: 'Reading challenges', description: 'Set a reading goal, join community challenges and climb the leaderboard.' })
  const user = useAuth((s) => s.user)
  const nav = useNavigate()
  const { data: challenges = [], isLoading } = useChallenges()
  const invalidate = useInvalidate()
  const person = usePeople(challenges.flatMap((c) => c.leaderboard.map((l) => l.userId)))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'books' as Challenge['type'], target: 12, days: 90 })

  const join = async (c: Challenge & { joined: boolean }) => {
    if (!user) return nav('/login?next=/challenges')
    try { const r = await api.post<{ joined: boolean }>(`/api/challenges/${c.id}/join`); invalidate('challenges'); toast(r.joined ? 'You’re in' : 'Left the challenge') } catch (e) { toast((e as Error).message, 'error') }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-1">Set a goal, tell a friend</p><h1 className="text-3xl md:text-4xl">Challenges</h1></div>
        <button onClick={() => (user ? setOpen(true) : nav('/login?next=/challenges'))} className="btn btn-primary"><Trophy size={15} /> Create challenge</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-72" />)}
        {challenges.map((c) => {
          const meta = TYPE_META[c.type]
          const mine = c.leaderboard.find((l) => l.userId === user?.id)
          const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 864e5))
          const top = c.leaderboard[0]?.value || 1
          return (
            <article key={c.id} className="card overflow-hidden">
              <div className="flex items-start gap-4 p-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: meta.color + '22' }}>{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{c.type.replace('_', ' ')} · {daysLeft} days left</p>
                  <h2 className="mt-1 text-2xl leading-tight">{c.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.description}</p>
                  {c.prompt && <p className="mt-3 rounded-xl px-3 py-2 font-quote text-lg italic" style={{ background: 'var(--bg-secondary)' }}>“{c.prompt}”</p>}
                </div>
                {c.joined && <ProgressRing value={((mine?.value ?? 0) / c.target) * 100} size={64} stroke={6} color={meta.color}><span className="text-center text-xs font-bold leading-none">{mine?.value ?? 0}<span className="block text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>/{c.target}</span></span></ProgressRing>}
              </div>
              <div className="border-t px-6 py-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-elev)' }}>
                <div className="flex items-center justify-between"><p className="eyebrow">Leaderboard</p><span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Users size={12} /> {c.participants}</span></div>
                <ol className="mt-3 space-y-2">
                  {c.leaderboard.slice(0, 4).map((l, idx) => { const u = person(l.userId); return (
                    <li key={l.userId} className={cn('flex items-center gap-3 text-sm', l.userId === user?.id && 'font-semibold')}>
                      <span className="w-5 text-center text-base" style={{ color: idx === 0 ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>{idx === 0 ? '♛' : idx + 1}</span>
                      <Link to={`/u/${u.username}`}><Avatar user={u} size={26} /></Link><span className="min-w-0 flex-1 truncate">{u.displayName}{l.userId === user?.id && ' (you)'}</span>
                      <span className="flex-1"><span className="block h-1.5 rounded-full" style={{ width: `${Math.min(100, (l.value / (c.type === 'writing' ? top : c.target)) * 100)}%`, background: meta.color }} /></span>
                      <span className="w-16 text-right text-xs" style={{ color: 'var(--text-muted)' }}>{l.value} {meta.unit}</span>
                    </li>
                  ) })}
                  {c.leaderboard.length === 0 && <li className="text-xs" style={{ color: 'var(--text-muted)' }}>No participants yet — be first.</li>}
                </ol>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => join(c)} className={cn('btn btn-sm', c.joined ? 'btn-secondary' : 'btn-primary')}>{c.joined ? 'Joined' : 'Join challenge'}</button>
                  {c.type === 'writing' && <Link to="/stories/write" className="btn btn-soft btn-sm">Submit an entry</Link>}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create a challenge">
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Twelve Russians before December" className="input" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Rules, spirit, anything else" className="input resize-none" />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Challenge['type'] })} className="input"><option value="books">Books</option><option value="pages">Pages</option><option value="genre_bingo">Genre bingo</option><option value="streak">Streak</option><option value="writing">Writing</option></select>
            <input type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} className="input" />
            <select value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className="input">{[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}</select>
          </div>
          <button disabled={form.title.trim().length < 3} onClick={async () => { try { await api.post('/api/challenges', form); invalidate('challenges'); setOpen(false); toast('Challenge created') } catch (e) { toast((e as Error).message, 'error') } }} className="btn btn-primary w-full">Create</button>
        </div>
      </Modal>
    </div>
  )
}
