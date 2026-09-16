import { useRef, useState } from 'react'
import { useSEO } from '@/lib/seo'
import { useNavigate } from 'react-router-dom'
import { Download, Globe, Instagram, Linkedin, Trash2, Youtube, BookMarked, Camera } from 'lucide-react'
import { Avatar, Modal, toast } from '@/components/ui'
import { openCookieSettings } from '@/components/legal/CookieConsent'
import { useAuth } from '@/store/authStore'
import { api } from '@/services/api'
import { useUI } from '@/store/readerStore'
import type { SocialLinks } from '@/types/community'

const COLORS = ['#1B6B4A', '#2F5D8A', '#7A4B8A', '#A0522D', '#3D6B6B', '#8A5A2F', '#1C1C1C']
const XIcon = ({ size = 16 }: { size?: number | string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-7-6.1 7H1.7l8-9.2L1 2h7l4.8 6.4L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z"/></svg>

export const LINK_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string; prefix?: string; Icon: React.ComponentType<{ size?: number | string }> }[] = [
  { key: 'website', label: 'Website', placeholder: 'https://yoursite.com', Icon: Globe },
  { key: 'x', label: 'X (Twitter)', placeholder: 'username', prefix: 'x.com/', Icon: XIcon },
  { key: 'instagram', label: 'Instagram', placeholder: 'username', prefix: 'instagram.com/', Icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'in/username', prefix: 'linkedin.com/', Icon: Linkedin },
  { key: 'goodreads', label: 'Goodreads', placeholder: 'user/show/123', prefix: 'goodreads.com/', Icon: BookMarked },
  { key: 'youtube', label: 'YouTube', placeholder: '@channel', prefix: 'youtube.com/', Icon: Youtube },
]

export function linkHref(key: keyof SocialLinks, value: string) {
  const v = value.trim().replace(/^@/, key === 'youtube' ? '@' : '')
  if (/^https?:\/\//i.test(v)) return v
  const base: Record<keyof SocialLinks, string> = { website: 'https://', x: 'https://x.com/', instagram: 'https://instagram.com/', linkedin: 'https://linkedin.com/', goodreads: 'https://goodreads.com/', youtube: 'https://youtube.com/' }
  return base[key] + v.replace(/^(x\.com|instagram\.com|linkedin\.com|goodreads\.com|youtube\.com)\//i, '')
}

async function fileToAvatar(file: File): Promise<File> {
  const bmp = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
  const s = Math.min(bmp.width, bmp.height)
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size)
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85))
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

export default function SettingsPage() {
  useSEO({ title: 'Settings', noindex: true })
  const user = useAuth((s) => s.user)
  const update = useAuth((s) => s.updateProfile)
  const deleteAccount = useAuth((s) => s.deleteAccount)
  const uploadAvatar = useAuth((s) => s.uploadAvatar)
  const nav = useNavigate()
  const { dark, toggleDark, lang, toggleLang } = useUI()
  const [form, setForm] = useState({ displayName: user?.displayName ?? '', headline: user?.headline ?? '', bio: user?.bio ?? '', location: user?.location ?? '', readingGoal: user?.readingGoal ?? 24, avatarColor: user?.avatarColor ?? COLORS[0], avatarUrl: user?.avatarUrl, username: user?.username ?? '' })
  const [links, setLinks] = useState<SocialLinks>(user?.links ?? {})
  const [digest, setDigest] = useState(user?.marketingOptIn ?? false)
  const [emails, setEmails] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [typed, setTyped] = useState('')
  const avatarRef = useRef<HTMLInputElement>(null)
  if (!user) return <div className="card mx-auto max-w-md p-10 text-center"><h2 className="text-xl">Log in to manage settings</h2><button onClick={() => nav('/login')} className="btn btn-primary mt-4">Log in</button></div>

  const exportData = async () => {
    try {
      const data = await api.get('/api/me/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bookverse-export-${new Date().toISOString().slice(0, 10)}.json`; a.click()
      toast('Your data export has started')
    } catch (e) { toast((e as Error).message, 'error') }
  }

  const Row = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{title}</p>{desc && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}</div><div className="shrink-0">{children}</div></div>
  )

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl">Settings</h1>
      <div className="mt-6 space-y-6">
        <section className="card p-6">
          <h2 className="text-lg">Profile</h2>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="relative">
              <Avatar user={{ displayName: form.displayName || 'You', avatarColor: form.avatarColor, avatarUrl: form.avatarUrl }} size={80} />
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const small = await fileToAvatar(f); await uploadAvatar(small); setForm((x) => ({ ...x, avatarUrl: useAuth.getState().user?.avatarUrl })); toast('Photo updated') } catch (err) { toast((err as Error).message, 'error') } }} />
              <button onClick={() => avatarRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border shadow-paper" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} aria-label="Change photo"><Camera size={14} /></button>
            </div>
            <div>
              <p className="text-sm font-semibold">Profile photo</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Square images work best. {form.avatarUrl && <button onClick={() => { setForm({ ...form, avatarUrl: undefined }); update({ avatarUrl: '' }) }} className="underline">Remove photo</button>}</p>
              {!form.avatarUrl && <div className="mt-2 flex gap-1.5">{COLORS.map((c) => <button key={c} onClick={() => setForm({ ...form, avatarColor: c })} className="h-6 w-6 rounded-full border-2" style={{ background: c, borderColor: form.avatarColor === c ? 'var(--text-primary)' : 'transparent' }} aria-label={c} />)}</div>}
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="label">Display name</label><input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input" /></div>
            <div><label className="label">Username</label><div className="input flex items-center gap-1 py-0"><span style={{ color: 'var(--text-muted)' }}>u/</span><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} className="h-10 w-full bg-transparent outline-none" /></div></div>
            <div className="sm:col-span-2"><label className="label">Headline</label><input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={80} className="input" placeholder="Author of… · Editor at… · Reads mostly history" /></div>
            <div className="sm:col-span-2"><label className="label">About</label><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} rows={3} className="input resize-none" /><p className="mt-1 text-right text-[11px]" style={{ color: 'var(--text-muted)' }}>{form.bio.length}/300</p></div>
            <div><label className="label">Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" /></div>
            <div><label className="label">Yearly reading goal</label><input type="number" min={1} max={365} value={form.readingGoal} onChange={(e) => setForm({ ...form, readingGoal: Number(e.target.value) })} className="input" /></div>
          </div>
          <h3 className="mt-7 text-sm font-semibold">Links</h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Shown on your public profile.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {LINK_FIELDS.map(({ key, label, placeholder, prefix, Icon }) => (
              <div key={key}><label className="label flex items-center gap-1.5"><Icon size={13} /> {label}</label><div className="input flex items-center gap-1 py-0">{prefix && <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{prefix}</span>}<input value={links[key] ?? ''} onChange={(e) => setLinks({ ...links, [key]: e.target.value })} placeholder={placeholder} className="h-10 w-full bg-transparent text-sm outline-none" /></div></div>
            ))}
          </div>
          <div className="mt-6 flex justify-end"><button onClick={async () => { try { const { avatarUrl, ...rest } = form; void avatarUrl; await update({ ...rest, links: Object.fromEntries(Object.entries(links).filter(([, v]) => v && v.trim())) }); toast('Profile saved') } catch (e) { toast((e as Error).message, 'error') } }} className="btn btn-primary">Save changes</button></div>
        </section>

        {!user.emailVerified && (
          <section className="card flex flex-wrap items-center justify-between gap-3 p-5" style={{ background: 'var(--bg-secondary)' }}>
            <div><p className="text-sm font-semibold">Verify your email</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>We sent a link to {user.email}. Verified accounts can recover their password.</p></div>
            <button onClick={() => api.post('/api/auth/resend-verification').then(() => toast('Verification email sent')).catch((e) => toast(e.message, 'error'))} className="btn btn-secondary btn-sm">Resend email</button>
          </section>
        )}
        <section className="card divide-y px-6 py-2" style={{ borderColor: 'var(--border)' }}>
          <h2 className="pt-4 text-lg">Preferences</h2>
          <Row title="Appearance" desc="Light or dark interface."><div className="flex rounded-full border p-0.5" style={{ borderColor: 'var(--border)' }}><button onClick={() => dark && toggleDark()} className={`btn btn-sm ${!dark ? 'chip-active' : 'btn-ghost'}`}>Light</button><button onClick={() => !dark && toggleDark()} className={`btn btn-sm ${dark ? 'chip-active' : 'btn-ghost'}`}>Dark</button></div></Row>
          <Row title="Language" desc="Interface language and reading direction."><button onClick={toggleLang} className="btn btn-secondary btn-sm">{lang === 'en' ? 'English' : 'العربية'}</button></Row>
          <Row title="Weekly digest" desc="A summary of your reading week and new chapters from writers you follow."><input type="checkbox" checked={digest} onChange={(e) => { setDigest(e.target.checked); update({ marketingOptIn: e.target.checked }) }} className="h-4 w-4 accent-[var(--accent-primary)]" /></Row>
          <Row title="Activity emails" desc="Replies, follows and club updates. Security emails are always sent."><input type="checkbox" checked={emails} onChange={(e) => setEmails(e.target.checked)} className="h-4 w-4 accent-[var(--accent-primary)]" /></Row>
        </section>

        <section className="card divide-y px-6 py-2" style={{ borderColor: 'var(--border)' }}>
          <h2 className="pt-4 text-lg">Privacy &amp; data</h2>
          <Row title="Cookie preferences" desc="Choose which optional cookies you allow."><button onClick={openCookieSettings} className="btn btn-secondary btn-sm">Manage</button></Row>
          <Row title="Download your data" desc="A copy of your profile, shelves, highlights, reviews and diary in JSON."><button onClick={exportData} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button></Row>
          <Row title="Delete account" desc="Permanently removes your account and data. This cannot be undone."><button onClick={() => setConfirmDelete(true)} className="btn btn-sm" style={{ background: 'var(--accent-tertiary)', color: '#fff' }}><Trash2 size={14} /> Delete</button></Row>
        </section>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your profile, shelves, highlights, reviews, diary and published books will be permanently deleted. Type <strong>DELETE</strong> to confirm.</p>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className="input mt-4" placeholder="DELETE" />
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirmDelete(false)} className="btn btn-ghost">Cancel</button><button disabled={typed !== 'DELETE'} onClick={async () => { try { await deleteAccount(); nav('/'); toast('Your account has been deleted', 'info') } catch (e) { toast((e as Error).message, 'error') } }} className="btn" style={{ background: 'var(--accent-tertiary)', color: '#fff' }}>Delete permanently</button></div>
      </Modal>
    </div>
  )
}
