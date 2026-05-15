import { supabase, withTimeout } from './supabase'
import type { Lead, ContactMoment, LeadStatus, ContactMomentType, LeadAttachment } from '../types'

// ── Leads ─────────────────────────────────────────────────────────────────────

interface DbLead {
  id: string
  company_name: string
  contact_person: string
  email: string | null
  phone: string | null
  source: string | null
  status: string
  assignee_id: string | null
  estimated_value: number | null
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

function leadFromRow(row: DbLead): Lead {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person ?? '',
    email: row.email ?? '',
    phone: row.phone ?? undefined,
    source: row.source ?? undefined,
    status: row.status as LeadStatus,
    assigneeId: row.assignee_id ?? undefined,
    estimatedValue: row.estimated_value ?? undefined,
    notes: row.notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function leadToRow(lead: Lead): DbLead {
  return {
    id: lead.id,
    company_name: lead.companyName,
    contact_person: lead.contactPerson,
    email: lead.email || null,
    phone: lead.phone ?? null,
    source: lead.source ?? null,
    status: lead.status,
    assignee_id: lead.assigneeId ?? null,
    estimated_value: lead.estimatedValue ?? null,
    notes: lead.notes ?? null,
    last_contacted_at: lead.lastContactedAt ?? null,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  }
}

// ── Contact moments ───────────────────────────────────────────────────────────

interface DbContactMoment {
  id: string
  lead_id: string
  date: string
  type: string
  note: string
  actor_id: string | null
  actor_email: string | null
  created_at: string
}

function momentFromRow(row: DbContactMoment): ContactMoment {
  return {
    id: row.id,
    leadId: row.lead_id,
    date: row.date,
    type: row.type as ContactMomentType,
    note: row.note,
    actorId: row.actor_id ?? undefined,
    actorEmail: row.actor_email ?? undefined,
    createdAt: row.created_at,
  }
}

// ── Exported DB module ────────────────────────────────────────────────────────

export const leadsDb = {
  async fetchAll(): Promise<Lead[]> {
    const { data, error } = await withTimeout(
      supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false }),
      15_000,
    )
    if (error) throw error
    return (data as DbLead[]).map(leadFromRow)
  },

  async fetchOne(id: string): Promise<Lead | null> {
    const { data, error } = await withTimeout(
      supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle()
    )
    if (error) throw error
    return data ? leadFromRow(data as DbLead) : null
  },

  async upsert(lead: Lead): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('leads').upsert(leadToRow(lead))
    )
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('leads').delete().eq('id', id)
    )
    if (error) throw error
  },

  async fetchContactMoments(leadId: string): Promise<ContactMoment[]> {
    const { data, error } = await withTimeout(
      supabase
        .from('contact_moments')
        .select('*')
        .eq('lead_id', leadId)
        .order('date', { ascending: false })
    )
    if (error) throw error
    return (data as DbContactMoment[]).map(momentFromRow)
  },

  async addContactMoment(moment: ContactMoment): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('contact_moments').insert({
        id: moment.id,
        lead_id: moment.leadId,
        date: moment.date,
        type: moment.type,
        note: moment.note,
        actor_id: moment.actorId ?? null,
        actor_email: moment.actorEmail ?? null,
        created_at: moment.createdAt,
      })
    )
    if (error) throw error
  },

  async deleteContactMoment(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('contact_moments').delete().eq('id', id)
    )
    if (error) throw error
  },

  // ── Attachments ──────────────────────────────────────────────────────────────

  async fetchAttachments(leadId: string): Promise<LeadAttachment[]> {
    const { data, error } = await withTimeout(
      supabase.from('lead_attachments').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      leadId: row.lead_id as string,
      fileName: row.file_name as string,
      fileSize: row.file_size as number | undefined,
      storagePath: row.storage_path as string,
      uploadedBy: row.uploaded_by as string | undefined,
      createdAt: row.created_at as string,
    }))
  },

  async uploadAttachment(leadId: string, file: File, userId?: string): Promise<LeadAttachment> {
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${leadId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('lead-attachments')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { data, error } = await withTimeout(
      supabase.from('lead_attachments').insert({
        lead_id: leadId,
        file_name: file.name,
        file_size: file.size,
        storage_path: path,
        uploaded_by: userId ?? null,
      }).select().single()
    )
    if (error) throw error
    const row = data as Record<string, unknown>
    return {
      id: row.id as string,
      leadId: row.lead_id as string,
      fileName: row.file_name as string,
      fileSize: row.file_size as number | undefined,
      storagePath: row.storage_path as string,
      uploadedBy: row.uploaded_by as string | undefined,
      createdAt: row.created_at as string,
    }
  },

  async deleteAttachment(id: string, storagePath: string): Promise<void> {
    await supabase.storage.from('lead-attachments').remove([storagePath])
    const { error } = await withTimeout(
      supabase.from('lead_attachments').delete().eq('id', id)
    )
    if (error) throw error
  },

  getAttachmentUrl(storagePath: string): string {
    const { data } = supabase.storage.from('lead-attachments').getPublicUrl(storagePath)
    return data.publicUrl
  },
}
