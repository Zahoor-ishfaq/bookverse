import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '@/components/layout/AppShell'
import { toast } from '@/components/ui'
import { useAuth } from '@/store/authStore'
import { useUI } from '@/store/readerStore'
import { googleConfigured, renderGoogleButton, type GoogleProfile } from '@/services/google'
import { api } from '@/services/api'
import { coverUrlFor } from '@/services/gutenberg'
import { MOSAIC_IDS } from '@/data/seed'
import { useSEO } from '@/lib/seo'

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
}

function GoogleButton({ onCredential, disabled, disabledReason }: { onCredential: (credential: string) => void; disabled?: boolean; disabledReason?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [native, setNative] = useState(false)
  useEffect(() => {
    if (!ref.current || !googleConfigured || disabled) return
    renderGoogleButton(ref.current, (p: GoogleProfile & { credential?: string }) => p.credential && onCredential(p.credential)).then((ok) => setNative(ok)).catch(() => setNative(false))
  }, [onCredential, disabled])
  return (
    <div className="relative">
      <div ref={ref} className={native ? 'flex justify-center' : 'hidden'} />
      {!native && (
        <button type="button" onClick={() => (disabled ? toast(disabledReason ?? 'Please accept the terms first', 'info') : toast('Google sign-in is temporarily unavailable. Please continue with email.', 'info'))} className="btn btn-secondary w-full gap-3">
          <GoogleMark /> Continue with Google
        </button>
      )}
    </div>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  const lang = useUI((s) => s.lang)
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col px-6 py-6 md:px-16">
        <Logo />
        <div className="my-auto w-full max-w-sm py-10">{children}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Link to="/legal/terms" className="hover:underline">Terms</Link><Link to="/legal/privacy" className="hover:underline">Privacy</Link><Link to="/legal/cookies" className="hover:underline">Cookies</Link><Link to="/help" className="hover:underline">Help</Link>
        </div>
      </div>
      <div className="hidden overflow-hidden lg:block" style={{ background: 'var(--bg-secondary)' }}>
        <div className="grid h-full grid-cols-5 gap-3 p-8" style={{ transform: 'rotate(-6deg) scale(1.15)', transformOrigin: 'center' }}>
          {MOSAIC_IDS.slice(0, 25).map((id, i) => <img key={id} src={coverUrlFor(id)} alt="" loading="lazy" className="aspect-[2/3] w-full rounded object-cover shadow-cover" style={{ marginTop: (i % 5) * 10, opacity: 0.9 }} />)}
        </div>
      </div>
    </div>
  )
}

function Divider() { return <div className="my-5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}><span className="divider flex-1" />or<span className="divider flex-1" /></div> }
function ErrorBox({ msg }: { msg: string | null }) { return msg ? <p role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: '#FDECEC', color: 'var(--accent-tertiary)' }}>{msg}</p> : null }

export function LoginPage() {
  useSEO({ title: 'Log in', noindex: true })
  const login = useAuth((s) => s.login)
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const after = (u: { onboardingCompleted: boolean }) => nav(params.get('next') ?? (u.onboardingCompleted ? '/home' : '/onboarding'))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true)
    try { after(await login(email, pw)) } catch (ex) { setErr((ex as Error).message) } finally { setBusy(false) }
  }
  return (
    <Frame>
      <h1 className="text-2xl">Log in</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>By continuing, you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and acknowledge our <Link to="/legal/privacy" className="underline">Privacy Policy</Link>.</p>
      {/* The notice above the button is the acceptance ("by continuing"), so a first-time Google sign-in here counts as agreeing. */}
      <div className="mt-6"><GoogleButton onCredential={(c) => loginWithGoogle(c, { acceptedTerms: true, marketingOptIn: false }).then(after).catch((ex) => setErr(ex.message))} /></div>
      <Divider />
      <form onSubmit={submit} className="space-y-3">
        <ErrorBox msg={err} />
        <div><label className="label">Email</label><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></div>
        <div><div className="flex items-center justify-between"><label className="label">Password</label><Link to="/forgot" className="mb-1.5 text-xs underline" style={{ color: 'var(--text-secondary)' }}>Forgot?</Link></div><input type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" /></div>
        <button disabled={busy} className="btn btn-primary w-full py-2.5">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>New to BookVerse? <Link to="/register" className="font-semibold underline" style={{ color: 'var(--text-primary)' }}>Sign up</Link></p>
    </Frame>
  )
}

export function RegisterPage() {
  useSEO({ title: 'Create your account', noindex: true })
  const register = useAuth((s) => s.register)
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [pw, setPw] = useState('')
  const [terms, setTerms] = useState(false)
  const [age, setAge] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ok = terms && age
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ok) return; setErr(null); setBusy(true)
    try { await register(name, email, pw, { acceptedTerms: terms, marketingOptIn: marketing }); nav('/onboarding') } catch (ex) { setErr((ex as Error).message) } finally { setBusy(false) }
  }
  return (
    <Frame>
      <h1 className="text-2xl">Create your account</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Free forever. No card required.</p>
      <div className="mt-6"><GoogleButton disabled={!ok} disabledReason="Please confirm the terms and your age below first" onCredential={(c) => loginWithGoogle(c, { acceptedTerms: terms, marketingOptIn: marketing }).then(() => nav('/onboarding')).catch((ex) => setErr(ex.message))} /></div>
      <Divider />
      <form onSubmit={submit} className="space-y-3">
        <ErrorBox msg={err} />
        <div><label className="label">Name</label><input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
        <div><label className="label">Email</label><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></div>
        <div><label className="label">Password</label><input type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" /><p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>At least 8 characters.</p></div>
        <div className="space-y-2.5 pt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <label className="flex items-start gap-2.5"><input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-primary)]" /><span>I agree to the <Link to="/legal/terms" className="underline" target="_blank">Terms of Service</Link> and have read the <Link to="/legal/privacy" className="underline" target="_blank">Privacy Policy</Link>. <span style={{ color: 'var(--accent-tertiary)' }}>*</span></span></label>
          <label className="flex items-start gap-2.5"><input type="checkbox" required checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-primary)]" /><span>I am at least 16 years old, or the minimum age of digital consent in my country. <span style={{ color: 'var(--accent-tertiary)' }}>*</span></span></label>
          <label className="flex items-start gap-2.5"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-primary)]" /><span>Send me the weekly reading digest and occasional news. Optional — unsubscribe any time.</span></label>
        </div>
        <button disabled={!ok || busy} className="btn btn-primary w-full py-2.5">{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Already have an account? <Link to="/login" className="font-semibold underline" style={{ color: 'var(--text-primary)' }}>Log in</Link></p>
    </Frame>
  )
}

export function ForgotPage() {
  useSEO({ title: 'Reset your password', noindex: true })
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <Frame>
      <h1 className="text-2xl">Reset your password</h1>
      {sent ? <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It is valid for two hours.</p> : (
        <form onSubmit={async (e) => { e.preventDefault(); await api.post('/api/auth/forgot', { email }).catch(() => {}); setSent(true) }} className="mt-4 space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your email and we'll send you a reset link.</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
          <button className="btn btn-primary w-full py-2.5">Send reset link</button>
        </form>
      )}
      <p className="mt-6 text-sm"><Link to="/login" className="underline">Back to log in</Link></p>
    </Frame>
  )
}

export function ResetPage() {
  useSEO({ title: 'Choose a new password', noindex: true })
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  return (
    <Frame>
      <h1 className="text-2xl">Choose a new password</h1>
      <form onSubmit={async (e) => { e.preventDefault(); setErr(null); try { const r = await api.post<{ accessToken: string; refreshToken: string; user: never }>('/api/auth/reset', { token: params.get('token'), password: pw }); localStorage.setItem('bookverse.session', JSON.stringify({ access: r.accessToken, refresh: r.refreshToken })); await useAuth.getState().init(); toast('Password updated'); nav('/home') } catch (ex) { setErr((ex as Error).message) } }} className="mt-4 space-y-3">
        <ErrorBox msg={err} />
        <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="New password (8+ characters)" />
        <button className="btn btn-primary w-full py-2.5">Update password</button>
      </form>
    </Frame>
  )
}

export function VerifyPage() {
  useSEO({ title: 'Verify email', noindex: true })
  const [params] = useSearchParams()
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working')
  useEffect(() => { api.post('/api/auth/verify', { token: params.get('token') }).then(() => { setState('ok'); useAuth.getState().init() }).catch(() => setState('error')) }, [params])
  return (
    <Frame>
      <h1 className="text-2xl">{state === 'working' ? 'Verifying…' : state === 'ok' ? 'Email verified' : 'Link expired'}</h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{state === 'ok' ? 'Thanks — your email address is confirmed.' : state === 'error' ? 'This verification link is invalid or has expired. You can request a new one from Settings.' : ''}</p>
      <Link to="/home" className="btn btn-primary mt-6">Continue</Link>
    </Frame>
  )
}
