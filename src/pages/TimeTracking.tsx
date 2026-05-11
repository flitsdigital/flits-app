import { useState, useMemo, useEffect, useRef } from 'react'
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval,
  addDays, subDays,
  addWeeks, subWeeks,
  addMonths, subMonths,
  isSameDay, isToday,
  parseISO, format,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  Play, Square, Plus, Pencil, Trash2, Download,
  ChevronLeft, ChevronRight, Tag, X, Check, Palette,
  ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { useTimeTrackingData } from '../hooks/useTimeTrackingData'
import { timeTrackingDb } from '../lib/timeTrackingDb'
import { PageHeader } from '../components/PageHeader'
import { usePageMeta } from '../hooks/usePageMeta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { TimeEntry, TimeTag } from '../types'

// ── Grid constants ─────────────────────────────────────────────────────────────

const HOUR_PX = 64           // pixels per hour in the calendar grid
const SLOT_MINS = 15         // snap to 15-minute slots
const SLOT_PX = (SLOT_MINS / 60) * HOUR_PX   // 16px per slot

// ── Tag colours ────────────────────────────────────────────────────────────────

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#ef4444', '#64748b',
]

// ── Grid helpers ───────────────────────────────────────────────────────────────

function snapMins(raw: number): number {
  return Math.round(raw / SLOT_MINS) * SLOT_MINS
}
function clampMins(m: number): number {
  return Math.max(0, Math.min(23 * 60 + 45, m))
}
function yToMins(y: number): number {
  return clampMins(snapMins((y / HOUR_PX) * 60))
}
function minsToY(m: number): number {
  return (m / 60) * HOUR_PX
}
function minsToTimeStr(m: number): string {
  const capped = Math.min(m, 23 * 60 + 59)
  return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`
}

// ── Duration / time helpers ────────────────────────────────────────────────────

function getDurationSeconds(entry: TimeEntry, now = Date.now()): number {
  const start = new Date(entry.startedAt).getTime()
  const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now
  return Math.max(0, Math.floor((end - start) / 1000))
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatHoursShort(seconds: number): string {
  if (seconds === 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}u`
  return `${h}u ${m}m`
}

function isoToLocalDate(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd')
}

function isoToLocalTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

function localToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

function entriesForDate(entries: TimeEntry[], date: Date): TimeEntry[] {
  const day = format(date, 'yyyy-MM-dd')
  return entries.filter((e) => isoToLocalDate(e.startedAt) === day)
}

function entryStartMins(entry: TimeEntry): number {
  const d = parseISO(entry.startedAt)
  return d.getHours() * 60 + d.getMinutes()
}

function entryEndMins(entry: TimeEntry, now: number): number {
  const d = entry.endedAt ? parseISO(entry.endedAt) : new Date(now)
  return d.getHours() * 60 + d.getMinutes()
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportCsv(
  entries: TimeEntry[],
  clientMap: Record<string, string>,
  tagMap: Record<string, TimeTag>,
  userMap: Record<string, string>,
) {
  const header = ['Datum', 'Start', 'Eind', 'Duur', 'Omschrijving', 'Klant', 'Tags', 'Medewerker']
  const rows = entries
    .filter((e) => !e.isRunning)
    .map((e) => [
      isoToLocalDate(e.startedAt),
      isoToLocalTime(e.startedAt),
      e.endedAt ? isoToLocalTime(e.endedAt) : '',
      formatDuration(getDurationSeconds(e)),
      `"${e.description.replace(/"/g, '""')}"`,
      clientMap[e.clientId ?? ''] ?? '',
      e.tagIds.map((id) => tagMap[id]?.name ?? '').filter(Boolean).join(', '),
      userMap[e.userId] ?? '',
    ])
  const csv = [header, ...rows].map((r) => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `uren-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tag pill ───────────────────────────────────────────────────────────────────

function TagPill({ tag, onRemove }: { tag: TimeTag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
      style={{ backgroundColor: tag.color + '25', color: tag.color, border: `1px solid ${tag.color}40` }}
    >
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100">
          <X size={8} />
        </button>
      )}
    </span>
  )
}

// ── Tag selector popover ───────────────────────────────────────────────────────

function TagSelector({
  tags, selectedIds, onChange, onManage,
}: {
  tags: TimeTag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onManage: () => void
}) {
  const [open, setOpen] = useState(false)
  const selectedTags = tags.filter((t) => selectedIds.includes(t.id))

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors shrink-0"
        >
          <Tag size={13} />
          {selectedTags.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedTags.map((t) => <TagPill key={t.id} tag={t} />)}
            </div>
          ) : (
            <span>Tags</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 bg-surface-2 border-border-subtle" align="start">
        {tags.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-2">Nog geen tags</p>
        ) : (
          <div className="space-y-0.5 mb-2">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.06] transition-colors text-left"
              >
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-xs text-text-primary flex-1 truncate">{t.name}</span>
                {selectedIds.includes(t.id) && <Check size={11} className="text-accent-blue shrink-0" />}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); onManage() }}
          className="w-full text-xs text-text-muted hover:text-text-primary text-center py-1 border-t border-border-subtle pt-2 mt-1 transition-colors"
        >
          Beheer tags
        </button>
      </PopoverContent>
    </Popover>
  )
}

// ── Client combobox ────────────────────────────────────────────────────────────

function ClientCombobox({
  value, onChange, clients,
}: {
  value: string | null
  onChange: (v: string | null) => void
  clients: { id: string; companyName: string }[]
}) {
  const [open, setOpen] = useState(false)
  const selected = clients.find((c) => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm h-9">
          {selected ? selected.companyName : <span className="text-muted-foreground">Geen klant</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klanten gevonden.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { onChange(null); setOpen(false) }}>
                <span className="text-text-muted">— Geen klant —</span>
              </CommandItem>
              {clients.map((c) => (
                <CommandItem key={c.id} value={c.companyName} onSelect={() => { onChange(c.id); setOpen(false) }}>
                  {c.companyName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Color picker ───────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isPreset = TAG_COLORS.includes(value)
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-md transition-transform hover:scale-110 shrink-0"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : undefined,
            outlineOffset: '2px',
          }}
        />
      ))}
      {/* Custom colour picker */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-6 h-6 rounded-md border-2 border-dashed border-border-default hover:border-text-muted transition-colors flex items-center justify-center shrink-0 relative overflow-hidden"
        title="Aangepaste kleur"
        style={{ backgroundColor: isPreset ? 'transparent' : value }}
      >
        {isPreset && <Palette size={10} className="text-text-muted" />}
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </button>
    </div>
  )
}

// ── Tag manager dialog ─────────────────────────────────────────────────────────

function TagManagerDialog({
  tags, open, onClose, onReload,
}: {
  tags: TimeTag[]
  open: boolean
  onClose: () => void
  onReload: () => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(TAG_COLORS[0]!)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0]!)
  const [saving, setSaving] = useState(false)

  function startEdit(tag: TimeTag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await timeTrackingDb.updateTag(editingId, editName.trim(), editColor)
      setEditingId(null)
      await onReload()
    } catch {
      toast.error('Bijwerken mislukt')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      await timeTrackingDb.createTag(newName.trim(), newColor)
      setNewName('')
      await onReload()
    } catch {
      toast.error('Aanmaken mislukt')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await timeTrackingDb.deleteTag(id)
      if (editingId === id) setEditingId(null)
      await onReload()
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tags beheren</DialogTitle>
        </DialogHeader>

        {/* Existing tags */}
        {tags.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {tags.map((tag) =>
              editingId === tag.id ? (
                <form key={tag.id} onSubmit={handleUpdate} className="space-y-2 p-2.5 bg-surface-3 rounded-lg border border-border-subtle">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)} className="flex-1 h-7 text-xs">
                      Annuleren
                    </Button>
                    <Button type="submit" size="sm" disabled={!editName.trim() || saving} className="flex-1 h-7 text-xs">
                      Opslaan
                    </Button>
                  </div>
                </form>
              ) : (
                <div key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] group">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-text-primary flex-1 truncate">{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(tag)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-all"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ),
            )}
          </div>
        )}

        {/* Create new */}
        <form onSubmit={handleCreate} className="space-y-3 border-t border-border-subtle pt-3">
          <p className="text-xs font-medium text-text-muted">Nieuwe tag</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Naam</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="bijv. Design"
              className="h-9 text-sm"
              autoFocus={tags.length === 0}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kleur</Label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <Button type="submit" size="sm" disabled={!newName.trim() || saving} className="w-full">
            <Plus size={13} /> Tag aanmaken
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Entry dialog ───────────────────────────────────────────────────────────────

function EntryDialog({
  open, onClose, onSave, initial,
  prefilledDate, prefilledStart, prefilledEnd,
  clients, tags, onManageTags,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: {
    clientId: string | null
    description: string
    startedAt: string
    endedAt: string | null
    tagIds: string[]
  }) => Promise<void>
  initial?: TimeEntry
  prefilledDate?: string
  prefilledStart?: string
  prefilledEnd?: string
  clients: { id: string; companyName: string }[]
  tags: TimeTag[]
  onManageTags: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const nowStr = format(new Date(), 'HH:mm')

  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? null)
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [date, setDate] = useState(initial ? isoToLocalDate(initial.startedAt) : (prefilledDate ?? today))
  const [startTime, setStartTime] = useState(initial ? isoToLocalTime(initial.startedAt) : (prefilledStart ?? nowStr))
  const [endTime, setEndTime] = useState(
    initial?.endedAt
      ? isoToLocalTime(initial.endedAt)
      : (prefilledEnd ?? format(new Date(Date.now() + 30 * 60_000), 'HH:mm')),
  )
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [saving, setSaving] = useState(false)

  // Re-sync when prefilled values change (drag-to-create)
  useEffect(() => {
    if (!initial) {
      if (prefilledDate) setDate(prefilledDate)
      if (prefilledStart) setStartTime(prefilledStart)
      if (prefilledEnd) setEndTime(prefilledEnd)
    }
  }, [prefilledDate, prefilledStart, prefilledEnd])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !startTime) { toast.error('Vul datum en starttijd in'); return }
    setSaving(true)
    try {
      await onSave({
        clientId,
        description: desc,
        startedAt: localToISO(date, startTime),
        endedAt: endTime ? localToISO(date, endTime) : null,
        tagIds,
      })
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Registratie bewerken' : 'Registratie toevoegen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Omschrijving</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Waar heb je aan gewerkt?"
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Klant (optioneel)</Label>
            <ClientCombobox value={clientId} onChange={setClientId} clients={clients} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Datum</Label>
            <DatePickerButton value={date} onChange={(d) => setDate(d ?? '')} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Starttijd</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Eindtijd</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tags (optioneel)</Label>
            <div className="flex items-center gap-2 flex-wrap min-h-[36px] px-3 py-2 border border-border-subtle rounded-md bg-transparent">
              <TagSelector tags={tags} selectedIds={tagIds} onChange={setTagIds} onManage={onManageTags} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuleren</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Opslaan…' : 'Opslaan'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Entry row (day view) ───────────────────────────────────────────────────────

function EntryRow({
  entry, now, clientMap, tagMap, onEdit, onDelete, onStop, showUser, userMap,
}: {
  entry: TimeEntry
  now: number
  clientMap: Record<string, string>
  tagMap: Record<string, TimeTag>
  onEdit: () => void
  onDelete: () => void
  onStop?: () => void
  showUser: boolean
  userMap: Record<string, string>
}) {
  const duration = getDurationSeconds(entry, now)
  const tags = entry.tagIds.map((id) => tagMap[id]).filter(Boolean) as TimeTag[]

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 group transition-colors',
      entry.isRunning ? 'bg-green-500/[0.04] hover:bg-green-500/[0.06]' : 'hover:bg-white/[0.03]',
    )}>
      <div className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        entry.isRunning ? 'bg-green-400 animate-pulse' : 'bg-transparent',
      )} />
      <div className="text-xs text-text-muted tabular-nums shrink-0 w-24">
        {format(parseISO(entry.startedAt), 'HH:mm')}
        {' – '}
        {entry.endedAt ? format(parseISO(entry.endedAt), 'HH:mm') : '…'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', entry.description ? 'text-text-primary' : 'text-text-muted italic')}>
          {entry.description || 'Geen omschrijving'}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {entry.clientId && clientMap[entry.clientId] && (
            <span className="text-[10px] text-text-muted">{clientMap[entry.clientId]}</span>
          )}
          {showUser && userMap[entry.userId] && (
            <span className="text-[10px] text-text-muted/60">{userMap[entry.userId]}</span>
          )}
          {tags.map((t) => <TagPill key={t.id} tag={t} />)}
        </div>
      </div>
      <span className={cn('text-sm font-semibold tabular-nums shrink-0', entry.isRunning ? 'text-green-400' : 'text-text-primary')}>
        {formatDuration(duration)}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {entry.isRunning && onStop && (
          <button type="button" onClick={onStop}
            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors" title="Timer stoppen">
            <Square size={13} />
          </button>
        )}
        <button type="button" onClick={onEdit}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
          <Pencil size={13} />
        </button>
        <button type="button" onClick={onDelete}
          className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Overlap layout algorithm ───────────────────────────────────────────────────

interface EntryLayout {
  entry: TimeEntry
  col: number       // 0-based column index within the group
  totalCols: number // total simultaneous columns at this entry's overlap group
}

function layoutDayEntries(dayEntries: TimeEntry[], now: number): EntryLayout[] {
  if (dayEntries.length === 0) return []

  const sorted = [...dayEntries].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  )

  // Greedy column assignment: place each entry in the first column that has ended
  const colEnds: number[] = []   // end-minute of the last entry in each column
  const assignments = new Map<string, number>()  // entry.id → column index

  for (const entry of sorted) {
    const startMin = entryStartMins(entry)
    let col = -1
    for (let c = 0; c < colEnds.length; c++) {
      if ((colEnds[c] ?? 0) <= startMin) { col = c; break }
    }
    if (col === -1) { col = colEnds.length; colEnds.push(0) }
    colEnds[col] = Math.min(entryEndMins(entry, now), 24 * 60)
    assignments.set(entry.id, col)
  }

  // Second pass: determine how many columns the overlap group spans for each entry
  return sorted.map((entry) => {
    const startMin = entryStartMins(entry)
    const endMin   = Math.min(entryEndMins(entry, now), 24 * 60)
    const myCol    = assignments.get(entry.id)!

    let maxCol = myCol
    for (const other of sorted) {
      if (other.id === entry.id) continue
      const oStart = entryStartMins(other)
      const oEnd   = Math.min(entryEndMins(other, now), 24 * 60)
      if (oStart < endMin && oEnd > startMin) {
        maxCol = Math.max(maxCol, assignments.get(other.id)!)
      }
    }
    return { entry, col: myCol, totalCols: maxCol + 1 }
  })
}

// ── Week calendar grid (Toggl-style) ───────────────────────────────────────────

interface DragPreview {
  dayIndex: number
  topPx: number
  heightPx: number
}

function WeekCalendarGrid({
  days, entries, now, tagMap, clientMap,
  onEdit, onCreateFromDrag, onResize, pendingSlot,
}: {
  days: Date[]
  entries: TimeEntry[]
  now: number
  tagMap: Record<string, TimeTag>
  clientMap: Record<string, string>
  onEdit: (entry: TimeEntry) => void
  onCreateFromDrag: (day: Date, startMins: number, endMins: number) => void
  onResize: (entry: TimeEntry, newStartMins: number, newEndMins: number) => void
  pendingSlot?: { date: string; startMins: number; endMins: number }
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))

  // Drag-to-create state
  const dragRef = useRef<{ dayIndex: number; day: Date; startMin: number; curMin: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)

  // Resize state — tracks both start and end during drag
  const resizeRef = useRef<{ entry: TimeEntry; dayIndex: number; type: 'top' | 'bottom' } | null>(null)
  const [resizePreview, setResizePreview] = useState<{
    entryId: string
    startMin: number
    endMin: number
  } | null>(null)

  // Scroll to current time on mount
  useEffect(() => {
    const d = new Date()
    const minsNow = d.getHours() * 60 + d.getMinutes()
    const scrollTo = Math.max(0, minsToY(minsNow) - 200)
    scrollRef.current?.scrollTo({ top: scrollTo, behavior: 'instant' })
  }, [])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const nowDate = new Date(now)

  function computePreview(startMin: number, curMin: number, dayIndex: number): DragPreview {
    const lo = Math.min(startMin, curMin)
    const hi = Math.max(startMin, curMin) + SLOT_MINS
    return { dayIndex, topPx: minsToY(lo), heightPx: Math.max(minsToY(hi) - minsToY(lo), SLOT_PX) }
  }

  // ── Drag to create ────────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, dayIndex: number, day: Date) {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-entry-block="true"]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    const startMin = yToMins(e.clientY - rect.top)
    dragRef.current = { dayIndex, day, startMin, curMin: startMin }
    setDragPreview(computePreview(startMin, startMin, dayIndex))
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>, dayIndex: number) {
    if (!dragRef.current || dragRef.current.dayIndex !== dayIndex) return
    const rect = e.currentTarget.getBoundingClientRect()
    const curMin = yToMins(e.clientY - rect.top)
    dragRef.current.curMin = curMin
    setDragPreview(computePreview(dragRef.current.startMin, curMin, dayIndex))
  }

  function handlePointerUp(dayIndex: number) {
    if (!dragRef.current || dragRef.current.dayIndex !== dayIndex) return
    const { day, startMin, curMin } = dragRef.current
    const lo = Math.min(startMin, curMin)
    const hi = Math.max(startMin, curMin) + SLOT_MINS
    dragRef.current = null
    setDragPreview(null)
    onCreateFromDrag(day, lo, hi)
  }

  function handlePointerCancel() {
    dragRef.current = null
    setDragPreview(null)
  }

  // ── Resize helpers ────────────────────────────────────────────────────────

  function yToMinsFromCol(clientY: number, dayIndex: number): number {
    const colEl = colRefs.current[dayIndex]
    if (!colEl) return 0
    const rect = colEl.getBoundingClientRect()
    return snapMins(clampMins((clientY - rect.top) / HOUR_PX * 60))
  }

  // Bottom handle — changes end time
  function handleBottomResizeStart(
    e: React.PointerEvent<HTMLDivElement>,
    entry: TimeEntry,
    dayIndex: number,
  ) {
    e.stopPropagation()
    e.preventDefault()
    const origStart = entryStartMins(entry)
    const origEnd   = Math.min(entryEndMins(entry, now), 24 * 60)
    resizeRef.current = { entry, dayIndex, type: 'bottom' }
    setResizePreview({ entryId: entry.id, startMin: origStart, endMin: origEnd })

    function onMove(ev: PointerEvent) {
      if (!resizeRef.current) return
      const newEnd = Math.max(origStart + SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      setResizePreview({ entryId: entry.id, startMin: origStart, endMin: newEnd })
    }
    function onUp(ev: PointerEvent) {
      const newEnd = Math.max(origStart + SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      onResize(entry, origStart, newEnd)
      resizeRef.current = null
      setResizePreview(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // Top handle — changes start time
  function handleTopResizeStart(
    e: React.PointerEvent<HTMLDivElement>,
    entry: TimeEntry,
    dayIndex: number,
  ) {
    e.stopPropagation()
    e.preventDefault()
    const origStart = entryStartMins(entry)
    const origEnd   = Math.min(entryEndMins(entry, now), 24 * 60)
    resizeRef.current = { entry, dayIndex, type: 'top' }
    setResizePreview({ entryId: entry.id, startMin: origStart, endMin: origEnd })

    function onMove(ev: PointerEvent) {
      if (!resizeRef.current) return
      const newStart = Math.min(origEnd - SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      setResizePreview({ entryId: entry.id, startMin: newStart, endMin: origEnd })
    }
    function onUp(ev: PointerEvent) {
      const newStart = Math.min(origEnd - SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      onResize(entry, newStart, origEnd)
      resizeRef.current = null
      setResizePreview(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 282px)', minHeight: '400px' }}
    >
      {/* Sticky day headers */}
      <div className="flex border-b border-border-subtle shrink-0 bg-surface-2 z-10">
        <div className="w-14 shrink-0 border-r border-border-subtle" />
        {days.map((day, i) => {
          const today_ = isToday(day)
          const dayEntries = entriesForDate(entries, day)
          const totalSecs = dayEntries.reduce((s, e) => s + getDurationSeconds(e, now), 0)
          return (
            <div
              key={i}
              className={cn(
                'flex-1 px-2 py-2 text-center border-l border-border-subtle',
                today_ && 'bg-accent-blue/[0.06]',
              )}
            >
              <p className={cn('text-[10px] font-medium uppercase tracking-wider', today_ ? 'text-accent-blue' : 'text-text-muted')}>
                {format(day, 'EEE', { locale: nl })}
              </p>
              <p className={cn('text-base font-bold leading-none mt-0.5', today_ ? 'text-accent-blue' : 'text-text-primary')}>
                {format(day, 'd')}
              </p>
              {totalSecs > 0 && (
                <p className="text-[10px] text-text-muted tabular-nums mt-0.5">{formatHoursShort(totalSecs)}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ userSelect: 'none' }}>
        <div className="flex" style={{ height: HOUR_PX * 24 }}>

          {/* Time labels */}
          <div className="w-14 shrink-0 relative border-r border-border-subtle bg-surface-2">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-text-muted/50 tabular-nums leading-none pointer-events-none"
                style={{ top: h * HOUR_PX - 6 }}
              >
                {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayEntries = entriesForDate(entries, day)
            const today_ = isToday(day)
            const currentMins = today_ ? nowDate.getHours() * 60 + nowDate.getMinutes() : -1
            const dayStr = format(day, 'yyyy-MM-dd')
            const pending = pendingSlot?.date === dayStr ? pendingSlot : null

            return (
              <div
                key={dayIndex}
                ref={(el) => { colRefs.current[dayIndex] = el }}
                className={cn(
                  'flex-1 relative border-l border-border-subtle cursor-crosshair',
                  today_ && 'bg-accent-blue/[0.015]',
                )}
                style={{ height: HOUR_PX * 24 }}
                onPointerDown={(e) => handlePointerDown(e, dayIndex, day)}
                onPointerMove={(e) => handlePointerMove(e, dayIndex)}
                onPointerUp={() => handlePointerUp(dayIndex)}
                onPointerCancel={handlePointerCancel}
              >
                {/* Hour lines */}
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border-subtle/40 pointer-events-none" style={{ top: h * HOUR_PX }} />
                ))}
                {/* 30-min lines */}
                {hours.map((h) => (
                  <div key={`${h}-30`} className="absolute left-0 right-0 border-t border-border-subtle/20 pointer-events-none" style={{ top: h * HOUR_PX + HOUR_PX / 2 }} />
                ))}

                {/* Current time indicator */}
                {currentMins >= 0 && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: minsToY(currentMins) }}>
                    <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 shrink-0" />
                    <div className="flex-1 h-px bg-red-400" />
                  </div>
                )}

                {/* Entry blocks — overlap layout + top/bottom resize handles */}
                {layoutDayEntries(dayEntries, now).map(({ entry, col, totalCols }) => {
                  const isResizing = resizePreview?.entryId === entry.id
                  const startMin  = isResizing ? resizePreview!.startMin : entryStartMins(entry)
                  const endMin    = isResizing ? resizePreview!.endMin : Math.min(entryEndMins(entry, now), 24 * 60)
                  const topPx    = minsToY(startMin)
                  const heightPx = Math.max(minsToY(Math.max(endMin, startMin + SLOT_MINS)) - topPx, SLOT_PX)
                  const firstTag = entry.tagIds.map((id) => tagMap[id]).find(Boolean)
                  const color    = entry.isRunning ? '#22c55e' : (firstTag?.color ?? '#6366f1')
                  const GAP      = 2
                  const leftPct  = (col / totalCols) * 100
                  const widthPct = (1 / totalCols) * 100

                  return (
                    <div
                      key={entry.id}
                      data-entry-block="true"
                      className={cn(
                        'group/entry absolute rounded px-1.5 py-1 cursor-pointer z-10 select-none overflow-hidden',
                        isResizing && 'opacity-75',
                      )}
                      style={{
                        top: topPx + 1,
                        height: heightPx - 2,
                        left: `calc(${leftPct}% + ${col === 0 ? 2 : GAP}px)`,
                        width: `calc(${widthPct}% - ${col === 0 ? GAP + 2 : GAP * 2}px)`,
                        backgroundColor: color + '20',
                        borderLeft: `3px solid ${color}`,
                      }}
                      onClick={(e) => { e.stopPropagation(); if (!isResizing) onEdit(entry) }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {/* Top resize handle — only visible on hover */}
                      <div
                        className="absolute top-0 left-0 right-0 h-2.5 cursor-n-resize flex items-start justify-center pt-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity z-10"
                        onPointerDown={(e) => handleTopResizeStart(e, entry, dayIndex)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-5 h-[3px] rounded-full" style={{ backgroundColor: color + 'cc' }} />
                      </div>

                      <p className="text-[11px] font-semibold leading-tight truncate mt-1" style={{ color }}>
                        {entry.isRunning && '● '}
                        {entry.description || 'Geen omschrijving'}
                      </p>
                      {heightPx > 28 && (
                        <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: color + 'bb' }}>
                          {isResizing ? minsToTimeStr(startMin) : format(parseISO(entry.startedAt), 'HH:mm')}
                          {' – '}
                          {isResizing
                            ? minsToTimeStr(endMin)
                            : entry.endedAt ? format(parseISO(entry.endedAt), 'HH:mm') : '…'}
                        </p>
                      )}
                      {heightPx > 48 && entry.clientId && clientMap[entry.clientId] && (
                        <p className="text-[10px] leading-tight truncate mt-0.5 opacity-70" style={{ color }}>
                          {clientMap[entry.clientId]}
                        </p>
                      )}

                      {/* Bottom resize handle — only visible on hover */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize flex items-end justify-center pb-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity z-10"
                        onPointerDown={(e) => handleBottomResizeStart(e, entry, dayIndex)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-5 h-[3px] rounded-full" style={{ backgroundColor: color + 'cc' }} />
                      </div>
                    </div>
                  )
                })}

                {/* Drag preview — gray dashed outline WHILE dragging */}
                {dragPreview?.dayIndex === dayIndex && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded border border-dashed border-white/30 bg-white/[0.06] z-30 pointer-events-none"
                    style={{ top: dragPreview.topPx, height: dragPreview.heightPx }}
                  >
                    <p className="text-[10px] text-text-muted/80 px-1.5 pt-1 font-medium tabular-nums">
                      {minsToTimeStr(Math.min(Math.min(dragRef.current?.startMin ?? 0, dragRef.current?.curMin ?? 0), 23 * 60 + 45))}
                      {' – '}
                      {minsToTimeStr(Math.min(Math.max(dragRef.current?.startMin ?? 0, dragRef.current?.curMin ?? 0) + SLOT_MINS, 23 * 60 + 59))}
                    </p>
                  </div>
                )}

                {/* Pending slot — gray outline AFTER release, while dialog is open */}
                {pending && !dragPreview && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded border border-dashed border-white/20 bg-white/[0.03] z-20 pointer-events-none"
                    style={{
                      top: minsToY(pending.startMins) + 1,
                      height: Math.max(minsToY(pending.endMins) - minsToY(pending.startMins), SLOT_PX) - 2,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────────────────────

type ViewMode = 'day' | 'week' | 'month'

export function TimeTracking() {
  usePageMeta('Uren')

  const profile = useAuthStore((s) => s.profile)
  const { clients } = useStore()
  const isAdmin = profile?.role === 'admin'

  // View state
  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all')

  // Timer bar state
  const [timerDesc, setTimerDesc] = useState('')
  const [timerClientId, setTimerClientId] = useState<string | null>(null)
  const [timerTagIds, setTimerTagIds] = useState<string[]>([])
  const descSaveRef = useRef<ReturnType<typeof setTimeout>>()

  // Dialogs
  const [showEntryDialog, setShowEntryDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()
  const [dragPrefill, setDragPrefill] = useState<{ date: string; start: string; end: string } | undefined>()
  const [showTagManager, setShowTagManager] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Live tick every second
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { entries, setEntries, tags, reloadTags, users, loading, runningEntry, deleteEntry } =
    useTimeTrackingData(isAdmin, selectedUserId)

  // Sync timer bar when a running entry is found
  useEffect(() => {
    if (runningEntry) {
      setTimerDesc(runningEntry.description)
      setTimerClientId(runningEntry.clientId)
      setTimerTagIds(runningEntry.tagIds)
    }
  }, [runningEntry?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Maps
  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.companyName])),
    [clients],
  )
  const tagMap = useMemo(
    () => Object.fromEntries(tags.map((t) => [t.id, t])),
    [tags],
  )
  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email])),
    [users],
  )
  const activeClients = useMemo(
    () => clients.filter((c) => c.status === 'active').sort((a, b) => a.companyName.localeCompare(b.companyName)),
    [clients],
  )

  // ── Navigation ────────────────────────────────────────────────────────────

  function navPrev() {
    setCurrentDate((d) => view === 'day' ? subDays(d, 1) : view === 'week' ? subWeeks(d, 1) : subMonths(d, 1))
  }
  function navNext() {
    setCurrentDate((d) => view === 'day' ? addDays(d, 1) : view === 'week' ? addWeeks(d, 1) : addMonths(d, 1))
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

  // ── Timer actions ─────────────────────────────────────────────────────────

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
        } catch { /* ignore */ }
      }, 1200)
    }
  }

  // ── Entry CRUD ────────────────────────────────────────────────────────────

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
        [created, ...prev].sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        ),
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

  // ── Drag-to-create (week view) ────────────────────────────────────────────

  function handleCreateFromDrag(day: Date, startMins: number, endMins: number) {
    setDragPrefill({
      date: format(day, 'yyyy-MM-dd'),
      start: minsToTimeStr(startMins),
      end: minsToTimeStr(Math.min(endMins, 23 * 60 + 59)),
    })
    setEditingEntry(undefined)
    setShowEntryDialog(true)
  }

  // ── Resize entry (week view) ──────────────────────────────────────────────

  async function handleResize(entry: TimeEntry, newStartMins: number, newEndMins: number) {
    const dateStr  = isoToLocalDate(entry.startedAt)
    const startedAt = localToISO(dateStr, minsToTimeStr(newStartMins))
    const endedAt   = localToISO(dateStr, minsToTimeStr(newEndMins))
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

  // Pending slot: shown in the grid while drag-dialog is open
  const pendingSlot = useMemo(() => {
    if (!dragPrefill || !showEntryDialog || !dragPrefill.start || !dragPrefill.end) return undefined
    const [sh, sm] = dragPrefill.start.split(':').map(Number)
    const [eh, em] = dragPrefill.end.split(':').map(Number)
    return { date: dragPrefill.date, startMins: (sh ?? 0) * 60 + (sm ?? 0), endMins: (eh ?? 0) * 60 + (em ?? 0) }
  }, [dragPrefill, showEntryDialog])

  // ── View helpers ──────────────────────────────────────────────────────────

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
    () => weekDays.reduce(
      (sum, d) => sum + entriesForDate(entries, d).reduce((s, e) => s + getDurationSeconds(e, now), 0),
      0,
    ),
    [entries, weekDays, now],
  )

  function entryRowProps(entry: TimeEntry) {
    return {
      now,
      clientMap,
      tagMap,
      onEdit: () => { setEditingEntry(entry); setDragPrefill(undefined); setShowEntryDialog(true) },
      onDelete: () => setConfirmDeleteId(entry.id),
      onStop: entry.isRunning ? () => handleStopEntry(entry) : undefined,
      showUser: isAdmin && selectedUserId === 'all',
      userMap,
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            )}
            <Button
              variant="outline" size="sm"
              onClick={() => exportCsv(entries, clientMap, tagMap, userMap)}
              disabled={entries.length === 0}
              className="h-7 text-xs gap-1.5"
            >
              <Download size={12} /> Exporteer
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditingEntry(undefined); setDragPrefill(undefined); setShowEntryDialog(true) }}
              className="h-7 text-xs gap-1.5"
            >
              <Plus size={12} /> Handmatig toevoegen
            </Button>
          </>
        }
      />

      {/* ── Timer bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-surface-1">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-3">
          {/* Description */}
          <input
            value={timerDesc}
            onChange={(e) => handleTimerDescChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartStop()}
            placeholder={runningEntry ? 'Omschrijving bijwerken…' : 'Waar ben je mee bezig?'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none min-w-0"
          />

          {/* Client */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors shrink-0">
                {timerClientId && clientMap[timerClientId]
                  ? <span className="text-text-secondary">{clientMap[timerClientId]}</span>
                  : <span>Klant</span>}
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

          {/* Tags */}
          <TagSelector
            tags={tags}
            selectedIds={timerTagIds}
            onChange={setTimerTagIds}
            onManage={() => setShowTagManager(true)}
          />

          {/* Duration counter */}
          <span className={cn(
            'text-sm font-mono tabular-nums w-20 text-center shrink-0 font-semibold',
            runningEntry ? 'text-green-400' : 'text-text-muted',
          )}>
            {runningEntry ? formatDuration(getDurationSeconds(runningEntry, now)) : '0:00:00'}
          </span>

          {/* Start / Stop */}
          <button
            type="button"
            onClick={handleStartStop}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              runningEntry
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
            )}
            title={runningEntry ? 'Timer stoppen' : 'Timer starten'}
          >
            {runningEntry
              ? <Square size={16} fill="currentColor" />
              : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>

      {/* ── View navigation ────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-surface-0/60">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-2 flex items-center gap-3">
          {/* View tabs */}
          <div className="flex items-center bg-surface-2 border border-border-subtle rounded-lg p-0.5 shrink-0">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  view === v
                    ? 'bg-surface-4 text-text-primary font-medium'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {v === 'day' ? 'Dag' : v === 'week' ? 'Week' : 'Maand'}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={navPrev}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary rounded-md hover:bg-white/[0.06] transition-colors">
              Vandaag
            </button>
            <button type="button" onClick={navNext}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          <span className="text-sm text-text-primary font-medium capitalize truncate flex-1">{periodLabel()}</span>

          {view === 'week' && (
            <span className="text-xs text-text-muted shrink-0 tabular-nums font-medium">
              {formatHoursShort(weekTotal)} totaal
            </span>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4">

        {loading && (
          <div className="text-center py-12 text-xs text-text-muted">Laden…</div>
        )}

        {/* ── WEEK VIEW — Toggl-style calendar grid ─────────────────────── */}
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

        {/* ── DAY VIEW ──────────────────────────────────────────────────── */}
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
                  onClick={() => { setEditingEntry(undefined); setDragPrefill({ date: format(currentDate, 'yyyy-MM-dd'), start: '', end: '' }); setShowEntryDialog(true) }}
                  className="text-accent-blue hover:underline"
                >
                  Toevoegen?
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {dayEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} {...entryRowProps(entry)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MONTH VIEW ────────────────────────────────────────────────── */}
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
                    onClick={() => { setCurrentDate(day); setView('day') }}
                    className={cn(
                      'bg-surface-2 p-2 min-h-[80px] text-left hover:bg-white/[0.04] transition-colors flex flex-col',
                      !isCurrentMonth && 'opacity-40',
                      today_ && 'bg-accent-blue/[0.05]',
                    )}
                  >
                    <span className={cn(
                      'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                      today_ ? 'bg-accent-blue text-white' : 'text-text-secondary',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {totalSecs > 0 && (
                      <span className="text-[10px] text-text-muted tabular-nums">{formatHoursShort(totalSecs)}</span>
                    )}
                    {dayEnt.slice(0, 3).map((e) => {
                      const firstTag = e.tagIds.map((id) => tagMap[id]).find(Boolean)
                      const color = e.isRunning ? '#22c55e' : (firstTag?.color ?? '#6366f1')
                      return (
                        <div key={e.id}
                          className="text-[10px] truncate mt-0.5 px-1 py-0.5 rounded"
                          style={{ backgroundColor: color + '20', color }}
                        >
                          {e.description || '—'}
                        </div>
                      )
                    })}
                    {dayEnt.length > 3 && (
                      <span className="text-[10px] text-text-muted/60 mt-0.5">+{dayEnt.length - 3}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Running timer card (shown when week/month view) */}
        {!loading && view !== 'day' && runningEntry && (
          <div className="mt-4 bg-green-500/[0.05] border border-green-500/20 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-green-500/15 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Lopende timer</p>
            </div>
            <EntryRow entry={runningEntry} {...entryRowProps(runningEntry)} />
          </div>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      {showEntryDialog && (
        <EntryDialog
          open={showEntryDialog}
          onClose={() => { setShowEntryDialog(false); setEditingEntry(undefined); setDragPrefill(undefined) }}
          onSave={handleSaveEntry}
          initial={editingEntry}
          prefilledDate={dragPrefill?.date}
          prefilledStart={dragPrefill?.start}
          prefilledEnd={dragPrefill?.end}
          clients={activeClients}
          tags={tags}
          onManageTags={() => { setShowEntryDialog(false); setShowTagManager(true) }}
        />
      )}

      <TagManagerDialog
        open={showTagManager}
        onClose={() => setShowTagManager(false)}
        tags={tags}
        onReload={reloadTags}
      />

      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registratie verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Dit kan niet ongedaan worden gemaakt.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1">Annuleren</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && handleDeleteEntry(confirmDeleteId)}
              className="flex-1"
            >
              Verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
