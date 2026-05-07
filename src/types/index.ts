export type UserRole = 'admin' | 'default'
export type AppPage = 'dashboard' | 'clients' | 'timeline' | 'content'

export interface UserProfile {
  id: string
  email: string
  name?: string | null
  role: UserRole
  allowed_pages: AppPage[]
}

export type BillingCycle = '4_weeks' | '6_weeks' | 'monthly' | 'custom'

export type ClientStatus = 'active' | 'paused' | 'inactive'

export interface InvoiceRecord {
  date: string // 'yyyy-MM-dd' — het gegenereerde factuurmoment
  invoiced: boolean
  invoicedAt?: string // ISO timestamp wanneer gemarkeerd
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
  // Contract
  startDate: string // ISO date string
  endDate?: string
  status: ClientStatus
  packageType: string
  // Facturatie
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
export type PostStatus = 'todo' | 'planned' | 'posted'

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

export interface InvoiceEvent {
  clientId: string
  clientName: string
  date: string
  amount: number
  status: 'upcoming' | 'overdue' | 'this_week'
}
