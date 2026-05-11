import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { notificationsDb, type Notification } from '../lib/notificationsDb'
import { useAuthStore } from '../store/useAuthStore'

export function useNotifications() {
  const profile = useAuthStore((s) => s.profile)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.id) return
    try {
      const data = await notificationsDb.fetchForUser(profile.id)
      setNotifications(data)
    } catch {
      // silent
    }
  }, [profile?.id])

  // Initial load
  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [profile?.id, load])

  // Polling fallback: re-fetch every 15 s to catch notifications when
  // the Realtime WebSocket is unavailable (e.g. JWT issues, network).
  useEffect(() => {
    if (!profile?.id) return
    const interval = setInterval(load, 15_000)
    return () => clearInterval(interval)
  }, [profile?.id, load])

  // Realtime: new INSERT → prepend immediately (best-effort, supplements polling)
  useEffect(() => {
    if (!profile?.id) return

    // Unique channel name per mount avoids React Strict Mode reuse issues
    const channelName = `notifications:${profile.id}:${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
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
            // Deduplicate: polling may have already added this row
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
      .subscribe()

    return () => {
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

  return { notifications, loading, unreadCount, markRead, markAllRead, reload: load }
}
