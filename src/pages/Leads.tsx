import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  UserPlus,
  ArrowUpDown,
  Sparkles,
  Phone,
  CheckCircle2,
  FileText,
  Trophy,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'
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

export const LEAD_STATUS_CONFIG: Record<LeadStatus, {
  label: string
  // legacy props (still consumed in LeadDetail for the StatusDropdown)
  color: string
  badge: string
  dot: string
  // new Kanban props (mirrors the Project task-board styling)
  Icon: React.ElementType
  bg: string
  headerBg: string
  ring: string
  text: string
}> = {
  new: {
    label: 'Nieuw',
    color: 'bg-blue-500/10 border-blue-500/25',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    dot: 'bg-blue-400',
    Icon: Sparkles,
    bg: 'bg-blue-500/[0.06]',
    headerBg: 'bg-blue-500/10',
    ring: 'bg-blue-400',
    text: 'text-blue-400',
  },
  contacted: {
    label: 'Gecontacteerd',
    color: 'bg-purple-500/10 border-purple-500/25',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    dot: 'bg-purple-400',
    Icon: Phone,
    bg: 'bg-purple-500/[0.06]',
    headerBg: 'bg-purple-500/10',
    ring: 'bg-purple-400',
    text: 'text-purple-400',
  },
  qualified: {
    label: 'Gekwalificeerd',
    color: 'bg-orange-500/10 border-orange-500/25',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    dot: 'bg-orange-400',
    Icon: CheckCircle2,
    bg: 'bg-orange-500/[0.06]',
    headerBg: 'bg-orange-500/10',
    ring: 'bg-orange-400',
    text: 'text-orange-400',
  },
  proposal: {
    label: 'Offerte verstuurd',
    color: 'bg-yellow-500/10 border-yellow-500/25',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    dot: 'bg-yellow-400',
    Icon: FileText,
    bg: 'bg-yellow-500/[0.06]',
    headerBg: 'bg-yellow-500/10',
    ring: 'bg-yellow-400',
    text: 'text-yellow-400',
  },
  won: {
    label: 'Gewonnen',
    color: 'bg-green-500/10 border-green-500/25',
    badge: 'bg-green-500/15 text-green-400 border-green-500/25',
    dot: 'bg-green-400',
    Icon: Trophy,
    bg: 'bg-green-500/[0.05]',
    headerBg: 'bg-green-500/10',
    ring: 'bg-green-400',
    text: 'text-green-400',
  },
  lost: {
    label: 'Verloren',
    color: 'bg-zinc-500/10 border-zinc-500/25',
    badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
    dot: 'bg-zinc-400',
    Icon: XCircle,
    bg: 'bg-zinc-500/[0.05]',
    headerBg: 'bg-zinc-500/10',
    ring: 'bg-zinc-400',
    text: 'text-zinc-400',
  },
}

const PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastContactLabel(dateStr?: string) {
  if (!dateStr) return null
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: nl })
}

// ── Lead Card (Kanban) ────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onClick,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead
  onClick: () => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const initials = lead.companyName.charAt(0).toUpperCase()
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        'bg-surface-0 border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-zinc-500 hover:shadow-lg hover:shadow-black/20 transition-all group select-none',
        isDragging && 'opacity-40 scale-[0.98]',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm text-text-primary leading-snug group-hover:text-white transition-colors font-medium">
          {lead.companyName}
        </p>
        {lead.estimatedValue != null && (
          <span className="text-xs font-semibold text-text-secondary shrink-0">
            €{lead.estimatedValue.toLocaleString('nl-NL')}
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted mb-2 truncate">{lead.contactPerson}</p>

      <div className="flex items-center gap-1.5">
        {lead.lastContactedAt ? (
          <span className="text-xs text-text-muted">
            {lastContactLabel(lead.lastContactedAt)}
          </span>
        ) : (
          <span className="text-xs text-text-muted/60 italic">Nog geen contact</span>
        )}

        <div className="ml-auto w-5 h-5 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
          <span className="text-[9px] font-semibold text-accent-blue">{initials}</span>
        </div>
      </div>
    </div>
  )
}

// ── Kanban Board ──────────────────────────────────────────────────────────────

function LeadsKanban({
  leads,
  onCardClick,
  onAddLead,
  onStatusChange,
}: {
  leads: Lead[]
  onCardClick: (id: string) => void
  onAddLead: (status: LeadStatus) => void
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)

  const byStatus = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = { new: [], contacted: [], qualified: [], proposal: [], won: [], lost: [] }
    leads.forEach((l) => map[l.status].push(l))
    return map
  }, [leads])

  function handleDragOver(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  function handleDrop(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault()
    if (draggedId) {
      const lead = leads.find((l) => l.id === draggedId)
      if (lead && lead.status !== status) {
        onStatusChange(draggedId, status)
      }
    }
    setDraggedId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-4 snap-x snap-mandatory">
      {PIPELINE.map((status) => {
        const cfg = LEAD_STATUS_CONFIG[status]
        const Icon = cfg.Icon
        const isOver = dragOverStatus === status
        const isDragSource = draggedId !== null && byStatus[status].some((l) => l.id === draggedId)
        const total = byStatus[status].reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0)

        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, status)}
            className={clsx(
              'flex flex-col w-[272px] shrink-0 snap-start rounded-xl overflow-hidden border transition-all duration-150',
              cfg.bg,
              isOver
                ? 'border-accent-blue/60 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]'
                : isDragSource
                  ? 'border-zinc-700'
                  : 'border-border-subtle',
            )}
          >
            {/* Column header */}
            <div className={clsx('flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle', cfg.headerBg)}>
              <div className={clsx('w-2 h-2 rounded-full shrink-0', cfg.ring)} />
              <Icon size={13} className={cfg.text} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', cfg.text)}>{cfg.label}</span>
              <span
                className={clsx(
                  'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full',
                  byStatus[status].length > 0 ? `${cfg.text} bg-white/[0.08]` : 'text-text-muted',
                )}
              >
                {byStatus[status].length}
              </span>
            </div>

            {total > 0 && (
              <div className="px-3 py-1.5 border-b border-border-subtle/50 text-[10px] text-text-muted">
                €{total.toLocaleString('nl-NL')} totaal
              </div>
            )}

            {/* Cards + drop zone */}
            <div
              className={clsx(
                'flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150',
                isOver && byStatus[status].length === 0 && 'bg-accent-blue/[0.06]',
              )}
            >
              {byStatus[status].map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => { if (!draggedId) onCardClick(lead.id) }}
                  isDragging={draggedId === lead.id}
                  onDragStart={() => setDraggedId(lead.id)}
                  onDragEnd={() => { setDraggedId(null); setDragOverStatus(null) }}
                />
              ))}

              {isOver && draggedId && !byStatus[status].some((l) => l.id === draggedId) && (
                <div className="border-2 border-dashed border-accent-blue/40 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-accent-blue/60">Hier neerzetten</span>
                </div>
              )}
            </div>

            {/* Add lead */}
            <div className="p-2 border-t border-border-subtle">
              <button
                onClick={() => onAddLead(status)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <Plus size={12} />
                Lead toevoegen
              </button>
            </div>
          </div>
        )
      })}
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
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus | undefined>()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortAsc, setSortAsc] = useState(false)

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

  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    await updateLeadStatus(leadId, newStatus)
    toast.success(`${lead.companyName} verplaatst naar ${LEAD_STATUS_CONFIG[newStatus].label}`)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function openAddForm(status?: LeadStatus) {
    setDefaultStatus(status)
    setShowForm(true)
  }

  const totalPipeline = leads
    .filter((l) => !['won', 'lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} leads · €${totalPipeline.toLocaleString('nl-NL')} in pipeline`}
        actions={
          <Button size="sm" onClick={() => openAddForm()} className="h-8 lg:h-7 text-xs gap-1.5">
            <Plus size={14} />
            <span className="hidden sm:inline">Nieuwe lead</span>
            <span className="sm:hidden">Lead</span>
          </Button>
        }
      />

      <div className={clsx('flex-1 px-4 lg:px-6 py-4 lg:py-5 flex flex-col min-h-0', viewMode === 'kanban' ? 'overflow-hidden' : 'overflow-y-auto')}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-5 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[180px] lg:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-8 bg-surface-2 border-border-subtle"
              placeholder="Zoek lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {viewMode === 'list' && (
            <div className="w-full lg:w-auto overflow-x-auto scrollbar-none">
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
            </div>
          )}

          <div className="lg:ml-auto">
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
          <div className="flex-1 min-h-0">
            {loading && leads.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <LeadsKanban
                leads={filtered}
                onCardClick={(id) => navigate(`/leads/${id}`)}
                onAddLead={(status) => openAddForm(status)}
                onStatusChange={handleStatusChange}
              />
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
            {/* Desktop kolomkoppen */}
            <div className="hidden lg:grid grid-cols-[1fr_160px_140px_120px_140px] gap-4 px-4 py-2 border-b border-border-subtle">
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
                const initials = lead.companyName.charAt(0).toUpperCase()
                return (
                  <div key={lead.id}>
                    {/* Desktop rij */}
                    <div
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hidden lg:grid grid-cols-[1fr_160px_140px_120px_140px] gap-4 px-4 py-2.5 hover:bg-white/[0.03] transition-colors items-center cursor-pointer"
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

                    {/* Mobile card */}
                    <button
                      type="button"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="lg:hidden w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-md bg-accent-blue/15 flex items-center justify-center shrink-0 border border-accent-blue/25">
                          <span className="text-sm font-semibold text-accent-blue">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-text-primary truncate">{lead.companyName}</p>
                            <Badge className={cn('text-xs border font-medium', cfg.badge)}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {lead.contactPerson}
                            {lead.estimatedValue != null && (
                              <> · <span className="text-text-secondary font-medium">€{lead.estimatedValue.toLocaleString('nl-NL')}</span></>
                            )}
                          </p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {lead.lastContactedAt ? lastContactLabel(lead.lastContactedAt) : 'Nog geen contact'}
                            {lead.source && <> · <span className="capitalize">{lead.source}</span></>}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <LeadForm
        open={showForm}
        onClose={() => { setShowForm(false); setDefaultStatus(undefined) }}
        onSave={async (data) => {
          await addLead({ ...data, status: defaultStatus ?? data.status })
          toast.success('Lead aangemaakt')
          setShowForm(false)
          setDefaultStatus(undefined)
        }}
      />
    </div>
  )
}
