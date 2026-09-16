import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, StarHalf, X } from 'lucide-react'
import { create } from 'zustand'
import { cn, initials, moodMeta } from '@/lib/utils'
import type { Mood } from '@/types/book'
import type { User } from '@/types/community'

/* ---------------- Avatar ---------------- */
export function Avatar({ user, size = 36, ring, className }: { user: Pick<User, 'displayName' | 'avatarColor'> & { avatarUrl?: string }; size?: number; ring?: number; className?: string }) {
  const r = size / 2
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      {ring != null && (
        <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={2 * Math.PI * (r - 1.5)} strokeDashoffset={2 * Math.PI * (r - 1.5) * (1 - ring / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
        </svg>
      )}
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: ring != null ? size - 8 : size, height: ring != null ? size - 8 : size }} />
      ) : (
        <span
          className="flex items-center justify-center rounded-full font-semibold text-white"
          style={{ width: ring != null ? size - 8 : size, height: ring != null ? size - 8 : size, background: user.avatarColor, fontSize: size * 0.38 }}
        >
          {initials(user.displayName)}
        </span>
      )}
    </span>
  )
}

export function AvatarStack({ users, size = 28, max = 4 }: { users: (Pick<User, 'displayName' | 'avatarColor'> & { avatarUrl?: string })[]; size?: number; max?: number }) {
  const shown = users.slice(0, max)
  return (
    <span className="flex items-center">
      {shown.map((u, i) => (
        <span key={i} className="rounded-full ring-2" style={{ marginLeft: i ? -size * 0.3 : 0, boxShadow: '0 0 0 2px var(--bg-card)' }}>
          <Avatar user={u} size={size} />
        </span>
      ))}
      {users.length > max && (
        <span className="ml-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>+{users.length - max}</span>
      )}
    </span>
  )
}

/* ---------------- Progress ring ---------------- */
export function ProgressRing({ value, size = 64, stroke = 6, color = 'var(--accent-primary)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }} transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children ?? <span className="font-display text-sm font-bold">{Math.round(value)}%</span>}</span>
    </span>
  )
}

/* ---------------- Stars ---------------- */
export function Stars({ value, size = 14, onChange, className }: { value: number; size?: number; onChange?: (v: number) => void; className?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const v = hover ?? value
  return (
    <span className={cn('inline-flex items-center gap-0.5', onChange && 'cursor-pointer', className)} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const full = v >= i
        const half = !full && v >= i - 0.5
        return (
          <span key={i} className="relative" style={{ width: size, height: size }}
            onMouseMove={onChange ? (e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setHover(e.clientX - rect.left < rect.width / 2 ? i - 0.5 : i) } : undefined}
            onClick={onChange ? () => onChange(hover ?? i) : undefined}>
            <Star size={size} className="absolute inset-0" style={{ color: 'var(--border-strong)' }} fill="currentColor" strokeWidth={0} />
            {full && <Star size={size} className="absolute inset-0" style={{ color: 'var(--accent-secondary)' }} fill="currentColor" strokeWidth={0} />}
            {half && <StarHalf size={size} className="absolute inset-0" style={{ color: 'var(--accent-secondary)' }} fill="currentColor" strokeWidth={0} />}
          </span>
        )
      })}
    </span>
  )
}

/* ---------------- Badges ---------------- */
export function MoodBadge({ mood, small, active, onClick }: { mood: Mood; small?: boolean; active?: boolean; onClick?: () => void }) {
  const m = moodMeta(mood)
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag onClick={onClick} className={cn('inline-flex items-center gap-1.5 rounded-full font-medium transition-all', small ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs', onClick && 'hover:-translate-y-0.5')}
      style={{ background: active ? m.color : m.soft, color: active ? '#fff' : m.color, border: `1px solid ${active ? m.color : 'transparent'}` }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: active ? '#fff' : m.color }} />
      {m.label}
    </Tag>
  )
}

export function GenreBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{children}</span>
}

export function AIBadge({ label = 'Auto-generated' }: { label?: string }) {
  return <span className="ai-badge">✦ {label}</span>
}

/* ---------------- Section heading ---------------- */
export function SectionHead({ eyebrow, title, action, className }: { eyebrow?: string; title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-2xl md:text-[28px]">{title}</h2>
      </div>
      {action}
    </div>
  )
}

/* ---------------- Skeletons ---------------- */
export function CoverSkeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton aspect-[2/3] w-full', className)} />
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl" style={{ background: 'var(--bg-secondary)' }}>{icon}</div>
      <h3 className="text-xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--text-secondary)' }}>{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0" style={{ background: 'rgba(30,22,12,.45)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
          <motion.div role="dialog" aria-modal className={cn('card relative max-h-[90vh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-b-[1.25rem]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
            initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h3 className="text-xl">{title}</h3>}
              <button onClick={onClose} className="btn btn-ghost btn-icon -mr-2 -mt-2 h-9 w-9" aria-label="Close"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Toasts ---------------- */
interface ToastItem { id: number; text: string; tone: 'success' | 'error' | 'info' }
interface ToastState { items: ToastItem[]; push: (text: string, tone?: ToastItem['tone']) => void; remove: (id: number) => void }
export const useToast = create<ToastState>((set) => ({
  items: [],
  push: (text, tone = 'success') => {
    const id = Date.now() + Math.random()
    set((s) => ({ items: [...s.items, { id, text, tone }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3200)
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))
export const toast = (text: string, tone?: ToastItem['tone']) => useToast.getState().push(text, tone)

export function Toaster() {
  const items = useToast((s) => s.items)
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 10, opacity: 0 }}
            className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lift"
            style={{ background: t.tone === 'error' ? 'var(--accent-tertiary)' : 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            <span>{t.tone === 'success' ? '✓' : t.tone === 'error' ? '!' : '•'}</span>{t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- Tabs ---------------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={cn('relative shrink-0 px-4 py-3 text-sm font-medium transition-colors', value === t.key ? '' : 'hover:opacity-80')} style={{ color: value === t.key ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full px-1.5 text-[10px]" style={{ background: 'var(--bg-secondary)' }}>{t.count}</span>}
          {value === t.key && <motion.span layoutId="tab-underline" className="absolute inset-x-3 -bottom-px h-[2px] rounded-full" style={{ background: 'var(--accent-secondary)' }} />}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Steam loader (AI) ---------------- */
export function BrewingLoader({ text = 'Brewing your summary…' }: { text?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: 'var(--bg-secondary)' }}>
      <div className="relative h-12 w-12">
        <div className="absolute bottom-0 left-1 right-1 h-7 rounded-b-xl rounded-t-md" style={{ background: 'var(--accent-secondary)' }} />
        <div className="absolute bottom-2 -right-1 h-4 w-3 rounded-r-full border-2" style={{ borderColor: 'var(--accent-secondary)' }} />
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute bottom-8 h-3 w-1 rounded-full" style={{ left: 12 + i * 8, background: 'var(--text-muted)', animation: `steam 1.6s ${i * 0.35}s ease-out infinite` }} />
        ))}
      </div>
      <div>
        <p className="text-base font-semibold">{text}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This usually takes a few seconds.</p>
      </div>
    </div>
  )
}
