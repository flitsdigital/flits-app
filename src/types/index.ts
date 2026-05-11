export type UserRole = 'admin' | 'default'
export type AppPage = 'dashboard' | 'clients' | 'timeline' | 'content' | 'reiskosten' | 'projects' | 'leads' | 'time_tracking'

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type ContactMomentType = 'call' | 'email' | 'meeting' | 'other'

export interface Lead {
  id: string
  companyName: string
  contactPerson: string
  email: string
  phone?: string
  source?: string
  status: LeadStatus
  assigneeId?: string
  estimatedValue?: number
  notes?: string
  lastContactedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ContactMoment {
  id: string
  leadId: string
  date: string
  type: ContactMomentType
  note: string
  actorId?: string
  actorEmail?: string
  createdAt: string
}

export interface TimeTag {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface TimeEntry {
  id: string
  userId: string
  clientId: string | null   // optioneel
  description: string
  startedAt: string         // ISO timestamptz
  endedAt: string | null    // null = lopende timer
  isRunning: boolean
  tagIds: string[]
  createdAt: string
  updatedAt: string
}

export interface TravelExpense {
  id: string
  userId: string
  clientId: string
  date: string
  from: string
  to: string
  returnTrip: boolean
  kilometers: number
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string | null
  role: UserRole
  allowed_pages: AppPage[]
}

export type BillingCycle = '4_weeks' | '6_weeks' | 'monthly' | 'custom'

export type ClientStatus = 'active' | 'paused' | 'inactive'

/** Retainer/cyclus, project met termijnen, of eenmalige factuur */
export type ClientType = 'recurring' | 'project' | 'oneoff'

export type ClientInvoiceStatus = 'planned' | 'sent' | 'paid' | 'overdue'

export interface InvoiceRecord {
  date: string // 'yyyy-MM-dd' — het gegenereerde factuurmoment
  invoiced: boolean
  invoicedAt?: string // ISO timestamp wanneer gemarkeerd
}

/** Milestone / eenmalige factuur (project & oneoff) */
export interface ClientInvoice {
  id: string
  clientId: string
  label: string
  amount: number
  percentage?: number
  dueDate: string // 'yyyy-MM-dd'
  status: ClientInvoiceStatus
  invoiceNumber?: string
  sentAt?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  // Klantgegevens
  companyName: string
  contactPerson: string
  email: string
  phone: string
  address: string
  vatNumber: string
  notes: string
  /** Soort klant — default recurring voor bestaande data */
  clientType: ClientType
  /** Totaal contractbedrag (alleen project) */
  projectBudget?: number
  /** Deadline / oplevering (alleen project) */
  projectDeadline?: string
  // Contract
  startDate: string // ISO date string
  endDate?: string
  status: ClientStatus
  packageType: string
  // Facturatie (primair recurring; optioneel voor project/oneoff in DB)
  billingCycle: BillingCycle
  customCycleDays?: number
  pricePerCycle: number
  lastInvoiceDate?: string
  nextInvoiceDate?: string
  invoiceRecords?: InvoiceRecord[]
  createdAt: string
  updatedAt: string
}

export type PostType = 'foto' | 'video' | 'reel' | 'story' | 'carousel'
export type PostStatus = 'todo' | 'in_progress' | 'feedback' | 'approved' | 'posted'
export type PostLogAction = 'created' | 'status_changed' | 'updated' | 'deleted'

export interface PostLog {
  id: string
  postId: string
  action: PostLogAction
  actorEmail?: string
  actorId?: string
  createdAt: string
  metadata?: {
    fromStatus?: PostStatus
    toStatus?: PostStatus
    note?: string
    changes?: Array<{
      field: 'clientId' | 'type' | 'status' | 'caption' | 'date' | 'mediaUrls'
      from: string
      to: string
    }>
  }
}

export interface Post {
  id: string
  clientId: string
  type: PostType
  status: PostStatus
  caption: string
  mediaUrl?: string
  mediaUrls?: string[]
  date?: string // 'yyyy-MM-dd'
  createdAt: string
  updatedAt: string
}

// ── Project Management ────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'paused' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Project {
  id: string
  clientId: string
  name: string
  description?: string | null
  status: ProjectStatus
  color: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface InvoiceEvent {
  clientId: string
  clientName: string
  date: string
  amount: number
  status: 'upcoming' | 'overdue' | 'this_week'
}
