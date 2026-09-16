import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, Heart, MessageCircle, Plus, Send, Trash2 } from 'lucide-react'
import { StoryCoverArt } from '@/components/story/StoryCard'
import { Avatar, Modal, toast } from '@/components/ui'
import { BookCover } from '@/components/book/BookCover'
import { useBook } from '@/hooks/useBooks'
import { useInvalidate, useStory } from '@/hooks/useCommunity'
import { useLibrary } from '@/store/libraryStore'
import { useAuth } from '@/store/authStore'
import { usePeople } from '@/store/peopleStore'
import { api } from '@/services/api'
import { ReportButton } from '@/components/ReportButton'
import { cn, formatNumber, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'

export default function StoryDetailPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { data: story, isLoading } = useStory(id)
  const user = useAuth((s) => s.user)
  const liked = useLibrary((s) => s.likedStories.includes(id ?? ''))
  const toggleLike = useLibrary((s) => s.toggleLikeStory)
  const following = useLibrary((s) => s.following)
  const toggleFollow = useLibrary((s) => s.toggleFollow)
  const invalidate = useInvalidate()
  const { data: inspired } = useBook(story?.inspiredByBookId ?? undefined)
  const person = usePeople([story?.authorId, ...(story?.commentsList ?? []).map((c) => c.userId)])
  const chNum = Number(params.get('ch') ?? 1)
  const [comment, setComment] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  useSEO({ title: story?.title ?? 'Story', description: story?.tagline, type: 'article' })
  if (isLoading) return <div className="mx-auto max-w-6xl"><div className="skeleton h-72" /></div>
  if (!story) return <div className="card mx-auto max-w-md p-10 text-center"><h2 className="text-2xl">Story not found</h2><Link to="/stories" className="btn btn-primary mt-4">Back</Link></div>
  const author = person(story.authorId)
  const chapter = story.chapters.find((c) => c.number === chNum) ?? story.chapters[0]
  const isAuthor = user?.id === story.authorId
  const isFollowing = following.includes(story.authorId)
  const comments = story.commentsList.filter((c) => c.chapter === chapter.number)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="card mb-8 grid overflow-hidden md:grid-cols-[280px_1fr]">
        <StoryCoverArt story={story} className="min-h-[200px]" />
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap gap-1.5">{story.genres.map((g) => <span key={g} className="chip">{g}</span>)}{story.isSerial && <span className="chip">{story.isComplete ? 'Complete serial' : 'Ongoing serial'}</span>}</div>
          <h1 className="mt-3 text-3xl md:text-4xl">{story.title}</h1>
          <p className="mt-2 font-title text-lg italic" style={{ color: 'var(--text-secondary)' }}>{story.tagline}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link to={`/u/${author.username}`} className="flex items-center gap-2"><Avatar user={author} size={36} /><span><span className="block text-sm font-semibold">{author.displayName}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatNumber(author.followers)} followers</span></span></Link>
            {!isAuthor && user && <button onClick={() => toggleFollow(story.authorId, author.username)} className={cn('btn btn-sm', isFollowing ? 'btn-secondary' : 'btn-primary')}>{isFollowing ? 'Following' : 'Follow'}</button>}
            {isAuthor && <><button onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add chapter</button><button onClick={async () => { if (confirm('Delete this story? This cannot be undone.')) { await api.del(`/api/stories/${story.id}`); invalidate('stories'); nav('/stories') } }} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-tertiary)' }}><Trash2 size={14} /> Delete</button></>}
            <span className="ml-auto flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}><span className="flex items-center gap-1"><Eye size={13} />{formatNumber(story.views)}</span><button onClick={() => { if (toggleLike(story.id)) invalidate('stories') }} className={cn('flex items-center gap-1', liked && 'font-semibold')} style={{ color: liked ? 'var(--accent-tertiary)' : undefined }}><Heart size={13} fill={liked ? 'currentColor' : 'none'} />{formatNumber(story.likes)}</button><span className="flex items-center gap-1"><MessageCircle size={13} />{formatNumber(story.comments)}</span>{!isAuthor && <ReportButton type="story" id={story.id} />}</span>
          </div>
          {inspired && <Link to={bookPath(inspired)} className="mt-5 flex w-fit items-center gap-3 rounded-xl p-2 pr-4 text-xs" style={{ background: 'var(--bg-secondary)' }}><span className="w-8 overflow-hidden rounded"><BookCover book={inspired} rounded="rounded" /></span><span><span className="eyebrow block">Inspired by</span><span className="font-title italic">{inspired.title}</span></span></Link>}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="eyebrow mb-3">Chapters</p>
          <ol className="space-y-1">{story.chapters.map((c) => <li key={c.number}><button onClick={() => { setParams({ ch: String(c.number) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={cn('flex w-full items-baseline gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]', c.number === chapter.number && 'font-semibold')} style={{ background: c.number === chapter.number ? 'var(--bg-secondary)' : undefined }}><span style={{ color: 'var(--accent-primary)' }}>{c.number}</span><span className="min-w-0 flex-1 truncate">{c.title}</span></button></li>)}</ol>
          {!story.isComplete && <p className="mt-3 px-3 text-xs italic" style={{ color: 'var(--text-muted)' }}>Next chapter coming…</p>}
        </aside>

        <article className="max-w-reader">
          <p className="eyebrow">Chapter {chapter.number} · {timeAgo(chapter.publishedAt)}</p>
          <h2 className="mt-2 text-3xl">{chapter.title}</h2>
          <div className="prose-reader mt-8 font-title text-[18px] leading-[1.85]">{chapter.content.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="mt-12 flex items-center justify-between border-t pt-6" style={{ borderColor: 'var(--border)' }}>
            <button disabled={chapter.number === 1} onClick={() => setParams({ ch: String(chapter.number - 1) })} className="btn btn-secondary"><ChevronLeft size={14} /> Previous</button>
            <button onClick={() => { if (toggleLike(story.id)) invalidate('stories') }} className={cn('btn', liked ? 'btn-secondary' : 'btn-primary')}><Heart size={14} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Liked' : 'Like this story'}</button>
            <button disabled={chapter.number === story.chapters.length} onClick={() => setParams({ ch: String(chapter.number + 1) })} className="btn btn-secondary">Next <ChevronRight size={14} /></button>
          </div>

          <section className="mt-12">
            <h3 className="flex items-center gap-2 text-xl"><MessageCircle size={18} /> {comments.length} comment{comments.length === 1 ? '' : 's'} on this chapter</h3>
            {user ? (
              <form onSubmit={async (e) => { e.preventDefault(); if (!comment.trim()) return; try { await api.post(`/api/stories/${story.id}/comments`, { chapter: chapter.number, body: comment.trim() }); setComment(''); invalidate('story'); toast('Comment posted') } catch (ex) { toast((ex as Error).message, 'error') } }} className="mt-4 flex gap-3">
                <Avatar user={user} size={36} /><div className="flex flex-1 items-center gap-2 rounded-xl border p-1 pl-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell the author something true" className="w-full bg-transparent text-sm outline-none" /><button className="btn btn-primary btn-icon h-8 w-8"><Send size={13} /></button></div>
              </form>
            ) : <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}><Link to="/login" className="underline">Log in</Link> to comment.</p>}
            <ul className="mt-6 space-y-4">{comments.map((c) => { const u = person(c.userId); return <li key={c.id} className="flex gap-3"><Avatar user={u} size={32} /><div><p className="text-sm"><span className="font-semibold">{u.displayName}</span> <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span></p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.body}</p></div></li> })}</ul>
          </section>
        </article>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Chapter ${story.chapters.length + 1}`} wide>
        <div className="space-y-3">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Chapter title" className="input" />
          <textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={12} placeholder="Write the chapter. Blank line between paragraphs." className="input resize-y font-title text-[16px]" />
          <button disabled={!newText.trim()} onClick={async () => { try { await api.post(`/api/stories/${story.id}/chapters`, { title: newTitle.trim(), content: newText.split(/\n\s*\n+/).map((t) => t.trim()).filter(Boolean) }); setAddOpen(false); setNewTitle(''); setNewText(''); invalidate('story', 'stories', 'feed'); toast('Chapter published — your followers have been notified') } catch (ex) { toast((ex as Error).message, 'error') } }} className="btn btn-primary w-full">Publish chapter</button>
        </div>
      </Modal>
    </div>
  )
}
