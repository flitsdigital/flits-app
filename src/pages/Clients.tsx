import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, MoreHorizontal, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../components/PageHeader'
import { parseISO, differenceInDays, startOfDay } from 'date-fns'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { getInvoiceStatus, formatWeek, formatWeekDate, formatCycle } from '../lib/billing'
import { StatusBadge } from '../components/StatusBadge'
import { InvoiceBadge } from '../components/InvoiceBadge'
import { ClientForm } from '../components/ClientForm'
import type { Client } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type SortKey = 'companyName' | 'nextInvoiceDate' | 'pricePerCycle' | 'status'
type Filter = 'all' | 'active' | 'paused' | 'inactive'

export function Clients() {
  usePageMeta('Klanten → Flits Impact', 'Beheer je klanten, contracten en facturatie.')
  const { clients, addClient, updateClient } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | undefined>()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('companyName')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const today = startOfDay(new Date())
    let list = clients.filter((c) => {
      const matchSearch = [c.companyName, c.contactPerson, c.email, c.packageType]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchFilter = filter === 'all' || c.status === filter
      return matchSearch && matchFilter
    })

    list = [...list].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sortKey === 'companyName') { va = a.companyName; vb = b.companyName }
      if (sortKey === 'pricePerCycle') { va = a.pricePerCycle; vb = b.pricePerCycle }
      if (sortKey === 'status') { va = a.status; vb = b.status }
      if (sortKey === 'nextInvoiceDate') {
        va = a.nextInvoiceDate ? differenceInDays(parseISO(a.nextInvoiceDate), today) : 9999
        vb = b.nextInvoiceDate ? differenceInDays(parseISO(b.nextInvoiceDate), today) : 9999
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [clients, search, filter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => toggleSort(k)}
        className={cn('text-xs font-medium transition-colors', active ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}
      >
        {label}{active ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </button>
    )
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

        {/* Filters */}
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
              <TabsTrigger value="all" className="text-xs h-6 px-2.5">Alle</TabsTrigger>
              <TabsTrigger value="active" className="text-xs h-6 px-2.5">Actief</TabsTrigger>
              <TabsTrigger value="paused" className="text-xs h-6 px-2.5">Gepauzeerd</TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs h-6 px-2.5">Inactief</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table */}
        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_140px_120px_60px] gap-4 px-4 py-2 border-b border-border-subtle">
            <SortBtn k="companyName" label="Klant" />
            <SortBtn k="status" label="Status" />
            <span className="text-xs font-medium text-text-muted">Cyclus</span>
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
              const next = c.nextInvoiceDate ? parseISO(c.nextInvoiceDate) : null
              const invoiceStatus = next ? getInvoiceStatus(next) : 'ok'
              return (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  className="group grid grid-cols-[1fr_140px_120px_140px_120px_60px] gap-4 px-4 py-2.5 hover:bg-white/[0.03] transition-colors items-center"
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
                  <div><StatusBadge status={c.status} /></div>
                  <div className="text-sm text-text-secondary">{formatCycle(c.billingCycle, c.customCycleDays)}</div>
                  <div>
                    {c.status === 'active' ? (
                      <div>
                        <p className="text-sm font-medium text-text-primary">{formatWeek(c.nextInvoiceDate)}</p>
                        <p className="text-xs text-text-muted mt-0.5">{formatWeekDate(c.nextInvoiceDate)}</p>
                        <div className="mt-1"><InvoiceBadge status={invoiceStatus} /></div>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-text-primary">
                    €{c.pricePerCycle.toLocaleString('nl-NL')}
                  </div>
                  <div className="flex justify-end" onClick={e => e.preventDefault()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted opacity-0 group-hover:opacity-100">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => { setEditClient(c); setShowForm(true) }}>
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
          onClose={() => { setShowForm(false); setEditClient(undefined) }}
          onSave={(data) => {
            if (editClient) {
              updateClient(editClient.id, data)
              toast.success('Klant bijgewerkt')
            } else {
              addClient(data)
              toast.success('Klant toegevoegd')
            }
            setShowForm(false)
            setEditClient(undefined)
          }}
          initial={editClient}
        />
      </div>
    </div>
  )
}
