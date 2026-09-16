import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { CookieConsent } from '@/components/legal/CookieConsent'
import { loadCatalog } from '@/services/catalog'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui'
import { useUI } from '@/store/readerStore'
import { useAuth } from '@/store/authStore'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const DiscoverPage = lazy(() => import('@/pages/discover/DiscoverPage'))
const BookDetailPage = lazy(() => import('@/pages/book/BookDetailPage'))
const BookReaderPage = lazy(() => import('@/pages/book/BookReaderPage'))
const MyShelfPage = lazy(() => import('@/pages/profile/MyShelfPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const CommunityPage = lazy(() => import('@/pages/community/CommunityPage'))
const BookClubPage = lazy(() => import('@/pages/community/BookClubPage'))
const ReadingRoomPage = lazy(() => import('@/pages/community/ReadingRoomPage'))
const DebatePage = lazy(() => import('@/pages/community/DebatePage'))
const StoriesPage = lazy(() => import('@/pages/stories/StoriesPage'))
const StoryDetailPage = lazy(() => import('@/pages/stories/StoryDetailPage'))
const WriteStoryPage = lazy(() => import('@/pages/stories/WriteStoryPage'))
const DiaryPage = lazy(() => import('@/pages/diary/DiaryPage'))
const ChallengesPage = lazy(() => import('@/pages/challenges/ChallengesPage'))
const SearchPage = lazy(() => import('@/pages/search/SearchPage'))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const PublishBookPage = lazy(() => import('@/pages/publish/PublishBookPage'))
const TermsPage = lazy(() => import('@/pages/legal/LegalPages').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('@/pages/legal/LegalPages').then((m) => ({ default: m.PrivacyPage })))
const CookiesPage = lazy(() => import('@/pages/legal/LegalPages').then((m) => ({ default: m.CookiesPage })))
const HelpPage = lazy(() => import('@/pages/legal/LegalPages').then((m) => ({ default: m.HelpPage })))
const AboutPage = lazy(() => import('@/pages/legal/LegalPages').then((m) => ({ default: m.AboutPage })))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))
const NotFoundPage = lazy(() => import('@/pages/legal/LegalPages').then((m) => ({ default: m.NotFoundPage })))
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage'))
const AuthPages = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.RegisterPage })))
const ForgotPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.ForgotPage })))
const ResetPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.ResetPage })))
const VerifyPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.VerifyPage })))

const DAY = 864e5
const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, gcTime: DAY } } })
// Only catalogue metadata survives reloads. Community data is always fresh; book texts live in IndexedDB.
const persister = createSyncStoragePersister({ storage: typeof window !== 'undefined' ? window.localStorage : undefined, key: 'bookverse.cache', throttleTime: 1500 })
const persistOptions = { persister, maxAge: DAY, buster: 'v3', dehydrateOptions: { shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { status: string } }) => q.state.status === 'success' && ['book', 'books', 'catalog'].includes(String(q.queryKey[0])) } }

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="font-quote text-2xl italic" style={{ color: 'var(--text-muted)' }}>Turning the page…</p>
    </div>
  )
}

function ThemeSync() {
  const dark = useUI((s) => s.dark)
  const lang = useUI((s) => s.lang)
  const init = useAuth((s) => s.init)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.lang = lang
  }, [dark, lang])
  useEffect(() => { init(); loadCatalog() }, [init])
  return null
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const user = useAuth((s) => s.user)
  const ready = useAuth((s) => s.ready)
  const loc = useLocation()
  if (!ready && !user) return <PageFallback />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}

export default function App() {
  return (
    <PersistQueryClientProvider client={qc} persistOptions={persistOptions}>
      <BrowserRouter>
        <ThemeSync />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPages />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot" element={<ForgotPage />} />
            <Route path="/reset" element={<ResetPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
            <Route path="/read/:id" element={<BookReaderPage />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/books/:id" element={<BookDetailPage />} />
              <Route path="/books/:id/:slug" element={<BookDetailPage />} />
              <Route path="/shelf" element={<RequireAuth><MyShelfPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/clubs/:id" element={<BookClubPage />} />
              <Route path="/community/rooms/:id" element={<ReadingRoomPage />} />
              <Route path="/community/debates/:id" element={<DebatePage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/stories/write" element={<WriteStoryPage />} />
              <Route path="/stories/:id" element={<StoryDetailPage />} />
              <Route path="/diary" element={<DiaryPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/publish" element={<RequireAuth><PublishBookPage /></RequireAuth>} />
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/cookies" element={<CookiesPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
                      </Routes>
        </Suspense>
        <Toaster />
        <CookieConsent />
      </BrowserRouter>
    </PersistQueryClientProvider>
  )
}
