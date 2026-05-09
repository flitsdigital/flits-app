import { useEffect, useState, useRef } from 'react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subMonths, subQuarters, subWeeks,
  addWeeks, addMonths,
  eachDayOfInterval, isSameDay, format, isToday,
  parseISO, isWithinInterval,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Users, Download, FileText, Sheet, CalendarDays, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { travelExpensesDb } from '../lib/travelExpensesDb'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthStore } from '../store/useAuthStore'
import { useTravelExpensesData } from '../hooks/useTravelExpensesData'
import { PageHeader } from '../components/PageHeader'
import type { TravelExpense, UserProfile } from '../types'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const RATE = 0.23

function totalKm(e: TravelExpense) { return e.returnTrip ? e.kilometers * 2 : e.kilometers }
function amount(e: TravelExpense) { return totalKm(e) * RATE }
function fmt(n: number) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }) }

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportCSV(expenses: TravelExpense[], clients: { id: string; companyName: string }[], users: UserProfile[], rangeLabel: string) {
  const headers = ['Datum', 'Van', 'Naar', 'Retour', 'Km (enkel)', 'Totaal km', 'Bedrag (€)', 'Klant', 'Gebruiker']
  const rows = expenses.map((e) => {
    const client = clients.find((c) => c.id === e.clientId)?.companyName ?? ''
    const user = users.find((u) => u.id === e.userId)
    const userName = user ? (user.name ?? user.email) : ''
    return [
      format(parseISO(e.date), 'd-M-yyyy'),
      e.from,
      e.to,
      e.returnTrip ? 'Ja' : 'Nee',
      e.kilometers.toString().replace('.', ','),
      totalKm(e).toString().replace('.', ','),
      (amount(e)).toFixed(2).replace('.', ','),
      client,
      userName,
    ]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reiskosten-${rangeLabel.replace(/\s/g, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportPDF(expenses: TravelExpense[], clients: { id: string; companyName: string }[], users: UserProfile[], rangeLabel: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Reiskosten overzicht', 14, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`Periode: ${rangeLabel}`, 14, 26)
  doc.text(`Gegenereerd op: ${format(new Date(), 'd MMMM yyyy', { locale: nl })}`, 14, 32)

  // Totalen
  const totalKmAll = expenses.reduce((s, e) => s + totalKm(e), 0)
  const totalAmountAll = expenses.reduce((s, e) => s + amount(e), 0)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Totaal: ${totalKmAll} km  |  ${fmt(totalAmountAll)}`, 14, 42)

  // Tabel
  const showUser = users.length > 0
  const head = [['Datum', 'Van', 'Naar', 'Retour', 'Km (enkel)', 'Totaal km', 'Bedrag', 'Klant', ...(showUser ? ['Gebruiker'] : [])]]
  const body = expenses.map((e) => {
    const client = clients.find((c) => c.id === e.clientId)?.companyName ?? '—'
    const user = users.find((u) => u.id === e.userId)
    return [
      format(parseISO(e.date), 'd MMM yyyy', { locale: nl }),
      e.from,
      e.to,
      e.returnTrip ? 'Ja' : 'Nee',
      `${e.kilometers} km`,
      `${totalKm(e)} km`,
      fmt(amount(e)),
      client,
      ...(showUser ? [user ? (user.name ?? user.email) : '—'] : []),
    ]
  })

  autoTable(doc, {
    head,
    body,
    startY: 48,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 6: { halign: 'right' } },
  })

  doc.save(`reiskosten-${rangeLabel.replace(/\s/g, '-').toLowerCase()}.pdf`)
}

type ViewMode = 'week' | 'month'

interface DateRange { start: Date; end: Date; label: string }

const PRESETS = (now: Date): { label: string; range: DateRange }[] => [
  { label: 'Deze week',      range: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'Deze week' } },
  { label: 'Vorige week',    range: { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), label: 'Vorige week' } },
  { label: 'Deze maand',     range: { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy', { locale: nl }) } },
  { label: 'Vorige maand',   range: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)), label: format(subMonths(now, 1), 'MMMM yyyy', { locale: nl }) } },
  { label: '2 maanden geleden', range: { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)), label: format(subMonths(now, 2), 'MMMM yyyy', { locale: nl }) } },
  { label: 'Dit kwartaal',   range: { start: startOfQuarter(now), end: endOfQuarter(now), label: 'Dit kwartaal' } },
  { label: 'Vorig kwartaal', range: { start: startOfQuarter(subQuarters(now, 1)), end: endOfQuarter(subQuarters(now, 1)), label: 'Vorig kwartaal' } },
  { label: 'Dit jaar',       range: { start: startOfYear(now), end: endOfYear(now), label: String(now.getFullYear()) } },
]

// ─── Modal ────────────────────────────────────────────────────────────────────

interface RoutePreset {
  id: string
  label: string
  from: string
  to: string
  kilometers: number
  returnTrip: boolean
}

function useRoutePresets(userId: string | undefined) {
  const key = `route-presets-${userId ?? 'anon'}`
  const [presets, setPresets] = useState<RoutePreset[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
  })

  function save(updated: RoutePreset[]) {
    setPresets(updated)
    localStorage.setItem(key, JSON.stringify(updated))
  }

  function addPreset(p: Omit<RoutePreset, 'id'>) {
    save([...presets, { ...p, id: Math.random().toString(36).slice(2, 8) }])
  }

  function removePreset(id: string) {
    save(presets.filter((p) => p.id !== id))
  }

  return { presets, addPreset, removePreset }
}

function ClientCombobox({ value, onChange, placeholder = '— Geen klant —' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const clients = useStore((s) => s.clients)
  const [open, setOpen] = useState(false)
  const selected = clients.find(c => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal text-sm">
          {selected ? selected.companyName : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klant gevonden.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="" onSelect={() => { onChange(''); setOpen(false) }}>
                <Check size={14} className={cn('mr-2', value === '' ? 'opacity-100' : 'opacity-0')} />
                — Geen klant —
              </CommandItem>
              {clients.map(c => (
                <CommandItem key={c.id} value={c.companyName} onSelect={() => { onChange(c.id); setOpen(false) }}>
                  <Check size={14} className={cn('mr-2', value === c.id ? 'opacity-100' : 'opacity-0')} />
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

function TravelDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <DatePickerButton
      value={value || undefined}
      onChange={onChange}
      placeholder="Selecteer datum"
      className="w-full rounded-md justify-start h-9 text-sm px-3"
    />
  )
}

function ExpenseModal({ expense, initialDate, onClose, onSaved, onDelete }: { expense?: TravelExpense; initialDate?: string; onClose: () => void; onSaved: () => void; onDelete: (id: string) => void }) {
  const session = useAuthStore((s) => s.session)
  const { presets, addPreset, removePreset } = useRoutePresets(session?.user.id)
  const isEdit = !!expense

  const [clientId, setClientId] = useState(expense?.clientId ?? '')
  const [date, setDate] = useState(expense?.date ?? initialDate ?? new Date().toISOString().slice(0, 10))
  const [from, setFrom] = useState(expense?.from ?? '')
  const [to, setTo] = useState(expense?.to ?? '')
  const [returnTrip, setReturnTrip] = useState(expense?.returnTrip ?? false)
  const [kilometers, setKilometers] = useState(expense?.kilometers?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetLabel, setPresetLabel] = useState('')

  const km = parseFloat(kilometers) || 0
  const total = returnTrip ? km * 2 : km

  function applyPreset(p: RoutePreset) {
    setFrom(p.from); setTo(p.to); setKilometers(p.kilometers.toString()); setReturnTrip(p.returnTrip)
  }

  function handleSavePreset() {
    if (!from || !to || !km) return
    addPreset({ label: presetLabel || `${from} → ${to}`, from, to, kilometers: km, returnTrip })
    setSavingPreset(false); setPresetLabel('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      if (isEdit) {
        await travelExpensesDb.updateExpense(expense!.id, { clientId: clientId || null, date, from, to, returnTrip, kilometers: km })
      } else {
        await travelExpensesDb.createExpense({ userId: session?.user.id, clientId: clientId || null, date, from, to, returnTrip, kilometers: km })
      }
      toast.success(isEdit ? 'Rit opgeslagen' : 'Rit toegevoegd')
      onSaved(); onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error('Opslaan mislukt', { description: msg })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rit bewerken' : 'Rit toevoegen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Snelle routes</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="group flex items-center gap-1 bg-surface-0 border border-border-subtle rounded-lg pl-2.5 pr-1 py-1">
                    <button type="button" onClick={() => applyPreset(p)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">{p.label}</button>
                    <button type="button" onClick={() => removePreset(p.id)} className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datum */}
          <div className="space-y-1.5">
            <Label>Datum</Label>
            <TravelDatePicker value={date} onChange={setDate} />
          </div>

          {/* Van → Naar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">Van</Label>
              <Input id="from" value={from} onChange={e => setFrom(e.target.value)} required placeholder="Vertrekpunt" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Naar</Label>
              <Input id="to" value={to} onChange={e => setTo(e.target.value)} required placeholder="Bestemming" />
            </div>
          </div>

          {/* Km + retour */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="km">Km (enkele reis)</Label>
              <Input id="km" type="number" value={kilometers} onChange={e => setKilometers(e.target.value)} required min="0" step="0.1" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Retourreis</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch id="returnTrip" checked={returnTrip} onCheckedChange={setReturnTrip} />
                <Label htmlFor="returnTrip" className="font-normal cursor-pointer text-muted-foreground">
                  {returnTrip ? `${km * 2} km totaal` : 'Enkele reis'}
                </Label>
              </div>
            </div>
          </div>

          {/* Sla op als preset */}
          {from && to && km > 0 && !isEdit && (
            savingPreset ? (
              <div className="flex gap-2 items-center">
                <Input value={presetLabel} onChange={e => setPresetLabel(e.target.value)} placeholder={`${from} → ${to}`} autoFocus className="flex-1 h-8 text-xs" />
                <Button type="button" size="sm" onClick={handleSavePreset} className="h-8 text-xs">Opslaan</Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => setSavingPreset(false)} className="h-8 w-8"><X size={13} /></Button>
              </div>
            ) : (
              <button type="button" onClick={() => setSavingPreset(true)} className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
                <Plus size={11} /> Sla op als snelle route
              </button>
            )
          )}

          {/* Klant */}
          <div className="space-y-1.5">
            <Label>Klant <span className="text-muted-foreground font-normal">(optioneel)</span></Label>
            <ClientCombobox value={clientId} onChange={setClientId} />
          </div>

          {/* Berekening */}
          {km > 0 && (
            <div className="bg-surface-0 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-text-muted">{km} km{returnTrip ? ' × 2 (retour)' : ''} × €{RATE}</span>
              <span className="text-sm font-semibold text-text-primary">{fmt(total * RATE)}</span>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            {isEdit && (
              <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(expense!.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 size={15} />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuleren</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Toevoegen'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bulk modal (meerdere datums) ─────────────────────────────────────────────

function BulkExpenseModal({ dates, onClose, onSaved }: { dates: string[]; onClose: () => void; onSaved: () => void }) {
  const clients = useStore((s) => s.clients)
  const session = useAuthStore((s) => s.session)
  const { presets, addPreset, removePreset } = useRoutePresets(session?.user.id)

  const [clientId, setClientId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [returnTrip, setReturnTrip] = useState(false)
  const [kilometers, setKilometers] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetLabel, setPresetLabel] = useState('')

  const km = parseFloat(kilometers) || 0
  const total = returnTrip ? km * 2 : km

  function applyPreset(p: RoutePreset) {
    setFrom(p.from); setTo(p.to); setKilometers(p.kilometers.toString()); setReturnTrip(p.returnTrip)
  }

  function handleSavePreset() {
    if (!from || !to || !km) return
    addPreset({ label: presetLabel || `${from} → ${to}`, from, to, kilometers: km, returnTrip })
    setSavingPreset(false); setPresetLabel('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      await travelExpensesDb.createBulkExpenses({
        userId: session?.user.id,
        clientId: clientId || null,
        dates,
        from,
        to,
        returnTrip,
        kilometers: km,
      })
      onSaved(); onClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setLoading(false) }
  }

  const sorted = [...dates].sort()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rit toevoegen voor {dates.length} datum{dates.length !== 1 ? 's' : ''}</DialogTitle>
          <p className="text-xs text-muted-foreground">Dezelfde rit wordt opgeslagen voor elke geselecteerde dag</p>
        </DialogHeader>

        {/* Selected dates chips */}
        <div className="px-5 pt-4 flex flex-wrap gap-1.5">
          {sorted.map((d) => (
            <span key={d} className="px-2 py-0.5 bg-accent-blue/15 border border-accent-blue/30 text-accent-blue text-xs rounded-md">
              {format(parseISO(d), 'd MMM', { locale: nl })}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Snelle routes</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="group flex items-center gap-1 bg-surface-0 border border-border-subtle rounded-lg pl-2.5 pr-1 py-1">
                    <button type="button" onClick={() => applyPreset(p)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">{p.label}</button>
                    <button type="button" onClick={() => removePreset(p.id)} className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Van → Naar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-from">Van</Label>
              <Input id="bulk-from" value={from} onChange={e => setFrom(e.target.value)} required placeholder="Vertrekpunt" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-to">Naar</Label>
              <Input id="bulk-to" value={to} onChange={e => setTo(e.target.value)} required placeholder="Bestemming" />
            </div>
          </div>

          {/* Km + retour */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-km">Km (enkele reis)</Label>
              <Input id="bulk-km" type="number" value={kilometers} onChange={e => setKilometers(e.target.value)} required min="0" step="0.1" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Retourreis</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch id="bulk-return" checked={returnTrip} onCheckedChange={setReturnTrip} />
                <Label htmlFor="bulk-return" className="font-normal cursor-pointer text-muted-foreground">
                  {returnTrip ? `${km * 2} km totaal` : 'Enkele reis'}
                </Label>
              </div>
            </div>
          </div>

          {/* Sla op als preset */}
          {from && to && km > 0 && (
            savingPreset ? (
              <div className="flex gap-2 items-center">
                <Input value={presetLabel} onChange={e => setPresetLabel(e.target.value)} placeholder={`${from} → ${to}`} autoFocus className="flex-1 h-8 text-xs" />
                <Button type="button" size="sm" onClick={handleSavePreset} className="h-8 text-xs">Opslaan</Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => setSavingPreset(false)} className="h-8 w-8"><X size={13} /></Button>
              </div>
            ) : (
              <button type="button" onClick={() => setSavingPreset(true)} className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
                <Plus size={11} /> Sla op als snelle route
              </button>
            )
          )}

          {/* Klant */}
          <div className="space-y-1.5">
            <Label>Klant <span className="text-muted-foreground font-normal">(optioneel)</span></Label>
            <ClientCombobox value={clientId} onChange={setClientId} />
          </div>

          {/* Berekening */}
          {km > 0 && (
            <div className="bg-surface-0 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-text-muted">{km} km{returnTrip ? ' × 2 (retour)' : ''} × €{RATE} × {dates.length} dag{dates.length !== 1 ? 'en' : ''}</span>
              <span className="text-sm font-semibold text-text-primary">{fmt(total * RATE * dates.length)}</span>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuleren</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Bezig…' : `${dates.length} rit${dates.length !== 1 ? 'ten' : ''} toevoegen`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick, selectMode, selectedDates, onDateToggle }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
  selectMode: boolean
  selectedDates: Set<string>
  onDateToggle: (date: string) => void
}) {
  const days = eachDayOfInterval({ start: range.start, end: range.end })

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
          const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
          const selected = selectedDates.has(dateStr)
          return (
            <div key={day.toISOString()} className={clsx('px-3 py-3 border-r border-border-subtle last:border-r-0 relative', isToday(day) && 'bg-accent-blue/5', selected && 'bg-accent-blue/10')}>
              <p className={clsx('text-xs font-medium mb-0.5', isToday(day) || selected ? 'text-accent-blue' : 'text-text-muted')}>
                {format(day, 'EEE', { locale: nl })}
              </p>
              <p className={clsx('text-lg font-semibold leading-none', isToday(day) || selected ? 'text-accent-blue' : 'text-text-primary')}>
                {format(day, 'd')}
              </p>
              {dayKm > 0 && <p className="text-xs text-text-muted mt-1">{dayKm} km</p>}
              {selected && <div className="absolute top-2 right-2 w-4 h-4 bg-accent-blue rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
            </div>
          )
        })}
      </div>

      {/* Day content */}
      <div className="grid grid-cols-7 min-h-32">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
          const selected = selectedDates.has(dateStr)
          return (
            <div
              key={day.toISOString()}
              onClick={() => selectMode ? onDateToggle(dateStr) : onDayClick(dateStr)}
              className={clsx(
                'border-r border-border-subtle last:border-r-0 p-2 space-y-1.5 cursor-pointer group/day transition-colors',
                isToday(day) && 'bg-accent-blue/[0.03]',
                selected && 'bg-accent-blue/[0.06] ring-1 ring-inset ring-accent-blue/30',
              )}
            >
              {dayExpenses.map((e) => {
                const user = isAdmin ? users.find((u) => u.id === e.userId) : null
                return (
                  <div key={e.id} className="bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1.5 cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={(ev) => { ev.stopPropagation(); onEdit(e) }}>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-blue-300 truncate flex-1">{e.from} → {e.to}</p>
                      {e.returnTrip && <RotateCcw size={10} className="text-blue-400 flex-shrink-0" />}
                    </div>
                    {user && <p className="text-xs text-blue-400/70 truncate">{user.name ?? user.email}</p>}
                    <p className="text-xs text-blue-300 font-medium mt-0.5">{totalKm(e)} km · {fmt(amount(e))}</p>
                  </div>
                )
              })}
              {!selectMode && (
                <div className="opacity-0 group-hover/day:opacity-100 transition-opacity flex items-center justify-center py-1">
                  <span className="text-xs text-text-muted flex items-center gap-1"><Plus size={10} /> Rit</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick, selectMode, selectedDates, onDateToggle }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
  selectMode: boolean
  selectedDates: Set<string>
  onDateToggle: (date: string) => void
}) {
  const monthStart = startOfMonth(range.start)
  const monthEnd = endOfMonth(range.start)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {DAY_LABELS.map((d) => (
          <div key={d} className="px-3 py-2 text-center text-xs font-medium text-text-muted border-r border-border-subtle last:border-r-0">{d}</div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border-subtle last:border-b-0">
          {week.map((day) => {
            const inMonth = day >= monthStart && day <= monthEnd
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
            const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
            const selected = selectedDates.has(dateStr)
            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  if (!inMonth) return
                  selectMode ? onDateToggle(dateStr) : onDayClick(dateStr)
                }}
                className={clsx(
                  'min-h-20 p-2 border-r border-border-subtle last:border-r-0 group/day transition-colors',
                  inMonth ? 'cursor-pointer' : 'opacity-30',
                  isToday(day) && 'bg-accent-blue/[0.04]',
                  selected && 'bg-accent-blue/[0.08] ring-1 ring-inset ring-accent-blue/30',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={clsx('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    selected ? 'bg-accent-blue text-white' : isToday(day) ? 'bg-accent-blue text-white' : 'text-text-muted'
                  )}>
                    {format(day, 'd')}
                  </p>
                  {selected && !isToday(day) && <Check size={11} className="text-accent-blue flex-shrink-0" />}
                </div>
                {dayExpenses.map((e) => {
                  const user = isAdmin ? users.find((u) => u.id === e.userId) : null
                  return (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onEdit(e) }} className="bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-1 mb-1 cursor-pointer hover:bg-blue-500/20 transition-colors">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-blue-300 truncate font-medium flex-1">{e.from} → {e.to}</p>
                        {e.returnTrip && <RotateCcw size={9} className="text-blue-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-blue-400/70 truncate">{totalKm(e)} km{user ? ` · ${user.name ?? user.email}` : ''}</p>
                    </div>
                  )
                })}
                {dayKm > 0 && dayExpenses.length > 1 && (
                  <p className="text-xs text-text-muted mt-0.5">{fmt(dayExpenses.reduce((s, e) => s + amount(e), 0))}</p>
                )}
                {inMonth && !selectMode && (
                  <div className="opacity-0 group-hover/day:opacity-100 transition-opacity flex items-center justify-center py-0.5 mt-0.5">
                    <span className="text-xs text-text-muted flex items-center gap-1"><Plus size={10} /> Rit</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TravelExpenses() {
  usePageMeta('Reiskosten → Flits Impact', 'Registreer en exporteer reiskosten per week of maand.')
  const clients = useStore((s) => s.clients)
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const now = new Date()
  const presets = PRESETS(now)

  const [viewMode, setViewMode] = useState<ViewMode>('week')
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

  return (
    <div>
      <PageHeader
        title="Reiskosten"
        subtitle={rangeLabel}
        actions={
          <>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExport((v) => !v)}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs rounded transition-colors"
              >
                <Download size={12} /> Exporteren <ChevronDown size={11} />
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border-default rounded-lg shadow-dropdown z-30 py-1 min-w-[150px]">
                  <button onClick={() => { exportCSV(filtered, clients, users, rangeLabel); setShowExport(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
                    <Sheet size={12} className="text-accent-green" /> CSV exporteren
                  </button>
                  <button onClick={() => { exportPDF(filtered, clients, users, rangeLabel); setShowExport(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
                    <FileText size={12} className="text-accent-red" /> PDF exporteren
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelectMode((v) => !v); setSelectedDates(new Set()) }}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1 border text-xs rounded transition-colors', selectMode ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'bg-surface-2 border-border-subtle text-text-secondary hover:text-text-primary')}
            >
              <CalendarDays size={12} /> {selectMode ? 'Klaar' : 'Datums selecteren'}
            </button>
            {!selectMode && (
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-medium rounded transition-colors">
                <Plus size={12} /> Rit toevoegen
              </button>
            )}
          </>
        }
      />
      <div className="px-6 py-5 max-w-5xl mx-auto">

      {/* Admin: user selector */}
      {isAdmin && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-surface-1 border border-border-subtle rounded-xl">
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
      )}

      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Period nav */}
        <div className="flex items-center bg-surface-2 border border-border-subtle rounded p-0.5">
          <button onClick={() => navigate(-1)} className="p-1 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded transition-colors">
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs font-medium text-text-primary px-2 min-w-[140px] text-center">{rangeLabel}</span>
          <button onClick={() => navigate(1)} className="p-1 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded transition-colors">
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Presets dropdown */}
        <div className="relative" ref={presetsRef}>
          <button onClick={() => setShowPresets((v) => !v)} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary text-xs rounded transition-colors">
            {range.label} <ChevronDown size={11} />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1 left-0 bg-surface-2 border border-border-default rounded-lg shadow-dropdown z-20 py-1 min-w-[170px]">
              {presets.map((p) => (
                <button key={p.label} onClick={() => { setRange(p.range); setAnchorDate(p.range.start); setShowPresets(false); if (p.label.includes('week') || p.label === 'Deze week' || p.label === 'Vorige week') setViewMode('week'); else setViewMode('month') }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <Tabs value={viewMode} onValueChange={(v) => {
          const m = v as ViewMode
          setViewMode(m)
          if (m === 'week') setRange({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }), label: `Week ${format(anchorDate, 'w', { locale: nl })}` })
          else setRange({ start: startOfMonth(anchorDate), end: endOfMonth(anchorDate), label: format(anchorDate, 'MMMM yyyy', { locale: nl }) })
        }} className="ml-auto">
          <TabsList className="h-7">
            <TabsTrigger value="week" className="text-xs h-6 px-2.5">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs h-6 px-2.5">Maand</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-surface-0 border border-border-subtle flex items-center justify-center">
                      <span className="text-xs font-medium text-text-secondary">{(u.name ?? u.email).charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-text-primary">{u.name ?? u.email}</span>
                    <span className="text-xs text-text-muted">{userExpenses.length} rit{userExpenses.length !== 1 ? 'ten' : ''}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-xs text-text-muted">{uKm} km</span>
                    <span className="text-sm font-semibold text-text-primary">{fmt(uAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>
      ) : viewMode === 'week' ? (
        <WeekView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} selectMode={selectMode} selectedDates={selectedDates} onDateToggle={toggleDate} />
      ) : (
        <MonthView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} selectMode={selectMode} selectedDates={selectedDates} onDateToggle={toggleDate} />
      )}

      {/* Lijst onder kalender */}
      {filtered.length > 0 && (
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surface-1 border border-border-subtle rounded-2xl shadow-2xl px-4 py-3">
          <span className="text-sm text-text-primary font-medium">{selectedDates.size} datum{selectedDates.size !== 1 ? 's' : ''} geselecteerd</span>
          <div className="w-px h-5 bg-border-subtle" />
          <button onClick={() => setSelectedDates(new Set())} className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
            <X size={12} /> Deselecteer
          </button>
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={14} /> Rit toevoegen voor alle
          </button>
        </div>
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
