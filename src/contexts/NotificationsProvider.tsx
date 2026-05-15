import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { notificationsDb, type Notification } from '../lib/notificationsDb'
import { useAuthStore } from '../store/useAuthStore'

type NotificationsContextValue = {
  notifications: Notification[]
  loading: boolean
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  reload: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const profile = useAuthStore((s) => s.profile)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const realtimeOkRef = useRef(false)

  const load = useCallback(async () => {
    if (!profile?.id) return
    try {
      const data = await notificationsDb.fetchForUser(profile.id)
      setNotifications(data)
    } catch {
      // silent
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [profile?.id, load])

  // Slow polling only when Realtime is not connected
  useEffect(() => {
    if (!profile?.id) return
    const interval = setInterval(() => {
      if (!realtimeOkRef.current) void load()
    }, 300_000)
    return () => clearInterval(interval)
  }, [profile?.id, load])

  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            user_id: string
            actor_email: string
            type: string
            content: string
            linked_type: string | null
            linked_id: string | null
            context_url: string | null
            read: boolean
            created_at: string
          }
          if (row.user_id !== profile.id) return
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev
            const notif: Notification = {
              id: row.id,
              userId: row.user_id,
              actorEmail: row.actor_email,
              type: row.type,
              content: row.content,
              linkedType: row.linked_type,
              linkedId: row.linked_id,
              contextUrl: row.context_url,
              read: row.read,
              createdAt: row.created_at,
            }
            return [notif, ...prev]
          })
        },
      )
      .subscribe((status) => {
        realtimeOkRef.current = status === 'SUBSCRIBED'
      })

    return () => {
      realtimeOkRef.current = false
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await notificationsDb.markRead(id)
  }

  async function markAllRead() {
    if (!profile?.id) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await notificationsDb.markAllRead(profile.id)
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const value: NotificationsContextValue = {
    notifications,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    reload: load,
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}
