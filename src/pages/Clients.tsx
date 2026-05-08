import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { parseISO, differenceInDays, startOfDay } from 'date-fns'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { getInvoiceStatus, formatWeek, formatWeekDate, formatCycle } from '../lib/billing'
import { StatusBadge } from '../components/StatusBadge'
import { InvoiceBadge } from '../components/InvoiceBadge'
import { ClientForm } from '../components/ClientForm'
import type { Client } from '../types'

type SortKey = 'companyName' | 'nextInvoiceDate' | 'pricePerCycle' | 'status'
type Filter = 'all' | 'active' | 'paused' | 'inactive'

export function Clients() {
  usePageMeta('Klanten → Flits Impact', 'Beheer je klanten, contracten en facturatie.')
  const { clients, addClient } = useStore()
  const [showForm, setShowForm] = useState(false)
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
        va = a.nextInvoiceDate
          ? differenceInDays(parseISO(a.nextInvoiceDate), today)
          : 9999
        vb = b.nextInvoiceDate
          ? differenceInDays(parseISO(b.nextInvoiceDate), today)
          : 9999
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
        className={`text-xs font-medium transition-colors ${active ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            Klant toevoegen
          </button>
        }
      />
      <div className="px-8 py-6 max-w-7xl mx-auto">

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="w-full bg-surface-2 border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-colors"
            placeholder="Zoek klant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle rounded-lg p-1">
          {(['all', 'active', 'paused', 'inactive'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-white/[0.08] text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {f === 'all' ? 'Alle' : f === 'active' ? 'Actief' : f === 'paused' ? 'Gepauzeerd' : 'Inactief'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_140px_120px_140px_120px_60px] gap-4 px-5 py-3 border-b border-border-subtle">
          <SortBtn k="companyName" label="Klant" />
          <SortBtn k="status" label="Status" />
          <span className="text-xs font-medium text-text-muted">Cyclus</span>
          <SortBtn k="nextInvoiceDate" label="Volgende factuur" />
          <SortBtn k="pricePerCycle" label="Prijs" />
          <span />
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-text-muted mb-3 opacity-40" />
            <p className="text-sm text-text-muted">Geen klanten gevonden</p>
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
                className="grid grid-cols-[1fr_140px_120px_140px_120px_60px] gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-accent-blue">
                      {c.companyName.charAt(0)}
                    </span>
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
                <div className="text-xs text-text-muted text-right">→</div>
              </Link>
            )
          })}
        </div>
      </div>

      <ClientForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={(data) => {
          addClient(data)
          setShowForm(false)
        }}
      />
      </div>
    </div>
  )
}
