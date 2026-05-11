import { useEffect, useMemo, useState } from 'react'
import { timeTrackingDb } from '../lib/timeTrackingDb'
import type { TimeEntry, TimeTag, UserProfile } from '../types'

export function useTimeTrackingData(isAdmin: boolean, selectedUserId: string | 'all') {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [tags, setTags] = useState<TimeTag[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const runningEntry = useMemo(() => entries.find((e) => e.isRunning) ?? null, [entries])

  useEffect(() => {
    timeTrackingDb.fetchTags().then(setTags).catch(() => setTags([]))
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    timeTrackingDb.fetchUsers().then(setUsers).catch(() => setUsers([]))
  }, [isAdmin])

  async function load() {
    setLoading(true)
    try {
      const data = await timeTrackingDb.fetchEntries({ isAdmin, selectedUserId })
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedUserId, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function reloadTags() {
    const data = await timeTrackingDb.fetchTags()
    setTags(data)
  }

  async function deleteEntry(id: string) {
    await timeTrackingDb.deleteEntry(id, isAdmin)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return { entries, setEntries, tags, reloadTags, users, loading, load, runningEntry, deleteEntry }
}
