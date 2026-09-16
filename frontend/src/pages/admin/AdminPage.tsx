import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, ExternalLink, Flag, LayoutDashboard, Shield, ShieldCheck, ShieldOff, Star, Trash2, Users } from 'lucide-react'
import { Avatar, Modal, Tabs, toast } from '@/components/ui'
import { useAuth } from '@/store/authStore'
import { useBook } from '@/hooks/useBooks'
import { api } from '@/services/api'
import { cn, formatNumber, minutesLabel, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'
import type { User } from '@/types/community'

type Tab = 'overview' | 'users' | 'content' | 'reports'
interface Stats { today: Record<string, number>; week: Record<string, number>; totals: Record<string, number>; series: { day: string; signups: number; readers: number; minutes: number; activity: number }[]; topBooks: { bookId: number; readers: number; minutes: number }[]; topClubs: { id: string; name: string; members: number; coverColor: string; coverEmoji: string }[] }
interface AdminUser extends User { email: string; isAdmin: boolean; isActive: boolean; createdAt: string; emailVerified: boolean }
interface ContentItem { id: string; type: string; summary: string; url: string; owner?: User; createdAt?: string; featured?: boolean | null; live?: boolean | null; pinned?: boolean | null }
interface ReportItem { id: string; contentType: string; contentId: string; reason: string; details?: string; status: string; snapshot?: string; createdAt: string; reporter?: User; owner?: User; exists: boolean; url?: string; resolvedBy?: User; resolvedAt?: string }

const CONTENT_TYPES = ['story', 'book', 'review', 'thread', 'reply', 'message', 'diary', 'club', 'room']

function Sparkline({ values, color = 'var(--accent-primary)' }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values)
  return <div className="flex h-12 items-end gap-[3px]">{values.map((v, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: color, opacity: 0.35 + (i / values.length) * 0.65 }} title={`${v}`} />)}</div>
}

function TopBook({ id, readers, minutes }: { id: number; readers: number; minutes: number }) {
  const { data } = useBook(id)
  return <li className="flex items-center justify-between gap-3 text-sm"><Link to={data ? bookPath(data) : `/books/${id}`} className="truncate font-medium">{data?.title ?? `#${id}`}</Link><span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{readers} readers · {minutesLabel(minutes)}</span></li>
}

export default function AdminPage() {
  useSEO({ title: 'Admin', noindex: true })
  const me = useAuth((s) => s.user)
  const ready = useAuth((s) => s.ready)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'overview'
  if (ready && !me?.isAdmin) return <Navigate to="/home" replace />
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}><Shield size={18} /></span><div><p className="eyebrow">Staff only</p><h1 className="text-3xl">Admin</h1></div></div>
      <Tabs<Tab> value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'users', label: 'Users' }, { key: 'content', label: 'Content' }, { key: 'reports', label: 'Reports' }]} />
      <div className="pt-6">
        {tab === 'overview' && <Overview />}
        {tab === 'users' && <UsersTab meId={me?.id} />}
        {tab === 'content' && <ContentTab />}
        {tab === 'reports' && <ReportsTab />}
      </div>
    </div>
  )
}

function Overview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get<Stats>('/api/admin/stats'), staleTime: 30_000 })
  if (isLoading || !data) return <div className="skeleton h-64" />
  const tiles = [['New users today', data.today.newUsers, `${data.week.newUsers} this week`], ['Active readers today', data.today.activeReaders, `${formatNumber(data.totals.activeUsers)} active accounts`], ['Reviews today', data.today.reviews, `${data.week.reviews} this week`], ['Stories today', data.today.stories, `${data.week.stories} this week`], ['Books published today', data.today.booksPublished, `${data.totals.books} total`], ['Pending reports', data.today.pendingReports, data.today.pendingReports ? 'needs attention' : 'all clear']]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{tiles.map(([l, v, s]) => <div key={String(l)} className="card p-4"><p className="eyebrow">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s}</p></div>)}</div>
      <div className="grid gap-4 md:grid-cols-2">
        {[['Sign-ups, last 14 days', data.series.map((s) => s.signups), 'var(--accent-primary)'], ['Active readers per day', data.series.map((s) => s.readers), '#2F5D8A'], ['Reading minutes per day', data.series.map((s) => s.minutes), '#C8962B'], ['Community activity per day', data.series.map((s) => s.activity), '#7A4B8A']].map(([t, v, c]) => (
          <div key={String(t)} className="card p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{t}</p><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(v as number[]).reduce((a, b) => a + b, 0)} total</span></div><Sparkline values={v as number[]} color={c as string} /><div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}><span>{data.series[0].day.slice(5)}</span><span>today</span></div></div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5"><p className="mb-3 text-sm font-semibold">Most-read books</p><ul className="space-y-2">{data.topBooks.map((b) => <TopBook key={b.bookId} id={b.bookId} readers={b.readers} minutes={b.minutes} />)}{data.topBooks.length === 0 && <li className="text-xs" style={{ color: 'var(--text-muted)' }}>No reading yet.</li>}</ul></div>
        <div className="card p-5"><p className="mb-3 text-sm font-semibold">Most active clubs</p><ul className="space-y-2">{data.topClubs.map((c) => <li key={c.id} className="flex items-center gap-3 text-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: c.coverColor }}>{c.coverEmoji}</span><Link to={`/community/clubs/${c.id}`} className="flex-1 truncate font-medium">{c.name}</Link><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.members} members</span></li>)}</ul></div>
      </div>
      <div className="card p-5"><p className="mb-3 text-sm font-semibold">Totals</p><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-8">{Object.entries(data.totals).map(([k, v]) => <div key={k}><p className="text-xl font-bold">{formatNumber(v)}</p><p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</p></div>)}</div></div>
    </div>
  )
}

function UsersTab({ meId }: { meId?: string }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({ queryKey: ['admin-users', q, status, page], queryFn: () => api.get<{ users: AdminUser[]; total: number; pages: number }>(`/api/admin/users?q=${encodeURIComponent(q)}&status=${status}&page=${page}`) })
  const [confirm, setConfirm] = useState<{ u: AdminUser; action: 'ban' | 'unban' | 'admin' | 'unadmin' } | null>(null)
  const patch = async (u: AdminUser, body: Record<string, boolean>) => { try { await api.patch(`/api/admin/users/${u.id}`, body); qc.invalidateQueries({ queryKey: ['admin-users'] }); toast('Updated') } catch (e) { toast((e as Error).message, 'error') } }
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2"><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search name, username or email" className="input max-w-sm" />{['all', 'admins', 'banned'].map((s) => <button key={s} onClick={() => { setStatus(s); setPage(1) }} className={cn('chip capitalize', status === s && 'chip-active')}>{s}</button>)}<span className="ml-auto self-center text-xs" style={{ color: 'var(--text-muted)' }}>{data?.total ?? 0} accounts</span></div>
      <div className="card-flat overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}><th className="p-3">Member</th><th className="p-3">Email</th><th className="p-3">Joined</th><th className="p-3">Activity</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {(data?.users ?? []).map((u) => (
              <tr key={u.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="p-3"><Link to={`/u/${u.username}`} className="flex items-center gap-2"><Avatar user={u} size={28} /><span><span className="block font-medium">{u.displayName}{u.isAdmin && <ShieldCheck size={12} className="ml-1 inline" style={{ color: 'var(--accent-primary)' }} />}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>u/{u.username}</span></span></Link></td>
                <td className="p-3 text-xs">{u.email}{!u.emailVerified && <span className="ml-1 rounded px-1 text-[9px] font-semibold uppercase" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>unverified</span>}</td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(u.createdAt)}</td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>{u.booksRead} read · {u.reviews} reviews · {u.followers} followers</td>
                <td className="p-3">{u.isActive ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}>Active</span> : <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: '#FDECEC', color: 'var(--accent-tertiary)' }}>Banned</span>}</td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <button title={u.isVerified ? 'Remove verified badge' : 'Verify'} onClick={() => patch(u, { isVerifiedBadge: !u.isVerified })} className={cn('btn btn-ghost btn-icon h-8 w-8', u.isVerified && 'text-[var(--accent-primary)]')}><Star size={14} /></button>
                  {u.id !== meId && <button title={u.isAdmin ? 'Remove admin' : 'Make admin'} onClick={() => setConfirm({ u, action: u.isAdmin ? 'unadmin' : 'admin' })} className="btn btn-ghost btn-icon h-8 w-8"><Shield size={14} /></button>}
                  {u.id !== meId && <button title={u.isActive ? 'Ban' : 'Unban'} onClick={() => setConfirm({ u, action: u.isActive ? 'ban' : 'unban' })} className="btn btn-ghost btn-icon h-8 w-8" style={{ color: u.isActive ? 'var(--accent-tertiary)' : 'var(--accent-primary)' }}><ShieldOff size={14} /></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data?.pages ?? 1) > 1 && <div className="mt-3 flex justify-end gap-2">{Array.from({ length: data!.pages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={cn('chip', page === i + 1 && 'chip-active')}>{i + 1}</button>)}</div>}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? { ban: 'Ban this account?', unban: 'Restore this account?', admin: 'Grant admin access?', unadmin: 'Remove admin access?' }[confirm.action] : ''}>
        {confirm && <><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{confirm.action === 'ban' ? `${confirm.u.displayName} will be logged out everywhere and unable to sign in. Their public content stays visible.` : confirm.action === 'admin' ? `${confirm.u.displayName} will be able to see this panel, ban users and remove any content.` : `Confirm for ${confirm.u.displayName}.`}</p>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirm(null)} className="btn btn-ghost">Cancel</button><button onClick={() => { const b: Record<string, boolean> = confirm.action === 'ban' ? { isActive: false } : confirm.action === 'unban' ? { isActive: true } : { isAdmin: confirm.action === 'admin' }; patch(confirm.u, b); setConfirm(null) }} className={cn('btn', confirm.action === 'ban' ? '' : 'btn-primary')} style={confirm.action === 'ban' ? { background: 'var(--accent-tertiary)', color: '#fff' } : undefined}>Confirm</button></div></>}
      </Modal>
    </div>
  )
}

function ContentTab() {
  const qc = useQueryClient()
  const [type, setType] = useState('story')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({ queryKey: ['admin-content', type, page], queryFn: () => api.get<{ items: ContentItem[]; total: number; pages: number }>(`/api/admin/content?type=${type}&page=${page}`) })
  const act = async (item: ContentItem, action: string) => {
    if (action === 'delete' && !confirm('Remove this permanently? The author will be notified.')) return
    try { await api.post(`/api/admin/content/${item.type}/${item.id}`, { action }); qc.invalidateQueries({ queryKey: ['admin-content'] }); toast('Done') } catch (e) { toast((e as Error).message, 'error') }
  }
  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">{CONTENT_TYPES.map((t) => <button key={t} onClick={() => { setType(t); setPage(1) }} className={cn('chip shrink-0 capitalize', type === t && 'chip-active')}>{t}{t.endsWith('y') ? '' : 's'}</button>)}<span className="ml-auto shrink-0 self-center text-xs" style={{ color: 'var(--text-muted)' }}>{data?.total ?? 0} items</span></div>
      <div className="space-y-2">
        {isLoading && <div className="skeleton h-40" />}
        {(data?.items ?? []).map((it) => (
          <div key={it.id} className="card flex flex-wrap items-start gap-3 p-4">
            {it.owner && <Link to={`/u/${it.owner.username}`}><Avatar user={it.owner} size={32} /></Link>}
            <div className="min-w-0 flex-1"><p className="text-sm">{it.summary}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{it.owner?.displayName ?? 'Unknown'} · {it.createdAt ? timeAgo(it.createdAt) : ''}{it.featured ? ' · Featured' : ''}{it.live ? ' · Live' : ''}{it.pinned ? ' · Pinned' : ''}</p></div>
            <div className="flex gap-1">
              <Link to={it.url} className="btn btn-ghost btn-icon h-8 w-8" title="Open"><ExternalLink size={14} /></Link>
              {it.featured != null && <button onClick={() => act(it, it.featured ? 'unfeature' : 'feature')} className={cn('btn btn-ghost btn-icon h-8 w-8', it.featured && 'text-[var(--accent-secondary)]')} title="Feature"><Star size={14} /></button>}
              {it.pinned != null && <button onClick={() => act(it, it.pinned ? 'unpin' : 'pin')} className="btn btn-ghost btn-sm">{it.pinned ? 'Unpin' : 'Pin'}</button>}
              {it.live && <button onClick={() => act(it, 'end')} className="btn btn-ghost btn-sm">End room</button>}
              <button onClick={() => act(it, 'delete')} className="btn btn-ghost btn-icon h-8 w-8" style={{ color: 'var(--accent-tertiary)' }} title="Remove"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!isLoading && data?.items.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing here.</p>}
      </div>
      {(data?.pages ?? 1) > 1 && <div className="mt-3 flex justify-end gap-2">{Array.from({ length: data!.pages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={cn('chip', page === i + 1 && 'chip-active')}>{i + 1}</button>)}</div>}
    </div>
  )
}

function ReportsTab() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('pending')
  const { data, isLoading } = useQuery({ queryKey: ['admin-reports', status], queryFn: () => api.get<ReportItem[]>(`/api/admin/reports?status=${status}`), refetchInterval: 30_000 })
  const act = async (r: ReportItem, action: 'remove' | 'dismiss') => {
    if (action === 'remove' && !confirm(r.contentType === 'user' ? 'Ban this account?' : 'Remove this content? The author will be notified.')) return
    try { await api.post(`/api/admin/reports/${r.id}`, { action }); qc.invalidateQueries({ queryKey: ['admin-reports'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast(action === 'remove' ? 'Removed and resolved' : 'Dismissed') } catch (e) { toast((e as Error).message, 'error') }
  }
  return (
    <div>
      <div className="mb-4 flex gap-2">{['pending', 'resolved', 'dismissed', 'all'].map((s) => <button key={s} onClick={() => setStatus(s)} className={cn('chip capitalize', status === s && 'chip-active')}>{s}</button>)}</div>
      <div className="space-y-3">
        {isLoading && <div className="skeleton h-32" />}
        {(data ?? []).map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}><Flag size={12} style={{ color: 'var(--accent-tertiary)' }} /><span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{r.reason}</span> · {r.contentType} · reported {timeAgo(r.createdAt)}{r.reporter && <> by <Link to={`/u/${r.reporter.username}`} className="underline">{r.reporter.displayName}</Link></>}<span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', r.status === 'pending' ? 'bg-[#FDECEC] text-[var(--accent-tertiary)]' : 'bg-[var(--bg-secondary)]')}>{r.status}</span></div>
            {r.details && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>“{r.details}”</p>}
            <blockquote className="mt-3 rounded-lg border-l-2 px-3 py-2 text-sm" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-secondary)' }}>{r.snapshot}{!r.exists && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>(already removed)</span>}</blockquote>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {r.owner && <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><Avatar user={r.owner} size={18} /> by <Link to={`/u/${r.owner.username}`} className="underline">{r.owner.displayName}</Link></span>}
              {r.url && r.exists && <Link to={r.url} className="btn btn-ghost btn-sm"><ExternalLink size={12} /> View</Link>}
              {r.status === 'pending' && <span className="ml-auto flex gap-2"><button onClick={() => act(r, 'dismiss')} className="btn btn-secondary btn-sm">Dismiss</button><button onClick={() => act(r, 'remove')} className="btn btn-sm" style={{ background: 'var(--accent-tertiary)', color: '#fff' }}>{r.contentType === 'user' ? 'Ban account' : 'Remove content'}</button></span>}
              {r.status !== 'pending' && r.resolvedBy && <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{r.status} by {r.resolvedBy.displayName} {r.resolvedAt ? timeAgo(r.resolvedAt) : ''}</span>}
            </div>
          </div>
        ))}
        {!isLoading && data?.length === 0 && <div className="card p-10 text-center"><ShieldCheck size={28} className="mx-auto" style={{ color: 'var(--accent-primary)' }} /><p className="mt-2 text-sm font-semibold">Nothing {status === 'all' ? 'reported yet' : status}</p></div>}
      </div>
    </div>
  )
}

export { BookOpen, LayoutDashboard, Users }
