import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, List, Quote, Settings2, StickyNote, X, Highlighter, BookA, Check } from 'lucide-react'
import { useBook, useBookText } from '@/hooks/useBooks'
import { useLibrary } from '@/store/libraryStore'
import { useReader, type ReaderFont, type ReaderTheme } from '@/store/readerStore'
import { toast } from '@/components/ui'
import { cn, minutesLabel } from '@/lib/utils'
import { readingMinutes } from '@/lib/parseBook'
import type { HighlightColor } from '@/types/book'

const FONT_STACK: Record<ReaderFont, string> = {
  Lora: "'Lora', Georgia, serif",
  Georgia: 'Georgia, serif',
  Inter: "'Inter', system-ui, sans-serif",
  System: 'system-ui, sans-serif',
}
const HL: Record<HighlightColor, string> = { yellow: 'rgba(224,184,76,.45)', green: 'rgba(127,154,122,.45)', blue: 'rgba(93,107,122,.35)', pink: 'rgba(199,122,135,.4)' }

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

export default function BookReaderPage() {
  const { id } = useParams()
  const bookId = Number(id)
  const nav = useNavigate()
  const { data: book } = useBook(bookId)
  const text = useBookText(book)
  const reader = useReader()
  const progress = useLibrary((s) => s.progress[bookId])
  const updateProgress = useLibrary((s) => s.updateProgress)
  const logMinutes = useLibrary((s) => s.logMinutes)
  const allHighlights = useLibrary((s) => s.highlights)
  const highlights = useMemo(() => allHighlights.filter((h) => h.bookId === bookId), [allHighlights, bookId])
  const addHighlight = useLibrary((s) => s.addHighlight)
  const allBookmarks = useLibrary((s) => s.bookmarks)
  const bookmarks = useMemo(() => allBookmarks.filter((b) => b.bookId === bookId), [allBookmarks, bookId])
  const toggleBookmark = useLibrary((s) => s.toggleBookmark)

  const [chapter, setChapter] = useState<number>(progress?.chapter ?? 0)
  const [uiVisible, setUiVisible] = useState(true)
  const [panel, setPanel] = useState<null | 'settings' | 'chapters' | 'bookmarks'>(null)
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [chapterPct, setChapterPct] = useState(0)
  const [sessionSec, setSessionSec] = useState(0)
  const topParaRef = useRef(0)
  const restoredRef = useRef(false)
  const hideTimer = useRef<number>()
  const scrollRef = useRef<HTMLDivElement>(null)

  const chapters = text.data?.chapters ?? []
  const current = chapters[chapter]
  const totalWords = text.data?.totalWords ?? 1
  const wordsBefore = useMemo(() => chapters.slice(0, chapter).reduce((n, c) => n + c.words, 0), [chapters, chapter])
  const overallPct = Math.min(100, ((wordsBefore + (current?.words ?? 0) * (chapterPct / 100)) / totalWords) * 100)

  // ---- UI auto-hide
  const poke = useCallback(() => {
    setUiVisible(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => !panel && setUiVisible(false), 2600)
  }, [panel])
  useEffect(() => { poke(); return () => window.clearTimeout(hideTimer.current) }, [poke, chapter])

  // ---- Scroll tracking → chapter percentage + top paragraph
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      setChapterPct(max <= 0 ? 100 : Math.min(100, (el.scrollTop / max) * 100))
      const paras = el.querySelectorAll<HTMLElement>('[data-para]')
      for (const p of paras) {
        if (p.offsetTop + p.offsetHeight - el.scrollTop > 80) { topParaRef.current = Number(p.dataset.para); break }
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [chapter, current])

  // ---- Restore position once
  useEffect(() => {
    if (!current || restoredRef.current) return
    restoredRef.current = true
    if (progress && progress.paragraph > 0) {
      requestAnimationFrame(() => {
        const p = scrollRef.current?.querySelector<HTMLElement>(`[data-para="${progress.paragraph}"]`)
        p?.scrollIntoView({ block: 'start' })
      })
    }
  }, [current, progress])

  // ---- Save position every 30s and on chapter change / unmount
  const save = useCallback(() => {
    if (!current) return
    updateProgress({ bookId, chapter, paragraph: topParaRef.current, percentage: Math.round(overallPct * 10) / 10 })
  }, [bookId, chapter, current, overallPct, updateProgress])
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => { const t = window.setInterval(() => saveRef.current(), 30000); return () => { window.clearInterval(t); saveRef.current() } }, [])
  useEffect(() => () => { saveRef.current() }, [chapter])

  // ---- Reading timer: only while the tab is focused
  useEffect(() => {
    let acc = 0
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setSessionSec((s) => s + 1)
      acc++
      if (acc >= 60) { logMinutes(bookId, 1); acc = 0 }
    }, 1000)
    return () => window.clearInterval(t)
  }, [bookId, logMinutes])

  // ---- Wake lock
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const n = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    n.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  // ---- Keyboard
  const go = useCallback((d: number) => {
    setChapter((c) => { const n = Math.min(chapters.length - 1, Math.max(0, c + d)); if (n !== c) scrollRef.current?.scrollTo({ top: 0 }); return n })
  }, [chapters.length])
  const bookmarkHere = useCallback(() => {
    if (!current) return
    const snippet = current.paragraphs[topParaRef.current]?.slice(0, 90) ?? ''
    toggleBookmark({ bookId, chapter, paragraph: topParaRef.current, snippet })
    toast('Bookmark toggled')
  }, [bookId, chapter, current, toggleBookmark])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') { if (panel || sel) { setPanel(null); setSel(null) } else nav(`/books/${bookId}`) }
      else if (e.key.toLowerCase() === 'b') bookmarkHere()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, nav, bookId, panel, sel, bookmarkHere])

  // ---- Selection popup
  useEffect(() => {
    const onUp = () => {
      const s = window.getSelection()
      const t = s?.toString().trim()
      if (!s || !t || t.length < 3 || s.rangeCount === 0) { setSel(null); return }
      const rect = s.getRangeAt(0).getBoundingClientRect()
      setSel({ text: t, x: rect.left + rect.width / 2, y: rect.top })
    }
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    return () => { document.removeEventListener('mouseup', onUp); document.removeEventListener('touchend', onUp) }
  }, [])

  const doHighlight = (color: HighlightColor) => {
    if (!sel) return
    addHighlight({ bookId, chapter, text: sel.text, color })
    toast('Highlighted')
    window.getSelection()?.removeAllRanges(); setSel(null)
  }

  const renderPara = (p: string, i: number) => {
    const hls = highlights.filter((h) => h.chapter === chapter && p.includes(h.text))
    if (!hls.length) return p
    const re = new RegExp(`(${hls.map((h) => escapeRe(h.text)).join('|')})`, 'g')
    return p.split(re).map((part, j) => {
      const h = hls.find((x) => x.text === part)
      return h ? <mark key={j} style={{ background: HL[h.color], color: 'inherit', borderRadius: 3, padding: '0 2px' }}>{part}</mark> : part
    })
  }

  const isBookmarked = bookmarks.some((b) => b.chapter === chapter && b.paragraph === topParaRef.current)

  return (
    <div className={cn('fixed inset-0 z-[70] flex flex-col', `reader-${reader.theme}`)} style={{ background: 'var(--r-bg)', color: 'var(--r-text)' }} onMouseMove={poke} onTouchStart={poke}>
      {/* Top bar */}
      <motion.header animate={{ y: uiVisible ? 0 : -70, opacity: uiVisible ? 1 : 0 }} transition={{ duration: 0.3 }} className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-3 py-2 md:px-5" style={{ background: 'linear-gradient(var(--r-bg) 60%, transparent)' }}>
        <button onClick={() => nav(`/books/${bookId}`)} className="btn btn-icon hover:bg-black/5" aria-label="Close"><X size={18} /></button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-title text-sm font-medium italic">{book?.title ?? '…'}</p>
          <p className="truncate text-[11px]" style={{ color: 'var(--r-muted)' }}>{current?.title ?? ''}{sessionSec > 59 ? ` · ${minutesLabel(Math.floor(sessionSec / 60))} this session` : ''}</p>
        </div>
        <button onClick={() => setPanel(panel === 'chapters' ? null : 'chapters')} className="btn btn-icon hover:bg-black/5" aria-label="Chapters"><List size={18} /></button>
        <button onClick={bookmarkHere} className="btn btn-icon hover:bg-black/5" aria-label="Bookmark">{isBookmarked ? <BookmarkCheck size={18} style={{ color: 'var(--accent-secondary)' }} /> : <Bookmark size={18} />}</button>
        <button onClick={() => setPanel(panel === 'settings' ? null : 'settings')} className="btn btn-icon hover:bg-black/5" aria-label="Settings"><Settings2 size={18} /></button>
      </motion.header>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-32 pt-20 md:px-10">
        {text.isLoading && (
          <div className="mx-auto max-w-reader">
            <p className="font-quote text-2xl italic" style={{ color: 'var(--r-muted)' }}>Opening the book…</p>
            <div className="mt-6 space-y-3">{Array.from({ length: 14 }).map((_, i) => <div key={i} className="skeleton h-4" style={{ width: `${70 + ((i * 37) % 30)}%`, opacity: 0.6 }} />)}</div>
          </div>
        )}
        {text.isError && (
          <div className="mx-auto max-w-reader text-center"><p className="text-4xl">📖</p><h2 className="mt-3 text-2xl">This edition won’t open</h2><p className="mt-2 text-sm" style={{ color: 'var(--r-muted)' }}>Gutenberg didn’t hand over the text. It happens with a few older files.</p><button onClick={() => text.refetch()} className="btn btn-secondary mt-4">Try again</button></div>
        )}
        {current && (
          <motion.article key={chapter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="prose-reader mx-auto max-w-reader" style={{ fontFamily: FONT_STACK[reader.font], fontSize: reader.fontSize, lineHeight: reader.lineHeight }}>
            <div className="eyebrow mb-2" style={{ color: 'var(--r-muted)' }}>{chapter + 1} of {chapters.length} · ~{readingMinutes(current.words)} min</div>
            <h2 className="mb-8 text-3xl md:text-4xl" style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600 }}>{current.title}</h2>
            {current.paragraphs.map((p, i) => (
              <p key={i} data-para={i} className={cn(bookmarks.some((b) => b.chapter === chapter && b.paragraph === i) && 'relative')}>
                {bookmarks.some((b) => b.chapter === chapter && b.paragraph === i) && <Bookmark size={14} className="absolute -left-6 top-1.5" style={{ color: 'var(--accent-secondary)' }} fill="currentColor" />}
                {renderPara(p, i)}
              </p>
            ))}
            <div className="mt-14 flex items-center justify-between border-t pt-6" style={{ borderColor: 'var(--r-muted)' }}>
              <button onClick={() => go(-1)} disabled={chapter === 0} className="btn btn-secondary disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
              {chapter === chapters.length - 1 ? (
                <button onClick={() => { useLibrary.getState().setShelf(bookId, 'finished'); toast('Finished! Added to your shelf.'); nav(`/books/${bookId}`) }} className="btn btn-primary"><Check size={15} /> Mark as finished</button>
              ) : (
                <button onClick={() => go(1)} className="btn btn-primary">Next chapter <ChevronRight size={15} /></button>
              )}
            </div>
          </motion.article>
        )}
      </div>

      {/* Bottom bar */}
      <motion.footer animate={{ y: uiVisible ? 0 : 80, opacity: uiVisible ? 1 : 0 }} transition={{ duration: 0.3 }} className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 pt-6 md:px-6" style={{ background: 'linear-gradient(transparent, var(--r-bg) 45%)' }}>
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <button onClick={() => go(-1)} disabled={chapter === 0} className="btn btn-icon hover:bg-black/5 disabled:opacity-30"><ChevronLeft size={18} /></button>
          <div className="flex-1">
            <div className="flex justify-between text-[11px]" style={{ color: 'var(--r-muted)' }}><span>Chapter {Math.round(chapterPct)}%</span><span>Book {Math.round(overallPct)}%</span></div>
            <div className="relative mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(128,128,128,.2)' }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${overallPct}%`, background: 'var(--accent-secondary)', transition: 'width .3s' }} />
            </div>
          </div>
          <button onClick={() => go(1)} disabled={chapter >= chapters.length - 1} className="btn btn-icon hover:bg-black/5 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </motion.footer>

      {/* Selection popup */}
      <AnimatePresence>
        {sel && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed z-30 -translate-x-1/2 -translate-y-full" style={{ left: Math.min(Math.max(sel.x, 150), window.innerWidth - 150), top: Math.max(sel.y - 10, 70) }}>
            <div className="flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lift" style={{ background: '#1c1c1c', color: '#fff' }}>
              <span className="flex items-center gap-1 px-1"><Highlighter size={14} />{(Object.keys(HL) as HighlightColor[]).map((c) => <button key={c} onClick={() => doHighlight(c)} className="h-5 w-5 rounded-full border-2 border-white/30 transition-transform hover:scale-110" style={{ background: HL[c].replace(/[\d.]+\)$/, '1)') }} aria-label={c} />)}</span>
              <span className="mx-1 h-4 w-px bg-white/20" />
              <button onClick={() => { navigator.clipboard?.writeText(`“${sel.text}” — ${book?.authorName}, ${book?.title}`); toast('Quote copied'); setSel(null) }} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-white/10"><Quote size={13} /> Quote</button>
              <a href={`https://www.merriam-webster.com/dictionary/${encodeURIComponent(sel.text.split(/\s+/)[0])}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-white/10"><BookA size={13} /> Define</a>
              <button onClick={() => { setNoteFor(sel.text); setNote(''); setSel(null) }} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-white/10"><StickyNote size={13} /> Note</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note modal */}
      <AnimatePresence>
        {noteFor && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setNoteFor(null)} />
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="card relative w-full max-w-md p-5">
              <p className="font-quote text-lg italic" style={{ color: 'var(--text-secondary)' }}>“{noteFor.slice(0, 160)}{noteFor.length > 160 ? '…' : ''}”</p>
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Your note…" className="input mt-3 resize-none" />
              <div className="mt-3 flex justify-end gap-2"><button onClick={() => setNoteFor(null)} className="btn btn-ghost btn-sm">Cancel</button><button onClick={() => { addHighlight({ bookId, chapter, text: noteFor, color: 'yellow', note }); setNoteFor(null); toast('Note saved') }} className="btn btn-primary btn-sm">Save note</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side panel */}
      <AnimatePresence>
        {panel && <motion.div key="panel-backdrop" className="absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanel(null)} />}
        {panel && (
            <motion.aside key="panel" initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="absolute inset-y-0 right-0 z-30 w-[320px] max-w-[90vw] overflow-y-auto border-l p-5 shadow-lift" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
              <div className="mb-5 flex items-center justify-between"><h3 className="text-xl">{panel === 'settings' ? 'Reading settings' : panel === 'chapters' ? 'Contents' : 'Bookmarks'}</h3><button onClick={() => setPanel(null)} className="btn btn-ghost btn-icon h-8 w-8"><X size={16} /></button></div>
              {panel === 'settings' && (
                <div className="space-y-6">
                  <div><p className="eyebrow mb-2">Theme</p><div className="grid grid-cols-4 gap-2">{(['warm', 'white', 'sepia', 'dark'] as ReaderTheme[]).map((t) => <button key={t} onClick={() => reader.set({ theme: t })} className={cn('reader-' + t, 'flex h-14 flex-col items-center justify-center rounded-xl border-2 text-xs font-medium capitalize')} style={{ background: 'var(--r-bg)', color: 'var(--r-text)', borderColor: reader.theme === t ? 'var(--accent-secondary)' : 'var(--border)' }}><span className="font-title text-lg">Aa</span>{t}</button>)}</div></div>
                  <div><p className="eyebrow mb-2">Font</p><div className="grid grid-cols-2 gap-2">{(Object.keys(FONT_STACK) as ReaderFont[]).map((f) => <button key={f} onClick={() => reader.set({ font: f })} className="rounded-xl border-2 px-3 py-2 text-left text-sm" style={{ fontFamily: FONT_STACK[f], borderColor: reader.font === f ? 'var(--accent-secondary)' : 'var(--border)' }}>{f}</button>)}</div></div>
                  <div><div className="mb-2 flex justify-between"><p className="eyebrow">Size</p><span className="text-xs">{reader.fontSize}px</span></div><input type="range" min={14} max={28} value={reader.fontSize} onChange={(e) => reader.set({ fontSize: Number(e.target.value) })} className="w-full accent-[var(--accent-secondary)]" /></div>
                  <div><div className="mb-2 flex justify-between"><p className="eyebrow">Line height</p><span className="text-xs">{reader.lineHeight.toFixed(2)}</span></div><input type="range" min={1.4} max={2.2} step={0.05} value={reader.lineHeight} onChange={(e) => reader.set({ lineHeight: Number(e.target.value) })} className="w-full accent-[var(--accent-secondary)]" /></div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>Keys: ← → chapters · B bookmark · Esc close. Position auto-saves every 30 seconds; time only counts while this tab is focused.</p>
                </div>
              )}
              {panel === 'chapters' && (
                <ol className="space-y-0.5">{chapters.map((c) => <li key={c.index}><button onClick={() => { setChapter(c.index); scrollRef.current?.scrollTo({ top: 0 }); setPanel(null) }} className={cn('flex w-full items-baseline justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]', c.index === chapter && 'font-semibold')} style={{ background: c.index === chapter ? 'var(--bg-secondary)' : undefined }}><span className="truncate">{c.title}</span><span className="ml-2 shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{readingMinutes(c.words)}m</span></button></li>)}</ol>
              )}
              {panel === 'bookmarks' && (bookmarks.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No bookmarks yet. Press <kbd className="rounded border px-1">B</kbd> anywhere.</p> : <ul className="space-y-2">{bookmarks.map((b) => <li key={b.id}><button onClick={() => { setChapter(b.chapter); setPanel(null); setTimeout(() => scrollRef.current?.querySelector(`[data-para="${b.paragraph}"]`)?.scrollIntoView({ block: 'start' }), 50) }} className="card-flat w-full p-3 text-left text-sm hover:bg-[var(--bg-secondary)]"><p className="eyebrow">{chapters[b.chapter]?.title}</p><p className="mt-1 line-clamp-2 font-title italic">{b.snippet}…</p></button></li>)}</ul>)}
              {panel !== 'bookmarks' && bookmarks.length > 0 && <button onClick={() => setPanel('bookmarks')} className="btn btn-secondary btn-sm mt-6 w-full"><Bookmark size={13} /> {bookmarks.length} bookmark{bookmarks.length > 1 ? 's' : ''}</button>}
            </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
