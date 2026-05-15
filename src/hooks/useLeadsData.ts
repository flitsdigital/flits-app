import { useCallback, useEffect, useRef, useState } from 'react'
import { leadsDb } from '../lib/leadsDb'
import { useAuthStore } from '../store/useAuthStore'
import { newId } from '../lib/id'
import {
  readLeadsCache,
  writeLeadsCache,
  clearLeadsCache,
  isLeadsCacheFresh,
} from '../lib/leadsCache'
import type { Lead, ContactMoment, LeadStatus } from '../types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useLeadsData(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled !== false
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const authReady = useAuthStore((s) => s.authReady)

  const [leads, setLeads] = useState<Lead[]>(() =>
    enabled ? readLeadsCache(sessionUserId) : [],
  )
  const [loading, setLoading] = useState(
    () => enabled && !readLeadsCache(sessionUserId).length,
  )
  const [error, setError] = useState<string | null>(null)

  const fetchGenRef = useRef(0)
  const inFlightRef = useRef<Promise<void> | null>(null)

  const loadLeads = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || !authReady || !sessionUserId) return

      const generation = ++fetchGenRef.current
      const hasCache = readLeadsCache(sessionUserId).length > 0

      if (!opts?.silent && !hasCache) setLoading(true)
      setError(null)

      const MAX_ATTEMPTS = 3

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (generation !== fetchGenRef.current) return

        try {
          const data = await leadsDb.fetchAll()
          if (generation !== fetchGenRef.current) return

          writeLeadsCache(sessionUserId, data)
          setLeads(data)
          setError(null)
          setLoading(false)
          return
        } catch (err) {
          if (generation !== fetchGenRef.current) return

          const isLast = attempt === MAX_ATTEMPTS - 1
          if (!isLast) {
            await sleep(600 * (attempt + 1))
            continue
          }

          console.error('Failed to load leads:', err)
          const message =
            err instanceof Error ? err.message : 'Kon leads niet laden'
          setError(message)
          if (!hasCache) setLeads([])
          setLoading(false)
        }
      }
    },
    [enabled, authReady, sessionUserId],
  )

  const loadLeadsDeduped = useCallback(
    (opts?: { silent?: boolean }) => {
      if (inFlightRef.current) {
        return inFlightRef.current
      }
      const promise = loadLeads(opts).finally(() => {
        if (inFlightRef.current === promise) inFlightRef.current = null
      })
      inFlightRef.current = promise
      return promise
    },
    [loadLeads],
  )

  useEffect(() => {
    if (!enabled) {
      setLeads([])
      setLoading(false)
      return
    }
    if (!authReady || !sessionUserId) {
      setLoading(!authReady)
      return
    }

    const cached = readLeadsCache(sessionUserId)
    if (cached.length > 0) {
      setLeads(cached)
      setLoading(false)
    }

    void loadLeadsDeduped({ silent: cached.length > 0 })
  }, [enabled, authReady, sessionUserId, loadLeadsDeduped])

  useEffect(() => {
    if (!enabled) return
    function onFocus() {
      if (authReady && sessionUserId && !isLeadsCacheFresh(sessionUserId)) {
        void loadLeadsDeduped({ silent: leads.length > 0 })
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [enabled, authReady, sessionUserId, loadLeadsDeduped, leads.length])

  useEffect(() => {
    if (!sessionUserId) clearLeadsCache()
  }, [sessionUserId])

  async function addLead(
    input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Lead> {
    const now = new Date().toISOString()
    const lead: Lead = { ...input, id: newId(), createdAt: now, updatedAt: now }

    setLeads((prev) => {
      const next = [lead, ...prev]
      if (sessionUserId) writeLeadsCache(sessionUserId, next)
      return next
    })

    try {
      await leadsDb.upsert(lead)
    } catch (err) {
      console.error('Failed to add lead:', err)
      setLeads((prev) => {
        const next = prev.filter((l) => l.id !== lead.id)
        if (sessionUserId) writeLeadsCache(sessionUserId, next)
        return next
      })
      throw err
    }

    return lead
  }

  async function updateLead(id: string, data: Partial<Lead>): Promise<void> {
    const updatedAt = new Date().toISOString()
    let updatedLead: Lead | undefined

    setLeads((prev) => {
      const next = prev.map((l) => {
        if (l.id === id) {
          updatedLead = { ...l, ...data, updatedAt }
          return updatedLead
        }
        return l
      })
      if (sessionUserId && updatedLead) writeLeadsCache(sessionUserId, next)
      return next
    })

    if (!updatedLead) return

    try {
      await leadsDb.upsert(updatedLead)
    } catch (err) {
      console.error('Failed to update lead:', err)
      await loadLeadsDeduped({ silent: true })
      throw err
    }
  }

  async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
    const updatedAt = new Date().toISOString()
    let updatedLead: Lead | undefined

    setLeads((prev) => {
      const next = prev.map((l) => {
        if (l.id === id) {
          updatedLead = { ...l, status, updatedAt }
          return updatedLead
        }
        return l
      })
      if (sessionUserId && updatedLead) writeLeadsCache(sessionUserId, next)
      return next
    })

    if (!updatedLead) return

    try {
      await leadsDb.upsert(updatedLead)
    } catch (err) {
      console.error('Failed to update lead status:', err)
      await loadLeadsDeduped({ silent: true })
      throw err
    }
  }

  async function deleteLead(id: string): Promise<void> {
    const previous = leads
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id)
      if (sessionUserId) writeLeadsCache(sessionUserId, next)
      return next
    })

    try {
      await leadsDb.delete(id)
    } catch (err) {
      console.error('Failed to delete lead:', err)
      setLeads(previous)
      if (sessionUserId) writeLeadsCache(sessionUserId, previous)
      throw err
    }
  }

  const waitingForAuth = enabled && (!authReady || !sessionUserId)

  return {
    leads: enabled ? leads : [],
    loading: waitingForAuth || (enabled && loading),
    error,
    loadLeads: () => loadLeadsDeduped(),
    addLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
  }
}

export function useContactMoments(leadId: string) {
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const authReady = useAuthStore((s) => s.authReady)

  const [moments, setMoments] = useState<ContactMoment[]>([])
  const [loading, setLoading] = useState(true)
  const fetchGenRef = useRef(0)

  const load = useCallback(async () => {
    if (!authReady || !sessionUserId || !leadId) {
      setLoading(!authReady)
      return
    }

    const generation = ++fetchGenRef.current
    setLoading(true)

    try {
      const data = await leadsDb.fetchContactMoments(leadId)
      if (generation !== fetchGenRef.current) return
      setMoments(Array.isArray(data) ? data : [])
    } catch (err) {
      if (generation !== fetchGenRef.current) return
      console.error('Failed to load contact moments:', err)
      setMoments([])
    } finally {
      if (generation === fetchGenRef.current) setLoading(false)
    }
  }, [leadId, authReady, sessionUserId])

  useEffect(() => {
    void load()
  }, [load])

  async function addMoment(
    input: Omit<ContactMoment, 'id' | 'createdAt'>,
  ): Promise<void> {
    const moment: ContactMoment = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
    }

    setMoments((prev) => [moment, ...prev])

    try {
      await leadsDb.addContactMoment(moment)
    } catch (err) {
      console.error('Failed to add contact moment:', err)
      setMoments((prev) => prev.filter((m) => m.id !== moment.id))
      throw err
    }
  }

  async function deleteMoment(id: string): Promise<void> {
    const previous = moments
    setMoments((prev) => prev.filter((m) => m.id !== id))

    try {
      await leadsDb.deleteContactMoment(id)
    } catch (err) {
      console.error('Failed to delete contact moment:', err)
      setMoments(previous)
      throw err
    }
  }

  const waitingForAuth = !authReady || !sessionUserId

  return {
    moments,
    loading: waitingForAuth || loading,
    addMoment,
    deleteMoment,
    reload: load,
  }
}
