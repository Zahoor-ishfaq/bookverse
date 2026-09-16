import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Modal, toast } from '@/components/ui'
import { api } from '@/services/api'
import { useAuth } from '@/store/authStore'
import { cn } from '@/lib/utils'

const REASONS: [string, string][] = [
  ['spam', 'Spam or advertising'], ['harassment', 'Harassment or bullying'], ['hate', 'Hate speech'], ['sexual', 'Sexual content'],
  ['violence', 'Violence or self-harm'], ['copyright', 'Copyright infringement'], ['misinformation', 'Misinformation'], ['other', 'Something else'],
]

export function ReportButton({ type, id, className, label = 'Report' }: { type: string; id: string | number; className?: string; label?: string }) {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ ok: boolean; duplicate?: boolean }>('/api/reports', { contentType: type, contentId: String(id), reason, details: details.trim() || undefined })
      toast(r.duplicate ? 'You already reported this — thank you' : 'Report sent. Our moderators will review it.')
      setOpen(false); setDetails('')
    } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) }
  }
  return (
    <>
      <button onClick={() => (user ? setOpen(true) : toast('Log in to report content', 'info'))} className={cn('inline-flex items-center gap-1 text-xs hover:text-[var(--accent-tertiary)]', className)} title="Report this content"><Flag size={12} /> {label}</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report this content">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Reports are anonymous to the author. Our moderators review every report, usually within 48 hours.</p>
        <div className="mt-4 space-y-1.5">
          {REASONS.map(([k, l]) => <label key={k} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm', reason === k && 'border-[var(--accent-primary)]')} style={{ borderColor: reason === k ? undefined : 'var(--border)' }}><input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} className="accent-[var(--accent-primary)]" />{l}</label>)}
        </div>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder="Anything else the moderators should know (optional)" className="input mt-3 resize-none" />
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn" style={{ background: 'var(--accent-tertiary)', color: '#fff' }}>{busy ? 'Sending…' : 'Send report'}</button></div>
      </Modal>
    </>
  )
}
