/**
 * Lightweight in-memory cache: TTL + in-flight deduplication.
 * Use for Supabase reads that are shared across components.
 */

type Entry<T> = { data: T; fetchedAt: number }

export function createQueryCache<T>(ttlMs: number) {
  let entry: Entry<T> | null = null
  let inflight: Promise<T> | null = null

  function isFresh(): boolean {
    return !!entry && Date.now() - entry.fetchedAt < ttlMs
  }

  return {
    get(): T | null {
      return isFresh() ? entry!.data : null
    },

    getStale(): T | null {
      return entry?.data ?? null
    },

    set(data: T) {
      entry = { data, fetchedAt: Date.now() }
    },

    invalidate() {
      entry = null
      inflight = null
    },

    /** Return cached data or run fetch once (deduped). */
    async fetch(fn: () => Promise<T>): Promise<T> {
      const cached = this.get()
      if (cached !== null) return cached
      if (inflight) return inflight

      inflight = fn()
        .then((data) => {
          this.set(data)
          return data
        })
        .finally(() => {
          inflight = null
        })

      return inflight
    },

    /** Stale-while-revalidate: return stale immediately, refresh in background. */
    async fetchSWR(
      fn: () => Promise<T>,
      opts?: { force?: boolean },
    ): Promise<T> {
      const stale = entry?.data
      if (!opts?.force && isFresh() && stale !== undefined) return stale

      if (!opts?.force && stale !== undefined && !inflight) {
        void this.fetch(fn).catch(() => {})
        return stale
      }

      return this.fetch(fn)
    },
  }
}
