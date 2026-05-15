import { lazy, Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { useRealtimeSync } from '../hooks/useRealtimeSync'
import { NotificationsProvider } from '../contexts/NotificationsProvider'
import { TodosProvider } from '../contexts/TodosProvider'

const TodoSheet = lazy(() => import('./TodoSheet').then((m) => ({ default: m.TodoSheet })))
const InboxSheet = lazy(() => import('./InboxSheet').then((m) => ({ default: m.InboxSheet })))
const GlobalSearchDialog = lazy(() =>
  import('./GlobalSearchDialog').then((m) => ({ default: m.GlobalSearchDialog })),
)

/** CRM-only shell: auth, realtime, global panels — not loaded on /preview. */
export function CrmBootstrap() {
  const initialize = useAuthStore((s) => s.initialize)
  useRealtimeSync()

  useEffect(() => {
    void initialize()
  }, [initialize])

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
    <NotificationsProvider>
      <TodosProvider>
        <Outlet />
        <Suspense fallback={null}>
          <TodoSheet />
          <InboxSheet />
          <GlobalSearchDialog />
        </Suspense>
      </TodosProvider>
    </NotificationsProvider>
  )
}
