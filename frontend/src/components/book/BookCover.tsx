import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Book } from '@/types/book'

const PALETTE = ['#1B6B4A', '#8A5A2F', '#8B3A3A', '#3F4F5C', '#7A4B8A', '#3D6B6B', '#2F5D8A', '#A64D62']

// When Gutenberg has no cover we typeset one — a title on coloured cloth
// feels more like a real shelf than a grey placeholder.
export function GeneratedCover({ title, author, seed, className }: { title: string; author?: string; seed: number; className?: string }) {
  const bg = PALETTE[seed % PALETTE.length]
  return (
    <div className={cn('relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden p-[9%] text-white', className)} style={{ background: `linear-gradient(160deg, ${bg} 0%, ${bg}cc 100%)` }}>
      <div className="absolute inset-y-0 left-0 w-[7%]" style={{ background: 'rgba(0,0,0,.18)' }} />
      <div className="absolute inset-[6%] rounded-sm border" style={{ borderColor: 'rgba(255,255,255,.35)' }} />
      <p className="relative mt-[8%] pl-[6%] font-title text-[clamp(11px,1.6vw,20px)] font-semibold leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</p>
      {author && <p className="relative pl-[6%] font-title text-[clamp(8px,1vw,12px)] italic opacity-85">{author}</p>}
    </div>
  )
}

export function BookCover({ book, className, priority, rounded = 'rounded-lg' }: { book: Pick<Book, 'id' | 'title' | 'authorName' | 'coverUrl'>; className?: string; priority?: boolean; rounded?: string }) {
  const [failed, setFailed] = useState(!book.coverUrl)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn('relative aspect-[2/3] w-full overflow-hidden', rounded, className)} style={{ background: 'var(--bg-secondary)' }}>
      {!failed ? (
        <>
          {!loaded && <div className="skeleton absolute inset-0" />}
          <img src={book.coverUrl} alt={book.title} loading={priority ? 'eager' : 'lazy'} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
            className={cn('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')} />
        </>
      ) : (
        <GeneratedCover title={book.title} author={book.authorName} seed={book.id} />
      )}
      {/* spine highlight */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[6px]" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.18), rgba(255,255,255,.08) 60%, transparent)' }} />
    </div>
  )
}
