import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ChevronUp, ChevronDown, ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import { BookCover, GeneratedCover } from '@/components/book/BookCover'
import { MoodBadge, toast } from '@/components/ui'
import { useAuth } from '@/store/authStore'
import { useInvalidate } from '@/hooks/useCommunity'
import { api } from '@/services/api'
import { MOODS, GENRE_TOPICS } from '@/data/seed'
import { cn, timeAgo } from '@/lib/utils'
import { bookPath, useSEO } from '@/lib/seo'
import type { Book, Mood } from '@/types/book'

const LANGS = [['en', 'English'], ['ar', 'Arabic'], ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['pt', 'Portuguese'], ['it', 'Italian'], ['tr', 'Turkish'], ['ur', 'Urdu'], ['hi', 'Hindi']]

// Downscale covers client-side so uploads stay small.
async function shrinkCover(file: File): Promise<File> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.86))
  return new File([blob], 'cover.jpg', { type: 'image/jpeg' })
}

const splitParagraphs = (t: string) => t.split(/\n\s*\n+/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

export default function PublishBookPage() {
  useSEO({ title: 'Publish a book', noindex: true })
  const nav = useNavigate()
  const user = useAuth((s) => s.user)!
  const invalidate = useInvalidate()
  const mine = useQuery({ queryKey: ['my-books'], queryFn: () => api.get<Book[]>('/api/books/mine/published') })

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [author, setAuthor] = useState(user.displayName)
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('Fiction')
  const [language, setLanguage] = useState('en')
  const [moods, setMoods] = useState<Mood[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | undefined>()
  const [chapters, setChapters] = useState<{ title: string; text: string }[]>([{ title: 'Chapter 1', text: '' }])
  const [active, setActive] = useState(0)
  const [rights, setRights] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const txtRef = useRef<HTMLInputElement>(null)

  const totalWords = chapters.reduce((n, c) => n + wordCount(c.text), 0)
  const canPublish = title.trim() && description.trim() && totalWords >= 50 && rights && !busy

  const importTxt = async (file: File) => {
    const text = await file.text()
    const parts = text.split(/\n(?=\s*(?:chapter|part)\s+[\divxlc]+)/i)
    const next = parts.length > 1 ? parts.map((p, i) => { const [first, ...rest] = p.trim().split('\n'); return { title: first.trim().slice(0, 80) || `Chapter ${i + 1}`, text: rest.join('\n').trim() } }) : [{ title: chapters[active]?.title || 'Chapter 1', text }]
    setChapters(next); setActive(0); toast(`Imported ${next.length} chapter${next.length > 1 ? 's' : ''}`)
  }

  const doPublish = async () => {
    if (!canPublish) return
    setBusy(true)
    try {
      let coverUrl: string | undefined
      if (coverFile) coverUrl = (await api.upload<{ url: string }>('/api/books/covers', coverFile)).url
      const book = await api.post<Book>('/api/books/publish', {
        title: title.trim(), subtitle: subtitle.trim() || undefined, authorName: author.trim() || user.displayName, description: description.trim(), genre, language, moods, coverUrl,
        chapters: chapters.filter((c) => c.text.trim()).map((c, i) => ({ title: c.title.trim() || `Chapter ${i + 1}`, paragraphs: splitParagraphs(c.text) })),
      })
      invalidate('community-books', 'my-books', 'feed', 'profile')
      toast('Your book is live')
      nav(bookPath(book))
    } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow mb-1">Author tools</p><h1 className="text-3xl">Publish a book</h1><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Add a cover, a description and your chapters. You keep all rights; readers get it in the same reader as the classics.</p></div>
        <div className="flex gap-2"><input ref={txtRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && importTxt(e.target.files[0])} /><button onClick={() => txtRef.current?.click()} className="btn btn-secondary btn-sm"><Upload size={14} /> Import .txt</button></div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <div className="space-y-5">
          <div className="card p-4">
            <p className="label">Cover</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 20e6) return toast('Please use an image under 20 MB', 'error'); const small = await shrinkCover(f); setCoverFile(small); setCoverPreview(URL.createObjectURL(small)) }} />
            <button onClick={() => fileRef.current?.click()} className="group relative mx-auto block w-48 overflow-hidden rounded-lg border shadow-cover" style={{ borderColor: 'var(--border)' }}>
              {coverPreview ? <img src={coverPreview} alt="" className="aspect-[2/3] w-full object-cover" /> : <GeneratedCover title={title || 'Your title'} author={author} seed={title.length} />}
              <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"><ImagePlus size={16} /> {coverPreview ? 'Replace' : 'Upload'}</span>
            </button>
            <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>JPG or PNG, portrait, at least 600×900. No cover? We typeset one.</p>
          </div>
          <div className="card space-y-3 p-4">
            <div><label className="label">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="The title" /></div>
            <div><label className="label">Subtitle <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span></label><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="input" /></div>
            <div><label className="label">Author name</label><input value={author} onChange={(e) => setAuthor(e.target.value)} className="input" /></div>
            <div><label className="label">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="input resize-none" placeholder="What is it about, and who is it for? 2–4 sentences." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Genre</label><select value={genre} onChange={(e) => setGenre(e.target.value)} className="input">{[...GENRE_TOPICS.map((g) => g.name), 'Non-fiction', 'Memoir', 'Essays', 'Children'].map((g) => <option key={g}>{g}</option>)}</select></div>
              <div><label className="label">Language</label><select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">{LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            </div>
            <div><label className="label">Mood tags <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(up to 3)</span></label><div className="flex flex-wrap gap-1.5">{MOODS.map((m) => <MoodBadge key={m.key} mood={m.key} small active={moods.includes(m.key)} onClick={() => setMoods((x) => (x.includes(m.key) ? x.filter((y) => y !== m.key) : [...x, m.key].slice(-3)))} />)}</div></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card grid overflow-hidden md:grid-cols-[220px_1fr]">
            <aside className="border-b p-3 md:border-b-0 md:border-r" style={{ borderColor: 'var(--border)' }}>
              <div className="mb-2 flex items-center justify-between px-1"><p className="eyebrow">Chapters</p><span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{totalWords.toLocaleString()} words</span></div>
              <ol className="space-y-0.5">
                {chapters.map((c, i) => (
                  <li key={i} className={cn('group flex items-center gap-1 rounded-md', i === active && 'bg-[var(--bg-secondary)]')}>
                    <button onClick={() => setActive(i)} className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm">{i + 1}. {c.title || 'Untitled'}</button>
                    <span className="hidden gap-0.5 pr-1 group-hover:flex">
                      <button disabled={i === 0} onClick={() => { const n = [...chapters]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setChapters(n); setActive(i - 1) }} className="rounded p-1 hover:bg-[var(--bg-tertiary)] disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button disabled={i === chapters.length - 1} onClick={() => { const n = [...chapters]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setChapters(n); setActive(i + 1) }} className="rounded p-1 hover:bg-[var(--bg-tertiary)] disabled:opacity-30"><ChevronDown size={13} /></button>
                      <button disabled={chapters.length === 1} onClick={() => { const n = chapters.filter((_, j) => j !== i); setChapters(n); setActive(Math.max(0, Math.min(active, n.length - 1))) }} className="rounded p-1 hover:bg-[var(--bg-tertiary)] disabled:opacity-30"><Trash2 size={13} /></button>
                    </span>
                  </li>
                ))}
              </ol>
              <button onClick={() => { setChapters([...chapters, { title: `Chapter ${chapters.length + 1}`, text: '' }]); setActive(chapters.length) }} className="btn btn-ghost btn-sm mt-2 w-full justify-start"><Plus size={14} /> Add chapter</button>
            </aside>
            <div className="p-4 md:p-6">
              <input value={chapters[active]?.title ?? ''} onChange={(e) => setChapters(chapters.map((c, i) => (i === active ? { ...c, title: e.target.value } : c)))} placeholder="Chapter title" className="w-full bg-transparent text-2xl font-bold outline-none placeholder:opacity-40" />
              <textarea value={chapters[active]?.text ?? ''} onChange={(e) => setChapters(chapters.map((c, i) => (i === active ? { ...c, text: e.target.value } : c)))} placeholder="Paste or write the chapter. Separate paragraphs with a blank line." rows={22} className="mt-4 w-full resize-y bg-transparent font-title text-[17px] leading-[1.8] outline-none placeholder:opacity-40" />
              <p className="mt-2 text-right text-[11px]" style={{ color: 'var(--text-muted)' }}>{wordCount(chapters[active]?.text ?? '').toLocaleString()} words in this chapter</p>
            </div>
          </div>
          <div className="card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <label className="flex items-start gap-2.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-primary)]" /><span>I confirm this is my original work or I hold the rights to publish it, and it complies with the <Link to="/legal/terms" className="underline" target="_blank">Terms of Service</Link>. I keep the copyright.</span></label>
            <button onClick={doPublish} disabled={!canPublish} className="btn btn-primary btn-lg shrink-0"><BookOpen size={16} /> {busy ? 'Publishing…' : 'Publish book'}</button>
          </div>
        </div>
      </div>

      {(mine.data?.length ?? 0) > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl">Your published books</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.data!.map((b) => (
              <div key={b.id} className="card flex items-center gap-4 p-3">
                <Link to={bookPath(b)} className="w-14 shrink-0 overflow-hidden rounded shadow-cover"><BookCover book={b} rounded="rounded" /></Link>
                <div className="min-w-0 flex-1"><Link to={bookPath(b)} className="block truncate font-semibold">{b.title}</Link><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.selfPublished?.chapters} chapters · published {b.selfPublished ? timeAgo(b.selfPublished.publishedAt) : ''}</p><div className="mt-2 flex gap-2"><Link to={`/read/${b.id}`} className="btn btn-soft btn-sm">Read</Link><button onClick={async () => { if (confirm(`Unpublish “${b.title}”? This cannot be undone.`)) { await api.del(`/api/books/${b.id}`); invalidate('my-books', 'community-books', 'profile') } }} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-tertiary)' }}>Unpublish</button></div></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
