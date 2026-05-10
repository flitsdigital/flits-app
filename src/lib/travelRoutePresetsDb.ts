import { supabase, withTimeout } from './supabase'

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'trp_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface DbTravelRoutePreset {
  id: string
  user_id: string
  label: string
  from_location: string
  to_location: string
  kilometers: number
  return_trip: boolean
  created_at: string
  updated_at: string
}

export interface TravelRoutePreset {
  id: string
  label: string
  from: string
  to: string
  kilometers: number
  returnTrip: boolean
}

function fromRow(row: DbTravelRoutePreset): TravelRoutePreset {
  return {
    id: row.id,
    label: row.label,
    from: row.from_location,
    to: row.to_location,
    kilometers: Number(row.kilometers),
    returnTrip: row.return_trip,
  }
}

export const travelRoutePresetsDb = {
  async fetchAll(): Promise<TravelRoutePreset[]> {
    const { data, error } = await withTimeout(
      supabase.from('travel_route_presets').select('*').order('created_at', { ascending: true }),
    )
    if (error) throw error
    return (data as DbTravelRoutePreset[] ?? []).map(fromRow)
  },

  async create(input: {
    userId: string
    label: string
    from: string
    to: string
    kilometers: number
    returnTrip: boolean
  }): Promise<TravelRoutePreset> {
    const id = newId()
    const now = new Date().toISOString()
    const { data, error } = await withTimeout(
      supabase.from('travel_route_presets').insert({
        id,
        user_id: input.userId,
        label: input.label,
        from_location: input.from,
        to_location: input.to,
        kilometers: input.kilometers,
        return_trip: input.returnTrip,
        created_at: now,
        updated_at: now,
      }).select().single(),
    )
    if (error) throw error
    return fromRow(data as DbTravelRoutePreset)
  },

  async delete(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('travel_route_presets').delete().eq('id', id),
    )
    if (error) throw error
  },
}
