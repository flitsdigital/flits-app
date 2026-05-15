import { supabase, withTimeout } from './supabase'
import type {
  Client,
  ClientInvoice,
  ClientInvoiceStatus,
  InvoiceRecord,
  Post,
  PostType,
  PostStatus,
  PostLog,
  PostLogAction,
} from '../types'
import { enrichClient } from './billing'

interface DbRow {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  vat_number: string
  notes: string
  start_date: string
  end_date: string | null
  status: string
  package_type: string
  billing_cycle: string | null
  custom_cycle_days: number | null
  price_per_cycle: number | null
  invoice_records: InvoiceRecord[]
  client_type?: string | null
  project_budget?: number | null
  project_deadline?: string | null
  created_at: string
  updated_at: string
}

function parseClientType(v: string | null | undefined): Client['clientType'] {
  if (v === 'project' || v === 'oneoff') return v
  return 'recurring'
}

function fromRow(row: DbRow): Client {
  const clientType = parseClientType(row.client_type)
  const billingCycle = (row.billing_cycle ?? '6_weeks') as Client['billingCycle']
  const pricePerCycle = Number(row.price_per_cycle ?? 0)
  return enrichClient({
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    vatNumber: row.vat_number ?? '',
    notes: row.notes ?? '',
    clientType,
    projectBudget: row.project_budget != null ? Number(row.project_budget) : undefined,
    projectDeadline: row.project_deadline ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    status: row.status as Client['status'],
    packageType: row.package_type ?? '',
    billingCycle,
    customCycleDays: row.custom_cycle_days ?? undefined,
    pricePerCycle,
    invoiceRecords: row.invoice_records ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function toRow(client: Client): Record<string, unknown> {
  const isRecurring = client.clientType === 'recurring'
  return {
    id: client.id,
    company_name: client.companyName,
    contact_person: client.contactPerson,
    email: client.email,
    phone: client.phone,
    address: client.address,
    vat_number: client.vatNumber,
    notes: client.notes,
    start_date: client.startDate,
    end_date: client.endDate ?? null,
    status: client.status,
    package_type: client.packageType,
    client_type: client.clientType,
    project_budget: client.projectBudget ?? null,
    project_deadline: client.projectDeadline ?? null,
    billing_cycle: isRecurring ? client.billingCycle : null,
    custom_cycle_days: isRecurring ? (client.customCycleDays ?? null) : null,
    price_per_cycle: isRecurring ? client.pricePerCycle : null,
    invoice_records: client.invoiceRecords ?? [],
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  }
}

export const db = {
  async fetchAll(): Promise<Client[]> {
    const { data, error } = await withTimeout(
      supabase.from('clients_app').select('*').order('company_name'),
      15_000,
    )
    if (error) throw error
    return (data as DbRow[]).map(fromRow)
  },

  async upsert(client: Client): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('clients').upsert(toRow(client) as never)
    )
    if (error) throw error
  },

  async upsertMany(clients: Client[]): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('clients').upsert(clients.map(toRow) as never[])
    )
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('clients').delete().eq('id', id)
    )
    if (error) throw error
  },
}

// ── Client invoices (milestones / eenmalig) ───────────────────────────────────

interface DbClientInvoice {
  id: string
  client_id: string
  label: string
  amount: number
  percentage: number | null
  due_date: string
  status: string
  invoice_number: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

function clientInvoiceFromRow(row: DbClientInvoice): ClientInvoice {
  return {
    id: row.id,
    clientId: row.client_id,
    label: row.label,
    amount: Number(row.amount),
    percentage: row.percentage != null ? Number(row.percentage) : undefined,
    dueDate: row.due_date,
    status: row.status as ClientInvoiceStatus,
    invoiceNumber: row.invoice_number ?? undefined,
    sentAt: row.sent_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function clientInvoiceToRow(inv: ClientInvoice): DbClientInvoice {
  return {
    id: inv.id,
    client_id: inv.clientId,
    label: inv.label,
    amount: inv.amount,
    percentage: inv.percentage ?? null,
    due_date: inv.dueDate,
    status: inv.status,
    invoice_number: inv.invoiceNumber ?? null,
    sent_at: inv.sentAt ?? null,
    paid_at: inv.paidAt ?? null,
    created_at: inv.createdAt,
    updated_at: inv.updatedAt,
  }
}

export const clientInvoiceDb = {
  async fetchAll(): Promise<ClientInvoice[]> {
    const { data, error } = await withTimeout(
      supabase.from('client_invoices').select('*').order('due_date', { ascending: true }),
      15_000,
    )
    if (error) throw error
    return (data as DbClientInvoice[]).map(clientInvoiceFromRow)
  },

  async upsert(inv: ClientInvoice): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('client_invoices').upsert(clientInvoiceToRow(inv) as never)
    )
    if (error) throw error
  },

  async upsertMany(invoices: ClientInvoice[]): Promise<void> {
    if (invoices.length === 0) return
    const { error } = await withTimeout(
      supabase.from('client_invoices').upsert(invoices.map(clientInvoiceToRow) as never[])
    )
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('client_invoices').delete().eq('id', id)
    )
    if (error) throw error
  },
}

// ── Posts ────────────────────────────────────────────────────────────────────

interface DbPost {
  id: string
  client_id: string | null
  type: string
  status: string
  caption: string
  media_url: string | null
  media_urls?: string[] | null
  date: string | null
  created_at: string
  updated_at: string
}

export function postFromRow(row: DbPost): Post {
  return {
    id: row.id,
    clientId: row.client_id ?? '',
    type: row.type as PostType,
    status: row.status as PostStatus,
    caption: row.caption ?? '',
    mediaUrl: row.media_url ?? undefined,
    mediaUrls: row.media_urls?.length ? row.media_urls : (row.media_url ? [row.media_url] : []),
    date: row.date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function postToRow(post: Post): DbPost {
  return {
    id: post.id,
    client_id: post.clientId || null,
    type: post.type,
    status: post.status,
    caption: post.caption,
    media_url: post.mediaUrls?.[0] ?? post.mediaUrl ?? null,
    media_urls: (post.mediaUrls && post.mediaUrls.length > 0)
      ? post.mediaUrls
      : (post.mediaUrl ? [post.mediaUrl] : []),
    date: post.date ?? null,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  }
}

export const postDb = {
  async fetchAll(): Promise<Post[]> {
    const { data, error } = await withTimeout(
      supabase.from('posts').select('*').order('date', { ascending: false }),
      15_000,
    )
    if (error) throw error
    return (data as DbPost[]).map(postFromRow)
  },

  async fetchForClient(clientId: string): Promise<Post[]> {
    const { data, error } = await withTimeout(
      supabase.from('posts').select('*').eq('client_id', clientId).order('date', { ascending: false }),
      15_000,
    )
    if (error) throw error
    return (data as DbPost[]).map(postFromRow)
  },

  async upsert(post: Post): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('posts').upsert(postToRow(post))
    )
    if (error) throw error
  },

  async upsertMany(posts: Post[]): Promise<void> {
    if (posts.length === 0) return
    const { error } = await withTimeout(
      supabase.from('posts').upsert(posts.map(postToRow))
    )
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('posts').delete().eq('id', id)
    )
    if (error) throw error
  },
}

interface DbPostLog {
  id: string
  post_id: string
  action: string
  actor_email: string | null
  actor_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function postLogFromRow(row: DbPostLog): PostLog {
  return {
    id: row.id,
    postId: row.post_id,
    action: row.action as PostLogAction,
    actorEmail: row.actor_email ?? undefined,
    actorId: row.actor_id ?? undefined,
    metadata: (row.metadata as PostLog['metadata']) ?? undefined,
    createdAt: row.created_at,
  }
}

export const postLogDb = {
  async fetchForPost(postId: string): Promise<PostLog[]> {
    const { data, error } = await supabase
      .from('post_logs')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as DbPostLog[]).map(postLogFromRow)
  },

  async add(input: {
    postId: string
    action: PostLogAction
    actorEmail?: string
    actorId?: string
    metadata?: PostLog['metadata']
  }): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('post_logs').insert({
        post_id: input.postId,
        action: input.action,
        actor_email: input.actorEmail ?? null,
        actor_id: input.actorId ?? null,
        metadata: input.metadata ?? null,
      })
    )
    if (error) throw error
  },

  async addMany(inputs: {
    postId: string
    action: PostLogAction
    actorEmail?: string
    actorId?: string
    metadata?: PostLog['metadata']
  }[]): Promise<void> {
    if (inputs.length === 0) return
    const { error } = await withTimeout(
      supabase.from('post_logs').insert(
        inputs.map((input) => ({
          post_id: input.postId,
          action: input.action,
          actor_email: input.actorEmail ?? null,
          actor_id: input.actorId ?? null,
          metadata: input.metadata ?? null,
        }))
      )
    )
    if (error) throw error
  },
}
