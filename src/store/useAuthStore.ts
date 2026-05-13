import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase, withTimeout } from '../lib/supabase'
import type { UserProfile } from '../types'

const PROFILE_CACHE_KEY = 'flits-cached-profile'

interface AuthStore {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

async function fetchProfileById(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('profiles').select('*').eq('id', userId).single(),
      12_000,
    )
    if (error) return null
    const profile = (data as UserProfile) ?? null
    // Cache for instant next load
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
    return profile
  } catch {
    return null
  }
}

/** Read cached profile synchronously from localStorage — no network needed. */
function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

/**
 * Check if Supabase has ANY session stored locally — expired or not.
 * Supabase stores sessions under keys matching `sb-*-auth-token`.
 * We intentionally ignore expiry here: if a token is expired, Supabase will
 * refresh it automatically via the refresh_token when `getSession()` is
 * called. Skipping an expired token causes the store to start with
 * loading=true and forces a network round-trip on every cold start
 * (e.g. opening the browser in the morning after the 1h access-token
 * lifetime). Returning it instead lets the UI render immediately while
 * the token refresh happens silently in the background.
 */
function getLocalSession(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Session
      // Any stored session with an access_token is good enough to render
      if (parsed.access_token) return parsed
    }
    return null
  } catch {
    return null
  }
}

/** Listener must be registered synchronously before any await — otherwise a
 *  hanging `getSession` / profile fetch blocks registration and a successful
 *  login never updates this store (infinite spinner on `/`). */
let authListenerRegistered = false

// Read from cache synchronously so the initial state is already hydrated.
const cachedSession = getLocalSession()
const cachedProfile = cachedSession ? getCachedProfile() : null

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // If we have a valid cached session, start non-loading immediately.
  session: cachedSession,
  profile: cachedProfile,
  loading: !cachedSession, // only show spinner on first-ever load

  initialize: async () => {
    if (!authListenerRegistered) {
      authListenerRegistered = true
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const profile = await fetchProfileById(session.user.id)
          if (profile) {
            set({ session, profile, loading: false })
          } else {
            set((s) => ({ ...s, session, loading: false }))
          }
        } else {
          set({ session: null, profile: null, loading: false })
        }
      })

      const handleResume = () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) set((s) => ({ ...s, session }))
        }).catch(() => {})
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') handleResume()
      })
      window.addEventListener('online', handleResume)
    }

    // Safety net: cap the spinner at 8s (reduced from 14s)
    const safety = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('auth init safety timeout — forcing loading=false')
        set({ loading: false })
      }
    }, 8_000)

    try {
      const { data: { session }, error } = await withTimeout(supabase.auth.getSession(), 8_000)
      if (error) console.warn('getSession error', error.message)

      if (session) {
        // Refresh profile in background — don't block if we already have a cached one
        const hasCached = !!get().profile
        if (hasCached) {
          // Show immediately, refresh profile silently
          set({ session, loading: false })
          fetchProfileById(session.user.id).then((profile) => {
            if (profile) set((s) => ({ ...s, profile }))
          })
        } else {
          const profile = await fetchProfileById(session.user.id)
          set({ session, profile: profile ?? get().profile, loading: false })
        }
      } else {
        // No valid session — clear cache and send to login
        localStorage.removeItem(PROFILE_CACHE_KEY)
        set({ session: null, profile: null, loading: false })
      }
    } catch (err) {
      console.warn('auth initialize timeout', err)
      set((s) => (s.loading ? { ...s, loading: false } : s))
    } finally {
      clearTimeout(safety)
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(PROFILE_CACHE_KEY)
    set({ session: null, profile: null })
  },

  refreshProfile: async () => {
    const { session } = get()
    if (!session) return
    const profile = await fetchProfileById(session.user.id)
    set({ profile })
  },
}))
