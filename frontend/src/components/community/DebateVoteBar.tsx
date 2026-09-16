import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLibrary } from '@/store/libraryStore'
import { cn } from '@/lib/utils'
import type { Debate } from '@/types/community'

export function DebateVoteBar({ debate, interactive = true, onVoted }: { debate: Debate; interactive?: boolean; onVoted?: (side: 'a' | 'b') => void }) {
  const myVote = useLibrary((s) => s.votes[debate.id])
  const vote = useLibrary((s) => s.vote)
  // Optimistic counts: server counts + my vote if it isn't reflected yet.
  const [local, setLocal] = useState<{ a: number; b: number } | null>(null)
  const a = local?.a ?? debate.countA
  const b = local?.b ?? debate.countB
  const pa = a + b === 0 ? 50 : Math.round((a / (a + b)) * 100)
  const pb = 100 - pa
  const cast = async (side: 'a' | 'b') => {
    if (!interactive || myVote === side) return
    const ok = await vote(debate.id, side)
    if (!ok) return
    setLocal({ a: a + (side === 'a' ? 1 : 0) - (myVote === 'a' ? 1 : 0), b: b + (side === 'b' ? 1 : 0) - (myVote === 'b' ? 1 : 0) })
    onVoted?.(side)
  }
  return (
    <div>
      <div className="flex h-11 overflow-hidden rounded-full text-xs font-semibold" style={{ background: 'var(--bg-secondary)' }}>
        <motion.button onClick={() => cast('a')} className={cn('flex items-center justify-start px-4 text-white', interactive && 'hover:brightness-110')} style={{ background: 'var(--accent-primary)', outline: myVote === 'a' ? '2px solid var(--text-primary)' : 'none', outlineOffset: -2 }} initial={false} animate={{ width: `${pa}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
          <span className="truncate">{pa}%</span>
        </motion.button>
        <motion.button onClick={() => cast('b')} className={cn('flex items-center justify-end px-4 text-white', interactive && 'hover:brightness-110')} style={{ background: 'var(--accent-tertiary)', outline: myVote === 'b' ? '2px solid var(--text-primary)' : 'none', outlineOffset: -2 }} initial={false} animate={{ width: `${pb}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
          <span className="truncate">{pb}%</span>
        </motion.button>
      </div>
      <div className="mt-2 flex justify-between gap-4 text-xs">
        <button onClick={() => cast('a')} className={cn('text-left font-medium', myVote === 'a' && 'underline decoration-2 underline-offset-2')} style={{ color: 'var(--accent-primary)' }}>{debate.sideA}</button>
        <button onClick={() => cast('b')} className={cn('text-right font-medium', myVote === 'b' && 'underline decoration-2 underline-offset-2')} style={{ color: 'var(--accent-tertiary)' }}>{debate.sideB}</button>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{(a + b).toLocaleString()} votes{myVote ? ' · you voted' : interactive ? ' · tap a side to vote' : ''}</p>
    </div>
  )
}
