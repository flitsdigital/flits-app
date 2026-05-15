import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, TrendingUp, AlertCircle, Clock, UserPlus,
  Calendar, FileText, CheckCircle2,
  MessageSquare, Zap, TriangleAlert, BadgeCheck, Timer,
} from 'lucide-react'
import { parseISO, differenceInDays, startOfDay, format, startOfWeek, endOfWeek } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import { useStore } from '../store/useStore'
import { useLeadsData } from '../hooks/useLeadsData'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthStore } from '../store/useAuthStore'
import { getInvoiceStatus, formatWeek, formatWeekDate, calcMonthlyRevenue } from '../lib/billing'
import { postStatusLabel, postStatusDot } from '../lib/postHelpers'
import { LEAD_STATUS_CONFIG } from '../lib/leadStatusConfig'
import { StatusBadge } from '../components/StatusBadge'
import { InvoiceBadge } from '../components/InvoiceBadge'
import { PageHeader } from '../components/PageHeader'
import { KpiCard } from '../components/KpiCard'
import { SectionHeader } from '../components/SectionHeader'
import { InitialsAvatar } from '../components/InitialsAvatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { AppPage, LeadStatus } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEAD_PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-5 text-center text-xs text-text-muted">{text}</div>
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  usePageMeta('Dashboard → Flits Impact', 'Overzicht van klanten, facturen en aankomende acties.')

  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const allowedPages = profile?.allowed_pages ?? []
  const has = (page: AppPage) => isAdmin || allowedPages.includes(page)

  const hasClients  = has('clients')
  const hasLeads    = has('leads')
  const hasContent  = has('content')
  const hasTimeline = has('timeline')
  const hasTime     = has('time_tracking')

  // Always call hooks — data simply won't be rendered if no access
  const clients = useStore((s) => s.clients)
  const posts   = useStore((s) => s.posts)
  const { leads } = useLeadsData({ enabled: hasLeads })

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
      if ((c.clientType ?? 'recurring') === 'recurring') {
        effectiveMrr += calcMonthlyRevenue(c.pricePerCycle, c.billingCycle, c.customCycleDays)
      }
      if (c.nextInvoiceDate && (c.clientType ?? 'recurring') === 'recurring') {
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
    upcomingInvoices.sort((a, b) => (a.nextInvoiceDate ?? '').localeCompare(b.nextInvoiceDate ?? ''))
    return { active, paused, effectiveMrr, overdueCount, thisWeekCount, upcomingInvoices, expiringContracts }
  }, [clients, today])

  // ── Post stats ─────────────────────────────────────────────────────────────
  const postStats = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd   = endOfWeek(today, { weekStartsOn: 1 })
    const thisWeekPosts = posts.filter((p) => {
      if (!p.date) return false
      const d = parseISO(p.date)
      return d >= weekStart && d <= weekEnd
    })
    const byStatus = {
      todo:        posts.filter((p) => p.status === 'todo').length,
      in_progress: posts.filter((p) => p.status === 'in_progress').length,
      feedback:    posts.filter((p) => p.status === 'feedback').length,
      posted:      posts.filter((p) => p.status === 'posted').length,
    }
    const staleFeedback = posts.filter((p) => {
      if (p.status !== 'feedback') return false
      return differenceInDays(today, parseISO(p.updatedAt)) >= 3
    })
    return { thisWeekPosts, byStatus, staleFeedback, total: posts.length }
  }, [posts, today])

  // ── Lead stats ─────────────────────────────────────────────────────────────
  const leadStats = useMemo(() => {
    const activeLeads   = leads.filter((l) => !['won', 'lost'].includes(l.status))
    const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
    const coldLeads     = leads.filter((l) => {
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

  // ── Action items (filtered by permissions) ─────────────────────────────────
  const actionItems = useMemo(() => {
    const items: { type: string; label: string; sub: string; to: string; severity: 'red' | 'orange' | 'yellow' }[] = []

    if (hasClients || hasTimeline) {
      clientStats.upcomingInvoices
        .filter((c) => c.nextInvoiceDate && getInvoiceStatus(parseISO(c.nextInvoiceDate)) === 'overdue')
        .forEach((c) => {
          const days = differenceInDays(today, parseISO(c.nextInvoiceDate!))
          items.push({ type: 'invoice', label: `Factuur verlopen — ${c.companyName}`, sub: `${days} dag${days !== 1 ? 'en' : ''} te laat`, to: `/clients/${c.id}`, severity: 'red' })
        })
      clientStats.upcomingInvoices
        .filter((c) => c.nextInvoiceDate && getInvoiceStatus(parseISO(c.nextInvoiceDate)) === 'this_week')
        .forEach((c) => {
          items.push({ type: 'invoice', label: `Factuur versturen — ${c.companyName}`, sub: formatWeekDate(c.nextInvoiceDate), to: `/clients/${c.id}`, severity: 'orange' })
        })
      clientStats.expiringContracts.forEach((c) => {
        const days = differenceInDays(parseISO(c.endDate!), today)
        items.push({ type: 'contract', label: `Contract loopt af — ${c.companyName}`, sub: `Over ${days} dag${days !== 1 ? 'en' : ''}`, to: `/clients/${c.id}`, severity: days <= 7 ? 'red' : 'orange' })
      })
    }

    if (hasContent) {
      postStats.staleFeedback.slice(0, 3).forEach((p) => {
        const client = clients.find((c) => c.id === p.clientId)
        items.push({ type: 'content', label: `Post wacht op feedback${client ? ` — ${client.companyName}` : ''}`, sub: `Al ${differenceInDays(today, parseISO(p.updatedAt))} dagen`, to: '/content', severity: 'yellow' })
      })
    }

    if (hasLeads) {
      leadStats.coldLeads.slice(0, 3).forEach((l) => {
        const days = l.lastContactedAt ? differenceInDays(today, parseISO(l.lastContactedAt)) : null
        items.push({ type: 'lead', label: `Lead opvolgen — ${l.companyName}`, sub: days != null ? `Geen contact in ${days} dagen` : 'Nog nooit gecontacteerd', to: `/leads/${l.id}`, severity: 'yellow' })
      })
    }

    return items
  }, [clientStats, postStats, leadStats, clients, today, hasClients, hasTimeline, hasContent, hasLeads])

  const severityIcon:  Record<string, React.ElementType> = { red: AlertCircle, orange: TriangleAlert, yellow: Clock }
  const severityColor: Record<string, string> = { red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-500' }

  // ── KPIs — only what the user can see ─────────────────────────────────────
  const kpis = [
    hasClients && (
      <KpiCard key="clients" label="Actieve klanten" value={clientStats.active.length} icon={Users}
        accent="blue"
        sub={clientStats.paused.length > 0 ? `${clientStats.paused.length} gepauzeerd` : 'Alles actief'} to="/clients" />
    ),
    hasClients && (
      <KpiCard key="mrr" label="Maandomzet" value={`€${Math.round(clientStats.effectiveMrr).toLocaleString('nl-NL')}`}
        icon={TrendingUp} sub="Genormaliseerd" accent="green" />
    ),
    hasTimeline && (
      <KpiCard key="overdue" label="Verlopen facturen" value={clientStats.overdueCount} icon={AlertCircle}
        sub={clientStats.overdueCount > 0 ? 'Actie vereist' : 'Alles op orde'}
        accent={clientStats.overdueCount > 0 ? 'red' : 'blue'} to="/timeline" />
    ),
    hasTimeline && (
      <KpiCard key="thisweek" label="Facturen deze week" value={clientStats.thisWeekCount} icon={Clock}
        sub="Komende 7 dagen" accent={clientStats.thisWeekCount > 0 ? 'orange' : 'blue'} to="/timeline" />
    ),
    hasLeads && (
      <KpiCard key="leads" label="Leads in pipeline" value={leadStats.activeLeads.length} icon={UserPlus}
        accent="purple"
        sub={leadStats.pipelineValue > 0 ? `€${leadStats.pipelineValue.toLocaleString('nl-NL')} waarde` : 'Geen waarde ingevuld'}
        to="/leads" />
    ),
    hasContent && (
      <KpiCard key="posts" label="Posts te doen" value={postStats.byStatus.todo + postStats.byStatus.in_progress}
        icon={FileText} accent="orange" sub={`${postStats.byStatus.feedback} wacht op feedback`} to="/content" />
    ),
    hasTime && (
      <KpiCard key="time" label="Uren deze week" value="—" icon={Timer} accent="blue" sub="Zie urenregistratie" to="/uren" />
    ),
  ].filter(Boolean)

  // ── Welcome state when no modules accessible ───────────────────────────────
  const hasAnyModule = hasClients || hasLeads || hasContent || hasTimeline || hasTime

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${profile?.name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'daar'}`}
        subtitle={format(today, "EEEE d MMMM yyyy", { locale: nl })}
      />

      <div className="px-4 lg:px-6 py-4 lg:py-5 max-w-[1400px] mx-auto flex flex-col gap-4 lg:gap-6">

        {!hasAnyModule ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle2 size={24} className="text-text-muted opacity-40" />
              <p className="text-sm font-medium text-text-primary">Welkom!</p>
              <p className="text-xs text-text-muted max-w-xs">
                Je hebt nog geen toegang tot modules. Vraag een beheerder om je rechten in te stellen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── KPI row — dynamic grid based on count ── */}
            {kpis.length > 0 && (
              <div className={cn(
                'grid gap-2.5 lg:gap-3',
                kpis.length <= 2 ? 'grid-cols-2' :
                kpis.length <= 3 ? 'grid-cols-3' :
                kpis.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
              )}>
                {kpis}
              </div>
            )}

            {/* ── Main cards grid ── */}
            {(actionItems.length > 0 || hasContent || hasLeads) && (
              <div className={cn(
                'grid grid-cols-1 gap-4',
                [true, hasContent, hasLeads].filter(Boolean).length >= 3 ? 'lg:grid-cols-3' :
                [true, hasContent, hasLeads].filter(Boolean).length === 2 ? 'lg:grid-cols-2' : ''
              )}>

                {/* Actie vereist — always shown if there are items or user has any module */}
                <Card className="overflow-hidden">
                  <SectionHeader icon={Zap} title="Actie vereist" count={actionItems.length} />
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
                            <Link key={i} to={item.to} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                              <Icon size={13} className={cn('mt-0.5 shrink-0', severityColor[item.severity])} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-text-primary leading-snug">{item.label}</p>
                                <p className="text-xs text-text-muted mt-0.5">{item.sub}</p>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Content overzicht */}
                {hasContent && (
                  <Card className="overflow-hidden">
                    <SectionHeader icon={Calendar} title="Content overzicht" to="/content" />
                    <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-2.5">
                        {(
                          [
                            { key: 'todo',        label: 'Te doen' },
                            { key: 'in_progress', label: 'Bezig' },
                            { key: 'feedback',    label: 'Wacht op feedback' },
                            { key: 'posted',      label: 'Gepost' },
                          ] as const
                        ).map(({ key, label }) => {
                          const count = postStats.byStatus[key]
                          const pct   = postStats.total > 0 ? Math.round((count / postStats.total) * 100) : 0
                          return (
                            <div key={key} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', postStatusDot[key])} />
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
                                <Link key={p.id} to="/content" className="flex items-center gap-2 hover:bg-white/[0.03] rounded-md px-1 py-1 transition-colors">
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', postStatusDot[p.status])} />
                                  <span className="text-xs text-text-primary truncate flex-1">{client?.companyName ?? '—'}</span>
                                  <span className="text-xs text-text-muted shrink-0">
                                    {p.date ? format(parseISO(p.date), 'd MMM', { locale: nl }) : '—'}
                                  </span>
                                  <Badge className={cn(
                                    'text-[10px] px-1 py-0 border font-medium shrink-0',
                                    p.status === 'posted'      ? 'bg-green-500/15 text-green-400 border-green-500/25' :
                                    p.status === 'feedback'    ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' :
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
                )}

                {/* Lead pipeline */}
                {hasLeads && (
                  <Card className="overflow-hidden">
                    <SectionHeader icon={UserPlus} title="Leads pipeline" to="/leads" count={leads.length} />
                    <CardContent className="p-4 flex flex-col gap-3">
                      {leads.length === 0 ? (
                        <EmptyRow text="Nog geen leads" />
                      ) : (
                        <>
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
                                        {value > 0 && <span className="text-xs text-text-muted">€{value.toLocaleString('nl-NL')}</span>}
                                        <span className="text-xs font-semibold text-text-primary tabular-nums w-4 text-right">{count}</span>
                                      </div>
                                    </div>
                                    <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                                      <div className={cn('h-full rounded-full transition-all', cfg.dot)} style={{ width: `${pct}%` }} />
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
                                  <Clock size={11} className="text-orange-400" /> Opvolgen ({leadStats.coldLeads.length})
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  {leadStats.coldLeads.slice(0, 4).map((l) => {
                                    const days = l.lastContactedAt ? differenceInDays(today, parseISO(l.lastContactedAt)) : null
                                    return (
                                      <Link key={l.id} to={`/leads/${l.id}`} className="flex items-center gap-2 hover:bg-white/[0.03] rounded-md px-1 py-1 transition-colors">
                                        <InitialsAvatar name={l.companyName} size="xs" />
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
                )}
              </div>
            )}

            {/* ── Bottom row ── */}
            {(hasTimeline || hasClients) && (
              <div className={cn('grid grid-cols-1 gap-4', hasClients && hasTimeline ? 'lg:grid-cols-2' : '')}>

                {/* Komende facturen */}
                {hasTimeline && (
                  <Card className="overflow-hidden">
                    <SectionHeader icon={Clock} title="Komende facturen" to="/timeline" count={clientStats.upcomingInvoices.length} />
                    <CardContent className="p-0">
                      {clientStats.upcomingInvoices.length === 0 ? (
                        <EmptyRow text="Geen facturen in de komende 3 weken" />
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {clientStats.upcomingInvoices.slice(0, 7).map((c) => {
                            const next   = c.nextInvoiceDate ? parseISO(c.nextInvoiceDate) : null
                            const status = next ? getInvoiceStatus(next) : 'ok'
                            const diff   = next ? differenceInDays(next, today) : null
                            return (
                              <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <InitialsAvatar name={c.companyName} size="sm" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-text-primary truncate">{c.companyName}</p>
                                    <p className="text-xs text-text-muted">
                                      {formatWeek(c.nextInvoiceDate)}
                                      {diff != null && diff >= 0 && <span className="ml-1 opacity-60">· over {diff}d</span>}
                                      {diff != null && diff < 0  && <span className="ml-1 text-red-400">{Math.abs(diff)}d te laat</span>}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <span className="text-xs font-semibold text-text-primary tabular-nums">
                                    €{(c.clientType ?? 'recurring') === 'recurring'
                                      ? c.pricePerCycle.toLocaleString('nl-NL')
                                      : c.clientType === 'project'
                                        ? (c.projectBudget ?? 0).toLocaleString('nl-NL')
                                        : '—'}
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
                )}

                {/* Klanten */}
                {hasClients && (
                  <Card className="overflow-hidden">
                    <SectionHeader icon={Users} title="Klanten" to="/clients" count={clients.length} />
                    <CardContent className="p-0">
                      <div className="divide-y divide-border-subtle">
                        {clients
                          .slice()
                          .sort((a, b) => {
                            if (a.status !== b.status) {
                              const order: Record<string, number> = { active: 0, paused: 1, inactive: 2 }
                              return (order[a.status] ?? 3) - (order[b.status] ?? 3)
                            }
                            return a.companyName.localeCompare(b.companyName)
                          })
                          .slice(0, 7)
                          .map((c) => {
                            const postCount = posts.filter((p) => p.clientId === c.id && p.status !== 'posted').length
                            return (
                              <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <InitialsAvatar name={c.companyName} size="sm" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-text-primary truncate">{c.companyName}</p>
                                    <p className="text-xs text-text-muted">{c.packageType || c.contactPerson}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  {postCount > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-text-muted">
                                      <MessageSquare size={10} /> {postCount}
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
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
