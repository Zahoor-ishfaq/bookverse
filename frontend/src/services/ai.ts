import type { Book, ParsedBook } from '@/types/book'

// Hugging Face inference with graceful local fallback. Without a key we
// build an extractive summary from the book text itself so the UI is never
// empty. Either way the UI only says "auto-generated".

const HF_KEY = import.meta.env.VITE_HF_API_KEY as string | undefined
const HF_URL = 'https://router.huggingface.co/hf-inference/models'

async function hf<T>(model: string, body: unknown): Promise<T> {
  const res = await fetch(`${HF_URL}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 503) throw new Error('warming')
  if (!res.ok) throw new Error(`HF ${res.status}`)
  return res.json()
}

function extractive(parsed: ParsedBook, paragraphs = 3): string[] {
  const body = parsed.chapters.filter((c) => c.title !== 'Front Matter')
  const pool = (body.length ? body : parsed.chapters).flatMap((c) => c.paragraphs).filter((p) => p.length > 220 && p.length < 900)
  if (!pool.length) return []
  const step = Math.max(1, Math.floor(pool.length / (paragraphs + 1)))
  return Array.from({ length: paragraphs }, (_, i) => pool[Math.min(pool.length - 1, (i + 1) * step)])
}

export interface SummaryResult {
  paragraphs: string[]
  source: 'huggingface' | 'fallback'
}

export async function summarize(book: Book, parsed: ParsedBook): Promise<SummaryResult> {
  const sample = extractive(parsed, 3)
  if (!HF_KEY) return { paragraphs: sample, source: 'fallback' }
  try {
    const out = await Promise.all(
      sample.map((p) => hf<{ summary_text: string }[]>('facebook/bart-large-cnn', { inputs: p, parameters: { max_length: 120, min_length: 40 } })),
    )
    return { paragraphs: out.map((o) => o[0]?.summary_text).filter(Boolean), source: 'huggingface' }
  } catch {
    return { paragraphs: sample, source: 'fallback' }
  }
}

export const WRITING_PROMPTS = [
  'Rewrite the last page of a book you love from the point of view of the furniture.',
  'A minor character from Pride and Prejudice starts a small business. Five hundred words.',
  'The creature from Frankenstein finds a library card. What does it borrow first?',
  'Two strangers on a train are reading the same book at the same page. Neither says anything. Write the silence.',
  'A lighthouse keeper receives a letter forty years late.',
  'Write the recipe Mrs. Bennet would have given if she had been asked about anything other than marriage.',
  'Sherlock Holmes takes a case in which nothing is wrong. Make it unbearable.',
]

export function writingPrompt(seed = Date.now()): string {
  return WRITING_PROMPTS[Math.floor(seed / 86_400_000) % WRITING_PROMPTS.length]
}

export const hasHFKey = Boolean(HF_KEY)
