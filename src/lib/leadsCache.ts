import type { Lead } from '../types'

let leadsCache: Lead[] | null = null
let leadsCacheUserId: string | null = null
let leadsCacheAt = 0

export const LEADS_CACHE_TTL_MS = 2 * 60_000

export function readLeadsCache(userId: string | undefined): Lead[] {
  if (!userId || leadsCacheUserId !== userId || !leadsCache) return []
  return leadsCache
}

export function writeLeadsCache(userId: string, data: Lead[]) {
  leadsCache = data
  leadsCacheUserId = userId
  leadsCacheAt = Date.now()
}

export function clearLeadsCache() {
  leadsCache = null
  leadsCacheUserId = null
  leadsCacheAt = 0
}

export function isLeadsCacheFresh(userId: string | undefined): boolean {
  if (!userId || leadsCacheUserId !== userId || !leadsCache) return false
  return Date.now() - leadsCacheAt < LEADS_CACHE_TTL_MS
}
