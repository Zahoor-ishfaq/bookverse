import { MOODS } from '@/data/seed'
import type { Mood } from '@/types/book'

export const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function timeUntil(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  if (diff <= 0) return 'ended'
  if (diff < 3600) return `${Math.ceil(diff / 60)}m left`
  if (diff < 86400) return `${Math.ceil(diff / 3600)}h left`
  return `${Math.ceil(diff / 86400)}d left`
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function moodMeta(m: Mood) {
  return MOODS.find((x) => x.key === m) ?? MOODS[5]
}

export const minutesLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim())

export function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
