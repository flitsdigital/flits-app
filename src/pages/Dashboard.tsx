import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, TrendingUp, AlertCircle, Clock, UserMinus, ArrowRight, Calendar } from 'lucide-react'
import { parseISO, differenceInDays, startOfDay, format } from 'date-fns'
import { useStore } from '../store/useStore'
import { getInvoiceStatus, formatWeek, formatWeekDate, formatCycle, calcMonthlyRevenue } from '../lib/billing'
import { StatusBadge } from '../components/StatusBadge'
import { InvoiceBadge } from '../components/InvoiceBadge'

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className={`p-2 rounded-lg bg-white/[0.04] ${accent ?? ''}`}>
          <Icon size={16} className="text-text-muted" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

export function Dashboard() {
  const clients = useStore((s) => s.clients)

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const active = clients.filter((c) => c.status === 'active')
    const paused = clients.filter((c) => c.status === 'paused')
    const inactive = clients.filter((c) => c.status === 'inactive')

    let overdueCount = 0
    let thisWeekCount = 0
    let effectiveMrr = 0
    const upcoming: typeof clients = []

    active.forEach((c) => {
      effectiveMrr += calcMonthlyRevenue(c.pricePerCycle, c.billingCycle, c.customCycleDays)
      if (!c.nextInvoiceDate) return
      const next = parseISO(c.nextInvoiceDate)
      const diff = differenceInDays(next, today)
      const status = getInvoiceStatus(next)
      if (status === 'overdue') overdueCount++
      if (status === 'this_week') thisWeekCount++
      if (diff >= 0 && diff <= 21) upcoming.push(c)
    })

    upcoming.sort((a, b) => {
      if (!a.nextInvoiceDate || !b.nextInvoiceDate) return 0
      return parseISO(a.nextInvoiceDate).getTime() - parseISO(b.nextInvoiceDate).getTime()
    })

    return { active, paused, inactive, effectiveMrr, overdueCount, thisWeekCount, upcoming }
  }, [clients])

  const recentClients = [...clients]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">{format(new Date(), "EEEE d MMMM yyyy")}</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard
          label="Actieve klanten"
          value={stats.active.length}
          icon={Users}
          sub={`${stats.paused.length} gepauzeerd`}
        />
        <KpiCard
          label="Effectieve maandomzet"
          value={`€${Math.round(stats.effectiveMrr).toLocaleString('nl-NL')}`}
          icon={TrendingUp}
          sub="Genormaliseerd over alle cycli"
        />
        <KpiCard
          label="Verlopen facturen"
          value={stats.overdueCount}
          icon={AlertCircle}
          sub={stats.overdueCount > 0 ? 'Actie vereist' : 'Alles op orde'}
        />
        <KpiCard
          label="Facturen deze week"
          value={stats.thisWeekCount}
          icon={Clock}
          sub="Komende 7 dagen"
        />
        <KpiCard
          label="Inactieve klanten"
          value={stats.inactive.length}
          icon={UserMinus}
          sub="Churned"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Komende facturen */}
        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-text-muted" />
              <h2 className="text-sm font-medium text-text-primary">Komende facturen</h2>
            </div>
            <Link to="/clients" className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
              Alle klanten <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {stats.upcoming.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-text-muted">Geen komende facturen</div>
            )}
            {stats.upcoming.slice(0, 6).map((c) => {
              const next = c.nextInvoiceDate ? parseISO(c.nextInvoiceDate) : null
              const status = next ? getInvoiceStatus(next) : 'ok'
              return (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-accent-blue">
                        {c.companyName.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{c.companyName}</p>
                      <p className="text-xs text-text-muted">
                        {formatWeek(c.nextInvoiceDate)}
                        <span className="text-text-muted/50 ml-1">· {formatWeekDate(c.nextInvoiceDate)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-medium text-text-primary">
                      €{c.pricePerCycle.toLocaleString('nl-NL')}
                    </span>
                    <InvoiceBadge status={status} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Klantenoverzicht */}
        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-text-muted" />
              <h2 className="text-sm font-medium text-text-primary">Alle klanten</h2>
            </div>
            <Link to="/clients" className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
              Beheren <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {recentClients.map((c) => {
              const next = c.nextInvoiceDate ? parseISO(c.nextInvoiceDate) : null
              const status = next ? getInvoiceStatus(next) : 'ok'
              return (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-purple-400">
                        {c.companyName.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{c.companyName}</p>
                      <p className="text-xs text-text-muted">{formatCycle(c.billingCycle, c.customCycleDays)} · {c.packageType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {c.status === 'active' && <InvoiceBadge status={status} />}
                    {c.status !== 'active' && <StatusBadge status={c.status} />}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
