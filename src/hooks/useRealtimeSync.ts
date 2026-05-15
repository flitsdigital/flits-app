import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { postFromRow } from '../lib/db'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'

/**
 * Houdt de lokale Zustand-store synchroon met Supabase Realtime.
 *
 * - posts:   INSERT / UPDATE / DELETE worden direct in de store verwerkt
 * - clients: bij elke wijziging volledige refetch (minder frequent, eenvoudiger)
 *
 * Vereiste (eenmalig in Supabase dashboard of via SQL):
 *   alter publication supabase_realtime add table posts;
 *   alter publication supabase_realtime add table clients;
 */
export function useRealtimeSync() {
  const accessToken = useAuthStore((s) => s.session?.access_token)
  const fetchClientsOnly = useStore((s) => s.fetchClientsOnly)
  const initialized = useStore((s) => s.initialized)

  useEffect(() => {
    if (!accessToken) return

    let clientDebounce: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel('crm-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          const { applyRemotePost } = useStore.getState()
          if (payload.eventType === 'INSERT') {
            applyRemotePost('insert', postFromRow(payload.new as never))
          } else if (payload.eventType === 'UPDATE') {
            applyRemotePost('update', postFromRow(payload.new as never))
          } else if (payload.eventType === 'DELETE') {
            applyRemotePost('delete', null, (payload.old as { id: string }).id)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          if (!initialized) return
          if (clientDebounce) clearTimeout(clientDebounce)
          clientDebounce = setTimeout(() => void fetchClientsOnly(), 400)
        },
      )
      .subscribe()

    return () => {
      if (clientDebounce) clearTimeout(clientDebounce)
      supabase.removeChannel(channel)
    }
  }, [accessToken, initialized, fetchClientsOnly])
}
