import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { Timeline } from './pages/Timeline'
import { Content } from './pages/Content'
import { PostPreview } from './pages/PostPreview'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Settings } from './pages/Settings'
import { TravelExpenses } from './pages/TravelExpenses'
import { TimeTracking } from './pages/TimeTracking'
import { Projects } from './pages/Projects'
import { TaskDetail } from './pages/TaskDetail'
import { Leads } from './pages/Leads'
import { LeadDetail } from './pages/LeadDetail'
import { ScrollToTop } from './components/ScrollToTop'
import { TodoSheet } from './components/TodoSheet'
import { InboxSheet } from './components/InboxSheet'
import { GlobalSearchDialog } from './components/GlobalSearchDialog'
import { useAuthStore } from './store/useAuthStore'
import { useStore } from './store/useStore'
import { useUIStore } from './store/useUIStore'
import { useRealtimeSync } from './hooks/useRealtimeSync'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const authReady = useAuthStore((s) => s.authReady)
  const fetchClients = useStore((s) => s.fetchClients)

  useRealtimeSync()

  useEffect(() => {
    initialize()
  }, [])

  // Fetch when auth is ready AND a session exists. authReady alone is not enough:
  // on a fresh visit initialize() sets authReady=true before login, so we must
  // re-fetch when sessionUserId appears after signIn (not only on page refresh).
  useEffect(() => {
    if (authReady && sessionUserId) fetchClients()
  }, [authReady, sessionUserId, fetchClients])

  // Re-fetch core data when the tab becomes visible or network comes back.
  // This prevents stale/empty state after the browser paused the tab.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && sessionUserId) {
        fetchClients()
      }
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [sessionUserId, fetchClients])

  // Global T shortcut to toggle todo panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element).tagName
      if (e.key === 't' && !['INPUT', 'TEXTAREA'].includes(tag) && !e.metaKey && !e.ctrlKey) {
        useUIStore.getState().toggleTodo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="preview/:postId" element={<PostPreview />} />

        {/* Protected shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>

            {/* Per-page access */}
            <Route element={<ProtectedRoute page="dashboard" />}>
              <Route index element={<Dashboard />} />
            </Route>

            <Route element={<ProtectedRoute page="clients" />}>
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
            </Route>

            <Route element={<ProtectedRoute page="timeline" />}>
              <Route path="timeline" element={<Timeline />} />
            </Route>

            <Route element={<ProtectedRoute page="content" />}>
              <Route path="content" element={<Content />} />
            </Route>

            <Route element={<ProtectedRoute page="reiskosten" />}>
              <Route path="reiskosten" element={<TravelExpenses />} />
            </Route>

            <Route element={<ProtectedRoute page="time_tracking" />}>
              <Route path="uren" element={<TimeTracking />} />
            </Route>

            <Route element={<ProtectedRoute page="projects" />}>
              <Route path="projects" element={<Projects />} />
              <Route path="projecten/:projectId/taken/:taskId" element={<TaskDetail />} />
            </Route>

            <Route element={<ProtectedRoute page="leads" />}>
              <Route path="leads" element={<Leads />} />
              <Route path="leads/:id" element={<LeadDetail />} />
            </Route>

            {/* Settings: accessible to all logged-in users (page guards admin sections internally) */}
            <Route path="settings" element={<Settings />} />

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global panels — rendered outside Layout so they're always available */}
      <TodoSheet />
      <InboxSheet />
      <GlobalSearchDialog />

      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}
