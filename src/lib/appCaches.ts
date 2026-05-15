import { createQueryCache } from './queryCache'
import { supabase, withTimeout } from './supabase'
import type { Project } from '../types'
import type { UserProfile } from '../types'

const MIN = 60_000

export type ProfileLite = {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
}

/** Shared team directory — used by mentions, projects, modals. */
export const profilesBasicCache = createQueryCache<ProfileLite[]>(5 * MIN)

/** Admin user lists (time tracking, travel). */
export const profilesAdminCache = createQueryCache<UserProfile[]>(5 * MIN)

export const projectsListCache = createQueryCache<Project[]>(2 * MIN)

export const projectTaskRefsCache = createQueryCache<Array<{ id: string; projectId: string }>>(2 * MIN)

export async function fetchProfilesBasicCached(): Promise<ProfileLite[]> {
  return profilesBasicCache.fetch(async () => {
    const { data, error } = await withTimeout(
      supabase.from('profiles').select('id, email, name, avatar_url').order('created_at'),
    )
    if (error) throw error
    return data ?? []
  })
}

export async function fetchProfilesAdminCached(): Promise<UserProfile[]> {
  return profilesAdminCache.fetch(async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('id, email, name, role, allowed_pages, allowed_features, avatar_url')
        .order('email'),
    )
    if (error) throw error
    return (data ?? []) as UserProfile[]
  })
}

/** Call on sign-out or after profile/team mutations. */
export function invalidateAppCaches() {
  profilesBasicCache.invalidate()
  profilesAdminCache.invalidate()
  projectsListCache.invalidate()
  projectTaskRefsCache.invalidate()
}
