import { useEffect, useState, useRef } from 'react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths,
  format, parseISO, isWithinInterval,
} from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import {
  Plus, Pencil, Trash2, X, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Users, Download, FileText, Sheet, CalendarDays, SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthStore } from '../store/useAuthStore'
import { useTravelExpensesData } from '../hooks/useTravelExpensesData'
import { useIsMobile } from '../hooks/useBreakpoint'
import { PageHeader } from '../components/PageHeader'
import type { TravelExpense } from '../types'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { travelExpenseRangePresets, type DateRange, type TravelExpenseViewMode } from '../components/travel-expenses/travelExpenseRanges'
import { amount, fmt, totalKm } from '../components/travel-expenses/travelExpenseMoney'
import { exportTravelExpensesCSV, exportTravelExpensesPDF } from '../components/travel-expenses/travelExpenseExport'
import { TravelWeekView, TravelAgendaView, TravelMonthView } from '../components/travel-expenses/TravelExpenseViews'
import { ExpenseModal, BulkExpenseModal } from '../components/travel-expenses/TravelExpenseModals'

export function TravelExpenses() {
  usePageMeta('Reiskosten → Flits Impact', 'Registreer en exporteer reiskosten per week of maand.')
  const clients = useStore((s) => s.clients)
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const isMobile = useIsMobile()
  const now = new Date()
  const presets = travelExpenseRangePresets(now)

  const [viewMode, setTravelExpenseViewMode] = useState<TravelExpenseViewMode>('week')
  const [anchorDate, setAnchorDate] = useState<Date>(now) // stable cursor across view switches
  const [range, setRange] = useState<DateRange>(presets[0].range)
  const [showPresets, setShowPresets] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addDate, setAddDate] = useState<string | undefined>()
  const [editExpense, setEditExpense] = useState<TravelExpense | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const presetsRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Multi-date select
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [showBulk, setShowBulk] = useState(false)

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedDates(new Set())
  }

  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all')
  const { users, expenses, loading, load, deleteExpense } = useTravelExpensesData(isAdmin, selectedUserId)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) setShowPresets(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleDayClick(date: string) {
    setAddDate(date)
    setShowAdd(true)
  }

  async function handleDelete(id: string) {
    await deleteExpense(id)
    setDeleteId(null)
    toast.success('Rit verwijderd')
  }

  function userName(userId: string) {
    const u = users.find((u) => u.id === userId)
    return u ? (u.name ?? u.email) : null
  }

  function navigate(dir: 1 | -1) {
    if (viewMode === 'week') {
      const newAnchor = dir === 1 ? addWeeks(anchorDate, 1) : subWeeks(anchorDate, 1)
      setAnchorDate(newAnchor)
      setRange({ start: startOfWeek(newAnchor, { weekStartsOn: 1 }), end: endOfWeek(newAnchor, { weekStartsOn: 1 }), label: `Week ${format(newAnchor, 'w', { locale: nl })}` })
    } else {
      const newAnchor = dir === 1 ? addMonths(anchorDate, 1) : subMonths(anchorDate, 1)
      setAnchorDate(newAnchor)
      setRange({ start: startOfMonth(newAnchor), end: endOfMonth(newAnchor), label: format(newAnchor, 'MMMM yyyy', { locale: nl }) })
    }
  }

  // Filter expenses for selected range
  const filtered = expenses.filter((e) => {
    const d = parseISO(e.date)
    return isWithinInterval(d, { start: range.start, end: range.end })
  })

  const totalKmPeriod = filtered.reduce((s, e) => s + totalKm(e), 0)
  const totalAmountPeriod = filtered.reduce((s, e) => s + amount(e), 0)

  const rangeLabel = viewMode === 'week'
    ? `${format(range.start, 'd MMM', { locale: nl })} – ${format(range.end, 'd MMM yyyy', { locale: nl })}`
    : format(range.start, 'MMMM yyyy', { locale: nl })

  const periodToolbar = (
    <>
      <div className="flex items-center bg-surface-2 border border-border-subtle rounded-md shrink-0">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 lg:p-1.5 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-l transition-colors" aria-label="Vorige periode">
          <ChevronLeft size={16} className="lg:w-[14px] lg:h-[14px]" />
        </button>
        <span className="text-xs font-medium text-text-primary px-2 min-w-[7.5rem] sm:min-w-[9rem] lg:min-w-[10rem] text-center tabular-nums">{rangeLabel}</span>
        <button type="button" onClick={() => navigate(1)} className="p-1.5 lg:p-1.5 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-r transition-colors" aria-label="Volgende periode">
          <ChevronRight size={16} className="lg:w-[14px] lg:h-[14px]" />
        </button>
      </div>
      <div className="relative shrink-0" ref={presetsRef}>
        <button type="button" onClick={() => setShowPresets((v) => !v)} className="flex items-center gap-1.5 px-2.5 h-8 bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary text-xs rounded-md transition-colors whitespace-nowrap">
          {range.label} <ChevronDown size={11} />
        </button>
        {showPresets && (
          <div className="absolute top-full mt-1 left-0 bg-surface-2 border border-border-default rounded-lg shadow-dropdown z-50 py-1 min-w-[170px]">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => { setRange(p.range); setAnchorDate(p.range.start); setShowPresets(false); if (p.label.includes('week') || p.label === 'Deze week' || p.label === 'Vorige week') setTravelExpenseViewMode('week'); else setTravelExpenseViewMode('month') }}
                className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <Tabs value={viewMode} onValueChange={(v) => {
        const m = v as TravelExpenseViewMode
        setTravelExpenseViewMode(m)
        if (m === 'week') setRange({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }), label: `Week ${format(anchorDate, 'w', { locale: nl })}` })
        else setRange({ start: startOfMonth(anchorDate), end: endOfMonth(anchorDate), label: format(anchorDate, 'MMMM yyyy', { locale: nl }) })
      }} className="hidden lg:block shrink-0">
        <TabsList className="h-8 px-1">
          <TabsTrigger value="week" className="text-xs h-7 px-2">Week</TabsTrigger>
          <TabsTrigger value="month" className="text-xs h-7 px-2">Maand</TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  )

  const desktopSecondaryActions = (
    <div className="hidden lg:flex items-center gap-1.5 shrink-0">
      <div className="relative" ref={exportRef}>
        <button
          type="button"
          onClick={() => setShowExport((v) => !v)}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs rounded transition-colors"
        >
          <Download size={12} /> Exporteren <ChevronDown size={11} />
        </button>
        {showExport && (
          <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border-default rounded-lg shadow-dropdown z-50 py-1 min-w-[150px]">
            <button type="button" onClick={() => { exportTravelExpensesCSV(filtered, clients, users, rangeLabel); setShowExport(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
              <Sheet size={12} className="text-accent-green" /> CSV exporteren
            </button>
            <button type="button" onClick={() => { exportTravelExpensesPDF(filtered, clients, users, rangeLabel); setShowExport(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
              <FileText size={12} className="text-accent-red" /> PDF exporteren
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => { setSelectMode((v) => !v); setSelectedDates(new Set()) }}
        className={clsx('flex items-center gap-1.5 px-2.5 py-1 border text-xs rounded transition-colors', selectMode ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'bg-surface-2 border-border-subtle text-text-secondary hover:text-text-primary')}
      >
        <CalendarDays size={12} /> {selectMode ? 'Klaar' : 'Datums selecteren'}
      </button>
      {!selectMode && (
        <Button size="sm" onClick={() => setShowAdd(true)} className="h-7 text-xs gap-1.5">
          <Plus size={12} /> Rit toevoegen
        </Button>
      )}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Reiskosten"
        subtitle={rangeLabel}
        actions={
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-none lg:flex-initial lg:justify-end">
              {periodToolbar}
            </div>
            {desktopSecondaryActions}
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              {selectMode ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => { setSelectMode(false); setSelectedDates(new Set()) }}
                >
                  Klaar
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs font-medium border-border-subtle">
                      <SlidersHorizontal size={14} className="text-text-muted" />
                      Opties
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs">Exporteren &amp; selectie</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSelectMode(true); setSelectedDates(new Set()) }}>
                      <CalendarDays size={13} className="mr-2" /> Datums selecteren
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={filtered.length === 0}
                      onClick={() => exportTravelExpensesCSV(filtered, clients, users, rangeLabel)}
                    >
                      <Sheet size={13} className="mr-2 text-accent-green" /> CSV exporteren
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={filtered.length === 0}
                      onClick={() => { void exportTravelExpensesPDF(filtered, clients, users, rangeLabel) }}
                    >
                      <FileText size={13} className="mr-2 text-accent-red" /> PDF exporteren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        }
      />
      <div className="px-4 lg:px-6 py-4 lg:py-5 max-w-5xl mx-auto">

      {/* Admin: user selector */}
      {isAdmin && (
        <>
          {/* Mobile: compact Select */}
          <div className="flex lg:hidden items-center gap-2 mb-3">
            <Users size={14} className="text-text-muted flex-shrink-0" />
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v as string)}>
              <SelectTrigger className="h-9 text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle gebruikers</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Desktop: chip row */}
          <div className="hidden lg:flex items-center gap-2 mb-4 p-3 bg-surface-1 border border-border-subtle rounded-xl">
            <Users size={14} className="text-text-muted flex-shrink-0" />
            <span className="text-xs text-text-muted">Gebruiker:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedUserId('all')}
                className={clsx('px-3 py-1 rounded-lg text-xs font-medium transition-colors', selectedUserId === 'all' ? 'bg-accent-blue text-white' : 'bg-white/[0.05] text-text-secondary hover:text-text-primary')}
              >
                Alle gebruikers
              </button>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-medium transition-colors', selectedUserId === u.id ? 'bg-accent-blue text-white' : 'bg-white/[0.05] text-text-secondary hover:text-text-primary')}
                >
                  {u.name ?? u.email}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-1 border border-border-subtle rounded-xl px-5 py-4">
          <p className="text-xs text-text-muted mb-1">Km deze periode</p>
          <p className="text-2xl font-semibold text-text-primary">{totalKmPeriod.toLocaleString('nl-NL')} km</p>
        </div>
        <div className="bg-surface-1 border border-border-subtle rounded-xl px-5 py-4">
          <p className="text-xs text-text-muted mb-1">Bedrag deze periode</p>
          <p className="text-2xl font-semibold text-text-primary">{fmt(totalAmountPeriod)}</p>
        </div>
      </div>

      {/* Admin: per-gebruiker breakdown als "alle" geselecteerd */}
      {isAdmin && selectedUserId === 'all' && users.length > 0 && filtered.length > 0 && (
        <div className="bg-surface-1 border border-border-subtle rounded-xl mb-4 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-secondary">Reiskosten per gebruiker</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {users.map((u) => {
              const userExpenses = filtered.filter((e) => e.userId === u.id)
              if (userExpenses.length === 0) return null
              const uKm = userExpenses.reduce((s, e) => s + totalKm(e), 0)
              const uAmount = userExpenses.reduce((s, e) => s + amount(e), 0)
              return (
                <div key={u.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded bg-surface-0 border border-border-subtle flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-text-secondary">{(u.name ?? u.email).charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{u.name ?? u.email}</p>
                      <p className="text-xs text-text-muted">{userExpenses.length} rit{userExpenses.length !== 1 ? 'ten' : ''} · {uKm} km</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-text-primary shrink-0 tabular-nums">{fmt(uAmount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar / Agenda */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>
      ) : isMobile ? (
        <TravelAgendaView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} selectMode={selectMode} selectedDates={selectedDates} onDateToggle={toggleDate} />
      ) : viewMode === 'week' ? (
        <TravelWeekView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} selectMode={selectMode} selectedDates={selectedDates} onDateToggle={toggleDate} />
      ) : (
        <TravelMonthView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} selectMode={selectMode} selectedDates={selectedDates} onDateToggle={toggleDate} />
      )}

      {/* Lijst onder kalender (desktop only — agenda toont al per-rit op mobiel) */}
      {filtered.length > 0 && !isMobile && (
        <div className="mt-4 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-secondary">{filtered.length} rit{filtered.length !== 1 ? 'ten' : ''} in deze periode</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {filtered.map((e) => {
              const client = clients.find((c) => c.id === e.clientId)
              const user = isAdmin ? users.find((u) => u.id === e.userId) : null
              return (
                <div key={e.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-white/[0.03] group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm text-text-primary font-medium">{e.from}</span>
                      <ArrowRight size={12} className="text-text-muted flex-shrink-0" />
                      <span className="text-sm text-text-primary font-medium">{e.to}</span>
                      {e.returnTrip && <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted border border-border-subtle flex items-center gap-1"><RotateCcw size={10} /> retour</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                      <span>{format(parseISO(e.date), 'd MMM yyyy', { locale: nl })}</span>
                      <span>·</span>
                      <span>{client?.companyName ?? '—'}</span>
                      <span>·</span>
                      <span>{totalKm(e)} km{e.returnTrip ? ` (${e.kilometers}×2)` : ''}</span>
                      {user && <><span>·</span><span className="text-text-muted/70">{user.name ?? user.email}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-text-primary">{fmt(amount(e))}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditExpense(e)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-md transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Floating bulk bar */}
      {selectMode && selectedDates.size > 0 && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 lg:gap-3 bg-surface-1 border border-border-subtle rounded-2xl shadow-2xl px-3 lg:px-4 py-2.5 lg:py-3 max-w-[calc(100vw-1rem)]">
          <span className="text-xs lg:text-sm text-text-primary font-medium whitespace-nowrap">{selectedDates.size} datum{selectedDates.size !== 1 ? 's' : ''}</span>
          <div className="w-px h-5 bg-border-subtle" />
          <button onClick={() => setSelectedDates(new Set())} className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 shrink-0">
            <X size={12} /> <span className="hidden sm:inline">Deselecteer</span>
          </button>
          <Button
            onClick={() => setShowBulk(true)}
            className="text-xs lg:text-sm gap-1.5 shrink-0"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Rit toevoegen voor alle</span><span className="sm:hidden">Toevoegen</span>
          </Button>
        </div>
      )}

      {/* Mobile FAB: snelle "Rit toevoegen" */}
      {!selectMode && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          aria-label="Rit toevoegen"
          className="lg:hidden fixed bottom-[calc(56px+env(safe-area-inset-bottom)+1rem)] right-4 z-30 w-14 h-14 rounded-full bg-accent-blue hover:bg-accent-blue/90 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modals */}
      {(showAdd || editExpense) && (
        <ExpenseModal expense={editExpense} initialDate={addDate} onClose={() => { setShowAdd(false); setEditExpense(undefined); setAddDate(undefined) }} onSaved={load} onDelete={(id) => { handleDelete(id); setEditExpense(undefined); setShowAdd(false) }} />
      )}
      {showBulk && (
        <BulkExpenseModal dates={[...selectedDates]} onClose={() => setShowBulk(false)} onSaved={() => { load(); exitSelectMode() }} />
      )}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rit verwijderen</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Weet je zeker dat je deze rit wil verwijderen?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Annuleren</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId!)} className="flex-1">Verwijderen</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
