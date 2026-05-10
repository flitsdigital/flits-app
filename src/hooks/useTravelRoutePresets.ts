import { useCallback, useEffect, useState } from 'react'
import { travelRoutePresetsDb } from '../lib/travelRoutePresetsDb'
import type { TravelRoutePreset } from '../lib/travelRoutePresetsDb'

const migratedKeys = new Set<string>()

async function tryMigrateFromLocalStorage(userId: string): Promise<boolean> {
  const key = `route-presets-${userId}`
  if (migratedKeys.has(key)) return false
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return false
  }
  if (!raw) return false
  let arr: unknown
  try {
    arr = JSON.parse(raw)
  } catch {
    return false
  }
  if (!Array.isArray(arr) || arr.length === 0) return false

  let createdCount = 0
  try {
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue
      const p = item as Record<string, unknown>
      const from = typeof p.from === 'string' ? p.from : ''
      const to = typeof p.to === 'string' ? p.to : ''
      const label = typeof p.label === 'string' ? p.label : `${from} → ${to}`
      const km = typeof p.kilometers === 'number' ? p.kilometers : Number(p.kilometers) || 0
      const returnTrip = Boolean(p.returnTrip)
      if (!from || !to) continue
      await travelRoutePresetsDb.create({
        userId,
        label,
        from,
        to,
        kilometers: km,
        returnTrip,
      })
      createdCount++
    }
    if (createdCount === 0) return false
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    migratedKeys.add(key)
    return true
  } catch {
    return false
  }
}

export function useTravelRoutePresets(userId: string | undefined) {
  const [presets, setPresets] = useState<TravelRoutePreset[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId) {
      setPresets([])
      return
    }
    setLoading(true)
    try {
      let data = await travelRoutePresetsDb.fetchAll()
      if (data.length === 0) {
        const migrated = await tryMigrateFromLocalStorage(userId)
        if (migrated) {
          data = await travelRoutePresetsDb.fetchAll()
        }
      }
      setPresets(data)
    } catch {
      setPresets([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function addPreset(p: Omit<TravelRoutePreset, 'id'>) {
    if (!userId) return
    const created = await travelRoutePresetsDb.create({
      userId,
      label: p.label,
      from: p.from,
      to: p.to,
      kilometers: p.kilometers,
      returnTrip: p.returnTrip,
    })
    setPresets((prev) => [...prev, created])
  }

  async function removePreset(id: string) {
    await travelRoutePresetsDb.delete(id)
    setPresets((prev) => prev.filter((x) => x.id !== id))
  }

  return { presets, loading, addPreset, removePreset, reload: load }
}

export type { TravelRoutePreset } from '../lib/travelRoutePresetsDb'
