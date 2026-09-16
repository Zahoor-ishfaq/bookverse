import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { type LucideIcon, Bell, BookOpen, ChevronDown, Compass, Feather, Home, Library, LogOut, Menu, Moon, NotebookPen, PenSquare, Plus, Search, Settings, Sun, Trophy, Users, Languages, X, MessageSquare, Scale, Radio, HelpCircle, FileText, Shield, Cookie, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/store/authStore'
import { useLibrary } from '@/store/libraryStore'
import { useUI } from '@/store/readerStore'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'
import { openCookieSettings } from '@/components/legal/CookieConsent'
import { BrandLockup } from './BrandMark'
import { useClubs } from '@/hooks/useCommunity'

export function Logo({ className, compact }: { className?: string; compact?: boolean; light?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center', className)} aria-label="BookVerse home">
      <BrandLockup size={30} wordmark={!compact} />
    </Link>
  )
}

function Section({ title, children, defaultOpen = true }: { title?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t py-3 first:border-t-0" style={{ borderColor: 'var(--border)' }}>
      {title && (
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 pb-1.5 pt-1">
          <span className="eyebrow">{title}</span>
          <ChevronDown size={14} className={cn('transition-transform', !open && '-rotate-90')} style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  )
}

function Item({ to, icon: Icon, children, onClick, end }: { to: string; icon: LucideIcon; children: ReactNode; onClick?: () => void; end?: boolean }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
      <Icon size={18} />{children}
    </NavLink>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user)
  const myClubs = useLibrary((s) => s.clubs)
  const { data: allClubs } = useClubs()
  const clubName = (id: string) => allClubs?.find((c) => c.id === id)?.name ?? '…'
  return (
    <nav className="px-3 py-3">
      <Section>
        <Item to="/home" icon={Home} onClick={onNavigate}>Home</Item>
        <Item to="/discover" icon={Compass} onClick={onNavigate}>Discover</Item>
        <Item to="/stories" icon={Feather} onClick={onNavigate}>Stories</Item>
      </Section>
      <Section title="Your library">
        <Item to="/shelf" icon={Library} onClick={onNavigate}>My shelf</Item>
        <Item to="/diary" icon={NotebookPen} onClick={onNavigate}>Reading diary</Item>
        <Item to="/publish" icon={PenSquare} onClick={onNavigate}>Publish a book</Item>
        {user && <Item to="/profile" icon={UserIcon} onClick={onNavigate}>Profile</Item>}
      </Section>
      {user?.isAdmin && (
        <Section title="Staff">
          <Item to="/admin" icon={Shield} onClick={onNavigate}>Admin panel</Item>
        </Section>
      )}
      <Section title="Community">
        <Item to="/community?tab=clubs" icon={Users} onClick={onNavigate}>Book clubs</Item>
        <Item to="/community?tab=rooms" icon={Radio} onClick={onNavigate}>Reading rooms</Item>
        <Item to="/community?tab=debates" icon={Scale} onClick={onNavigate}>Debates</Item>
        <Item to="/challenges" icon={Trophy} onClick={onNavigate}>Challenges</Item>
        {myClubs.length > 0 && <p className="eyebrow px-3 pb-1 pt-3">Your clubs</p>}
        {myClubs.slice(0, 4).map((id) => <Item key={id} to={`/community/clubs/${id}`} icon={MessageSquare} onClick={onNavigate}>{clubName(id)}</Item>)}
      </Section>
      <Section title="Resources" defaultOpen={false}>
        <Item to="/legal/terms" icon={FileText} onClick={onNavigate}>Terms of service</Item>
        <Item to="/legal/privacy" icon={Shield} onClick={onNavigate}>Privacy policy</Item>
        <Item to="/legal/cookies" icon={Cookie} onClick={onNavigate}>Cookie policy</Item>
        <button onClick={() => { openCookieSettings(); onNavigate?.() }} className="nav-item"><Settings size={18} />Cookie settings</button>
        <Item to="/help" icon={HelpCircle} onClick={onNavigate}>Help</Item>
        <Item to="/about" icon={BookOpen} onClick={onNavigate}>About BookVerse</Item>
      </Section>
      <p className="px-3 pt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>BookVerse © {new Date().getFullYear()}. Public-domain texts courtesy of Project Gutenberg.</p>
    </nav>
  )
}

export function TopBar({ onMenu, search = true }: { onMenu?: () => void; search?: boolean }) {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const { dark, toggleDark, lang, toggleLang } = useUI()
  const unread = useLibrary((s) => s.notifications.filter((n) => !n.isRead).length)
  const loadNotifications = useLibrary((s) => s.loadNotifications)
  useEffect(() => { if (!user) return; const t = window.setInterval(() => loadNotifications().catch(() => {}), 45_000); return () => window.clearInterval(t) }, [user, loadNotifications])
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => { setMenu(false) }, [loc.pathname, loc.search])
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent | TouchEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDown); document.addEventListener('touchstart', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); document.removeEventListener('keydown', onKey) }
  }, [menu])
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex h-full items-center gap-3 px-3 md:px-4">
        {onMenu && <button className="btn btn-ghost btn-icon lg:hidden" onClick={onMenu} aria-label="Menu"><Menu size={20} /></button>}
        <Logo />
        {search && (
          <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`) }} className="mx-auto hidden w-full max-w-xl items-center gap-2 rounded-full px-4 sm:flex" style={{ background: 'var(--bg-secondary)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books, people, stories" className="h-9 w-full bg-transparent text-sm outline-none" />
          </form>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Link to="/search" className="btn btn-ghost btn-icon sm:hidden" aria-label="Search"><Search size={19} /></Link>
          <Link to="/publish" className="btn btn-ghost btn-sm hidden gap-1.5 md:inline-flex"><Plus size={16} /> Publish</Link>
          <button onClick={toggleLang} className="btn btn-ghost btn-icon hidden sm:inline-flex" title="Language"><Languages size={18} /><span className="sr-only">{lang}</span></button>
          <button onClick={toggleDark} className="btn btn-ghost btn-icon" title="Theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <Link to="/notifications" className="btn btn-ghost btn-icon relative" aria-label="Notifications">
            <Bell size={18} />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: 'var(--accent-tertiary)' }}>{unread}</span>}
          </Link>
          {user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-[var(--bg-secondary)]">
                <Avatar user={user} size={30} />
                <ChevronDown size={14} className="hidden md:block" style={{ color: 'var(--text-muted)' }} />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div key="user-menu" role="menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="card absolute right-0 z-50 mt-2 w-64 overflow-hidden p-1.5 shadow-lift">
                    <div className="flex items-center gap-3 px-3 py-3"><Avatar user={user} size={40} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.displayName}</p><p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>u/{user.username}</p></div></div>
                    <div className="divider my-1" />
                    {[{ to: '/profile', l: 'View profile', I: UserIcon }, { to: '/shelf', l: 'My shelf', I: Library }, { to: '/publish', l: 'Publish a book', I: PenSquare }, { to: '/settings', l: 'Settings', I: Settings }, ...(user.isAdmin ? [{ to: '/admin', l: 'Admin panel', I: Shield }] : [])].map(({ to, l, I }) => (
                      <Link key={to} to={to} role="menuitem" onClick={() => setMenu(false)} className="nav-item"><I size={16} />{l}</Link>
                    ))}
                    <div className="divider my-1" />
                    <button role="menuitem" onClick={() => { setMenu(false); logout(); nav('/') }} className="nav-item w-full"><LogOut size={16} />Log out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm ml-1">Log in</Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function AppShell() {
  const lang = useUI((s) => s.lang)
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0 }) }, [loc.pathname, loc.search])

  return (
    <div className="min-h-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <TopBar onMenu={() => setDrawer(true)} />

      <aside className="sidebar-scroll fixed bottom-0 left-0 top-14 z-30 hidden w-[270px] overflow-y-auto border-r lg:block" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.4)' }} onClick={() => setDrawer(false)} />
            <motion.div className="absolute inset-y-0 left-0 w-[290px] overflow-y-auto" style={{ background: 'var(--bg-card)' }} initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
              <div className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: 'var(--border)' }}><Logo /><button onClick={() => setDrawer(false)} className="btn btn-ghost btn-icon"><X size={18} /></button></div>
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="px-4 pb-24 pt-20 md:px-8 lg:pb-12 lg:pl-[302px]">
        {/* Page-level Suspense: a lazy route must never suspend the shell itself,
            otherwise open menus/drawers get orphaned mid-transition. */}
        <Suspense fallback={<div className="mx-auto max-w-6xl space-y-4 pt-4"><div className="skeleton h-9 w-56" /><div className="skeleton h-4 w-80" /><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3]" />)}</div></div>}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t px-2 py-1.5 lg:hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {[{ to: '/home', l: 'Home', I: Home }, { to: '/discover', l: 'Discover', I: Compass }, { to: '/shelf', l: 'Shelf', I: Library }, { to: '/community', l: 'Community', I: Users }, { to: '/stories', l: 'Stories', I: Feather }].map(({ to, l, I }) => (
          <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium" style={({ isActive }) => ({ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' })}>
            <I size={21} />{l}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export { BookOpen }
