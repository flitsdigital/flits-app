import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import type { Client } from '../types'
import { computeClientStats, type ComputedClientStats } from '../lib/clientStats'

/** Statistieken voor één klant; leest invoices/posts uit de store. */
export function useClientStatsForClient(
  client: Client | undefined,
  weekRef?: Date,
): ComputedClientStats | null {
  const invoices = useStore((s) => s.clientInvoices)
  const posts = useStore((s) => s.posts)

  return useMemo(() => {
    if (!client) return null
    return computeClientStats(client, { invoices, posts, weekRef })
  }, [client, invoices, posts, weekRef])
}
