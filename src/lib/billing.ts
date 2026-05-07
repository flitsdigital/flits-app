import {
  addWeeks,
  addMonths,
  addDays,
  differenceInDays,
  isAfter,
  isBefore,
  parseISO,
  format,
  startOfDay,
  getISOWeek,
  getYear,
} from 'date-fns'
import type { Client, BillingCycle } from '../types'

export function getCycleDays(cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case '4_weeks': return 28
    case '6_weeks': return 42
    case 'monthly': return 30
    case 'custom': return customDays ?? 30
  }
}

export function addCycle(date: Date, cycle: BillingCycle, customDays?: number): Date {
  switch (cycle) {
    case '4_weeks': return addWeeks(date, 4)
    case '6_weeks': return addWeeks(date, 6)
    case 'monthly': return addMonths(date, 1)
    case 'custom': return addDays(date, customDays ?? 30)
  }
}

export function calcNextInvoiceDate(client: Client): Date {
  const start = parseISO(client.startDate)
  const today = startOfDay(new Date())

  let next = start
  while (!isAfter(next, today)) {
    next = addCycle(next, client.billingCycle, client.customCycleDays)
  }
  return next
}

export function calcLastInvoiceDate(client: Client): Date | null {
  const start = parseISO(client.startDate)
  const today = startOfDay(new Date())

  if (isAfter(start, today)) return null

  let current = start
  let prev = start
  while (!isAfter(current, today)) {
    prev = current
    current = addCycle(current, client.billingCycle, client.customCycleDays)
  }
  return prev
}

export function getInvoiceTimeline(client: Client, weeksAhead = 26): Date[] {
  const start = parseISO(client.startDate)
  const end = addWeeks(new Date(), weeksAhead)
  const dates: Date[] = []

  let current = start
  while (isBefore(current, end)) {
    dates.push(current)
    current = addCycle(current, client.billingCycle, client.customCycleDays)
  }
  return dates
}

export function getPastInvoiceDates(client: Client): Date[] {
  const start = parseISO(client.startDate)
  const today = startOfDay(new Date())
  const dates: Date[] = []

  let current = start
  while (isBefore(current, today)) {
    dates.push(current)
    current = addCycle(current, client.billingCycle, client.customCycleDays)
  }
  return dates.reverse() // meest recent eerst
}

export function enrichClient(client: Omit<Client, 'nextInvoiceDate' | 'lastInvoiceDate'>): Client {
  const next = calcNextInvoiceDate(client as Client)
  const last = calcLastInvoiceDate(client as Client)
  return {
    ...(client as Client),
    nextInvoiceDate: format(next, 'yyyy-MM-dd'),
    lastInvoiceDate: last ? format(last, 'yyyy-MM-dd') : undefined,
  }
}

export type InvoiceStatus = 'overdue' | 'this_week' | 'upcoming' | 'ok'

export function getInvoiceStatus(nextDate: Date): InvoiceStatus {
  const today = startOfDay(new Date())
  const diff = differenceInDays(nextDate, today)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'this_week'
  if (diff <= 21) return 'upcoming'
  return 'ok'
}

export function formatCycle(cycle: BillingCycle, customDays?: number): string {
  switch (cycle) {
    case '4_weeks': return '4 weken'
    case '6_weeks': return '6 weken'
    case 'monthly': return 'Maandelijks'
    case 'custom': return `${customDays ?? '?'} dagen`
  }
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'd MMM yyyy')
  } catch {
    return '—'
  }
}

const AVG_DAYS_PER_MONTH = 365.25 / 12

export function calcMonthlyRevenue(pricePerCycle: number, cycle: BillingCycle, customDays?: number): number {
  const cycleDays = getCycleDays(cycle, customDays)
  return (pricePerCycle / cycleDays) * AVG_DAYS_PER_MONTH
}

export function formatWeek(date: Date | string | undefined | null): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    const week = getISOWeek(d)
    const year = getYear(d)
    const currentYear = getYear(new Date())
    return year === currentYear ? `Week ${week}` : `Week ${week}, ${year}`
  } catch {
    return '—'
  }
}

export function formatWeekDate(date: Date | string | undefined | null): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'd MMM')
  } catch {
    return '—'
  }
}
