import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { Avatar, EmptyState } from '@/components/ui'
import { useLibrary } from '@/store/libraryStore'
import { usePeople } from '@/store/peopleStore'
import { cn, timeAgo } from '@/lib/utils'
import { useSEO } from '@/lib/seo'
import type { Notification } from '@/types/community'

const ICON: Record<string, string> = { like: '❤️', comment: '💬', follow: '👋', finished: '📕', chapter: '🪶', club: '🕯️', debate: '⚖️', streak: '🔥', digest: '📬' }
const GROUP: Record<string, string> = { like: 'Reactions', comment: 'Reactions', follow: 'People', finished: 'People', chapter: 'Writers you follow', club: 'Clubs & debates', debate: 'Clubs & debates', streak: 'You', digest: 'You' }

export default function NotificationsPage() {
  useSEO({ title: 'Notifications', noindex: true })
  const notifications = useLibrary((s) => s.notifications)
  const load = useLibrary((s) => s.loadNotifications)
  const markRead = useLibrary((s) => s.markRead)
  useEffect(() => { load().catch(() => {}) }, [load])
  const person = usePeople(notifications.map((n) => n.fromUserId))
  const unread = notifications.filter((n) => !n.isRead).length
  const groups = notifications.reduce<Record<string, Notification[]>>((acc, n) => ((acc[GROUP[n.type] ?? 'Other'] ??= []).push(n), acc), {})

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-end justify-between">
        <div><p className="eyebrow mb-1">{unread ? `${unread} unread` : 'All caught up'}</p><h1 className="text-3xl">Notifications</h1></div>
        {unread > 0 && <button onClick={() => markRead()} className="btn btn-secondary btn-sm"><CheckCheck size={14} /> Mark all read</button>}
      </div>
      {notifications.length === 0 ? <EmptyState icon={<Bell />} title="Quiet in here" body="When someone follows you, likes your review or replies to your thread, you'll hear about it." /> : (
        <div className="space-y-8">
          {Object.entries(groups).map(([g, items]) => (
            <section key={g}>
              <p className="eyebrow mb-3">{g}</p>
              <div className="card-flat divide-y overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {items.map((n) => (
                  <Link key={n.id} to={n.actionUrl} onClick={() => markRead(n.id)} className={cn('flex items-start gap-4 p-4 transition-colors hover:bg-[var(--bg-secondary)]', !n.isRead && 'bg-[var(--bg-elev)]')}>
                    <span className="relative shrink-0">{n.fromUserId ? <Avatar user={person(n.fromUserId)} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ background: 'var(--bg-secondary)' }}>{ICON[n.type] ?? '•'}</span>}{n.fromUserId && <span className="absolute -bottom-1 -right-1 text-sm">{ICON[n.type]}</span>}</span>
                    <span className="min-w-0 flex-1 text-sm"><span className={cn('block', !n.isRead && 'font-semibold')}>{n.title}</span><span className="block truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{n.body}</span></span>
                    <span className="flex shrink-0 flex-col items-end gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}{!n.isRead && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
