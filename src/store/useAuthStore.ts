import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase, withTimeout } from '../lib/supabase'
import type { UserProfile } from '../types'

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
    return (data as UserProfile) ?? null
  } catch {
    return null
  }
}

/** Listener must be registered synchronously before any await — otherwise a
 *  hanging `getSession` / profile fetch blocks registration and a successful
 *  login never updates this store (infinite spinner on `/`). */
let authListenerRegistered = false

export const useAuthStore = create<AuthStore>()((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    if (!authListenerRegistered) {
      authListenerRegistered = true
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const profile = await fetchProfileById(session.user.id)
          set({ session, profile, loading: false })
        } else {
          set({ session: null, profile: null, loading: false })
        }
      })
    }

    // Hard safety net: never let `loading` stay true beyond ~14s, regardless
    // of what supabase-internals do. Worst case the user is briefly logged
    // out and gets redirected to /login instead of staring at a spinner.
    const safety = setTimeout(() => {
      const s = useAuthStore.getState()
      if (s.loading) {
        console.warn('auth init safety timeout — forcing loading=false')
        set({ loading: false })
      }
    }, 14_000)

    try {
      const { data: { session }, error } = await withTimeout(supabase.auth.getSession(), 12_000)
      if (error) {
        console.warn('getSession error', error.message)
      }
      if (session) {
        const profile = await fetchProfileById(session.user.id)
        set({ session, profile, loading: false })
      } else {
        set({ session: null, profile: null, loading: false })
      }
    } catch (err) {
      // Time-out or netwerkfout: spinner niet eindeloos laten hangen.
      // `onAuthStateChange` kan daarna alsnog INITIAL_SESSION / SIGNED_IN afleveren.
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
    set({ session: null, profile: null })
  },

  refreshProfile: async () => {
    const { session } = get()
    if (!session) return
    const profile = await fetchProfileById(session.user.id)
    set({ profile })
  },
}))
