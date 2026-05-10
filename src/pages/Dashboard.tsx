import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, TrendingUp, AlertCircle, Clock, UserPlus,
  ArrowRight, Calendar, FileText, CheckCircle2,
  MessageSquare, Zap, TriangleAlert, BadgeCheck,
} from 'lucide-react'
import { parseISO, differenceInDays, startOfDay, format, isThisWeek, startOfWeek, endOfWeek } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { useLeadsData } from '../hooks/useLeadsData'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthStore } from '../store/useAuthStore'
import { getInvoiceStatus, formatWeek, formatWeekDate, calcMonthlyRevenue } from '../lib/billing'
import { postStatusLabel, postStatusDot } from '../lib/postHelpers'
import { LEAD_STATUS_CONFIG } from './Leads'
import { StatusBadge } from '../components/StatusBadge'
import { InvoiceBadge } from '../components/InvoiceBadge'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { LeadStatus } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEAD_PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, sub, accent, to,
}: {
  label: string; value: string | number; icon: React.ElementType
  sub?: string; accent?: 'red' | 'green' | 'orange'; to?: string
}) {
  const accentCls = {
    red:    'text-red-400',
    orange: 'text-orange-400',
    green:  'text-green-400',
  }
  const inner = (
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-text-muted leading-none">{label}</p>
        <Icon size={13} className="text-text-muted opacity-50 shrink-0" />
      </div>
      <p className={cn('text-xl font-semibold text-text-primary tabular-nums', accent && accentCls[accent])}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </CardContent>
  )
  if (to) return <Card className="hover:bg-white/[0.02] transition-colors cursor-pointer"><Link to={to}>{inner}</Link></Card>
  return <Card>{inner}</Card>
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, to, count }: {
  icon: React.ElementType; title: string; to?: string; count?: number
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle">
      <Icon size={13} className="text-text-muted shrink-0" />
      <span className="text-xs font-semibold text-text-secondary flex-1">{title}</span>
      {count != null && (
        <span className="text-xs bg-surface-3 border border-border-subtle text-text-muted rounded px-1.5 py-0.5 font-medium tabular-nums">
          {count}
        </span>
      )}
      {to && (
        <Link to={to} className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-0.5 ml-1">
          Alles <ArrowRight size={10} />
        </Link>
      )}
    </div>
  )
}

// ── Empty row ─────────────────────────────────────────────────────────────────

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="px-4 py-5 text-center text-xs text-text-muted">{text}</div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  usePageMeta('Dashboard → Flits Impact', 'Overzicht van klanten, facturen en aankomende acties.')
  const profile = useAuthStore((s) => s.profile)
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const { leads } = useLeadsData()

  const today = startOfDay(new Date())

  // ── Client stats ───────────────────────────────────────────────────────────
  const clientStats = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active')
    const paused = clients.filter((c) => c.status === 'paused')
    let effectiveMrr = 0
    let overdueCount = 0
    let thisWeekCount = 0
    const upcomingInvoices: typeof clients = []
    const expiringContracts: typeof clients = []

    active.forEach((c) => {
      effectiveMrr += calcMonthlyRevenue(c.pricePerCycle, c.billingCycle, c.customCycleDays)
      if (c.nextInvoiceDate) {
        const next = parseISO(c.nextInvoiceDate)
        const diff = differenceInDays(next, today)
        const status = getInvoiceStatus(next)
        if (status === 'overdue') overdueCount++
        if (status === 'this_week') thisWeekCount++
        if (diff >= -30 && diff <= 21) upcomingInvoices.push(c)
      }
      if (c.endDate) {
        const end = parseISO(c.endDate)
        const daysLeft = differenceInDays(end, today)
        if (daysLeft >= 0 && daysLeft <= 30) expiringContracts.push(c)
      }
    })

    upcomingInvoices.sort((a, b) =>
      (a.nextInvoiceDate ?? '').localeCompare(b.nextInvoiceDate ?? '')
    )

    return { active, paused, effectiveMrr, overdueCount, thisWeekCount, upcomingInvoices, expiringContracts }
  }, [clients, today])

  // ── Post stats ─────────────────────────────────────────────────────────────
  const postStats = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

    const thisWeekPosts = posts.filter((p) => {
      if (!p.date) return false
      const d = parseISO(p.date)
      return d >= weekStart && d <= weekEnd
    })

    const byStatus = {
      todo: posts.filter((p) => p.status === 'todo').length,
      in_progress: posts.filter((p) => p.status === 'in_progress').length,
      feedback: posts.filter((p) => p.status === 'feedback').length,
      posted: posts.filter((p) => p.status === 'posted').length,
    }

    const staleFeedback = posts.filter((p) => {
      if (p.status !== 'feedback') return false
      const age = differenceInDays(today, parseISO(p.updatedAt))
      return age >= 3
    })

    const unstartedOld = posts.filter((p) => {
      if (p.status !== 'todo' || !p.date) return false
      const age = differenceInDays(today, parseISO(p.date))
      return age >= 3
    })

    return { thisWeekPosts, byStatus, staleFeedback, unstartedOld, total: posts.length }
  }, [posts, today])

  // ── Lead stats ─────────────────────────────────────────────────────────────
  const leadStats = useMemo(() => {
    const activeLeads = leads.filter((l) => !['won', 'lost'].includes(l.status))
    const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

    const coldLeads = leads.filter((l) => {
      if (['won', 'lost'].includes(l.status)) return false
      if (!l.lastContactedAt) return true
      return differenceInDays(today, parseISO(l.lastContactedAt)) >= 7
    })

    const byStatus = LEAD_PIPELINE.map((s) => ({
      status: s,
      count: leads.filter((l) => l.status === s).length,
      value: leads.filter((l) => l.status === s).reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0),
    }))

    const maxCount = Math.max(...byStatus.map((b) => b.count), 1)

    return { activeLeads, pipelineValue, coldLeads, byStatus, maxCount }
  }, [leads, today])

  // ── Action items ───────────────────────────────────────────────────────────
  const actionItems = useMemo(() => {
    const items: { type: string; label: string; sub: string; to: string; severity: 'red' | 'orange' | 'yellow' }[] = []

    // Overdue invoices
    clientStats.upcomingInvoices
      .filter((c) => c.nextInvoiceDate && getInvoiceStatus(parseISO(c.nextInvoiceDate)) === 'overdue')
      .forEach((c) => {
        const days = differenceInDays(today, parseISO(c.nextInvoiceDate!))
        items.push({
          type: 'invoice',
          label: `Factuur verlopen — ${c.companyName}`,
          sub: `${days} dag${days !== 1 ? 'en' : ''} te laat`,
          to: `/clients/${c.id}`,
          severity: 'red',
        })
      })

    // This week invoices
    clientStats.upcomingInvoices
      .filter((c) => c.nextInvoiceDate && getInvoiceStatus(parseISO(c.nextInvoiceDate)) === 'this_week')
      .forEach((c) => {
        items.push({
          type: 'invoice',
          label: `Factuur versturen — ${c.companyName}`,
          sub: formatWeekDate(c.nextInvoiceDate),
          to: `/clients/${c.id}`,
          severity: 'orange',
        })
      })

    // Expiring contracts
    clientStats.expiringContracts.forEach((c) => {
      const days = differenceInDays(parseISO(c.endDate!), today)
      items.push({
        type: 'contract',
        label: `Contract loopt af — ${c.companyName}`,
        sub: `Over ${days} dag${days !== 1 ? 'en' : ''}`,
        to: `/clients/${c.id}`,
        severity: days <= 7 ? 'red' : 'orange',
      })
    })

    // Stale feedback posts
    postStats.staleFeedback.slice(0, 3).forEach((p) => {
      const client = clients.find((c) => c.id === p.clientId)
      items.push({
        type: 'content',
        label: `Post wacht op feedback${client ? ` — ${client.companyName}` : ''}`,
        sub: `Al ${differenceInDays(today, parseISO(p.updatedAt))} dagen`,
        to: '/content',
        severity: 'yellow',
      })
    })

    // Cold leads
    leadStats.coldLeads.slice(0, 3).forEach((l) => {
      const days = l.lastContactedAt
        ? differenceInDays(today, parseISO(l.lastContactedAt))
        : null
      items.push({
        type: 'lead',
        label: `Lead opvolgen — ${l.companyName}`,
        sub: days != null ? `Geen contact in ${days} dagen` : 'Nog nooit gecontacteerd',
        to: `/leads/${l.id}`,
        severity: 'yellow',
      })
    })

    return items
  }, [clientStats, postStats, leadStats, clients, today])

  const severityIcon: Record<string, React.ElementType> = {
    red: AlertCircle,
    orange: TriangleAlert,
    yellow: Clock,
  }
  const severityColor: Record<string, string> = {
    red: 'text-red-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-500',
  }

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${profile?.name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'daar'}`}
        subtitle={format(today, "EEEE d MMMM yyyy", { locale: nl })}
      />

      <div className="px-6 py-5 max-w-[1400px] mx-auto flex flex-col gap-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Actieve klanten"
            value={clientStats.active.length}
            icon={Users}
            sub={clientStats.paused.length > 0 ? `${clientStats.paused.length} gepauzeerd` : 'Alles actief'}
            to="/clients"
          />
          <KpiCard
            label="Maandomzet"
            value={`€${Math.round(clientStats.effectiveMrr).toLocaleString('nl-NL')}`}
            icon={TrendingUp}
            sub="Genormaliseerd"
            accent="green"
          />
          <KpiCard
            label="Verlopen facturen"
            value={clientStats.overdueCount}
            icon={AlertCircle}
            sub={clientStats.overdueCount > 0 ? 'Actie vereist' : 'Alles op orde'}
            accent={clientStats.overdueCount > 0 ? 'red' : undefined}
            to="/timeline"
          />
          <KpiCard
            label="Facturen deze week"
            value={clientStats.thisWeekCount}
            icon={Clock}
            sub="Komende 7 dagen"
            accent={clientStats.thisWeekCount > 0 ? 'orange' : undefined}
            to="/timeline"
          />
          <KpiCard
            label="Leads in pipeline"
            value={leadStats.activeLeads.length}
            icon={UserPlus}
            sub={leadStats.pipelineValue > 0 ? `€${leadStats.pipelineValue.toLocaleString('nl-NL')} waarde` : 'Geen waarde ingevuld'}
            to="/leads"
          />
          <KpiCard
            label="Posts te doen"
            value={postStats.byStatus.todo + postStats.byStatus.in_progress}
            icon={FileText}
            sub={`${postStats.byStatus.feedback} wacht op feedback`}
            to="/content"
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Actie vereist */}
          <Card className="overflow-hidden">
            <SectionHeader
              icon={Zap}
              title="Actie vereist"
              count={actionItems.length}
            />
            <CardContent className="p-0">
              {actionItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <BadgeCheck size={20} className="text-green-400 opacity-60" />
                  <p className="text-xs text-text-muted">Alles is op orde</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {actionItems.map((item, i) => {
                    const Icon = severityIcon[item.severity]
                    return (
                      <Link
                        key={i}
                        to={item.to}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <Icon size={13} className={cn('mt-0.5 shrink-0', severityColor[item.severity])} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary leading-snug">{item.label}</p>
                          <p className="text-xs text-text-muted mt-0.5">{item.sub}</p>
                        </div>
                        <ArrowRight size={11} className="text-text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content overzicht */}
          <Card className="overflow-hidden">
            <SectionHeader icon={Calendar} title="Content overzicht" to="/content" />
            <CardContent className="p-4 flex flex-col gap-4">

              {/* Status bars */}
              <div className="flex flex-col gap-2.5">
                {(
                  [
                    { key: 'todo', label: 'Te doen' },
                    { key: 'in_progress', label: 'Bezig' },
                    { key: 'feedback', label: 'Wacht op feedback' },
                    { key: 'posted', label: 'Gepost' },
                  ] as const
                ).map(({ key, label }) => {
                  const count = postStats.byStatus[key]
                  const pct = postStats.total > 0 ? Math.round((count / postStats.total) * 100) : 0
                  const dotColor = postStatusDot[key]
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
                          <span className="text-xs text-text-secondary">{label}</span>
                        </div>
                        <span className="text-xs font-semibold text-text-primary tabular-nums">{count}</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  )
                })}
              </div>

              <Separator className="bg-border-subtle" />

              {/* Posts deze week */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">
                  Deze week ({postStats.thisWeekPosts.length} posts)
                </p>
                {postStats.thisWeekPosts.length === 0 ? (
                  <p className="text-xs text-text-muted">Geen posts ingepland</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {postStats.thisWeekPosts.slice(0, 5).map((p) => {
                      const client = clients.find((c) => c.id === p.clientId)
                      return (
                        <Link
                          key={p.id}
                          to="/content"
                          className="flex items-center gap-2 hover:bg-white/[0.03] rounded-md px-1 py-1 transition-colors"
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', postStatusDot[p.status])} />
                          <span className="text-xs text-text-primary truncate flex-1">{client?.companyName ?? '—'}</span>
                          <span className="text-xs text-text-muted shrink-0">
                            {p.date ? format(parseISO(p.date), 'd MMM', { locale: nl }) : '—'}
                          </span>
                          <Badge className={cn(
                            'text-[10px] px-1 py-0 border font-medium shrink-0',
                            p.status === 'posted' ? 'bg-green-500/15 text-green-400 border-green-500/25' :
                            p.status === 'feedback' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' :
                            p.status === 'in_progress' ? 'bg-orange-500/15 text-orange-400 border-orange-500/25' :
                            'bg-zinc-700/50 text-zinc-400 border-zinc-600/40'
                          )}>
                            {postStatusLabel(p.status)}
                          </Badge>
                        </Link>
                      )
                    })}
                    {postStats.thisWeekPosts.length > 5 && (
                      <Link to="/content" className="text-xs text-text-muted hover:text-text-secondary transition-colors pl-1">
                        +{postStats.thisWeekPosts.length - 5} meer →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lead pipeline */}
          <Card className="overflow-hidden">
            <SectionHeader icon={UserPlus} title="Leads pipeline" to="/leads" count={leads.length} />
            <CardContent className="p-4 flex flex-col gap-3">

              {leads.length === 0 ? (
                <EmptyRow text="Nog geen leads" />
              ) : (
                <>
                  {/* Funnel bars */}
                  <div className="flex flex-col gap-2">
                    {leadStats.byStatus
                      .filter((b) => b.count > 0)
                      .map(({ status, count, value }) => {
                        const cfg = LEAD_STATUS_CONFIG[status]
                        const pct = Math.round((count / leadStats.maxCount) * 100)
                        return (
                          <Link key={status} to="/leads" className="group">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                                <span className="text-xs text-text-secondary">{cfg.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {value > 0 && (
                                  <span className="text-xs text-text-muted">€{value.toLocaleString('nl-NL')}</span>
                                )}
                                <span className="text-xs font-semibold text-text-primary tabular-nums w-4 text-right">{count}</span>
                              </div>
                            </div>
                            <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', cfg.dot)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </Link>
                        )
                      })}
                  </div>

                  {leadStats.coldLeads.length > 0 && (
                    <>
                      <Separator className="bg-border-subtle" />
                      <div>
                        <p className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                          <Clock size={11} className="text-orange-400" />
                          Opvolgen ({leadStats.coldLeads.length})
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {leadStats.coldLeads.slice(0, 4).map((l) => {
                            const days = l.lastContactedAt
                              ? differenceInDays(today, parseISO(l.lastContactedAt))
                              : null
                            return (
                              <Link
                                key={l.id}
                                to={`/leads/${l.id}`}
                                className="flex items-center gap-2 hover:bg-white/[0.03] rounded-md px-1 py-1 transition-colors"
                              >
                                <div className="w-5 h-5 rounded bg-accent-blue/20 flex items-center justify-center shrink-0">
                                  <span className="text-[9px] font-bold text-accent-blue">{l.companyName.charAt(0)}</span>
                                </div>
                                <span className="text-xs text-text-primary truncate flex-1">{l.companyName}</span>
                                <span className="text-xs text-orange-400 shrink-0 tabular-nums">
                                  {days != null ? `${days}d` : 'nieuw'}
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Komende facturen */}
          <Card className="overflow-hidden">
            <SectionHeader
              icon={Clock}
              title="Komende facturen"
              to="/timeline"
              count={clientStats.upcomingInvoices.length}
            />
            <CardContent className="p-0">
              {clientStats.upcomingInvoices.length === 0 ? (
                <EmptyRow text="Geen facturen in de komende 3 weken" />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {clientStats.upcomingInvoices.slice(0, 7).map((c) => {
                    const next = c.nextInvoiceDate ? parseISO(c.nextInvoiceDate) : null
                    const status = next ? getInvoiceStatus(next) : 'ok'
                    const diff = next ? differenceInDays(next, today) : null
                    return (
                      <Link
                        key={c.id}
                        to={`/clients/${c.id}`}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-accent-blue/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-accent-blue">{c.companyName.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{c.companyName}</p>
                            <p className="text-xs text-text-muted">
                              {formatWeek(c.nextInvoiceDate)}
                              {diff != null && diff >= 0 && (
                                <span className="ml-1 opacity-60">· over {diff}d</span>
                              )}
                              {diff != null && diff < 0 && (
                                <span className="ml-1 text-red-400">{Math.abs(diff)}d te laat</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-xs font-semibold text-text-primary tabular-nums">
                            €{c.pricePerCycle.toLocaleString('nl-NL')}
                          </span>
                          <InvoiceBadge status={status} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Klanten snel */}
          <Card className="overflow-hidden">
            <SectionHeader icon={Users} title="Klanten" to="/clients" count={clients.length} />
            <CardContent className="p-0">
              <div className="divide-y divide-border-subtle">
                {clients
                  .slice()
                  .sort((a, b) => {
                    // Actief bovenaan, dan op naam
                    if (a.status !== b.status) {
                      const order = { active: 0, paused: 1, inactive: 2 }
                      return (order[a.status] ?? 3) - (order[b.status] ?? 3)
                    }
                    return a.companyName.localeCompare(b.companyName)
                  })
                  .slice(0, 7)
                  .map((c) => {
                    const postCount = posts.filter((p) => p.clientId === c.id && p.status !== 'posted').length
                    return (
                      <Link
                        key={c.id}
                        to={`/clients/${c.id}`}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-purple-400">{c.companyName.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{c.companyName}</p>
                            <p className="text-xs text-text-muted">{c.packageType || c.contactPerson}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {postCount > 0 && (
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <MessageSquare size={10} />
                              {postCount}
                            </div>
                          )}
                          {c.status === 'active'
                            ? <InvoiceBadge status={c.nextInvoiceDate ? getInvoiceStatus(parseISO(c.nextInvoiceDate)) : 'ok'} />
                            : <StatusBadge status={c.status} />
                          }
                        </div>
                      </Link>
                    )
                  })}
              </div>
              {clients.length > 7 && (
                <div className="px-4 py-2 border-t border-border-subtle">
                  <Link to="/clients" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
                    +{clients.length - 7} meer klanten →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
