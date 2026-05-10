import { useCallback, useEffect, useState } from 'react'
import { leadsDb } from '../lib/leadsDb'
import type { Lead, ContactMoment, LeadStatus } from '../types'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const data = await leadsDb.fetchAll()
      setLeads(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

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
    await updateLead(id, { status })
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
  const [moments, setMoments] = useState<ContactMoment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const data = await leadsDb.fetchContactMoments(leadId)
      setMoments(data)
    } finally {
      setLoading(false)
    }
  }, [leadId])

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
