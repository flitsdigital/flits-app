import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, MoreHorizontal, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../components/PageHeader'
import { parseISO, differenceInDays, startOfDay } from 'date-fns'
import { useStore } from '../store/useStore'
import { useUIStore } from '../store/useUIStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { getInvoiceStatus, formatWeek, formatWeekDate, formatCycle, calcMonthlyRevenue } from '../lib/billing'
import { computeClientStats } from '../lib/clientStats'
import { StatusBadge } from '../components/StatusBadge'
import { InvoiceBadge } from '../components/InvoiceBadge'
import { ClientForm, type ClientFormSaveData } from '../components/ClientForm'
import { ClientTypeBadge } from '../components/ClientTypeBadge'
import type { Client, ClientType } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type SortKey = 'companyName' | 'nextInvoiceDate' | 'pricePerCycle' | 'status'
type Filter = 'all' | 'active' | 'paused' | 'inactive'

export function Clients() {
  usePageMeta('Klanten → Flits Impact', 'Beheer je klanten, contracten en facturatie.')
  const { clients, addClient, updateClient, addClientInvoice, clientInvoices, posts } = useStore()
  const clientsTypeSegment = useUIStore((s) => s.clientsTypeSegment)
  const setClientsTypeSegment = useUIStore((s) => s.setClientsTypeSegment)

  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | undefined>()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('companyName')
  const [sortAsc, setSortAsc] = useState(true)

  const statsById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof computeClientStats>>()
    for (const c of clients) {
      m.set(c.id, computeClientStats(c, { invoices: clientInvoices, posts }))
    }
    return m
  }, [clients, clientInvoices, posts])

  const kpi = useMemo(() => {
    const today = startOfDay(new Date())
    const bySeg = (t: ClientType | 'all') =>
      t === 'all' ? clients : clients.filter((c) => (c.clientType ?? 'recurring') === t)

    const list = bySeg(clientsTypeSegment === 'all' ? 'all' : clientsTypeSegment)
    const activeSeg = list.filter((c) => c.status === 'active')

    let mrr = 0
    let open = 0
    let thisWeek = 0
    let overdue = 0

    for (const c of activeSeg) {
      const st = statsById.get(c.id)
      if (!st) continue
      if ((c.clientType ?? 'recurring') === 'recurring') {
        mrr += calcMonthlyRevenue(c.pricePerCycle, c.billingCycle, c.customCycleDays)
        if (c.nextInvoiceDate) {
          const next = parseISO(c.nextInvoiceDate)
          const s = getInvoiceStatus(next)
          if (s === 'overdue') overdue++
          if (s === 'this_week') thisWeek++
        }
      } else {
        open += st.openAmount
        if (st.nextMilestone) {
          const d = parseISO(st.nextMilestone.dueDate)
          const s = getInvoiceStatus(d)
          if (s === 'overdue') overdue++
          if (s === 'this_week') thisWeek++
        }
      }
    }

    const projectTotalBudget = activeSeg
      .filter((c) => c.clientType === 'project')
      .reduce((s, c) => s + (c.projectBudget ?? 0), 0)

    return {
      count: list.length,
      active: activeSeg.length,
      mrr,
      open,
      thisWeek,
      overdue,
      projectTotalBudget,
    }
  }, [clients, clientsTypeSegment, statsById])

  const filtered = useMemo(() => {
    const today = startOfDay(new Date())
    let list = clients.filter((c) => {
      const matchSearch = [c.companyName, c.contactPerson, c.email, c.packageType]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchFilter = filter === 'all' || c.status === filter
      const matchType =
        clientsTypeSegment === 'all' || (c.clientType ?? 'recurring') === clientsTypeSegment
      return matchSearch && matchFilter && matchType
    })

    list = [...list].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sortKey === 'companyName') {
        va = a.companyName
        vb = b.companyName
      }
      if (sortKey === 'pricePerCycle') {
        const ta = a.clientType ?? 'recurring'
        const tb = b.clientType ?? 'recurring'
        va =
          ta === 'recurring'
            ? a.pricePerCycle
            : ta === 'project'
              ? a.projectBudget ?? 0
              : statsById.get(a.id)?.singleInvoice?.amount ?? 0
        vb =
          tb === 'recurring'
            ? b.pricePerCycle
            : tb === 'project'
              ? b.projectBudget ?? 0
              : statsById.get(b.id)?.singleInvoice?.amount ?? 0
      }
      if (sortKey === 'status') {
        va = a.status
        vb = b.status
      }
      if (sortKey === 'nextInvoiceDate') {
        const sa = statsById.get(a.id)
        const sb = statsById.get(b.id)
        const da =
          (a.clientType ?? 'recurring') === 'recurring' && a.nextInvoiceDate
            ? differenceInDays(parseISO(a.nextInvoiceDate), today)
            : sa?.nextMilestone
              ? differenceInDays(parseISO(sa.nextMilestone.dueDate), today)
              : sa?.singleInvoice
                ? differenceInDays(parseISO(sa.singleInvoice.dueDate), today)
                : 9999
        const db =
          (b.clientType ?? 'recurring') === 'recurring' && b.nextInvoiceDate
            ? differenceInDays(parseISO(b.nextInvoiceDate), today)
            : sb?.nextMilestone
              ? differenceInDays(parseISO(sb.nextMilestone.dueDate), today)
              : sb?.singleInvoice
                ? differenceInDays(parseISO(sb.singleInvoice.dueDate), today)
                : 9999
        va = da
        vb = db
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [clients, search, filter, sortKey, sortAsc, clientsTypeSegment, statsById])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          'text-xs font-medium transition-colors',
          active ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
        )}
      >
        {label}
        {active ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </button>
    )
  }

  async function handleSave(data: ClientFormSaveData) {
    const { pendingInvoices, ...rest } = data
    if (editClient) {
      const patch = {
        ...rest,
        ...(rest.clientType !== 'recurring' ? { invoiceRecords: [] as Client['invoiceRecords'] } : {}),
      }
      await updateClient(editClient.id, patch)
      if (pendingInvoices?.length) {
        for (const p of pendingInvoices) {
          await addClientInvoice({ ...p, clientId: editClient.id })
        }
      }
      toast.success('Klant bijgewerkt')
    } else {
      const created = await addClient(rest)
      if (pendingInvoices?.length) {
        for (const p of pendingInvoices) {
          await addClientInvoice({ ...p, clientId: created.id })
        }
      }
      toast.success('Klant toegevoegd')
    }
    setShowForm(false)
    setEditClient(undefined)
  }

  return (
    <div>
      <PageHeader
        title="Klanten"
        subtitle={`${clients.length} klanten`}
        actions={
          <Button size="sm" onClick={() => setShowForm(true)} className="h-7 text-xs gap-1.5">
            <Plus size={14} />
            Klant toevoegen
          </Button>
        }
      />
      <div className="px-6 py-5 max-w-6xl mx-auto">
        {/* Type segment + KPI */}
        <div className="flex flex-col gap-3 mb-4">
          <Tabs value={clientsTypeSegment} onValueChange={(v) => setClientsTypeSegment(v as typeof clientsTypeSegment)}>
            <TabsList className="h-8 flex-wrap">
              <TabsTrigger value="all" className="text-xs h-6 px-2.5">
                Alle
              </TabsTrigger>
              <TabsTrigger value="recurring" className="text-xs h-6 px-2.5">
                Retainer
              </TabsTrigger>
              <TabsTrigger value="project" className="text-xs h-6 px-2.5">
                Projecten
              </TabsTrigger>
              <TabsTrigger value="oneoff" className="text-xs h-6 px-2.5">
                Eenmalig
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-text-muted">
              {kpi.count} in segment · {kpi.active} actief
            </span>
            {clientsTypeSegment === 'recurring' || clientsTypeSegment === 'all' ? (
              <span className="text-text-muted">
                MRR (retainer): ca. €{Math.round(kpi.mrr).toLocaleString('nl-NL')}/mnd
              </span>
            ) : null}
            {clientsTypeSegment === 'project' ? (
              <span className="text-text-muted">
                Totaal budget (actief): €{kpi.projectTotalBudget.toLocaleString('nl-NL')}
              </span>
            ) : null}
            {(clientsTypeSegment === 'project' ||
              clientsTypeSegment === 'oneoff' ||
              clientsTypeSegment === 'all') && (
              <span className="text-text-muted">Openstaand: €{kpi.open.toLocaleString('nl-NL')}</span>
            )}
            <span className="text-text-muted">Deze week: {kpi.thisWeek}</span>
            <span className="text-orange-400">Achterstallig: {kpi.overdue}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-8 bg-surface-2 border-border-subtle"
              placeholder="Zoek klant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-6 px-2.5">
                Alle
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs h-6 px-2.5">
                Actief
              </TabsTrigger>
              <TabsTrigger value="paused" className="text-xs h-6 px-2.5">
                Gepauzeerd
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs h-6 px-2.5">
                Inactief
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.2fr)_100px_100px_140px_120px_60px] gap-3 px-4 py-2 border-b border-border-subtle">
            <SortBtn k="companyName" label="Klant" />
            <span className="text-xs font-medium text-text-muted">Soort</span>
            <SortBtn k="status" label="Status" />
            <span className="text-xs font-medium text-text-muted">Cyclus / termijn</span>
            <SortBtn k="nextInvoiceDate" label="Volgende factuur" />
            <SortBtn k="pricePerCycle" label="Prijs" />
            <span />
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users size={24} className="text-text-muted mb-2 opacity-40" />
              <p className="text-xs text-text-muted">Geen klanten gevonden</p>
            </div>
          )}

          <div className="divide-y divide-border-subtle">
            {filtered.map((c) => {
              const st = statsById.get(c.id)
              const ct = c.clientType ?? 'recurring'
              const nextRecurring = c.nextInvoiceDate ? parseISO(c.nextInvoiceDate) : null
              const invoiceStatusRecurring = nextRecurring ? getInvoiceStatus(nextRecurring) : 'ok'
              const nextM = st?.nextMilestone ?? st?.singleInvoice
              const nextNonRecurring = nextM ? parseISO(nextM.dueDate) : null
              const invoiceStatusOther = nextNonRecurring ? getInvoiceStatus(nextNonRecurring) : 'ok'

              return (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  className="group grid grid-cols-[minmax(0,1.2fr)_100px_100px_140px_120px_60px] gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors items-center"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded bg-accent-blue/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-accent-blue">{c.companyName.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{c.companyName}</p>
                      <p className="text-xs text-text-muted truncate">{c.contactPerson}</p>
                    </div>
                  </div>
                  <div>
                    <ClientTypeBadge type={c.clientType} />
                  </div>
                  <div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-sm text-text-secondary">
                    {ct === 'recurring' && formatCycle(c.billingCycle, c.customCycleDays)}
                    {ct === 'project' && (
                      <span className="text-xs">
                        {st?.progress ? `${st.progress.paidCount}/${st.progress.totalCount}` : '—'} termijnen
                      </span>
                    )}
                    {ct === 'oneoff' && <span className="text-xs">Eenmalig</span>}
                  </div>
                  <div>
                    {c.status === 'active' ? (
                      ct === 'recurring' ? (
                        <div>
                          <p className="text-sm font-medium text-text-primary">{formatWeek(c.nextInvoiceDate)}</p>
                          <p className="text-xs text-text-muted mt-0.5">{formatWeekDate(c.nextInvoiceDate)}</p>
                          <div className="mt-1">
                            <InvoiceBadge status={invoiceStatusRecurring} />
                          </div>
                        </div>
                      ) : nextM ? (
                        <div>
                          <p className="text-sm font-medium text-text-primary truncate">{nextM.label}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            €{nextM.amount.toLocaleString('nl-NL')} · {formatWeekDate(nextM.dueDate)}
                          </p>
                          <div className="mt-1">
                            <InvoiceBadge status={invoiceStatusOther} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-text-primary">
                    {ct === 'recurring' && <>€{c.pricePerCycle.toLocaleString('nl-NL')}</>}
                    {ct === 'project' && (
                      <>
                        €{(c.projectBudget ?? 0).toLocaleString('nl-NL')}
                        {st?.progress != null && st.progress.total > 0 && (
                          <span className="block h-1 w-full max-w-[72px] mt-1 rounded-full bg-surface-3 overflow-hidden">
                            <span
                              className="block h-full bg-green-500/80"
                              style={{ width: `${Math.min(100, st.progress.pct)}%` }}
                            />
                          </span>
                        )}
                      </>
                    )}
                    {ct === 'oneoff' && <>€{(st?.singleInvoice?.amount ?? 0).toLocaleString('nl-NL')}</>}
                  </div>
                  <div className="flex justify-end" onClick={(e) => e.preventDefault()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-text-muted opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditClient(c)
                            setShowForm(true)
                          }}
                        >
                          <Edit2 size={13} className="mr-2" /> Bewerken
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <ClientForm
          open={showForm}
          onClose={() => {
            setShowForm(false)
            setEditClient(undefined)
          }}
          onConfirmTypeChange={async (from: ClientType, to: ClientType) => {
            if (from === to) return true
            if (from === 'recurring' && (to === 'project' || to === 'oneoff')) {
              return window.confirm(
                'Je schakelt over van cyclus-facturatie naar project/eenmalig. Cyclus-gegevens worden niet meer gebruikt. Doorgaan?',
              )
            }
            if ((from === 'project' || from === 'oneoff') && to === 'recurring') {
              return window.confirm(
                'Je schakelt over naar retainer/cyclus. Controleer facturatiecyclus en prijs in de volgende stap. Doorgaan?',
              )
            }
            return true
          }}
          onSave={(d) => void handleSave(d)}
          initial={editClient}
        />
      </div>
    </div>
  )
}
