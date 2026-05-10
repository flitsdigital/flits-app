import { useState, useEffect, useCallback, useRef } from 'react'
import { notificationsDb, type Notification } from '../lib/notificationsDb'
import { useAuthStore } from '../store/useAuthStore'

const POLL_INTERVAL = 30_000

export function useNotifications() {
  const profile = useAuthStore((s) => s.profile)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    intervalRef.current = setInterval(load, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [profile?.id, load])

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

  return { notifications, loading, unreadCount, markRead, markAllRead, reload: load }
}
