import type { Chapter, ParsedBook } from '@/types/book'

// Strips Project Gutenberg boilerplate and splits a plain-text book into
// chapters. Falls back to evenly sized sections when no headings are found.

const START_RE = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i
const END_RE = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i

const HEADING_RE =
  /^\s*(?:(?:CHAPTER|Chapter|BOOK|Book|PART|Part|LETTER|Letter|STAVE|Stave|CANTO|Canto|ACT|Act|SCENE|Scene)\s+(?:[IVXLC]+|\d+|[A-Za-z-]+)\b[^\n]{0,80}|(?:[IVXLC]{1,6}|\d{1,3})\.?\s*$|(?:PROLOGUE|EPILOGUE|PREFACE|INTRODUCTION|CONCLUSION)\b[^\n]{0,60})\s*$/

function stripBoilerplate(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n')
  const s = text.search(START_RE)
  if (s >= 0) {
    const lineEnd = text.indexOf('\n', s)
    text = text.slice(lineEnd + 1)
  }
  const e = text.search(END_RE)
  if (e >= 0) text = text.slice(0, e)
  return text.trim()
}

function toParagraphs(block: string): string[] {
  return block
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((p) => p.length > 0)
}

function countWords(paragraphs: string[]) {
  return paragraphs.reduce((n, p) => n + p.split(/\s+/).length, 0)
}

function prettifyHeading(h: string) {
  const t = h.trim().replace(/\s+/g, ' ')
  if (/^[IVXLC\d.]+$/.test(t)) return `Chapter ${t.replace('.', '')}`
  // Title-case shouty headings
  if (t === t.toUpperCase() && t.length > 4) {
    return t
      .toLowerCase()
      .replace(/(^|\s)([a-z])/g, (_, s, c) => s + c.toUpperCase())
      .replace(/\b(Iv|Vi|Vii|Viii|Ix|Xi|Xii|Xiii|Xiv|Xv|Xvi|Xvii|Xviii|Xix|Xx|Ii|Iii)\b/g, (m) => m.toUpperCase())
  }
  return t
}

export function parseBook(raw: string): ParsedBook {
  const text = stripBoilerplate(raw)
  const lines = text.split('\n')

  // Find heading line indexes. Require a blank line before and after so
  // in-sentence mentions like "Chapter 3 was..." don't split the text.
  const marks: { line: number; title: string }[] = []
  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i]
    if (line.trim().length === 0 || line.length > 90) continue
    if (lines[i - 1].trim() !== '' || (lines[i + 1].trim() !== '' && !/^\s*[A-Z][^\n]{0,70}$/.test(lines[i + 1])))
      continue
    if (HEADING_RE.test(line)) marks.push({ line: i, title: prettifyHeading(line) })
  }

  // Skip an early table of contents: if the first N marks are packed closely, drop them.
  let start = 0
  while (start < marks.length - 1 && marks[start + 1].line - marks[start].line < 4) start++
  if (start > 0 && start < marks.length) marks.splice(0, start)

  const chapters: Chapter[] = []
  if (marks.length >= 3) {
    // Front matter before first heading
    const front = toParagraphs(lines.slice(0, marks[0].line).join('\n'))
    if (countWords(front) > 120) chapters.push({ index: 0, title: 'Front Matter', paragraphs: front, words: countWords(front) })
    for (let m = 0; m < marks.length; m++) {
      const from = marks[m].line + 1
      const to = m + 1 < marks.length ? marks[m + 1].line : lines.length
      const paragraphs = toParagraphs(lines.slice(from, to).join('\n'))
      if (paragraphs.length === 0) continue
      const words = countWords(paragraphs)
      // Merge trivially short "chapters" (usually stray subtitles) into next.
      if (words < 40 && chapters.length && m + 1 < marks.length) continue
      chapters.push({ index: chapters.length, title: marks[m].title, paragraphs, words })
    }
  }

  if (chapters.length < 2) {
    // Fallback: slice into ~2400-word sections
    const paragraphs = toParagraphs(text)
    let bucket: string[] = []
    let words = 0
    let idx = 0
    const flush = () => {
      if (!bucket.length) return
      chapters.push({ index: idx, title: `Part ${idx + 1}`, paragraphs: bucket, words })
      idx++
      bucket = []
      words = 0
    }
    chapters.length = 0
    for (const p of paragraphs) {
      bucket.push(p)
      words += p.split(/\s+/).length
      if (words >= 2400) flush()
    }
    flush()
  }

  // A tiny first "chapter" is almost always the tail of a table of contents.
  while (chapters.length > 1 && chapters[0].words < 120) chapters.shift()
  chapters.forEach((c, i) => (c.index = i))
  return { chapters, totalWords: chapters.reduce((n, c) => n + c.words, 0) }
}

export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 230))
