// BookVerse mark: an open book whose gutter forms a "V", with a bookmark
// ribbon. Works from 16px favicon up to hero size; single accent + white.
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--accent-primary, #1B6B4A)" />
      {/* left page */}
      <path d="M12 20c6-3 12-3 18 1v25c-6-4-12-4-18-1z" fill="#fff" />
      {/* right page */}
      <path d="M52 20c-6-3-12-3-18 1v25c6-4 12-4 18-1z" fill="#fff" fillOpacity=".92" />
      {/* page lines */}
      <path d="M17 27c3-1 6-1 9 0M17 32c3-1 6-1 9 0M17 37c3-1 6-1 9 0M38 27c3-1 6-1 9 0M38 32c3-1 6-1 9 0M38 37c3-1 6-1 9 0" stroke="var(--accent-primary, #1B6B4A)" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* spine / V */}
      <path d="M30 21l2 3 2-3v25l-2 3-2-3z" fill="var(--accent-primary, #1B6B4A)" fillOpacity=".25" />
      {/* bookmark ribbon */}
      <path d="M41 12h8v16l-4-3-4 3z" fill="#C8962B" />
    </svg>
  )
}

export function BrandLockup({ size = 30, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <BrandMark size={size} />
      {wordmark && <span className="text-lg font-extrabold tracking-tight">Book<span style={{ color: 'var(--accent-primary)' }}>Verse</span></span>}
    </span>
  )
}
