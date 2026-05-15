import { useState, useMemo, useEffect, useRef } from 'react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  format,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { Play, Square, Plus, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { useTimeTrackingData } from '../hooks/useTimeTrackingData'
import { timeTrackingDb } from '../lib/timeTrackingDb'
import { PageHeader } from '../components/PageHeader'
import { usePageMeta } from '../hooks/usePageMeta'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '../types'
import {
  entriesForDate,
  getDurationSeconds,
  formatDuration,
  formatHoursShort,
  isoToLocalDate,
  minsToTimeStr,
  localToISO,
  exportCsv,
} from '../components/time-tracking/timeTrackingHelpers'
import { TagSelector, TagManagerDialog } from '../components/time-tracking/TimeTrackingTagUI'
import { TimeTrackingEntryDialog } from '../components/time-tracking/TimeTrackingEntryDialog'
import { TimeTrackingEntryRow } from '../components/time-tracking/TimeTrackingEntryRow'
import { WeekCalendarGrid } from '../components/time-tracking/WeekCalendarGrid'

type ViewMode = 'day' | 'week' | 'month'

export function TimeTracking() {
  usePageMeta('Uren')

  const profile = useAuthStore((s) => s.profile)
  const { clients } = useStore()
  const isAdmin = profile?.role === 'admin'

  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all')

  const [timerDesc, setTimerDesc] = useState('')
  const [timerClientId, setTimerClientId] = useState<string | null>(null)
  const [timerTagIds, setTimerTagIds] = useState<string[]>([])
  const descSaveRef = useRef<ReturnType<typeof setTimeout>>()

  const [showEntryDialog, setShowEntryDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()
  const [dragPrefill, setDragPrefill] = useState<{ date: string; start: string; end: string } | undefined>()
  const [showTagManager, setShowTagManager] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { entries, setEntries, tags, reloadTags, users, loading, runningEntry, deleteEntry } = useTimeTrackingData(isAdmin, selectedUserId)

  useEffect(() => {
    if (runningEntry) {
      setTimerDesc(runningEntry.description)
      setTimerClientId(runningEntry.clientId)
      setTimerTagIds(runningEntry.tagIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync bar when running entry identity changes
  }, [runningEntry?.id])

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.companyName])), [clients])
  const tagMap = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email])), [users])
  const activeClients = useMemo(
    () => clients.filter((c) => c.status === 'active').sort((a, b) => a.companyName.localeCompare(b.companyName)),
    [clients],
  )

  function navPrev() {
    setCurrentDate((d) => (view === 'day' ? subDays(d, 1) : view === 'week' ? subWeeks(d, 1) : subMonths(d, 1)))
  }
  function navNext() {
    setCurrentDate((d) => (view === 'day' ? addDays(d, 1) : view === 'week' ? addWeeks(d, 1) : addMonths(d, 1)))
  }
  function periodLabel(): string {
    if (view === 'day') return format(currentDate, 'EEEE d MMMM yyyy', { locale: nl })
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 })
      const e = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(s, 'd MMM', { locale: nl })} – ${format(e, 'd MMM yyyy', { locale: nl })}`
    }
    return format(currentDate, 'MMMM yyyy', { locale: nl })
  }

  async function handleStartStop() {
    if (!profile?.id) return
    if (runningEntry) {
      try {
        const stopped = await timeTrackingDb.stopTimer(runningEntry.id)
        setEntries((prev) => prev.map((e) => (e.id === stopped.id ? stopped : e)))
        toast.success('Timer gestopt')
      } catch {
        toast.error('Stoppen mislukt')
      }
    } else {
      try {
        const entry = await timeTrackingDb.startTimer({
          userId: profile.id,
          description: timerDesc,
          clientId: timerClientId,
          tagIds: timerTagIds,
        })
        setEntries((prev) => [entry, ...prev])
        toast.success('Timer gestart')
      } catch {
        toast.error('Starten mislukt')
      }
    }
  }

  function handleTimerDescChange(v: string) {
    setTimerDesc(v)
    if (runningEntry) {
      clearTimeout(descSaveRef.current)
      descSaveRef.current = setTimeout(async () => {
        try {
          const updated = await timeTrackingDb.updateEntry(runningEntry.id, {
            description: v,
            clientId: runningEntry.clientId,
            startedAt: runningEntry.startedAt,
            endedAt: runningEntry.endedAt,
            tagIds: runningEntry.tagIds,
          })
          setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        } catch {
          /* ignore */
        }
      }, 1200)
    }
  }

  async function handleStopEntry(entry: TimeEntry) {
    try {
      const stopped = await timeTrackingDb.stopTimer(entry.id)
      setEntries((prev) => prev.map((e) => (e.id === stopped.id ? stopped : e)))
      toast.success('Timer gestopt')
    } catch {
      toast.error('Stoppen mislukt')
    }
  }

  async function handleSaveEntry(data: {
    clientId: string | null
    description: string
    startedAt: string
    endedAt: string | null
    tagIds: string[]
  }) {
    if (editingEntry) {
      const updated = await timeTrackingDb.updateEntry(editingEntry.id, data)
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      toast.success('Registratie bijgewerkt')
    } else {
      if (!profile?.id) return
      const created = await timeTrackingDb.createEntry({
        userId: profile.id,
        ...data,
        endedAt: data.endedAt ?? new Date().toISOString(),
      })
      setEntries((prev) =>
        [created, ...prev].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
      )
      toast.success('Registratie aangemaakt')
    }
    setShowEntryDialog(false)
    setEditingEntry(undefined)
    setDragPrefill(undefined)
  }

  async function handleDeleteEntry(id: string) {
    await deleteEntry(id)
    setConfirmDeleteId(null)
    toast.success('Registratie verwijderd')
  }

  function handleCreateFromDrag(day: Date, startMins: number, endMins: number) {
    setDragPrefill({
      date: format(day, 'yyyy-MM-dd'),
      start: minsToTimeStr(startMins),
      end: minsToTimeStr(Math.min(endMins, 23 * 60 + 59)),
    })
    setEditingEntry(undefined)
    setShowEntryDialog(true)
  }

  async function handleResize(entry: TimeEntry, newStartMins: number, newEndMins: number) {
    const dateStr = isoToLocalDate(entry.startedAt)
    const startedAt = localToISO(dateStr, minsToTimeStr(newStartMins))
    const endedAt = localToISO(dateStr, minsToTimeStr(newEndMins))
    try {
      const updated = await timeTrackingDb.updateEntry(entry.id, {
        clientId: entry.clientId,
        description: entry.description,
        startedAt,
        endedAt,
        tagIds: entry.tagIds,
      })
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } catch {
      toast.error('Opslaan mislukt')
    }
  }

  const pendingSlot = useMemo(() => {
    if (!dragPrefill || !showEntryDialog || !dragPrefill.start || !dragPrefill.end) return undefined
    const [sh, sm] = dragPrefill.start.split(':').map(Number)
    const [eh, em] = dragPrefill.end.split(':').map(Number)
    return { date: dragPrefill.date, startMins: (sh ?? 0) * 60 + (sm ?? 0), endMins: (eh ?? 0) * 60 + (em ?? 0) }
  }, [dragPrefill, showEntryDialog])

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const gridStart = startOfWeek(start, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(end, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentDate])

  const dayEntries = useMemo(() => entriesForDate(entries, currentDate), [entries, currentDate])

  const weekTotal = useMemo(
    () => weekDays.reduce((sum, d) => sum + entriesForDate(entries, d).reduce((s, e) => s + getDurationSeconds(e, now), 0), 0),
    [entries, weekDays, now],
  )

  function entryRowProps(entry: TimeEntry) {
    return {
      now,
      clientMap,
      tagMap,
      onEdit: () => {
        setEditingEntry(entry)
        setDragPrefill(undefined)
        setShowEntryDialog(true)
      },
      onDelete: () => setConfirmDeleteId(entry.id),
      onStop: entry.isRunning ? () => void handleStopEntry(entry) : undefined,
      showUser: isAdmin && selectedUserId === 'all',
      userMap,
    }
  }

  return (
    <div>
      <PageHeader
        title="Urenregistratie"
        actions={
          <>
            {isAdmin && users.length > 0 && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="h-7 px-2 text-xs bg-surface-2 border border-border-subtle text-text-secondary rounded focus:outline-none"
              >
                <option value="all">Alle medewerkers</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(entries, clientMap, tagMap, userMap)}
              disabled={entries.length === 0}
              className="h-7 text-xs gap-1.5"
            >
              <Download size={12} /> Exporteer
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingEntry(undefined)
                setDragPrefill(undefined)
                setShowEntryDialog(true)
              }}
              className="h-7 text-xs gap-1.5"
            >
              <Plus size={12} /> Handmatig toevoegen
            </Button>
          </>
        }
      />

      <div className="border-b border-border-subtle bg-surface-1">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-3">
          <input
            value={timerDesc}
            onChange={(e) => handleTimerDescChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleStartStop()}
            placeholder={runningEntry ? 'Omschrijving bijwerken…' : 'Waar ben je mee bezig?'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none min-w-0"
          />

          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors shrink-0">
                {timerClientId && clientMap[timerClientId] ? (
                  <span className="text-text-secondary">{clientMap[timerClientId]}</span>
                ) : (
                  <span>Klant</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="end">
              <Command>
                <CommandInput placeholder="Zoek klant..." />
                <CommandList>
                  <CommandEmpty>Geen klanten.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => setTimerClientId(null)}>
                      <span className="text-text-muted">— Geen klant —</span>
                    </CommandItem>
                    {activeClients.map((c) => (
                      <CommandItem key={c.id} value={c.companyName} onSelect={() => setTimerClientId(c.id)}>
                        {c.companyName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <TagSelector tags={tags} selectedIds={timerTagIds} onChange={setTimerTagIds} onManage={() => setShowTagManager(true)} />

          <span
            className={cn('text-sm font-mono tabular-nums w-20 text-center shrink-0 font-semibold', runningEntry ? 'text-green-400' : 'text-text-muted')}
          >
            {runningEntry ? formatDuration(getDurationSeconds(runningEntry, now)) : '0:00:00'}
          </span>

          <button
            type="button"
            onClick={() => void handleStartStop()}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              runningEntry ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
            )}
            title={runningEntry ? 'Timer stoppen' : 'Timer starten'}
          >
            {runningEntry ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>

      <div className="border-b border-border-subtle bg-surface-0/60">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-2 flex items-center gap-3">
          <div className="flex items-center bg-surface-2 border border-border-subtle rounded-lg p-0.5 shrink-0">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  view === v ? 'bg-surface-4 text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {v === 'day' ? 'Dag' : v === 'week' ? 'Week' : 'Maand'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={navPrev}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary rounded-md hover:bg-white/[0.06] transition-colors"
            >
              Vandaag
            </button>
            <button
              type="button"
              onClick={navNext}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <span className="text-sm text-text-primary font-medium capitalize truncate flex-1">{periodLabel()}</span>

          {view === 'week' && (
            <span className="text-xs text-text-muted shrink-0 tabular-nums font-medium">{formatHoursShort(weekTotal)} totaal</span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4">
        {loading && <div className="text-center py-12 text-xs text-text-muted">Laden…</div>}

        {!loading && view === 'week' && (
          <WeekCalendarGrid
            days={weekDays}
            entries={entries}
            now={now}
            tagMap={tagMap}
            clientMap={clientMap}
            onEdit={(entry) => {
              setEditingEntry(entry)
              setDragPrefill(undefined)
              setShowEntryDialog(true)
            }}
            onCreateFromDrag={handleCreateFromDrag}
            onResize={handleResize}
            pendingSlot={pendingSlot}
          />
        )}

        {!loading && view === 'day' && (
          <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {format(currentDate, 'EEEE d MMMM', { locale: nl })}
              </h2>
              <span className="text-xs text-text-muted tabular-nums">
                {formatHoursShort(dayEntries.reduce((s, e) => s + getDurationSeconds(e, now), 0))}
              </span>
            </div>
            {dayEntries.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                Geen registraties voor deze dag.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setEditingEntry(undefined)
                    setDragPrefill({ date: format(currentDate, 'yyyy-MM-dd'), start: '', end: '' })
                    setShowEntryDialog(true)
                  }}
                  className="text-accent-blue hover:underline"
                >
                  Toevoegen?
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {dayEntries.map((entry) => (
                  <TimeTrackingEntryRow key={entry.id} entry={entry} {...entryRowProps(entry)} />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && view === 'month' && (
          <div>
            <div className="grid grid-cols-7 mb-px">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
                <div key={d} className="text-center py-2 text-[10px] font-medium text-text-muted uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border-subtle rounded-xl overflow-hidden">
              {monthDays.map((day) => {
                const dayEnt = entriesForDate(entries, day)
                const totalSecs = dayEnt.reduce((s, e) => s + getDurationSeconds(e, now), 0)
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const today_ = isToday(day)
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setCurrentDate(day)
                      setView('day')
                    }}
                    className={cn(
                      'bg-surface-2 p-2 min-h-[80px] text-left hover:bg-white/[0.04] transition-colors flex flex-col',
                      !isCurrentMonth && 'opacity-40',
                      today_ && 'bg-accent-blue/[0.05]',
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                        today_ ? 'bg-accent-blue text-white' : 'text-text-secondary',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {totalSecs > 0 && <span className="text-[10px] text-text-muted tabular-nums">{formatHoursShort(totalSecs)}</span>}
                    {dayEnt.slice(0, 3).map((e) => {
                      const firstTag = e.tagIds.map((id) => tagMap[id]).find(Boolean)
                      const color = e.isRunning ? '#22c55e' : firstTag?.color ?? '#6366f1'
                      return (
                        <div key={e.id} className="text-[10px] truncate mt-0.5 px-1 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>
                          {e.description || '—'}
                        </div>
                      )
                    })}
                    {dayEnt.length > 3 && <span className="text-[10px] text-text-muted/60 mt-0.5">+{dayEnt.length - 3}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!loading && view !== 'day' && runningEntry && (
          <div className="mt-4 bg-green-500/[0.05] border border-green-500/20 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-green-500/15 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Lopende timer</p>
            </div>
            <TimeTrackingEntryRow entry={runningEntry} {...entryRowProps(runningEntry)} />
          </div>
        )}
      </div>

      {showEntryDialog && (
        <TimeTrackingEntryDialog
          open={showEntryDialog}
          onClose={() => {
            setShowEntryDialog(false)
            setEditingEntry(undefined)
            setDragPrefill(undefined)
          }}
          onSave={handleSaveEntry}
          initial={editingEntry}
          prefilledDate={dragPrefill?.date}
          prefilledStart={dragPrefill?.start}
          prefilledEnd={dragPrefill?.end}
          clients={activeClients}
          tags={tags}
          onManageTags={() => {
            setShowEntryDialog(false)
            setShowTagManager(true)
          }}
        />
      )}

      <TagManagerDialog open={showTagManager} onClose={() => setShowTagManager(false)} tags={tags} onReload={reloadTags} />

      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registratie verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Dit kan niet ongedaan worden gemaakt.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1">
              Annuleren
            </Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && void handleDeleteEntry(confirmDeleteId)} className="flex-1">
              Verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
