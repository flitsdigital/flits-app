import { supabase, supabaseAdmin, withTimeout } from './supabase'
import type { TravelExpense, UserProfile } from '../types'

/**
 * The `travel_expenses.id` column has no DEFAULT in the database, so we
 * generate one client-side. `crypto.randomUUID()` is available in all
 * modern browsers and produces a value that fits both `uuid` and `text`
 * column types.
 */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for very old environments — should never trigger in modern browsers.
  return 'te_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface DbTravelExpense {
  id: string
  user_id: string
  client_id: string
  date: string
  from_location: string
  to_location: string
  return_trip: boolean
  kilometers: number
  created_at: string
  updated_at: string
}

function fromRow(row: DbTravelExpense): TravelExpense {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    date: row.date,
    from: row.from_location,
    to: row.to_location,
    returnTrip: row.return_trip,
    kilometers: row.kilometers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const travelExpensesDb = {
  async fetchUsers(): Promise<UserProfile[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('profiles').select('*').order('email')
    )
    if (error) throw error
    return data ?? []
  },

  async fetchExpenses(input: { isAdmin: boolean; selectedUserId?: string | 'all' }): Promise<TravelExpense[]> {
    let query = input.isAdmin
      ? supabaseAdmin.from('travel_expenses').select('*').order('date', { ascending: false })
      : supabase.from('travel_expenses').select('*').order('date', { ascending: false })

    if (input.isAdmin && input.selectedUserId && input.selectedUserId !== 'all') {
      query = query.eq('user_id', input.selectedUserId)
    }

    const { data, error } = await withTimeout(query, 15_000)
    if (error) throw error
    return (data as DbTravelExpense[] ?? []).map(fromRow)
  },

  async createExpense(input: {
    userId?: string
    clientId?: string | null
    date: string
    from: string
    to: string
    returnTrip: boolean
    kilometers: number
  }): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await withTimeout(
      supabase.from('travel_expenses').insert({
        id: newId(),
        user_id: input.userId ?? null,
        client_id: input.clientId ?? null,
        date: input.date,
        from_location: input.from,
        to_location: input.to,
        return_trip: input.returnTrip,
        kilometers: input.kilometers,
        created_at: now,
        updated_at: now,
      })
    )
    if (error) throw error
  },

  async createBulkExpenses(input: {
    userId?: string
    clientId?: string | null
    dates: string[]
    from: string
    to: string
    returnTrip: boolean
    kilometers: number
  }): Promise<void> {
    const now = new Date().toISOString()
    const rows = input.dates.map((date) => ({
      id: newId(),
      user_id: input.userId ?? null,
      client_id: input.clientId ?? null,
      date,
      from_location: input.from,
      to_location: input.to,
      return_trip: input.returnTrip,
      kilometers: input.kilometers,
      created_at: now,
      updated_at: now,
    }))

    const { error } = await withTimeout(supabase.from('travel_expenses').insert(rows))
    if (error) throw error
  },

  async updateExpense(id: string, input: {
    clientId?: string | null
    date: string
    from: string
    to: string
    returnTrip: boolean
    kilometers: number
  }): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('travel_expenses').update({
        client_id: input.clientId ?? null,
        date: input.date,
        from_location: input.from,
        to_location: input.to,
        return_trip: input.returnTrip,
        kilometers: input.kilometers,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    )
    if (error) throw error
  },

  async deleteExpense(id: string, isAdmin: boolean): Promise<void> {
    const client = isAdmin ? supabaseAdmin : supabase
    const { error } = await withTimeout(client.from('travel_expenses').delete().eq('id', id))
    if (error) throw error
  },
}
