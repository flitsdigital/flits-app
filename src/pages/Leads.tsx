import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserPlus, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { PageHeader } from '../components/PageHeader'
import { LeadForm } from '../components/LeadForm'
import { useLeadsData } from '../hooks/useLeadsData'
import { usePageMeta } from '../hooks/usePageMeta'
import type { Lead, LeadStatus } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Status config ─────────────────────────────────────────────────────────────

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; badge: string; dot: string }> = {
  new:       { label: 'Nieuw',             color: 'bg-blue-500/10 border-blue-500/25',   badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',   dot: 'bg-blue-400' },
  contacted: { label: 'Gecontacteerd',     color: 'bg-purple-500/10 border-purple-500/25', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/25', dot: 'bg-purple-400' },
  qualified: { label: 'Gekwalificeerd',    color: 'bg-orange-500/10 border-orange-500/25', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25', dot: 'bg-orange-400' },
  proposal:  { label: 'Offerte verstuurd', color: 'bg-yellow-500/10 border-yellow-500/25', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', dot: 'bg-yellow-400' },
  won:       { label: 'Gewonnen',          color: 'bg-green-500/10 border-green-500/25',  badge: 'bg-green-500/15 text-green-400 border-green-500/25',  dot: 'bg-green-400' },
  lost:      { label: 'Verloren',          color: 'bg-zinc-500/10 border-zinc-500/25',    badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',    dot: 'bg-zinc-400' },
}

const PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastContactLabel(dateStr?: string) {
  if (!dateStr) return null
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: nl })
}

// ── Lead card (Kanban) ────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onDragStart,
  onClick,
}: {
  lead: Lead
  onDragStart: (e: React.DragEvent, lead: Lead) => void
  onClick: (id: string) => void
}) {
  const cfg = LEAD_STATUS_CONFIG[lead.status]
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onClick(lead.id)}
      className="bg-surface-3 border border-border-subtle rounded-lg p-3 cursor-pointer hover:border-border-default transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-text-primary leading-snug group-hover:text-accent-blue transition-colors">
          {lead.companyName}
        </p>
        {lead.estimatedValue != null && (
          <span className="text-xs font-semibold text-text-secondary shrink-0">
            €{lead.estimatedValue.toLocaleString('nl-NL')}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-2">{lead.contactPerson}</p>
      <div className="flex items-center justify-between">
        <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', cfg.badge)}>
          {cfg.label}
        </span>
        {lead.lastContactedAt && (
          <span className="text-xs text-text-muted">{lastContactLabel(lead.lastContactedAt)}</span>
        )}
      </div>
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  leads,
  onDragStart,
  onDrop,
  onDragOver,
  onCardClick,
}: {
  status: LeadStatus
  leads: Lead[]
  onDragStart: (e: React.DragEvent, lead: Lead) => void
  onDrop: (e: React.DragEvent, status: LeadStatus) => void
  onDragOver: (e: React.DragEvent) => void
  onCardClick: (id: string) => void
}) {
  const cfg = LEAD_STATUS_CONFIG[status]
  const total = leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0)

  return (
    <div
      className="flex flex-col min-w-[220px] w-[220px]"
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
    >
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
        <span className="text-xs font-semibold text-text-secondary">{cfg.label}</span>
        <span className="ml-auto text-xs text-text-muted bg-surface-3 border border-border-subtle rounded px-1.5 py-0.5 font-medium">
          {leads.length}
        </span>
      </div>
      {total > 0 && (
        <p className="text-xs text-text-muted mb-2 px-0.5">
          €{total.toLocaleString('nl-NL')} totaal
        </p>
      )}
      <div className="flex flex-col gap-2 min-h-[80px]">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type ViewMode = 'kanban' | 'list'
type SortKey = 'companyName' | 'estimatedValue' | 'lastContactedAt' | 'createdAt'

export function Leads() {
  usePageMeta('Leads → Flits Impact', 'Beheer je leadpipeline.')
  const navigate = useNavigate()
  const { leads, loading, addLead, updateLeadStatus } = useLeadsData()

  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null)

  const filtered = useMemo(() => {
    let list = leads.filter((l) => {
      const q = search.toLowerCase()
      const matchSearch = !q || [l.companyName, l.contactPerson, l.email].join(' ').toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || l.status === filterStatus
      return matchSearch && matchStatus
    })
    list = [...list].sort((a, b) => {
      let va: string | number = 0
      let vb: string | number = 0
      if (sortKey === 'companyName') { va = a.companyName; vb = b.companyName }
      if (sortKey === 'estimatedValue') { va = a.estimatedValue ?? -1; vb = b.estimatedValue ?? -1 }
      if (sortKey === 'lastContactedAt') { va = a.lastContactedAt ?? ''; vb = b.lastContactedAt ?? '' }
      if (sortKey === 'createdAt') { va = a.createdAt; vb = b.createdAt }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [leads, search, filterStatus, sortKey, sortAsc])

  const byStatus = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = { new: [], contacted: [], qualified: [], proposal: [], won: [], lost: [] }
    filtered.forEach((l) => map[l.status].push(l))
    return map
  }, [filtered])

  function handleDragStart(e: React.DragEvent, lead: Lead) {
    setDraggingLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault()
    if (!draggingLead || draggingLead.status === status) { setDraggingLead(null); return }
    await updateLeadStatus(draggingLead.id, status)
    toast.success(`${draggingLead.companyName} verplaatst naar ${LEAD_STATUS_CONFIG[status].label}`)
    setDraggingLead(null)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const totalPipeline = leads
    .filter((l) => !['won', 'lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} leads · €${totalPipeline.toLocaleString('nl-NL')} in pipeline`}
        actions={
          <Button size="sm" onClick={() => setShowForm(true)} className="h-7 text-xs gap-1.5">
            <Plus size={14} />
            Nieuwe lead
          </Button>
        }
      />

      <div className="px-6 py-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-8 bg-surface-2 border-border-subtle"
              placeholder="Zoek lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {viewMode === 'list' && (
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as LeadStatus | 'all')}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-6 px-2.5">Alle</TabsTrigger>
                {PIPELINE.map((s) => (
                  <TabsTrigger key={s} value={s} className="text-xs h-6 px-2.5">
                    {LEAD_STATUS_CONFIG[s].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="ml-auto">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="kanban" className="text-xs h-6 px-2.5">Kanban</TabsTrigger>
                <TabsTrigger value="list" className="text-xs h-6 px-2.5">Lijst</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Kanban view */}
        {viewMode === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: PIPELINE.length * 236 }}>
              {PIPELINE.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  leads={byStatus[status]}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onCardClick={(id) => navigate(`/leads/${id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_160px_140px_120px_140px] gap-4 px-4 py-2 border-b border-border-subtle">
              <button
                onClick={() => toggleSort('companyName')}
                className={cn('text-xs font-medium text-left transition-colors flex items-center gap-1', sortKey === 'companyName' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}
              >
                Bedrijf {sortKey === 'companyName' && <ArrowUpDown size={11} />}
              </button>
              <span className="text-xs font-medium text-text-muted">Status</span>
              <button
                onClick={() => toggleSort('estimatedValue')}
                className={cn('text-xs font-medium text-left transition-colors flex items-center gap-1', sortKey === 'estimatedValue' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}
              >
                Waarde {sortKey === 'estimatedValue' && <ArrowUpDown size={11} />}
              </button>
              <span className="text-xs font-medium text-text-muted">Bron</span>
              <button
                onClick={() => toggleSort('lastContactedAt')}
                className={cn('text-xs font-medium text-left transition-colors flex items-center gap-1', sortKey === 'lastContactedAt' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}
              >
                Laatste contact {sortKey === 'lastContactedAt' && <ArrowUpDown size={11} />}
              </button>
            </div>

            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserPlus size={24} className="text-text-muted mb-2 opacity-40" />
                <p className="text-xs text-text-muted">Geen leads gevonden</p>
              </div>
            )}

            <div className="divide-y divide-border-subtle">
              {filtered.map((lead) => {
                const cfg = LEAD_STATUS_CONFIG[lead.status]
                return (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="grid grid-cols-[1fr_160px_140px_120px_140px] gap-4 px-4 py-2.5 hover:bg-white/[0.03] transition-colors items-center cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{lead.companyName}</p>
                      <p className="text-xs text-text-muted truncate">{lead.contactPerson}</p>
                    </div>
                    <div>
                      <Badge className={cn('text-xs border font-medium', cfg.badge)}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-text-secondary">
                      {lead.estimatedValue != null ? `€${lead.estimatedValue.toLocaleString('nl-NL')}` : '—'}
                    </div>
                    <div className="text-sm text-text-muted capitalize">
                      {lead.source ?? '—'}
                    </div>
                    <div className="text-sm text-text-muted">
                      {lead.lastContactedAt ? lastContactLabel(lead.lastContactedAt) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <LeadForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={async (data) => {
          await addLead(data)
          toast.success('Lead aangemaakt')
          setShowForm(false)
        }}
      />
    </div>
  )
}
