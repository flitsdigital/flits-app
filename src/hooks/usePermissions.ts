import { useAuthStore } from '../store/useAuthStore'
import type { FeatureFlag } from '../types'

export function usePermissions() {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'

  function can(feature: FeatureFlag): boolean {
    if (isAdmin) return true
    return profile?.allowed_features?.includes(feature) ?? false
  }

  return { isAdmin, can }
}
