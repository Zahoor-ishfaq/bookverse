import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Avatar, toast } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { DebateVoteBar } from '@/components/community/DebateVoteBar'
import { useBook } from '@/hooks/useBooks'
import { useDebate, useInvalidate } from '@/hooks/useCommunity'
import { useLibrary } from '@/store/libraryStore'
import { useAuth } from '@/store/authStore'
import { usePeople } from '@/store/peopleStore'
import { timeUntil } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'

export default function DebatePage() {
  const { id } = useParams()
  const { data: debate, isLoading } = useDebate(id)
  const { data: book } = useBook(debate?.bookId)
  const user = useAuth((s) => s.user)
  const myVote = useLibrary((s) => s.votes[id ?? ''])
  const vote = useLibrary((s) => s.vote)
  const invalidate = useInvalidate()
  const [argText, setArgText] = useState('')
  const person = usePeople((debate?.arguments ?? []).map((a) => a.userId))
  useSEO({ title: debate?.question ?? 'Debate', description: debate ? `${debate.sideA} vs ${debate.sideB}` : undefined })
  if (isLoading) return <div className="mx-auto max-w-5xl"><div className="skeleton h-64" /></div>
  if (!debate) return <div className="card mx-auto max-w-md p-10 text-center"><h2 className="text-2xl">Debate not found</h2><Link to="/community?tab=debates" className="btn btn-primary mt-4">Back</Link></div>

  const ended = new Date(debate.endsAt).getTime() < Date.now()
  const mine = debate.arguments.find((a) => a.userId === user?.id)
  const side = (s: 'a' | 'b') => debate.arguments.filter((a) => a.side === s)

  const Column = ({ s, title, color }: { s: 'a' | 'b'; title: string; color: string }) => (
    <div>
      <div className="mb-4 flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: color }} /><h3 className="text-lg" style={{ color }}>{title}</h3></div>
      <div className="space-y-3">
        {side(s).map((a) => { const u = person(a.userId); return (
          <div key={a.id} className="card p-4" style={{ borderTop: `3px solid ${color}` }}>
            <p className="font-quote text-xl italic leading-snug">“{a.text}”</p>
            <div className="mt-3 flex items-center justify-between text-xs"><Link to={`/u/${u.username}`} className="flex items-center gap-2"><Avatar user={u} size={22} /> {u.displayName}</Link><span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Heart size={12} /> {a.likes}</span></div>
          </div>
        ) })}
        {side(s).length === 0 && <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No arguments yet.</p>}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-8 md:grid-cols-[140px_1fr]">
        {book && <Link to={bookPath(book)} className="mx-auto w-[120px] md:w-full"><div className="cover-3d shadow-lift rounded-xl"><BookCover book={book} rounded="rounded-xl" /></div></Link>}
        <div>
          <p className="eyebrow" style={{ color: ended ? 'var(--text-muted)' : 'var(--accent-tertiary)' }}>{ended ? 'Debate ended · final results' : `Debate · ${timeUntil(debate.endsAt)}`}</p>
          <h1 className="mt-1 text-3xl md:text-5xl">{debate.question}</h1>
          {book && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>About <span className="font-title italic">{book.title}</span> by {book.authorName}</p>}
          <div className="mt-6"><DebateVoteBar debate={debate} interactive={!ended} onVoted={() => invalidate('debates')} /></div>
          {myVote && !ended && !mine && (
            <form onSubmit={async (e) => { e.preventDefault(); if (!argText.trim()) return; const ok = await vote(debate.id, myVote, argText.trim()); if (ok) { setArgText(''); invalidate('debate'); toast('Argument posted') } }} className="mt-5">
              <p className="eyebrow mb-2">Make your case ({280 - argText.length} left)</p>
              <div className="flex gap-2"><input value={argText} maxLength={280} onChange={(e) => setArgText(e.target.value)} placeholder={`Why “${myVote === 'a' ? debate.sideA : debate.sideB}”?`} className="input" /><button className="btn btn-primary">Post</button></div>
            </form>
          )}
          {!user && <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}><Link to="/login" className="underline">Log in</Link> to vote and argue.</p>}
        </div>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <Column s="a" title={debate.sideA} color="var(--accent-primary)" />
        <Column s="b" title={debate.sideB} color="var(--accent-tertiary)" />
      </div>
    </div>
  )
}
