import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from 'date-fns'
import type { Client, ClientInvoice, Post } from '../types'
import { getInvoiceStatus } from './billing'

export function invoicesForClient(
  invoices: ClientInvoice[],
  clientId: string,
): ClientInvoice[] {
  return invoices
    .filter((i) => i.clientId === clientId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getOpenInvoiceAmount(invoices: ClientInvoice[]): number {
  return invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + i.amount, 0)
}

/** Eerste nog niet-betaalde milestone, op vervaldatum */
export function getNextOpenInvoice(
  invoices: ClientInvoice[],
): ClientInvoice | null {
  const open = invoices.filter((i) => i.status !== 'paid')
  if (open.length === 0) return null
  return [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
}

export function getProjectInvoiceProgress(
  client: Client,
  invoices: ClientInvoice[],
) {
  const paid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0)
  const fromInvoices = invoices.reduce((s, i) => s + i.amount, 0)
  const total = client.projectBudget ?? fromInvoices
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0
  return {
    paid,
    total,
    pct,
    paidCount: invoices.filter((i) => i.status === 'paid').length,
    totalCount: invoices.length,
  }
}

export type ComputedClientStats = {
  clientType: Client['clientType']
  postsThisWeek: number
  openAmount: number
  /** project / oneoff: eerstvolgende open milestone */
  nextMilestone: ClientInvoice | null
  recurringNext: Date | null
  recurringStatus: ReturnType<typeof getInvoiceStatus>
  progress: ReturnType<typeof getProjectInvoiceProgress> | null
  /** oneoff: max één rij verwacht */
  singleInvoice: ClientInvoice | null
}

export function computeClientStats(
  client: Client,
  options: {
    invoices: ClientInvoice[]
    posts: Post[]
    weekRef?: Date
  },
): ComputedClientStats {
  const invs = invoicesForClient(options.invoices, client.id)
  const ref = options.weekRef ?? new Date()
  const weekStart = startOfWeek(ref, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(ref, { weekStartsOn: 1 })
  const postsThisWeek = options.posts.filter((p) => {
    if (p.clientId !== client.id || !p.date) return false
    const d = parseISO(p.date)
    return isWithinInterval(d, { start: weekStart, end: weekEnd })
  }).length

  const ct = client.clientType ?? 'recurring'

  if (ct === 'recurring') {
    const next = client.nextInvoiceDate
      ? parseISO(client.nextInvoiceDate)
      : null
    return {
      clientType: 'recurring',
      postsThisWeek,
      openAmount: 0,
      nextMilestone: null,
      recurringNext: next,
      recurringStatus: next ? getInvoiceStatus(next) : 'ok',
      progress: null,
      singleInvoice: null,
    }
  }

  if (ct === 'oneoff') {
    const single = invs[0] ?? null
    return {
      clientType: 'oneoff',
      postsThisWeek,
      openAmount: single && single.status !== 'paid' ? single.amount : 0,
      nextMilestone: single && single.status !== 'paid' ? single : null,
      recurringNext: null,
      recurringStatus: 'ok',
      progress: null,
      singleInvoice: single,
    }
  }

  const progress = getProjectInvoiceProgress(client, invs)
  return {
    clientType: 'project',
    postsThisWeek,
    openAmount: getOpenInvoiceAmount(invs),
    nextMilestone: getNextOpenInvoice(invs),
    recurringNext: null,
    recurringStatus: 'ok',
    progress,
    singleInvoice: null,
  }
}
