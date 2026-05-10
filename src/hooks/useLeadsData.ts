import { useCallback, useEffect, useState } from 'react'
import { leadsDb } from '../lib/leadsDb'
import { useAuthStore } from '../store/useAuthStore'
import type { Lead, ContactMoment, LeadStatus } from '../types'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useLeadsData() {
  // Subscribe to BOTH the session user id and the auth-store loading flag.
  // Wait until auth has finished initializing before firing the first fetch
  // — otherwise the supabase client may not have its JWT attached yet and
  // RLS silently returns an empty list.
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const authLoading = useAuthStore((s) => s.loading)

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const loadLeads = useCallback(async () => {
    if (authLoading || !sessionUserId) return
    setLoading(true)
    try {
      const data = await leadsDb.fetchAll()
      setLeads(data)
    } catch (err) {
      console.error('Failed to load leads:', err)
    } finally {
      setLoading(false)
    }
  }, [authLoading, sessionUserId])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Re-fetch when the browser tab regains focus (catches stale state after
  // returning from another tab or the user manually refreshing the session).
  useEffect(() => {
    function onFocus() {
      if (!authLoading && sessionUserId) loadLeads()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authLoading, sessionUserId, loadLeads])

  async function addLead(input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    const now = new Date().toISOString()
    const lead: Lead = { ...input, id: generateId(), createdAt: now, updatedAt: now }
    setLeads((prev) => [lead, ...prev])
    await leadsDb.upsert(lead)
    return lead
  }

  async function updateLead(id: string, data: Partial<Lead>): Promise<void> {
    setLeads((prev) =>
      prev.map((l) => l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l)
    )
    const updated = leads.find((l) => l.id === id)
    if (updated) await leadsDb.upsert({ ...updated, ...data, updatedAt: new Date().toISOString() })
  }

  async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
    // Optimistic update + persist directly without depending on the stale `leads` closure
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l))
    const current = leads.find((l) => l.id === id)
    if (current) await leadsDb.upsert({ ...current, status, updatedAt: new Date().toISOString() })
  }

  async function deleteLead(id: string): Promise<void> {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    await leadsDb.delete(id)
  }

  return {
    leads,
    loading,
    loadLeads,
    addLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
  }
}

export function useContactMoments(leadId: string) {
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const authLoading = useAuthStore((s) => s.loading)
  const [moments, setMoments] = useState<ContactMoment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (authLoading || !sessionUserId || !leadId) return
    setLoading(true)
    try {
      const data = await leadsDb.fetchContactMoments(leadId)
      setMoments(data)
    } catch (err) {
      console.error('Failed to load contact moments:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId, authLoading, sessionUserId])

  useEffect(() => { load() }, [load])

  async function addMoment(input: Omit<ContactMoment, 'id' | 'createdAt'>): Promise<void> {
    const moment: ContactMoment = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    setMoments((prev) => [moment, ...prev])
    await leadsDb.addContactMoment(moment)
  }

  async function deleteMoment(id: string): Promise<void> {
    setMoments((prev) => prev.filter((m) => m.id !== id))
    await leadsDb.deleteContactMoment(id)
  }

  return { moments, loading, addMoment, deleteMoment }
}
