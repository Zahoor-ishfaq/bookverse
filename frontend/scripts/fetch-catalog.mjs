// Snapshots the most popular English books from Gutendex into public/catalog.json
// so Discover, Home and Landing paint instantly without a network round-trip.
// Run: npm run catalog   (re-run occasionally; the catalogue changes slowly)
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
if (args.includes('--if-missing') && existsSync('public/catalog.json')) { console.log('catalog.json present, skipping'); process.exit(0) }
const PAGES = Number(args.find((a) => /^\d+$/.test(a)) ?? 20) // 32 books per page
const MUST_HAVE = [1342,84,2701,1661,11,174,1399,996,98,345,43,1952,76,5200,64317,2554,158,1260,768,120,1184,36,35,55,1497,1727,2591,28054,219,1400,205,514,74,145,161,2542,1513,46,1257,829,600,16,113,2680,25344,6130,215,844,105,2500,67979,16389,2852,1232,132,16328,2148]

const trim = (b) => ({
  id: b.id,
  title: b.title,
  authors: b.authors,
  subjects: b.subjects.slice(0, 8),
  bookshelves: b.bookshelves.slice(0, 6),
  languages: b.languages,
  download_count: b.download_count,
  copyright: b.copyright,
  summaries: b.summaries?.length ? [b.summaries[0].slice(0, 600)] : undefined,
  formats: Object.fromEntries(Object.entries(b.formats).filter(([k]) => k === 'image/jpeg' || k.startsWith('text/plain'))),
})

// curl is used instead of fetch: undici's connection reuse stalls against this
// host after a handful of requests, curl does not.
const get = async (url) => {
  for (let i = 0; i < 4; i++) {
    try {
      const out = execFileSync('curl', ['-sS', '--max-time', '30', '-A', 'bookverse-catalog/1.0', url], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
      return JSON.parse(out)
    } catch (e) { console.error(`retry ${i + 1}: ${String(e.message).split(String.fromCharCode(10))[0]}`) }
    await new Promise((r) => setTimeout(r, 12000 * (i + 1)))
  }
  return null
}

const books = new Map()
for (let p = 1; p <= PAGES; p++) {
  const data = await get(`https://gutendex.com/books/?languages=en&mime_type=text/plain&sort=popular&page=${p}`)
  if (!data) { console.error('giving up at page ' + p + '; writing what we have'); break }
  for (const b of data.results) books.set(b.id, trim(b))
  console.log('page ' + p + '/' + PAGES + ' -> ' + books.size + ' books')
  if (!data.next) break
  await new Promise((r) => setTimeout(r, 2500)) // the API throttles bursts
}
const missing = MUST_HAVE.filter((id) => !books.has(id))
for (let i = 0; i < missing.length; i += 30) {
  await new Promise((r) => setTimeout(r, 3000))
  const data = await get(`https://gutendex.com/books/?ids=${missing.slice(i, i + 30).join(',')}`)
  if (data) for (const b of data.results) books.set(b.id, trim(b))
}
const out = { generatedAt: new Date().toISOString(), count: books.size, results: [...books.values()].sort((a, b) => b.download_count - a.download_count) }
mkdirSync('public', { recursive: true })
writeFileSync('public/catalog.json', JSON.stringify(out))
console.log(`\nwrote public/catalog.json — ${out.count} books, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`)
