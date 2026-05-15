import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { shouldRefetchClients } from '../lib/storeFreshness'

/** Loads clients/posts/invoices once per session after auth is ready. */
export function useStoreBootstrap() {
  const authReady = useAuthStore((s) => s.authReady)
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const initialized = useStore((s) => s.initialized)
  const fetchClients = useStore((s) => s.fetchClients)
  const fetchClientsOnly = useStore((s) => s.fetchClientsOnly)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (authReady && sessionUserId && !initialized) {
      void fetchClients()
    }
  }, [authReady, sessionUserId, initialized, fetchClients])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible' || !sessionUserId || !initialized) return
      if (!shouldRefetchClients()) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => void fetchClientsOnly(), 800)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sessionUserId, initialized, fetchClientsOnly])
}
