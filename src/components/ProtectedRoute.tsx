import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import type { AppPage } from '../types'

interface Props {
  page?: AppPage
}

export function ProtectedRoute({ page }: Props) {
  const { session, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-0">
        <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Page-level access check
  if (page && profile) {
    const isAdmin = profile.role === 'admin'
    const hasAccess = isAdmin || profile.allowed_pages.includes(page)
    if (!hasAccess) {
      const first = profile.allowed_pages[0]
      const to = first === 'dashboard' ? '/' : first ? `/${first}` : '/content'
      return <Navigate to={to} replace />
    }
  }

  return <Outlet />
}
