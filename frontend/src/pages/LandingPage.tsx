import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { ArrowRight, BookOpen, Users, PenSquare, Check } from 'lucide-react'
import { TopBar } from '@/components/layout/AppShell'
import { BookCover } from '@/components/book/BookCover'
import { Avatar, AvatarStack } from '@/components/ui'
import { StoryCard } from '@/components/story/StoryCard'
import { useBooksByIds } from '@/hooks/useBooks'
import { MOSAIC_IDS, TESTIMONIALS, TRENDING_IDS } from '@/data/seed'
import { useAuth } from '@/store/authStore'
import { useUI } from '@/store/readerStore'
import { coverUrlFor } from '@/services/gutenberg'
import { faqJsonLd, orgJsonLd, useSEO } from '@/lib/seo'
import { useStats, useStories, useSuggested } from '@/hooks/useCommunity'
import { usePeople } from '@/store/peopleStore'

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now(); const dur = 1200
    const tick = (t: number) => { const p = Math.min(1, (t - start) / dur); setV(Math.floor(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }, [inView, to])
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>
}

const FAQS: [string, string][] = [
  ['What is BookVerse?', 'BookVerse is a free reading platform. It combines a distraction-free e-book reader, a catalogue of more than 75,000 public-domain books, book clubs, live reading rooms, a reading diary and self-publishing tools for writers.'],
  ['Is BookVerse really free?', 'Yes. Every book in the catalogue is in the public domain and free to read. Creating an account, joining clubs and publishing your own book are free too. There is no subscription and no card required.'],
  ['Where do the books come from?', 'The classics come from Project Gutenberg, a volunteer project that digitises books whose copyright has expired in the United States. Newer titles are published on BookVerse by their authors.'],
  ['Can I publish my own book?', 'Yes. Upload a cover and your chapters from the Publish page. Your book appears in the catalogue and opens in the same reader as the classics. You keep all rights.'],
  ['Does it work on my phone?', 'Yes. BookVerse is a responsive web app that works in any modern browser on phones, tablets and desktops. Your reading position syncs with your account.'],
]

export default function LandingPage() {
  const user = useAuth((s) => s.user)
  const lang = useUI((s) => s.lang)
  const nav = useNavigate()
  const [t, setT] = useState(0)
  const [email, setEmail] = useState('')
  const trending = useBooksByIds(TRENDING_IDS)
  useSEO({ path: '/', jsonLd: [orgJsonLd(), faqJsonLd(FAQS)] })
  const stats = useStats().data
  const people = useSuggested().data ?? []
  const stories = (useStories().data ?? []).slice(0, 3)
  const person = usePeople(stories.map((s) => s.authorId))
  useEffect(() => { const id = setInterval(() => setT((x) => (x + 1) % TESTIMONIALS.length), 5200); return () => clearInterval(id) }, [])
  const readersFor = (i: number) => people.length ? [people[i % people.length], people[(i + 2) % people.length], people[(i + 4) % people.length]] : []

  return (
    <div className="min-h-screen pt-14" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <TopBar search={false} />

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow mb-4">Free reading platform · 75,000+ books</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl leading-[1.05] sm:text-5xl md:text-6xl">Read. Connect. Remember.</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="mt-5 max-w-xl text-[17px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A reading room, a diary and a bookshop in one place. Read the classics for free, publish your own work, and talk about books with people who care.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={user ? '/home' : '/register'} className="btn btn-primary btn-lg">Start reading free <ArrowRight size={16} /></Link>
            <Link to="/discover" className="btn btn-secondary btn-lg">Browse the catalogue</Link>
          </motion.div>
          <ul className="mt-7 grid gap-2 text-sm sm:grid-cols-2" style={{ color: 'var(--text-secondary)' }}>
            {['No subscription, ever', 'Reader with highlights & notes', 'Book clubs and live rooms', 'Publish your own book'].map((x) => <li key={x} className="flex items-center gap-2"><Check size={15} style={{ color: 'var(--accent-primary)' }} />{x}</li>)}
          </ul>
          <div className="mt-8 flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <AvatarStack users={people.slice(0, 5)} size={28} max={5} />
            <span><strong style={{ color: 'var(--text-primary)' }}>{(stats?.members ?? 0).toLocaleString()}</strong> members and counting</span>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative hidden lg:block">
          <div className="grid grid-cols-4 items-start gap-3">
            {MOSAIC_IDS.slice(0, 12).map((id, i) => (
              <Link key={id} to={`/books/${id}`} className="cover-3d self-start overflow-hidden rounded-md shadow-cover" style={{ marginTop: i % 4 === 1 || i % 4 === 3 ? 24 : 0 }}>
                <img src={coverUrlFor(id)} alt="" loading={i < 8 ? 'eager' : 'lazy'} className="aspect-[2/3] w-full object-cover" />
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Reading right now */}
      <section className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="mb-5 flex items-end justify-between">
            <div><p className="eyebrow mb-1">Right now</p><h2 className="text-2xl md:text-3xl">Books people are reading tonight</h2></div>
            <Link to="/discover" className="btn btn-ghost btn-sm hidden sm:inline-flex">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">
            {(trending.data ?? []).map((b, i) => (
              <Link key={b.id} to={`/books/${b.id}`} className="w-[150px] shrink-0 md:w-[170px]">
                <div className="cover-3d cover-shadow rounded-md"><BookCover book={b} rounded="rounded-md" /></div>
                {readersFor(i).length > 0 && <div className="mt-3 flex items-center gap-2"><AvatarStack users={readersFor(i)} size={20} max={3} /><span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>popular this week</span></div>}
                <p className="mt-1.5 truncate text-sm font-semibold">{b.title}</p>
                <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{b.authorName}</p>
              </Link>
            ))}
            {trending.isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3] w-[150px] shrink-0 md:w-[170px]" />)}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { I: BookOpen, title: 'A reader built for long books', body: 'Four themes, your fonts, highlights in colour, notes and bookmarks. It remembers your place on every device.' },
            { I: Users, title: 'Clubs, rooms and debates', body: 'Chapter-locked discussions so nobody spoils the ending, live read-along rooms, and debates with real percentages.' },
            { I: PenSquare, title: 'Publish your own book', body: 'Upload a cover and chapters. Your book sits beside the classics in the same reader, and you keep every right.' },
          ].map(({ I, title, body }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}><I size={20} /></span>
              <h3 className="mt-4 text-lg">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-4xl px-5 pb-16 text-center">
        <div className="relative min-h-[150px]">
          <AnimatePresence mode="wait">
            <motion.blockquote key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
              <p className="font-title text-2xl italic leading-snug md:text-3xl">“{TESTIMONIALS[t].quote}”</p>
              <footer className="mt-4 flex items-center justify-center gap-3 text-sm">{people[t] && <Avatar user={people[t]} size={28} />}<span className="font-semibold">{people[t]?.displayName ?? TESTIMONIALS[t].who}</span><span style={{ color: 'var(--text-muted)' }}>· {TESTIMONIALS[t].role}</span></footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">{TESTIMONIALS.map((_, i) => <button key={i} onClick={() => setT(i)} aria-label={`Quote ${i + 1}`} className="h-1.5 rounded-full transition-all" style={{ width: i === t ? 20 : 6, background: i === t ? 'var(--text-primary)' : 'var(--border-strong)' }} />)}</div>
      </section>

      {/* Stories */}
      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div><p className="eyebrow mb-1">Community writing</p><h2 className="text-2xl md:text-3xl">Written here, read everywhere</h2></div>
          <Link to="/stories" className="btn btn-ghost btn-sm hidden sm:inline-flex">All stories <ArrowRight size={14} /></Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">{stories.map((s) => <StoryCard key={s.id} story={s} author={person(s.authorId)} />)}</div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-16 md:px-8" id="faq">
        <p className="eyebrow mb-1">Questions</p>
        <h2 className="text-2xl md:text-3xl">Frequently asked</h2>
        <div className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
          {FAQS.map(([q, a]) => <details key={q} className="py-4"><summary className="cursor-pointer list-none text-[15px] font-semibold">{q}</summary><p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p></details>)}
        </div>
        <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>More in the <Link to="/help" className="underline">Help centre</Link> or read <Link to="/about" className="underline">about BookVerse</Link>.</p>
      </section>

      {/* Numbers */}
      <section className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-6 border-y py-10 sm:grid-cols-3" style={{ borderColor: 'var(--border)' }}>
          {[{ n: stats?.books ?? 75000, s: '+', l: 'Free books' }, { n: stats?.members ?? 0, s: '', l: 'Members' }, { n: stats?.reviews ?? 0, s: '', l: 'Reviews written' }].map((c) => (
            <div key={c.l} className="text-center"><p className="text-4xl font-bold md:text-5xl"><Counter to={c.n} suffix={c.s} /></p><p className="eyebrow mt-2">{c.l}</p></div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="rounded-2xl px-6 py-12 text-center md:px-12 md:py-16" style={{ background: 'var(--accent-primary)', color: '#fff' }}>
          <h2 className="text-3xl md:text-5xl">Your next favourite book is already free.</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] opacity-90">Create an account in ten seconds. No card, no trial.</p>
          <form onSubmit={(e) => { e.preventDefault(); nav(`/register?email=${encodeURIComponent(email)}`) }} className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="input flex-1 rounded-full" style={{ background: '#fff', color: '#1c1c1c', border: 0 }} />
            <button className="btn btn-lg" style={{ background: '#fff', color: 'var(--accent-primary)' }}>Create account</button>
          </form>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-4 md:px-8">
          <div><p className="text-lg font-extrabold">BookVerse</p><p className="mt-2 max-w-xs text-sm" style={{ color: 'var(--text-secondary)' }}>Read. Connect. Remember. Public-domain texts courtesy of Project Gutenberg volunteers.</p></div>
          {[
            { h: 'Explore', l: [['Discover', '/discover'], ['Stories', '/stories'], ['Community', '/community'], ['Challenges', '/challenges']] },
            { h: 'Create', l: [['Publish a book', '/publish'], ['Write a story', '/stories/write'], ['Start a club', '/community?tab=clubs']] },
            { h: 'Company', l: [['About', '/about'], ['Help centre', '/help'], ['Terms of service', '/legal/terms'], ['Privacy policy', '/legal/privacy'], ['Cookie policy', '/legal/cookies']] },
          ].map((c) => <div key={c.h}><p className="eyebrow mb-3">{c.h}</p><ul className="space-y-2 text-sm">{c.l.map(([t, to]) => <li key={to}><Link to={to} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{t}</Link></li>)}</ul></div>)}
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-8 text-xs md:px-8" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} BookVerse. All rights reserved.</div>
      </footer>
    </div>
  )
}
