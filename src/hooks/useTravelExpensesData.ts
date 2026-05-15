import { useEffect, useState } from 'react'
import { travelExpensesDb } from '../lib/travelExpensesDb'
import { useTeamProfiles } from '../contexts/ProfilesProvider'
import { useAuthStore } from '../store/useAuthStore'
import type { TravelExpense, UserProfile } from '../types'

export function useTravelExpensesData(isAdmin: boolean, selectedUserId: string | 'all') {
  const authReady = useAuthStore((s) => s.authReady)
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const { adminProfiles } = useTeamProfiles()
  const users = isAdmin ? adminProfiles : []
  const [expenses, setExpenses] = useState<TravelExpense[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await travelExpensesDb.fetchExpenses({ isAdmin, selectedUserId })
      setExpenses(data)
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authReady || !sessionUserId) return
    load()
  }, [selectedUserId, isAdmin, authReady, sessionUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteExpense(id: string) {
    await travelExpensesDb.deleteExpense(id, isAdmin)
    await load()
  }

  return {
    users,
    expenses,
    loading,
    load,
    deleteExpense,
  }
}
