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
import { Plus, Pencil, Trash2, X, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Users, Download, FileText, Sheet } from 'lucide-react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthStore } from '../store/useAuthStore'
import type { TravelExpense, UserProfile } from '../types'
import clsx from 'clsx'

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

function ExpenseModal({ expense, initialDate, onClose, onSaved, onDelete }: { expense?: TravelExpense; initialDate?: string; onClose: () => void; onSaved: () => void; onDelete: (id: string) => void }) {
  const clients = useStore((s) => s.clients)
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
    setFrom(p.from)
    setTo(p.to)
    setKilometers(p.kilometers.toString())
    setReturnTrip(p.returnTrip)
  }

  function handleSavePreset() {
    if (!from || !to || !km) return
    addPreset({ label: presetLabel || `${from} → ${to}`, from, to, kilometers: km, returnTrip })
    setSavingPreset(false)
    setPresetLabel('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const row = { client_id: clientId || null, date, from_location: from, to_location: to, return_trip: returnTrip, kilometers: km, updated_at: new Date().toISOString() }
    try {
      if (isEdit) {
        const { error } = await supabase.from('travel_expenses').update(row).eq('id', expense!.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('travel_expenses').insert({ ...row, id: Math.random().toString(36).slice(2, 10), user_id: session?.user.id, created_at: new Date().toISOString() })
        if (error) throw error
      }
      onSaved(); onClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">{isEdit ? 'Rit bewerken' : 'Rit toevoegen'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Snelle routes</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="group flex items-center gap-1 bg-surface-0 border border-border-subtle rounded-lg pl-2.5 pr-1 py-1">
                    <button type="button" onClick={() => applyPreset(p)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                      {p.label}
                    </button>
                    <button type="button" onClick={() => removePreset(p.id)} className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datum */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Datum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors" />
          </div>

          {/* Van → Naar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Van</label>
              <input type="text" value={from} onChange={(e) => setFrom(e.target.value)} required placeholder="Vertrekpunt" className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Naar</label>
              <input type="text" value={to} onChange={(e) => setTo(e.target.value)} required placeholder="Bestemming" className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors" />
            </div>
          </div>

          {/* Km + retour */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Km (enkele reis)</label>
              <input type="number" value={kilometers} onChange={(e) => setKilometers(e.target.value)} required min="0" step="0.1" placeholder="0" className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Retour</label>
              <button type="button" onClick={() => setReturnTrip((v) => !v)} className={clsx('w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-colors', returnTrip ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04]')}>
                <RotateCcw size={13} />{returnTrip ? 'Ja' : 'Nee'}
              </button>
            </div>
          </div>

          {/* Sla op als preset */}
          {from && to && km > 0 && !isEdit && (
            savingPreset ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={presetLabel}
                  onChange={(e) => setPresetLabel(e.target.value)}
                  placeholder={`${from} → ${to}`}
                  autoFocus
                  className="flex-1 px-3 py-1.5 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
                />
                <button type="button" onClick={handleSavePreset} className="px-3 py-1.5 bg-accent-blue hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">Opslaan</button>
                <button type="button" onClick={() => setSavingPreset(false)} className="px-2 py-1.5 text-text-muted hover:text-text-primary transition-colors"><X size={13} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setSavingPreset(true)} className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
                <Plus size={11} /> Sla op als snelle route
              </button>
            )
          )}

          {/* Klant (optioneel) */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Klant <span className="text-text-muted font-normal">(optioneel)</span></label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors">
              <option value="">— Geen klant —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
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
              <button type="button" onClick={() => onDelete(expense!.id)} className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-border-subtle transition-colors" title="Verwijderen">
                <Trash2 size={15} />
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border-subtle text-text-secondary hover:text-text-primary text-sm rounded-lg transition-colors">Annuleren</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Toevoegen'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
}) {
  const days = eachDayOfInterval({ start: range.start, end: range.end })

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {days.map((day) => {
          const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
          const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
          return (
            <div key={day.toISOString()} className={clsx('px-3 py-3 border-r border-border-subtle last:border-r-0', isToday(day) && 'bg-accent-blue/5')}>
              <p className={clsx('text-xs font-medium mb-0.5', isToday(day) ? 'text-accent-blue' : 'text-text-muted')}>
                {format(day, 'EEE', { locale: nl })}
              </p>
              <p className={clsx('text-lg font-semibold leading-none', isToday(day) ? 'text-accent-blue' : 'text-text-primary')}>
                {format(day, 'd')}
              </p>
              {dayKm > 0 && <p className="text-xs text-text-muted mt-1">{dayKm} km</p>}
            </div>
          )
        })}
      </div>

      {/* Day content */}
      <div className="grid grid-cols-7 min-h-32">
        {days.map((day) => {
          const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(format(day, 'yyyy-MM-dd'))}
              className={clsx('border-r border-border-subtle last:border-r-0 p-2 space-y-1.5 cursor-pointer group/day', isToday(day) && 'bg-accent-blue/[0.03]')}
            >
              {dayExpenses.map((e) => {
                const client = clients.find((c) => c.id === e.clientId)
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
              {/* Add hint on hover */}
              <div className="opacity-0 group-hover/day:opacity-100 transition-opacity flex items-center justify-center py-1">
                <span className="text-xs text-text-muted flex items-center gap-1"><Plus size={10} /> Rit</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
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
            const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
            const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
            return (
              <div
                key={day.toISOString()}
                onClick={() => inMonth && onDayClick(format(day, 'yyyy-MM-dd'))}
                className={clsx(
                  'min-h-20 p-2 border-r border-border-subtle last:border-r-0 group/day',
                  inMonth ? 'cursor-pointer' : 'opacity-30',
                  isToday(day) && 'bg-accent-blue/[0.04]'
                )}
              >
                <p className={clsx('text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                  isToday(day) ? 'bg-accent-blue text-white' : 'text-text-muted'
                )}>
                  {format(day, 'd')}
                </p>
                {dayExpenses.map((e) => {
                  const client = clients.find((c) => c.id === e.clientId)
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
                {inMonth && (
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

// ─── DB helpers ───────────────────────────────────────────────────────────────

interface DbRow {
  id: string; user_id: string; client_id: string; date: string; from_location: string
  to_location: string; return_trip: boolean; kilometers: number
  created_at: string; updated_at: string
}

function fromRow(row: DbRow): TravelExpense {
  return { id: row.id, userId: row.user_id, clientId: row.client_id, date: row.date, from: row.from_location, to: row.to_location, returnTrip: row.return_trip, kilometers: row.kilometers, createdAt: row.created_at, updatedAt: row.updated_at }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TravelExpenses() {
  usePageMeta('Reiskosten → Flits Impact', 'Registreer en exporteer reiskosten per week of maand.')
  const clients = useStore((s) => s.clients)
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const now = new Date()
  const presets = PRESETS(now)

  const [expenses, setExpenses] = useState<TravelExpense[]>([])
  const [loading, setLoading] = useState(true)
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

  // Admin: user selector
  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all')

  // Load users for admin
  useEffect(() => {
    if (!isAdmin) return
    supabaseAdmin.from('profiles').select('*').order('email').then(({ data }) => setUsers(data ?? []))
  }, [isAdmin])

  async function load() {
    setLoading(true)
    let query = isAdmin
      ? supabaseAdmin.from('travel_expenses').select('*').order('date', { ascending: false })
      : supabase.from('travel_expenses').select('*').order('date', { ascending: false })

    if (isAdmin && selectedUserId !== 'all') {
      query = query.eq('user_id', selectedUserId)
    }

    const { data } = await query
    setExpenses((data as DbRow[] ?? []).map(fromRow))
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedUserId])

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
    const client = isAdmin ? supabaseAdmin : supabase
    await client.from('travel_expenses').delete().eq('id', id)
    setDeleteId(null); load()
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-text-primary">Reiskosten</h1>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExport((v) => !v)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-1 border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm rounded-lg transition-colors"
            >
              <Download size={14} /> Exporteren <ChevronDown size={12} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-surface-1 border border-border-subtle rounded-xl shadow-xl z-20 py-1 min-w-[160px]">
                <button
                  onClick={() => { exportCSV(filtered, clients, users, rangeLabel); setShowExport(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                >
                  <Sheet size={14} className="text-green-400" /> CSV exporteren
                </button>
                <button
                  onClick={() => { exportPDF(filtered, clients, users, rangeLabel); setShowExport(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                >
                  <FileText size={14} className="text-red-400" /> PDF exporteren
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={14} /> Rit toevoegen
          </button>
        </div>
      </div>

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
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Period nav */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border-subtle rounded-lg p-1">
          <button onClick={() => navigate(-1)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-md transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium text-text-primary px-2 min-w-[160px] text-center">{rangeLabel}</span>
          <button onClick={() => navigate(1)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-md transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Presets dropdown */}
        <div className="relative" ref={presetsRef}>
          <button onClick={() => setShowPresets((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-surface-1 border border-border-subtle text-text-secondary hover:text-text-primary text-sm rounded-lg transition-colors">
            {range.label} <ChevronDown size={13} />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1 left-0 bg-surface-1 border border-border-subtle rounded-xl shadow-xl z-20 py-1 min-w-[180px]">
              {presets.map((p) => (
                <button key={p.label} onClick={() => { setRange(p.range); setAnchorDate(p.range.start); setShowPresets(false); if (p.label.includes('week') || p.label === 'Deze week' || p.label === 'Vorige week') setViewMode('week'); else setViewMode('month') }}
                  className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-surface-1 border border-border-subtle rounded-lg p-1 ml-auto">
          {(['week', 'month'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => { setViewMode(m); if (m === 'week') { setRange({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }), label: `Week ${format(anchorDate, 'w', { locale: nl })}` }) } else { setRange({ start: startOfMonth(anchorDate), end: endOfMonth(anchorDate), label: format(anchorDate, 'MMMM yyyy', { locale: nl }) }) } }}
              className={clsx('px-3 py-1.5 rounded-md text-sm transition-colors', viewMode === m ? 'bg-white/[0.08] text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary')}>
              {m === 'week' ? 'Week' : 'Maand'}
            </button>
          ))}
        </div>
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
          <div className="px-5 py-3 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-secondary">Reiskosten per gebruiker</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {users.map((u) => {
              const userExpenses = filtered.filter((e) => e.userId === u.id)
              if (userExpenses.length === 0) return null
              const uKm = userExpenses.reduce((s, e) => s + totalKm(e), 0)
              const uAmount = userExpenses.reduce((s, e) => s + amount(e), 0)
              return (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surface-0 border border-border-subtle flex items-center justify-center">
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
        <WeekView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} />
      ) : (
        <MonthView expenses={filtered} range={range} clients={clients} users={users} isAdmin={isAdmin} onEdit={setEditExpense} onDayClick={handleDayClick} />
      )}

      {/* Lijst onder kalender */}
      {filtered.length > 0 && (
        <div className="mt-4 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-secondary">{filtered.length} rit{filtered.length !== 1 ? 'ten' : ''} in deze periode</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {filtered.map((e) => {
              const client = clients.find((c) => c.id === e.clientId)
              const user = isAdmin ? users.find((u) => u.id === e.userId) : null
              return (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] group">
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

      {/* Modals */}
      {(showAdd || editExpense) && (
        <ExpenseModal expense={editExpense} initialDate={addDate} onClose={() => { setShowAdd(false); setEditExpense(undefined); setAddDate(undefined) }} onSaved={load} onDelete={(id) => { handleDelete(id); setEditExpense(undefined); setShowAdd(false) }} />
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-sm p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-1">Rit verwijderen</h2>
            <p className="text-xs text-text-muted mb-4">Weet je zeker dat je deze rit wil verwijderen?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-border-subtle text-text-secondary text-sm rounded-lg transition-colors">Annuleren</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
