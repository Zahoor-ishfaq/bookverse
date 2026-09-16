import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Logo } from '@/components/layout/AppShell'
import { Avatar, MoodBadge } from '@/components/ui'
import { useAuth } from '@/store/authStore'
import { useLibrary } from '@/store/libraryStore'
import { GENRE_TOPICS, MOODS } from '@/data/seed'
import { cn, formatNumber } from '@/lib/utils'
import { useSuggested } from '@/hooks/useCommunity'
import { coverUrlFor } from '@/services/gutenberg'
import type { Mood } from '@/types/book'

const STEPS = ['Genres', 'Moods', 'Goal', 'People']
const GENRE_ICONS: Record<string, string> = { Fiction: '📖', Mystery: '🔍', Romance: '💌', Philosophy: '🪞', History: '🏛️', Science: '🔬', Poetry: '🪶', Adventure: '🧭' }

function goalMessage(g: number) {
  if (g <= 6) return 'Slow and deep. The best readers I know are like this.'
  if (g <= 12) return 'One a month. Sustainable, respectable, quietly impressive.'
  if (g <= 24) return 'Two a month. You will need a bigger nightstand.'
  if (g <= 40) return 'Nearly one a week. Your commute is about to get interesting.'
  return 'A book a week. We salute you and worry a little.'
}

export default function OnboardingPage() {
  const nav = useNavigate()
  const complete = useAuth((s) => s.completeOnboarding)
  const user = useAuth((s) => s.user)
  const following = useLibrary((s) => s.following)
  const toggleFollow = useLibrary((s) => s.toggleFollow)
  const [step, setStep] = useState(0)
  const [genres, setGenres] = useState<string[]>([])
  const [moods, setMoods] = useState<Mood[]>([])
  const [goal, setGoal] = useState(24)
  const suggested = useSuggested().data ?? []
  const [saving, setSaving] = useState(false)
  const finish = async () => { setSaving(true); try { await complete({ genres, moods, goal }); nav('/home') } catch { nav('/home') } finally { setSaving(false) } }
  const next = () => (step === STEPS.length - 1 ? finish() : setStep(step + 1))

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8">
      <div className="flex items-center justify-between"><Logo light /><button onClick={finish} className="btn btn-ghost btn-sm">Skip for now</button></div>
      <div className="mt-8 flex items-center gap-2">
        {STEPS.map((s, i) => <div key={s} className="flex flex-1 items-center gap-2"><span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors', i < step ? 'text-white' : i === step ? 'text-white' : '')} style={{ background: i <= step ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: i <= step ? '#fff' : 'var(--text-muted)' }}>{i < step ? <Check size={13} /> : i + 1}</span><span className="hidden text-xs font-medium sm:inline" style={{ color: i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>{i < STEPS.length - 1 && <span className="h-px flex-1" style={{ background: i < step ? 'var(--accent-primary)' : 'var(--border)' }} />}</div>)}
      </div>

      <div className="my-auto py-10">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
            {step === 0 && (
              <>
                <p className="eyebrow mb-2">Step 1 · Genres</p><h1 className="text-4xl">What do you reach for?</h1><p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Pick as many as you like. We use this to seed your first shelf.</p>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {GENRE_TOPICS.map((g, i) => { const on = genres.includes(g.name); return (
                    <motion.button key={g.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setGenres((x) => (on ? x.filter((y) => y !== g.name) : [...x, g.name]))} className={cn('group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all', on ? 'shadow-lift' : 'hover:-translate-y-0.5')} style={{ background: on ? g.color : 'var(--bg-card)', borderColor: on ? g.color : 'var(--border)', color: on ? '#fff' : 'var(--text-primary)' }}>
                      <img src={coverUrlFor(g.ids[0])} alt="" className="absolute -bottom-4 -right-4 w-16 rotate-12 rounded shadow-cover opacity-60 transition-transform group-hover:rotate-6" />
                      <span className="text-2xl">{GENRE_ICONS[g.name]}</span><span className="mt-6 block font-display text-lg font-semibold">{g.name}</span>
                      {on && <Check size={16} className="absolute right-3 top-3" />}
                    </motion.button>
                  ) })}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <p className="eyebrow mb-2">Step 2 · Moods</p><h1 className="text-4xl">How do you like to feel?</h1><p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Moods power recommendations more than genres do.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {MOODS.map((m, i) => { const on = moods.includes(m.key); return (
                    <motion.button key={m.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setMoods((x) => (on ? x.filter((y) => y !== m.key) : [...x, m.key]))} className="flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5" style={{ background: on ? m.color : m.soft, borderColor: on ? m.color : 'transparent', color: on ? '#fff' : m.color }}>
                      <span><span className="block font-display text-xl font-semibold">{m.label}</span><span className="text-xs opacity-80">{m.blurb}</span></span>{on && <Check size={18} />}
                    </motion.button>
                  ) })}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p className="eyebrow mb-2">Step 3 · Goal</p><h1 className="text-4xl">How many books this year?</h1>
                <div className="mt-10 text-center"><motion.p key={goal} initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[96px] font-bold leading-none" style={{ color: 'var(--accent-primary)' }}>{goal}</motion.p><p className="eyebrow mt-2">books</p></div>
                <input type="range" min={1} max={52} value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="mt-8 w-full accent-[var(--accent-secondary)]" />
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}><span>1</span><span>52</span></div>
                <p className="mt-6 text-center font-quote text-2xl italic" style={{ color: 'var(--text-secondary)' }}>{goalMessage(goal)}</p>
              </>
            )}
            {step === 3 && (
              <>
                <p className="eyebrow mb-2">Step 4 · People</p><h1 className="text-4xl">Readers worth following.</h1><p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Active, kind, occasionally wrong about Heathcliff.</p>
                <ul className="mt-8 space-y-3">
                  {suggested.map((u, i) => { const id = u.id; const on = following.includes(id); return (
                    <motion.li key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card flex items-center gap-4 p-4">
                      <Avatar user={u} size={48} /><div className="min-w-0 flex-1"><p className="font-semibold">{u.displayName}</p><p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{u.headline || u.bio}</p><div className="mt-1 flex gap-1">{u.favoriteMoods.slice(0, 2).map((m) => <MoodBadge key={m} mood={m} small />)}</div></div>
                      <div className="text-right"><button onClick={() => toggleFollow(id, u.username)} className={cn('btn btn-sm', on ? 'btn-secondary' : 'btn-primary')}>{on ? 'Following' : 'Follow'}</button><p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatNumber(u.followers)} followers</p></div>
                    </motion.li>
                  ) })}
                {suggested.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>No suggestions yet. You can find readers later under Community.</li>}</ul>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-ghost disabled:opacity-30"><ArrowLeft size={15} /> Back</button>
        <button onClick={next} disabled={saving} className="btn btn-primary btn-lg">{step === STEPS.length - 1 ? `Open BookVerse${user ? `, ${user.displayName.split(' ')[0]}` : ''}` : 'Continue'} <ArrowRight size={15} /></button>
      </div>
    </div>
  )
}
