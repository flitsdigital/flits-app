import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startOfWeek,
  addWeeks,
  addMonths,
  format,
  differenceInDays,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfMonth,
  startOfMonth,
  eachWeekOfInterval,
  isSameMonth,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { getInvoiceTimeline, getInvoiceStatus, formatWeek, formatWeekDate } from '../lib/billing'
import type { Client } from '../types'

const COL_WIDTH = 44 // pixels per week column
const ROW_HEIGHT = 52
const LABEL_WIDTH = 220

type ViewMode = 'weeks' | 'months'

function useTimeline(viewMode: ViewMode) {
  const today = startOfDay(new Date())
  const weeksBack = 4
  const weeksAhead = viewMode === 'weeks' ? 26 : 52

  const start = startOfWeek(addWeeks(today, -weeksBack), { weekStartsOn: 1 })
  const end = addWeeks(start, weeksBack + weeksAhead)

  const weeks: Date[] = []
  let cur = start
  while (cur < end) {
    weeks.push(cur)
    cur = addWeeks(cur, 1)
  }

  return { start, end, weeks, today }
}

function clientColor(index: number): { bar: string; invoice: string } {
  const colors = [
    { bar: 'bg-blue-500/25 border-blue-500/40', invoice: 'bg-blue-400' },
    { bar: 'bg-purple-500/25 border-purple-500/40', invoice: 'bg-purple-400' },
    { bar: 'bg-emerald-500/25 border-emerald-500/40', invoice: 'bg-emerald-400' },
    { bar: 'bg-amber-500/25 border-amber-500/40', invoice: 'bg-amber-400' },
    { bar: 'bg-rose-500/25 border-rose-500/40', invoice: 'bg-rose-400' },
    { bar: 'bg-cyan-500/25 border-cyan-500/40', invoice: 'bg-cyan-400' },
    { bar: 'bg-indigo-500/25 border-indigo-500/40', invoice: 'bg-indigo-400' },
  ]
  return colors[index % colors.length]
}

function statusBarColor(client: Client, today: Date): string {
  if (client.status === 'paused') return 'bg-zinc-600/30 border-zinc-600/40'
  if (client.status === 'inactive') return 'bg-zinc-800/50 border-zinc-700/40'
  if (!client.nextInvoiceDate) return 'bg-green-500/20 border-green-500/30'
  const next = parseISO(client.nextInvoiceDate)
  const s = getInvoiceStatus(next)
  if (s === 'overdue') return 'bg-red-500/20 border-red-500/30'
  if (s === 'this_week') return 'bg-orange-500/20 border-orange-500/30'
  return 'bg-green-500/20 border-green-500/30'
}

interface TooltipData {
  client: Client
  x: number
  y: number
  type: 'bar' | 'invoice'
  invoiceDate?: Date
  isPast?: boolean
  invoiced?: boolean
}

export function Timeline() {
  usePageMeta('Timeline → Flits Impact', 'Tijdlijn van alle klantactiviteiten en mijlpalen.')
  const clients = useStore((s) => s.clients)
  const toggleInvoiced = useStore((s) => s.toggleInvoiced)
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('weeks')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all')

  const { start, end, weeks, today } = useTimeline(viewMode)

  const todayOffset = differenceInDays(today, start)
  const todayX = (todayOffset / 7) * COL_WIDTH

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (filterStatus === 'all') return true
      return c.status === filterStatus
    })
  }, [clients, filterStatus])

  // Group weeks by month for header
  const monthGroups = useMemo(() => {
    const groups: { month: Date; weeks: Date[] }[] = []
    let currentMonth: Date | null = null
    let currentGroup: Date[] = []

    weeks.forEach((w) => {
      const monthStart = startOfMonth(w)
      if (!currentMonth || !isSameMonth(w, currentMonth)) {
        if (currentGroup.length > 0) {
          groups.push({ month: currentMonth!, weeks: currentGroup })
        }
        currentMonth = monthStart
        currentGroup = [w]
      } else {
        currentGroup.push(w)
      }
    })
    if (currentGroup.length > 0 && currentMonth) {
      groups.push({ month: currentMonth, weeks: currentGroup })
    }
    return groups
  }, [weeks])

  return (
    <div className="px-8 py-8 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Timeline</h1>
          <p className="text-sm text-text-muted mt-0.5">Visueel overzicht van abonnementen en factuurmomenten</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle rounded-lg p-1">
            {(['all', 'active', 'paused'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterStatus === f ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'active' ? 'Actief' : 'Gepauzeerd'}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle rounded-lg p-1">
            {(['weeks', 'months'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === v ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {v === 'weeks' ? '26 weken' : '52 weken'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-5 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30" />
          Actief
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-500/20 border border-orange-500/30" />
          Binnenkort factureren
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" />
          Factuur verlopen
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-600/30 border border-zinc-600/40" />
          Gepauzeerd
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-white" />
          Factuurmoment
        </div>
      </div>

      {/* Gantt container */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
        {/* Sticky header row */}
        <div className="flex border-b border-border-subtle sticky top-0 z-20 bg-surface-2">
          {/* Label spacer */}
          <div className="shrink-0 border-r border-border-subtle" style={{ width: LABEL_WIDTH }} />

          {/* Month + week header */}
          <div ref={scrollRef} className="overflow-x-auto flex-1 scrollbar-none">
            <div style={{ width: weeks.length * COL_WIDTH, minWidth: '100%' }}>
              {/* Month row */}
              <div className="flex border-b border-border-subtle">
                {monthGroups.map((g, i) => (
                  <div
                    key={i}
                    className="border-r border-border-subtle px-2 py-1.5 text-xs font-medium text-text-secondary"
                    style={{ width: g.weeks.length * COL_WIDTH }}
                  >
                    {format(g.month, 'MMMM yyyy', { locale: nl })}
                  </div>
                ))}
              </div>
              {/* Week row */}
              <div className="flex">
                {weeks.map((w, i) => {
                  const isCurrentWeek =
                    today >= w && today < addWeeks(w, 1)
                  return (
                    <div
                      key={i}
                      className={`border-r border-border-subtle py-1.5 text-center text-xs flex-shrink-0 ${
                        isCurrentWeek
                          ? 'bg-accent-blue/10 text-accent-blue font-medium'
                          : 'text-text-muted'
                      }`}
                      style={{ width: COL_WIDTH }}
                    >
                      {format(w, 'd/M')}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div
          className="overflow-x-auto"
          onScroll={(e) => {
            if (scrollRef.current) {
              scrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft
            }
          }}
        >
          <div style={{ minWidth: LABEL_WIDTH + weeks.length * COL_WIDTH }}>
            {filteredClients.length === 0 && (
              <div className="flex items-center justify-center py-16 text-sm text-text-muted">
                Geen klanten om te tonen
              </div>
            )}
            {filteredClients.map((client, idx) => {
              const contractStart = parseISO(client.startDate)
              const contractEnd = client.endDate ? parseISO(client.endDate) : addWeeks(today, 52)
              const invoiceDates = getInvoiceTimeline(client, 52)

              // Bar start/end in columns
              const barStartDay = differenceInDays(contractStart < start ? start : contractStart, start)
              const barEndDay = differenceInDays(contractEnd > end ? end : contractEnd, start)
              const barX = (barStartDay / 7) * COL_WIDTH
              const barW = Math.max(((barEndDay - barStartDay) / 7) * COL_WIDTH, COL_WIDTH / 2)

              const barColorClass = statusBarColor(client, today)

              return (
                <div
                  key={client.id}
                  className="flex border-b border-border-subtle hover:bg-white/[0.01] transition-colors group"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Label */}
                  <div
                    className="flex items-center gap-3 px-4 border-r border-border-subtle shrink-0 cursor-pointer"
                    style={{ width: LABEL_WIDTH }}
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-accent-blue">
                        {client.companyName.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate group-hover:text-accent-blue transition-colors">
                        {client.companyName}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        €{client.pricePerCycle.toLocaleString('nl-NL')}
                      </p>
                    </div>
                  </div>

                  {/* Chart area */}
                  <div className="relative flex-1 overflow-hidden" style={{ height: ROW_HEIGHT }}>
                    {/* Alternating week backgrounds */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {weeks.map((_, i) => (
                        <div
                          key={i}
                          className="border-r border-border-subtle/30 shrink-0 h-full"
                          style={{ width: COL_WIDTH, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.005)' }}
                        />
                      ))}
                    </div>

                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-accent-blue/50 z-10 pointer-events-none"
                      style={{ left: todayX }}
                    />

                    {/* Contract bar */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md border ${barColorClass} cursor-pointer transition-opacity hover:opacity-80`}
                      style={{ left: barX, width: barW }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({ client, x: rect.left, y: rect.top, type: 'bar' })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => navigate(`/clients/${client.id}`)}
                    />

                    {/* Invoice markers */}
                    {invoiceDates.map((date, i) => {
                      const dayOffset = differenceInDays(date, start)
                      if (dayOffset < 0 || dayOffset > weeks.length * 7) return null
                      const x = (dayOffset / 7) * COL_WIDTH
                      const isPast = date < today
                      const dateKey = format(date, 'yyyy-MM-dd')
                      const invoiced = isPast
                        ? (client.invoiceRecords?.find((r) => r.date === dateKey)?.invoiced ?? false)
                        : false

                      let dotColor: string
                      if (isPast) {
                        dotColor = invoiced
                          ? 'bg-green-400 shadow-green-400/40'
                          : 'bg-red-400 shadow-red-400/40'
                      } else {
                        const status = getInvoiceStatus(date)
                        dotColor =
                          status === 'this_week'
                            ? 'bg-orange-400 shadow-orange-400/50'
                            : status === 'upcoming'
                            ? 'bg-blue-400 shadow-blue-400/50'
                            : 'bg-zinc-400'
                      }

                      return (
                        <div
                          key={i}
                          className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm z-10 transition-all hover:scale-150 ${dotColor} ${
                            isPast ? 'w-2.5 h-2.5 cursor-pointer' : 'w-2 h-2 cursor-default'
                          }`}
                          style={{ left: x - (isPast ? 5 : 4) }}
                          onClick={isPast ? (e) => {
                            e.stopPropagation()
                            toggleInvoiced(client.id, dateKey)
                          } : undefined}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({ client, x: rect.left, y: rect.top, type: 'invoice', invoiceDate: date, isPast, invoiced })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-surface-3 border border-border-default rounded-lg shadow-xl p-3 text-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8, transform: 'translateY(-100%)' }}
        >
          <p className="font-semibold text-text-primary mb-1">{tooltip.client.companyName}</p>
          {tooltip.type === 'invoice' && tooltip.invoiceDate && (
            <>
              <p className="text-text-primary font-medium">{formatWeek(tooltip.invoiceDate)}</p>
              <p className="text-text-muted">{format(tooltip.invoiceDate, 'd MMMM yyyy', { locale: nl })}</p>
              <p className="text-text-muted mt-1">€{tooltip.client.pricePerCycle.toLocaleString('nl-NL')}</p>
              {tooltip.isPast && (
                <div className={`mt-1.5 flex items-center gap-1 font-medium ${tooltip.invoiced ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{tooltip.invoiced ? '✓ Gefactureerd' : '✗ Niet gefactureerd'}</span>
                </div>
              )}
              {tooltip.isPast && (
                <p className="text-text-muted mt-1 opacity-60">Klik om te wijzigen</p>
              )}
            </>
          )}
          {tooltip.type === 'bar' && (
            <>
              <p className="text-text-secondary">{tooltip.client.packageType}</p>
              <p className="text-text-muted">
                Start: {format(parseISO(tooltip.client.startDate), 'd MMM yyyy', { locale: nl })}
              </p>
              {tooltip.client.endDate && (
                <p className="text-text-muted">
                  Einde: {format(parseISO(tooltip.client.endDate), 'd MMM yyyy', { locale: nl })}
                </p>
              )}
              <p className="font-medium text-text-primary mt-1">
                €{tooltip.client.pricePerCycle.toLocaleString('nl-NL')} / cyclus
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
