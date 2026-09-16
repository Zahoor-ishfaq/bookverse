import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, Search, TrendingUp } from 'lucide-react'
import { Avatar, Tabs } from '@/components/ui'
import { BookListItem } from '@/components/book/BookCard'
import { StoryCard } from '@/components/story/StoryCard'
import { useBookList } from '@/hooks/useBooks'
import { useSearch } from '@/hooks/useCommunity'
import { useLibrary } from '@/store/libraryStore'
import { usePeople } from '@/store/peopleStore'
import { cn, formatNumber } from '@/lib/utils'
import { useSEO } from '@/lib/seo'

type Tab = 'books' | 'users' | 'stories' | 'clubs'
const POPULAR = ['dorian gray', 'jane austen', 'sherlock', 'philosophy', 'ghost stories', 'dostoevsky', 'poetry']

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  useSEO({ title: q ? `Search: ${q}` : 'Search', noindex: true })
  const [draft, setDraft] = useState(q)
  const [tab, setTab] = useState<Tab>('books')
  const history = useLibrary((s) => s.searchHistory)
  const pushSearch = useLibrary((s) => s.pushSearch)
  const [debounced, setDebounced] = useState(q)
  useEffect(() => { const t = setTimeout(() => setDebounced(draft.trim()), 350); return () => clearTimeout(t) }, [draft])
  useEffect(() => { if (debounced && debounced !== q) setParams({ q: debounced }, { replace: true }) }, [debounced, q, setParams])
  useEffect(() => { if (q) pushSearch(q) }, [q, pushSearch])

  const books = useBookList({ search: q }, q.length > 1)
  const social = useSearch(q)
  const person = usePeople((social.data?.stories ?? []).map((s) => s.authorId))
  const communityBooks = social.data?.communityBooks ?? []

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3 rounded-full border p-2 pl-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Books, people, stories, clubs…" className="w-full bg-transparent text-lg outline-none" />
      </div>
      {!q ? (
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div><p className="eyebrow mb-3 flex items-center gap-1"><Clock size={12} /> Recent</p><div className="flex flex-wrap gap-2">{history.map((h) => <button key={h} onClick={() => setDraft(h)} className="chip">{h}</button>)}{history.length === 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No searches yet.</span>}</div></div>
          <div><p className="eyebrow mb-3 flex items-center gap-1"><TrendingUp size={12} /> Popular this week</p><div className="flex flex-wrap gap-2">{POPULAR.map((h) => <button key={h} onClick={() => setDraft(h)} className="chip">{h}</button>)}</div></div>
        </div>
      ) : (
        <div className="mt-6">
          <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'books', label: 'Books', count: (books.data?.count ?? 0) + communityBooks.length }, { key: 'users', label: 'People', count: social.data?.users.length }, { key: 'stories', label: 'Stories', count: social.data?.stories.length }, { key: 'clubs', label: 'Clubs', count: social.data?.clubs.length }]} />
          <div className="pt-6">
            {tab === 'books' && (
              <div className="space-y-4">
                {communityBooks.length > 0 && <div><p className="eyebrow mb-2">Published on BookVerse</p><div className="card-flat divide-y p-2" style={{ borderColor: 'var(--border)' }}>{communityBooks.map((b) => <BookListItem key={b.id} book={b} right={<span className="stamp">Member book</span>} />)}</div></div>}
                <div>
                  {communityBooks.length > 0 && <p className="eyebrow mb-2">Catalogue</p>}
                  {books.isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
                    : books.data?.books.length ? <div className="card-flat divide-y p-2" style={{ borderColor: 'var(--border)' }}>{books.data.books.map((b) => <BookListItem key={b.id} book={b} right={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatNumber(b.download_count)} reads</span>} />)}</div>
                    : books.isError ? <Empty text="The catalogue search is slow right now. Try again in a moment." /> : communityBooks.length === 0 ? <Empty /> : null}
                </div>
              </div>
            )}
            {tab === 'users' && (social.data?.users.length ? <ul className="grid gap-3 sm:grid-cols-2">{social.data.users.map((u) => <li key={u.id}><Link to={`/u/${u.username}`} className="card flex items-center gap-3 p-4"><Avatar user={u} size={44} /><span className="min-w-0"><span className="block truncate font-semibold">{u.displayName}</span><span className="block truncate text-xs" style={{ color: 'var(--text-muted)' }}>u/{u.username} · {formatNumber(u.followers)} followers</span></span></Link></li>)}</ul> : <Empty />)}
            {tab === 'stories' && (social.data?.stories.length ? <div className="grid gap-4 sm:grid-cols-2">{social.data.stories.map((s) => <StoryCard key={s.id} story={s} compact author={person(s.authorId)} />)}</div> : <Empty />)}
            {tab === 'clubs' && (social.data?.clubs.length ? <ul className="grid gap-3 sm:grid-cols-2">{social.data.clubs.map((c) => <li key={c.id}><Link to={`/community/clubs/${c.id}`} className="card flex items-center gap-3 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: c.coverColor }}>{c.coverEmoji}</span><span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{c.memberCount} members</span></span></Link></li>)}</ul> : <Empty />)}
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ text = 'Try another spelling, or fewer words.' }: { text?: string }) { return <div className={cn('card px-6 py-12 text-center')}><p className="text-lg font-semibold">Nothing here</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p></div> }
