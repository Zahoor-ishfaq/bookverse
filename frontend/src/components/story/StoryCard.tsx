import { Link } from 'react-router-dom'
import { Bookmark, Eye, Heart, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import type { Story, User } from '@/types/community'
import { PLACEHOLDER } from '@/store/peopleStore'

// Story covers are typeset, not uploaded: a colour, a pattern, a title.
export function StoryCoverArt({ story, className }: { story: Story; className?: string }) {
  const c = story.coverColor
  const pattern =
    story.coverPattern === 'stripes' ? `repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,.12) 14px 16px)`
    : story.coverPattern === 'dots' ? `radial-gradient(rgba(255,255,255,.22) 1.5px, transparent 1.6px)`
    : story.coverPattern === 'grid' ? `linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)`
    : `radial-gradient(ellipse 60% 30% at 50% 110%, rgba(255,255,255,.25), transparent), radial-gradient(ellipse 80% 40% at 20% -10%, rgba(255,255,255,.18), transparent)`
  const size = story.coverPattern === 'dots' ? '14px 14px' : story.coverPattern === 'grid' ? '22px 22px' : 'auto'
  return (
    <div className={className} style={{ background: `${pattern}, ${c}`, backgroundSize: size }}>
      <div className="flex h-full flex-col justify-end p-5 text-white">
        <p className="font-display text-2xl font-bold leading-tight drop-shadow-sm">{story.title}</p>
      </div>
    </div>
  )
}

export function StoryCard({ story, compact, author = PLACEHOLDER }: { story: Story; compact?: boolean; author?: User }) {
  return (
    <Link to={`/stories/${story.id}`} className="card group flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1">
      <StoryCoverArt story={story} className={compact ? 'h-32' : 'h-44'} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {story.featured && <span className="stamp">Featured</span>}
          {story.genres.slice(0, 2).map((g) => <span key={g} className="chip">{g}</span>)}
        </div>
        <p className="font-title text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{story.tagline}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="flex items-center gap-2 text-xs"><Avatar user={author} size={24} /><span className="font-medium">{author.displayName}</span></span>
          <span className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><Eye size={12} />{formatNumber(story.views)}</span>
            <span className="flex items-center gap-1"><Heart size={12} />{formatNumber(story.likes)}</span>
            <span className="hidden items-center gap-1 sm:flex"><MessageCircle size={12} />{formatNumber(story.comments)}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

export { Bookmark }
