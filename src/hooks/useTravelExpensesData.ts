import { useEffect, useState } from 'react'
import { travelExpensesDb } from '../lib/travelExpensesDb'
import type { TravelExpense, UserProfile } from '../types'

export function useTravelExpensesData(isAdmin: boolean, selectedUserId: string | 'all') {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [expenses, setExpenses] = useState<TravelExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) return
    travelExpensesDb.fetchUsers().then(setUsers).catch(() => setUsers([]))
  }, [isAdmin])

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

  useEffect(() => { load() }, [selectedUserId, isAdmin])

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
