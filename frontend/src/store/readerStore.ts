import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReaderFont = 'Lora' | 'Georgia' | 'Inter' | 'System'
export type ReaderTheme = 'warm' | 'white' | 'sepia' | 'dark'

interface ReaderState {
  font: ReaderFont
  fontSize: number
  lineHeight: number
  theme: ReaderTheme
  set: (patch: Partial<Omit<ReaderState, 'set'>>) => void
}

export const useReader = create<ReaderState>()(
  persist(
    (set) => ({
      font: 'Lora',
      fontSize: 19,
      lineHeight: 1.8,
      theme: 'warm',
      set: (patch) => set(patch),
    }),
    { name: 'bookverse.reader' },
  ),
)

interface UIState {
  dark: boolean
  lang: 'en' | 'ar'
  toggleDark: () => void
  toggleLang: () => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      dark: false,
      lang: 'en',
      toggleDark: () => set((s) => ({ dark: !s.dark })),
      toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'ar' : 'en' })),
    }),
    { name: 'bookverse.ui' },
  ),
)
