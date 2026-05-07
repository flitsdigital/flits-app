import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { Timeline } from './pages/Timeline'
import { Content } from './pages/Content'
import { PostPreview } from './pages/PostPreview'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { useAuthStore } from './store/useAuthStore'
import { useStore } from './store/useStore'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const session = useAuthStore((s) => s.session)
  const fetchClients = useStore((s) => s.fetchClients)

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (session) fetchClients()
  }, [session])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
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

            {/* Settings: admin only */}
            <Route path="settings" element={<Settings />} />

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
