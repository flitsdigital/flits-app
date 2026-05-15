/** Timestamps for Zustand store refetch throttling (tab focus / realtime). */

let clientsSyncedAt = 0
let fullBootstrapAt = 0

export const STORE_CLIENTS_TTL_MS = 90_000
export const STORE_FULL_TTL_MS = 3 * 60_000

export function markClientsSynced() {
  clientsSyncedAt = Date.now()
}

export function markFullBootstrap() {
  const now = Date.now()
  clientsSyncedAt = now
  fullBootstrapAt = now
}

export function shouldRefetchClients(): boolean {
  return Date.now() - clientsSyncedAt > STORE_CLIENTS_TTL_MS
}

export function shouldFullBootstrap(): boolean {
  return Date.now() - fullBootstrapAt > STORE_FULL_TTL_MS
}

export function resetStoreFreshness() {
  clientsSyncedAt = 0
  fullBootstrapAt = 0
}
