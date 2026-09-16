import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bold, Heading2, Italic, Minus, Quote, Sparkles } from 'lucide-react'
import { StoryCoverArt } from '@/components/story/StoryCard'
import { AIBadge, toast } from '@/components/ui'
import { useInvalidate } from '@/hooks/useCommunity'
import { useAuth } from '@/store/authStore'
import { api } from '@/services/api'
import { writingPrompt } from '@/services/ai'
import { cn } from '@/lib/utils'
import { useSEO } from '@/lib/seo'
import type { Story } from '@/types/community'

const COLORS = ['#1B6B4A', '#8A5A2F', '#8B3A3A', '#3F4F5C', '#7A4B8A', '#3D6B6B', '#A64D62', '#1C1C1C']
const PATTERNS: Story['coverPattern'][] = ['waves', 'stripes', 'dots', 'grid']
const GENRES = ['Literary', 'Retelling', 'Gothic', 'Romance', 'Flash Fiction', 'Historical', 'Humour', 'Speculative']

export default function WriteStoryPage() {
  useSEO({ title: 'Write a story', noindex: true })
  const nav = useNavigate()
  const [params] = useSearchParams()
  const user = useAuth((s) => s.user)
  const invalidate = useInvalidate()
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [pattern, setPattern] = useState<Story['coverPattern']>('waves')
  const [genres, setGenres] = useState<string[]>([])
  const [serial, setSerial] = useState(false)
  const [words, setWords] = useState(0)
  const [busy, setBusy] = useState(false)
  const editor = useRef<HTMLDivElement>(null)
  const prompt = params.get('prompt')

  const cmd = (c: string, v?: string) => { editor.current?.focus(); document.execCommand(c, false, v) }
  const onInput = () => setWords((editor.current?.innerText.trim().split(/\s+/).filter(Boolean).length) ?? 0)

  const doPublish = async () => {
    const tmp = document.createElement('div'); tmp.innerHTML = editor.current?.innerHTML ?? ''
    let paragraphs = Array.from(tmp.querySelectorAll('p, h2, blockquote, div')).map((n) => n.textContent?.trim() ?? '').filter(Boolean)
    if (paragraphs.length === 0) paragraphs = (editor.current?.innerText ?? '').split(/\n+/).map((t) => t.trim()).filter(Boolean)
    if (!title.trim() || paragraphs.length === 0) { toast('Add a title and some text first', 'error'); return }
    setBusy(true)
    try {
      const s = await api.post<Story>('/api/stories', { title: title.trim(), tagline: tagline.trim(), coverColor: color, coverPattern: pattern, genres, isSerial: serial, chapter: { title: chapterTitle.trim() || title.trim(), content: paragraphs } })
      invalidate('stories', 'feed')
      toast('Published — your followers have been notified')
      nav(`/stories/${s.id}`)
    } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) }
  }

  const preview: Story = { id: 'preview', authorId: user?.id ?? '', title: title || 'Untitled', tagline, coverColor: color, coverPattern: pattern, genres, isSerial: serial, isComplete: !serial, wordCount: words, views: 0, likes: 0, bookmarks: 0, comments: 0, publishedAt: '', chapters: [] }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_300px]">
      <div>
        <p className="eyebrow mb-1">New story</p>
        {prompt && <div className="mb-5 flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}><Sparkles size={16} className="mt-1 shrink-0" style={{ color: 'var(--accent-secondary)' }} /><div><div className="mb-1 flex items-center gap-2"><span className="eyebrow">Prompt</span><AIBadge /></div><p className="font-quote text-lg italic leading-snug">{prompt}</p></div></div>}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-transparent text-4xl font-bold outline-none placeholder:opacity-30" />
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A one-line tagline" className="mt-3 w-full bg-transparent font-title text-lg italic outline-none placeholder:opacity-40" />
        <input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder={serial ? 'Chapter 1 title' : 'Chapter title (optional)'} className="mt-6 w-full bg-transparent text-2xl font-semibold outline-none placeholder:opacity-30" />
        <div className="sticky top-16 z-10 mt-6 flex w-fit items-center gap-1 rounded-full border p-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {[{ i: Bold, c: 'bold', t: 'Bold' }, { i: Italic, c: 'italic', t: 'Italic' }, { i: Heading2, c: 'formatBlock', v: 'h2', t: 'Heading' }, { i: Quote, c: 'formatBlock', v: 'blockquote', t: 'Quote' }, { i: Minus, c: 'insertHorizontalRule', t: 'Divider' }].map(({ i: Icon, c, v, t }) => <button key={t} type="button" title={t} onMouseDown={(e) => { e.preventDefault(); cmd(c, v) }} className="btn btn-ghost btn-icon h-9 w-9"><Icon size={15} /></button>)}
          <span className="px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{words} words</span>
        </div>
        <div ref={editor} contentEditable suppressContentEditableWarning onInput={onInput} data-placeholder="Once upon a time, but better." className="story-editor mt-4 min-h-[50vh] max-w-reader font-title text-[18px] leading-[1.85] outline-none" />
        <style>{`.story-editor:empty::before{content:attr(data-placeholder);opacity:.3}.story-editor p,.story-editor div{margin:0 0 1.1em}.story-editor h2{font-family:inherit;font-size:1.5em;font-weight:700;margin:1.2em 0 .5em}.story-editor blockquote{border-left:3px solid var(--accent-secondary);padding-left:1em;font-style:italic;color:var(--text-secondary);margin:1.2em 0}.story-editor hr{border:0;text-align:center;margin:2em 0}.story-editor hr::after{content:'✦ ✦ ✦';color:var(--text-muted);letter-spacing:.5em}`}</style>
      </div>
      <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
        <div className="card overflow-hidden"><StoryCoverArt story={preview} className="h-40" /><div className="p-4"><p className="label">Cover colour</p><div className="flex flex-wrap gap-2">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: color === c ? 'var(--text-primary)' : 'transparent' }} aria-label={c} />)}</div><p className="label mt-4">Pattern</p><div className="flex gap-1.5">{PATTERNS.map((p) => <button key={p} onClick={() => setPattern(p)} className={cn('chip capitalize', pattern === p && 'chip-active')}>{p}</button>)}</div></div></div>
        <div className="card p-4"><p className="label">Genres (up to 3)</p><div className="flex flex-wrap gap-1.5">{GENRES.map((g) => <button key={g} onClick={() => setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g].slice(-3)))} className={cn('chip', genres.includes(g) && 'chip-active')}>{g}</button>)}</div>
          <label className="mt-4 flex items-center justify-between text-sm"><span>Serial (more chapters later)</span><input type="checkbox" checked={serial} onChange={(e) => setSerial(e.target.checked)} className="h-4 w-4 accent-[var(--accent-primary)]" /></label>
        </div>
        <button onClick={doPublish} disabled={busy} className="btn btn-primary btn-lg w-full">{busy ? 'Publishing…' : 'Publish'}</button>
        <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Stuck? <button onClick={() => nav(`/stories/write?prompt=${encodeURIComponent(writingPrompt(Math.random() * 1e9))}`)} className="underline">Get a prompt</button></p>
      </aside>
    </div>
  )
}
