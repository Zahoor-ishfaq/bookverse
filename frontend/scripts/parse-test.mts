import { readFileSync } from 'node:fs'
import { parseBook } from '../src/lib/parseBook'
const t = readFileSync(process.argv[2], 'utf-8')
const p = parseBook(t)
console.log('chapters:', p.chapters.length, 'words:', p.totalWords)
console.log(p.chapters.slice(0, 8).map(c => `${c.index}: ${c.title} (${c.words}w)`).join('\n'))
