import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cn } from '@/lib/utils'

// Consent is recorded per category with a policy version and timestamp so a
// future policy change can re-prompt. Nothing non-essential runs before a
// choice is made; "Reject" is as prominent as "Accept" (ePrivacy / GDPR).
export const CONSENT_VERSION = '2026-09-01'

export interface Consent {
  necessary: true
  analytics: boolean
  personalisation: boolean
  marketing: boolean
  version: string
  decidedAt: string
}

interface ConsentState {
  consent: Consent | null
  open: boolean
  decide: (c: Omit<Consent, 'necessary' | 'version' | 'decidedAt'>) => void
  setOpen: (o: boolean) => void
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      consent: null,
      open: false,
      decide: (c) => set({ consent: { necessary: true, ...c, version: CONSENT_VERSION, decidedAt: new Date().toISOString() }, open: false }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'bookverse.consent', partialize: (s) => ({ consent: s.consent }) },
  ),
)

export const openCookieSettings = () => useConsent.getState().setOpen(true)
export const hasConsent = (cat: keyof Omit<Consent, 'version' | 'decidedAt'>) => Boolean(useConsent.getState().consent?.[cat])

const CATEGORIES = [
  { key: 'necessary' as const, name: 'Strictly necessary', desc: 'Required for the site to work: keeping you signed in, remembering your reading position and your privacy choices. Cannot be switched off.', locked: true },
  { key: 'analytics' as const, name: 'Analytics', desc: 'Helps us understand which features are used so we can improve them. Data is aggregated and never sold.' },
  { key: 'personalisation' as const, name: 'Personalisation', desc: 'Tailors recommendations and your home feed to what you read.' },
  { key: 'marketing' as const, name: 'Marketing', desc: 'Lets us measure and show relevant promotions for books and events. Off by default.' },
]

export function CookieConsent() {
  const { consent, open, decide, setOpen } = useConsent()
  const needsPrompt = !consent || consent.version !== CONSENT_VERSION
  const [prefs, setPrefs] = useState({ analytics: consent?.analytics ?? false, personalisation: consent?.personalisation ?? false, marketing: consent?.marketing ?? false })

  const acceptAll = () => decide({ analytics: true, personalisation: true, marketing: true })
  const rejectAll = () => decide({ analytics: false, personalisation: false, marketing: false })

  return (
    <>
      <AnimatePresence>
        {needsPrompt && !open && (
          <motion.div role="dialog" aria-label="Cookie consent" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed inset-x-3 bottom-3 z-[95] mx-auto max-w-3xl rounded-xl border p-4 shadow-lift md:p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1 text-sm">
                <p className="font-semibold">We use cookies</p>
                <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                  We use strictly necessary cookies to run BookVerse. With your consent we also use analytics, personalisation and marketing cookies. You can change your choice at any time in Cookie settings. See our <Link to="/legal/cookies" className="underline">Cookie policy</Link> and <Link to="/legal/privacy" className="underline">Privacy policy</Link>.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
                <button onClick={acceptAll} className="btn btn-primary">Accept all</button>
                <button onClick={rejectAll} className="btn btn-secondary">Reject non-essential</button>
                <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm">Manage preferences</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[96] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.45)' }} onClick={() => !needsPrompt && setOpen(false)} />
            <motion.div role="dialog" aria-modal aria-label="Cookie preferences" initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24 }} className="card relative max-h-[90vh] w-full overflow-y-auto rounded-b-none p-6 sm:max-w-lg sm:rounded-b-xl">
              <h2 className="text-xl">Cookie preferences</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Choose which categories you allow. Your choice is stored for 12 months and can be changed at any time.</p>
              <div className="mt-5 space-y-3">
                {CATEGORIES.map((c) => (
                  <label key={c.key} className={cn('flex items-start justify-between gap-4 rounded-lg border p-4', c.locked && 'opacity-90')} style={{ borderColor: 'var(--border)' }}>
                    <span><span className="block text-sm font-semibold">{c.name}{c.locked && <span className="ml-2 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Always on</span>}</span><span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.desc}</span></span>
                    <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-primary)]" checked={c.locked ? true : prefs[c.key as keyof typeof prefs]} disabled={c.locked} onChange={(e) => !c.locked && setPrefs({ ...prefs, [c.key]: e.target.checked })} />
                  </label>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button onClick={rejectAll} className="btn btn-secondary">Reject non-essential</button>
                <button onClick={() => decide(prefs)} className="btn btn-secondary">Save preferences</button>
                <button onClick={acceptAll} className="btn btn-primary">Accept all</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
