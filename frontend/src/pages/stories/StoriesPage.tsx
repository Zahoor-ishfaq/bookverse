import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Feather, Sparkles } from 'lucide-react'
import { StoryCard, StoryCoverArt } from '@/components/story/StoryCard'
import { AIBadge, Avatar, SectionHead } from '@/components/ui'
import { useChallenges, useStories } from '@/hooks/useCommunity'
import { usePeople } from '@/store/peopleStore'
import { writingPrompt } from '@/services/ai'
import { cn, formatNumber } from '@/lib/utils'
import { useSEO } from '@/lib/seo'

const GENRES = ['All', 'Literary', 'Retelling', 'Gothic', 'Romance', 'Flash Fiction', 'Historical', 'Humour', 'Speculative']

export default function StoriesPage() {
  useSEO({ title: 'Community stories', description: 'Original fiction and creative non-fiction written by BookVerse members. Read serials chapter by chapter, or publish your own.' })
  const [genre, setGenre] = useState('All')
  const { data: stories = [], isLoading } = useStories()
  const { data: challenges = [] } = useChallenges()
  const person = usePeople(stories.map((s) => s.authorId))
  const featured = stories.find((s) => s.featured) ?? stories[0]
  const list = stories.filter((s) => genre === 'All' || s.genres.includes(genre))
  const trending = [...stories].sort((a, b) => b.views - a.views).slice(0, 4)
  const writing = challenges.find((c) => c.type === 'writing')

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-1">Original fiction</p><h1 className="text-3xl md:text-4xl">Stories</h1></div>
        <Link to="/stories/write" className="btn btn-primary"><Feather size={15} /> Write a story</Link>
      </div>

      {isLoading && <div className="skeleton mb-10 h-64" />}
      {featured && (
        <section className="card mb-10 grid overflow-hidden md:grid-cols-[1fr_1.2fr]">
          <StoryCoverArt story={featured} className="min-h-[220px]" />
          <div className="flex flex-col p-6 md:p-10">
            <span className="stamp w-fit">{featured.featured ? 'Story of the week' : 'Latest'}</span>
            <h2 className="mt-4 text-3xl">{featured.title}</h2>
            <p className="mt-2 font-title text-lg italic" style={{ color: 'var(--text-secondary)' }}>{featured.tagline}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
              <span className="flex items-center gap-2 text-sm"><Avatar user={person(featured.authorId)} size={30} /><span><span className="block font-medium">{person(featured.authorId).displayName}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{featured.chapters.length} chapters · {formatNumber(featured.wordCount)} words</span></span></span>
              <Link to={`/stories/${featured.id}`} className="btn btn-primary">Start reading <ArrowRight size={14} /></Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">{GENRES.map((g) => <button key={g} onClick={() => setGenre(g)} className={cn('chip shrink-0', genre === g && 'chip-active')}>{g}</button>)}</div>
          <div className="grid gap-5 sm:grid-cols-2">{list.map((s) => <StoryCard key={s.id} story={s} author={person(s.authorId)} />)}</div>
          {!isLoading && list.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No stories in this genre yet.</p>}
        </div>
        <aside className="space-y-5">
          <div className="card p-5">
            <SectionHead eyebrow="This week" title={<span className="text-xl">Trending</span>} className="mb-3" />
            <ol className="space-y-3">{trending.map((s, i) => <li key={s.id}><Link to={`/stories/${s.id}`} className="flex items-start gap-3"><span className="text-2xl font-bold leading-none" style={{ color: 'var(--border-strong)' }}>{i + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{s.title}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{person(s.authorId).displayName} · {formatNumber(s.views)} reads</span></span></Link></li>)}</ol>
          </div>
          {writing && (
            <div className="card p-5" style={{ background: 'var(--bg-secondary)' }}>
              <p className="eyebrow mb-1">Writing challenge</p>
              <h3 className="text-lg">{writing.title}</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{writing.description}</p>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>{writing.participants} entries so far</p>
              <Link to="/stories/write" className="btn btn-primary btn-sm mt-3">Enter</Link>
            </div>
          )}
          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between"><p className="eyebrow flex items-center gap-1"><Sparkles size={12} /> Today’s prompt</p><AIBadge /></div>
            <p className="font-quote text-xl italic leading-snug">{writingPrompt()}</p>
            <Link to={`/stories/write?prompt=${encodeURIComponent(writingPrompt())}`} className="btn btn-secondary btn-sm mt-3">Write to this</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
