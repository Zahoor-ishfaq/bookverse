import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bookmark, BookOpen, Check, ChevronLeft, ChevronRight, Heart, Plus, Star, X } from 'lucide-react'
import { BookCover } from './BookCover'
import { MoodBadge, Stars, toast } from '@/components/ui'
import { useLibrary } from '@/store/libraryStore'
import { cn, formatNumber } from '@/lib/utils'
import type { Book, ShelfType } from '@/types/book'
import { bookPath } from '@/lib/seo'

export const SHELF_LABELS: Record<ShelfType, string> = {
  reading: 'Currently reading',
  want_to_read: 'Want to read',
  finished: 'Finished',
  did_not_finish: 'Did not finish',
  favorites: 'Favorites',
}

/* ---------------- Add to shelf ---------------- */
// Rendered through a portal: cards clip overflow for their cover art, so an
// in-flow dropdown would be cut off (that was the "button does nothing" bug).
export function ShelfMenu({ book, compact, align = 'left' }: { book: Book; compact?: boolean; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; right: number }>({ top: 0, left: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const entry = useLibrary((s) => s.shelves.find((e) => e.bookId === book.id))
  const setShelf = useLibrary((s) => s.setShelf)

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, right: window.innerWidth - r.right - window.scrollX })
    setOpen((o) => !o)
  }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])

  const choose = (k: ShelfType | null) => {
    setShelf(book.id, k)
    setOpen(false)
    toast(k ? `Added to ${SHELF_LABELS[k]}` : 'Removed from your shelf', k ? 'success' : 'info')
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-haspopup="menu" aria-expanded={open} className={cn('btn', compact ? 'btn-sm' : '', entry ? 'btn-secondary' : 'btn-primary')}>
        {entry ? <Check size={14} /> : <Plus size={14} />}
        {entry ? SHELF_LABELS[entry.shelf] : 'Add to shelf'}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[85]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false) }}>
          <motion.div role="menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14 }}
            className="card absolute w-60 p-1.5 shadow-lift" style={{ top: pos.top - window.scrollY, ...(align === 'right' ? { right: pos.right } : { left: pos.left }) }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
            <p className="eyebrow px-3 pb-1 pt-1.5">Save to</p>
            {(Object.keys(SHELF_LABELS) as ShelfType[]).map((k) => (
              <button key={k} role="menuitem" onClick={() => choose(k)} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]">
                <span className="flex items-center gap-2.5">{k === 'favorites' ? <Heart size={15} /> : k === 'reading' ? <BookOpen size={15} /> : <Bookmark size={15} />}{SHELF_LABELS[k]}</span>
                {entry?.shelf === k && <Check size={15} style={{ color: 'var(--accent-primary)' }} />}
              </button>
            ))}
            {entry && (
              <><div className="divider my-1" /><button onClick={() => choose(null)} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--accent-tertiary)' }}><X size={15} /> Remove from shelf</button></>
            )}
          </motion.div>
        </div>,
        document.body,
      )}
    </>
  )
}

/* ---------------- Card (masonry / grid) ---------------- */
export function BookCard({ book, size = 'md', showMeta = true, className }: { book: Book; size?: 'sm' | 'md' | 'lg'; showMeta?: boolean; className?: string }) {
  const progress = useLibrary((s) => s.progress[book.id])
  return (
    <Link to={bookPath(book)} className={cn('group block break-inside-avoid', className)}>
      <div className="cover-3d cover-shadow relative overflow-hidden rounded-xl">
        <BookCover book={book} rounded="rounded-xl" />
        {/* hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(20,14,8,.88))' }}>
          <p className="font-title text-sm italic leading-tight text-white" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</p>
          <p className="mt-0.5 text-[11px] text-white/75">{book.authorName}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-white"><Star size={11} fill="currentColor" style={{ color: '#E0A25C' }} strokeWidth={0} /> {book.rating}</span>
            <span className="text-[11px] text-white/75">{formatNumber(book.readers)} reading</span>
          </div>
          <div className="mt-2 hidden sm:block"><ShelfMenu book={book} compact /></div>
        </div>
        {progress && progress.percentage > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: 'rgba(255,255,255,.35)' }}>
            <div className="h-full" style={{ width: `${progress.percentage}%`, background: 'var(--accent-secondary)' }} />
          </div>
        )}
      </div>
      {showMeta && (
        <div className={cn('mt-2.5', size === 'sm' && 'hidden sm:block')}>
          <p className="font-title text-[13px] font-medium leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{book.authorName}</p>
          {size === 'lg' && (
            <div className="mt-1.5 flex flex-wrap gap-1">{book.moods.slice(0, 2).map((m) => <MoodBadge key={m} mood={m} small />)}</div>
          )}
        </div>
      )}
    </Link>
  )
}

/* ---------------- Masonry ---------------- */
export function MasonryGrid({ books }: { books: Book[] }) {
  // Cover sizes vary by a deterministic pattern so the grid feels arranged, not generated.
  const sizeFor = (i: number): 'sm' | 'md' | 'lg' => (i % 7 === 0 ? 'lg' : i % 5 === 3 ? 'sm' : 'md')
  return (
    <div className="columns-2 gap-4 sm:columns-3 md:gap-5 lg:columns-4 xl:columns-5">
      {books.map((b, i) => {
        const s = sizeFor(i)
        return (
          <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: (i % 5) * 0.04 }}
            className={cn('mb-5 break-inside-avoid', s === 'lg' ? 'px-0' : s === 'sm' ? 'px-3 sm:px-5' : 'px-1.5')}>
            <BookCard book={b} size={s} />
          </motion.div>
        )
      })}
    </div>
  )
}

/* ---------------- Carousel ---------------- */
export function BookCarousel({ books, renderExtra, itemWidth = 150 }: { books: Book[]; renderExtra?: (b: Book) => ReactNode; itemWidth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * itemWidth * 3, behavior: 'smooth' })
  return (
    <div className="group/car relative">
      <div ref={ref} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-2 md:gap-5">
        {books.map((b) => (
          <div key={b.id} className="shrink-0" style={{ width: itemWidth }}>
            <BookCard book={b} />
            {renderExtra?.(b)}
          </div>
        ))}
      </div>
      <button onClick={() => scroll(-1)} aria-label="Previous" className="btn btn-secondary btn-icon absolute -left-3 top-1/3 hidden shadow-paper opacity-0 transition-opacity group-hover/car:opacity-100 md:inline-flex"><ChevronLeft size={16} /></button>
      <button onClick={() => scroll(1)} aria-label="Next" className="btn btn-secondary btn-icon absolute -right-3 top-1/3 hidden shadow-paper opacity-0 transition-opacity group-hover/car:opacity-100 md:inline-flex"><ChevronRight size={16} /></button>
    </div>
  )
}

/* ---------------- Standing shelf ---------------- */
export function ShelfRow({ books, height = 150, children }: { books: Book[]; height?: number; children?: ReactNode }) {
  return (
    <div>
      <div className="no-scrollbar flex items-end gap-3 overflow-x-auto px-4 pt-3" style={{ minHeight: height + 12 }}>
        {books.map((b, i) => (
          <Link key={b.id} to={bookPath(b)} className="group relative shrink-0 origin-bottom transition-transform duration-300 hover:-translate-y-2" style={{ height: height - (i % 3) * 6 }}>
            <div className="h-full overflow-hidden rounded-[3px] shadow-cover" style={{ aspectRatio: '2/3' }}>
              <BookCover book={b} rounded="rounded-[3px]" />
            </div>
          </Link>
        ))}
        {children}
      </div>
      <div className="shelf-plank" />
    </div>
  )
}

/* ---------------- Compact list item ---------------- */
export function BookListItem({ book, right }: { book: Book; right?: ReactNode }) {
  return (
    <Link to={bookPath(book)} className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-[var(--bg-secondary)]">
      <div className="w-12 shrink-0 overflow-hidden rounded-md shadow-cover"><BookCover book={book} rounded="rounded-md" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-title text-sm font-medium">{book.title}</p>
        <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{book.authorName}</p>
        <div className="mt-1 flex items-center gap-2"><Stars value={book.rating} size={11} /><span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{book.rating}</span></div>
      </div>
      {right}
    </Link>
  )
}
