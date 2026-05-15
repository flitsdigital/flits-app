import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchProfilesAdminCached,
  fetchProfilesBasicCached,
  PROFILES_INVALIDATE_EVENT,
  type ProfileLite,
} from '../lib/appCaches'
import { useAuthStore } from '../store/useAuthStore'
import type { UserProfile } from '../types'

type ProfilesContextValue = {
  /** Team directory (mentions, assignees, avatars). */
  profiles: ProfileLite[]
  /** Full profiles for admin pickers (uren/reiskosten/settings). */
  adminProfiles: UserProfile[]
  byId: Map<string, ProfileLite>
  byEmail: Map<string, ProfileLite>
  loading: boolean
  refresh: () => Promise<void>
  profileById: (id: string) => ProfileLite | undefined
  profileByEmail: (email: string) => ProfileLite | undefined
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null)

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const authReady = useAuthStore((s) => s.authReady)
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const allowedPages = profile?.allowed_pages ?? []
  const needsAdminDirectory =
    isAdmin ||
    allowedPages.includes('time_tracking') ||
    allowedPages.includes('reiskosten')

  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [adminProfiles, setAdminProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!authReady || !sessionUserId) return
    setLoading(true)
    try {
      const basic = await fetchProfilesBasicCached()
      setProfiles(basic)
      if (needsAdminDirectory) {
        const admin = await fetchProfilesAdminCached()
        setAdminProfiles(admin)
      } else {
        setAdminProfiles([])
      }
    } finally {
      setLoading(false)
    }
  }, [authReady, sessionUserId, needsAdminDirectory])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onInvalidate = () => void load()
    window.addEventListener(PROFILES_INVALIDATE_EVENT, onInvalidate)
    return () => window.removeEventListener(PROFILES_INVALIDATE_EVENT, onInvalidate)
  }, [load])

  const byId = useMemo(() => {
    const m = new Map<string, ProfileLite>()
    for (const p of profiles) m.set(p.id, p)
    return m
  }, [profiles])

  const byEmail = useMemo(() => {
    const m = new Map<string, ProfileLite>()
    for (const p of profiles) {
      m.set(p.email.toLowerCase(), p)
    }
    return m
  }, [profiles])

  const value = useMemo<ProfilesContextValue>(
    () => ({
      profiles,
      adminProfiles,
      byId,
      byEmail,
      loading,
      refresh: load,
      profileById: (id) => byId.get(id),
      profileByEmail: (email) => byEmail.get(email.toLowerCase()),
    }),
    [profiles, adminProfiles, byId, byEmail, loading, load],
  )

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>
}

export function useTeamProfiles() {
  const ctx = useContext(ProfilesContext)
  if (!ctx) {
    throw new Error('useTeamProfiles must be used within ProfilesProvider')
  }
  return ctx
}
