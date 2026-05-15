import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, X, Trash2, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { travelExpensesDb } from '../../lib/travelExpensesDb'
import { errorMessage } from '../../lib/errors'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useTravelRoutePresets } from '../../hooks/useTravelRoutePresets'
import type { TravelExpense } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { RATE, fmt } from './travelExpenseMoney'

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
export function ExpenseModal({ expense, initialDate, onClose, onSaved, onDelete }: { expense?: TravelExpense; initialDate?: string; onClose: () => void; onSaved: () => void; onDelete: (id: string) => void }) {
  const session = useAuthStore((s) => s.session)
  const { presets, loading: presetsLoading, addPreset, removePreset } = useTravelRoutePresets(session?.user.id)
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

  function applyPreset(p: { from: string; to: string; kilometers: number; returnTrip: boolean }) {
    setFrom(p.from); setTo(p.to); setKilometers(p.kilometers.toString()); setReturnTrip(p.returnTrip)
  }

  async function handleSavePreset() {
    if (!from || !to || !km) return
    try {
      await addPreset({ label: presetLabel || `${from} → ${to}`, from, to, kilometers: km, returnTrip })
      setSavingPreset(false); setPresetLabel('')
    } catch (err: unknown) {
      toast.error('Route opslaan mislukt', { description: errorMessage(err) })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isEdit && !session?.user.id) {
      const msg = 'Sessie nog niet geladen. Probeer het over een paar seconden opnieuw.'
      setError(msg); toast.error('Niet ingelogd', { description: msg })
      return
    }
    setError(null); setLoading(true)
    try {
      if (isEdit) {
        await travelExpensesDb.updateExpense(expense!.id, { clientId: clientId || null, date, from, to, returnTrip, kilometers: km })
      } else {
        await travelExpensesDb.createExpense({ userId: session!.user.id, clientId: clientId || null, date, from, to, returnTrip, kilometers: km })
      }
      toast.success(isEdit ? 'Rit opgeslagen' : 'Rit toegevoegd')
      onSaved(); onClose()
    } catch (err: unknown) {
      const msg = errorMessage(err)
      setError(msg)
      toast.error('Opslaan mislukt', { description: msg })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rit bewerken' : 'Rit toevoegen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {presetsLoading && presets.length === 0 && (
            <p className="text-xs text-muted-foreground">Snelle routes laden…</p>
          )}
          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Snelle routes</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="group flex items-center gap-1 bg-surface-0 border border-border-subtle rounded-lg pl-2.5 pr-1 py-1">
                    <button type="button" onClick={() => applyPreset(p)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">{p.label}</button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removePreset(p.id)
                        } catch (err: unknown) {
                          toast.error('Route verwijderen mislukt', { description: errorMessage(err) })
                        }
                      }}
                      className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                    >
                      <X size={10} />
                    </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

export function BulkExpenseModal({ dates, onClose, onSaved }: { dates: string[]; onClose: () => void; onSaved: () => void }) {
  const clients = useStore((s) => s.clients)
  const session = useAuthStore((s) => s.session)
  const { presets, loading: presetsLoading, addPreset, removePreset } = useTravelRoutePresets(session?.user.id)

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

  function applyPreset(p: { from: string; to: string; kilometers: number; returnTrip: boolean }) {
    setFrom(p.from); setTo(p.to); setKilometers(p.kilometers.toString()); setReturnTrip(p.returnTrip)
  }

  async function handleSavePreset() {
    if (!from || !to || !km) return
    try {
      await addPreset({ label: presetLabel || `${from} → ${to}`, from, to, kilometers: km, returnTrip })
      setSavingPreset(false); setPresetLabel('')
    } catch (err: unknown) {
      toast.error('Route opslaan mislukt', { description: errorMessage(err) })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user.id) {
      const msg = 'Sessie nog niet geladen. Probeer het over een paar seconden opnieuw.'
      setError(msg); toast.error('Niet ingelogd', { description: msg })
      return
    }
    setError(null); setLoading(true)
    try {
      await travelExpensesDb.createBulkExpenses({
        userId: session.user.id,
        clientId: clientId || null,
        dates,
        from,
        to,
        returnTrip,
        kilometers: km,
      })
      onSaved(); onClose()
    } catch (err: unknown) {
      const msg = errorMessage(err)
      setError(msg)
      toast.error('Opslaan mislukt', { description: msg })
    } finally { setLoading(false) }
  }

  const sorted = [...dates].sort()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="lg:max-w-md">
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
          {presetsLoading && presets.length === 0 && (
            <p className="text-xs text-muted-foreground">Snelle routes laden…</p>
          )}
          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Snelle routes</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="group flex items-center gap-1 bg-surface-0 border border-border-subtle rounded-lg pl-2.5 pr-1 py-1">
                    <button type="button" onClick={() => applyPreset(p)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">{p.label}</button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removePreset(p.id)
                        } catch (err: unknown) {
                          toast.error('Route verwijderen mislukt', { description: errorMessage(err) })
                        }
                      }}
                      className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Van → Naar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
