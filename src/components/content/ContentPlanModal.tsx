import { useState, useMemo } from 'react'
import { format, parseISO, eachDayOfInterval, addWeeks, getDay } from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'
import { toast } from 'sonner'
import { Plus, X, Check, CalendarRange, ChevronsUpDown } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { PostType } from '../../types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
const PLAN_DAYS = [
  { label: 'Ma', day: 1 }, { label: 'Di', day: 2 }, { label: 'Wo', day: 3 },
  { label: 'Do', day: 4 }, { label: 'Vr', day: 5 }, { label: 'Za', day: 6 },
  { label: 'Zo', day: 0 },
]

const PLAN_TYPES: PostType[] = ['foto', 'video', 'reel', 'story', 'carousel']

const TYPE_LABEL: Record<PostType, string> = {
  foto: 'Foto', video: 'Video', reel: 'Reel', story: 'Story', carousel: 'Carousel',
}

const TYPE_COLOR: Record<PostType, string> = {
  foto:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  video:    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  reel:     'bg-pink-500/15 text-pink-400 border-pink-500/30',
  story:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  carousel: 'bg-green-500/15 text-green-400 border-green-500/30',
}

const WEEK_PRESETS = [
  { label: '2 weken', weeks: 2 },
  { label: '4 weken', weeks: 4 },
  { label: '6 weken', weeks: 6 },
  { label: '8 weken', weeks: 8 },
  { label: '3 maanden', weeks: 13 },
]

function ClientComboboxContent({ value, onChange, clients }: { value: string; onChange: (v: string) => void; clients: { id: string; companyName: string }[] }) {
  const [open, setOpen] = useState(false)
  const selected = clients.find(c => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm">
          {selected ? selected.companyName : <span className="text-muted-foreground">Selecteer klant...</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klant gevonden.</CommandEmpty>
            <CommandGroup>
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

function ContentDatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <DatePickerButton
      value={value || undefined}
      onChange={onChange}
      placeholder={placeholder}
      className="flex-1 rounded-md justify-start"
    />
  )
}

export function ContentPlanModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const { clients, addPostsBulk } = useStore()
  const today = new Date()

  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addWeeks(today, 6), 'yyyy-MM-dd'))
  const [selectedDays, setSelectedDays] = useState<number[]>([4]) // donderdag
  const [pattern, setPattern] = useState<PostType[]>(['foto', 'video'])
  const [loading, setLoading] = useState(false)

  function applyPreset(weeks: number) {
    setStartDate(format(today, 'yyyy-MM-dd'))
    setEndDate(format(addWeeks(today, weeks), 'yyyy-MM-dd'))
  }

  function toggleDay(day: number) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function addToPattern(type: PostType) {
    setPattern(prev => [...prev, type])
  }

  function removeFromPattern(index: number) {
    setPattern(prev => prev.filter((_, i) => i !== index))
  }

  // Compute preview: all dates in range on selected weekdays, cycling through pattern
  const preview = useMemo(() => {
    if (!startDate || !endDate || selectedDays.length === 0 || pattern.length === 0) return []
    try {
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      if (end < start) return []
      const allDays = eachDayOfInterval({ start, end })
      const matching = allDays.filter(d => selectedDays.includes(getDay(d)))
      return matching.map((date, i) => ({
        date: format(date, 'yyyy-MM-dd'),
        displayDate: format(date, 'EEE d MMM', { locale: nl }),
        type: pattern[i % pattern.length] as PostType,
      }))
    } catch { return [] }
  }, [startDate, endDate, selectedDays, pattern])

  async function handleGenerate() {
    if (!clientId || preview.length === 0) return
    setLoading(true)
    try {
      await addPostsBulk(
        preview.map(({ date, type }) => ({ clientId, type, status: 'todo' as const, caption: '', date }))
      )
      toast.success(`${preview.length} posts ingepland`)
      onGenerated()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = clientId && selectedDays.length > 0 && pattern.length > 0 && preview.length > 0

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="lg:max-w-2xl p-0 gap-0 lg:max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-row items-center gap-2 px-5 py-4 border-b border-border-subtle space-y-0">
          <CalendarRange size={15} className="text-accent-blue" />
          <DialogTitle className="text-sm font-semibold">Content plannen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left: settings */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 lg:border-r border-border-subtle">

            {/* Client */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Klant</label>
              <ClientComboboxContent value={clientId} onChange={setClientId} clients={clients} />
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Periode</label>
              <div className="flex gap-1.5 flex-wrap mb-2.5">
                {WEEK_PRESETS.map(p => (
                  <button
                    key={p.weeks}
                    onClick={() => applyPreset(p.weeks)}
                    className="px-2.5 py-1 text-xs border border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:border-zinc-600 transition-colors"
                  >
                    Komende {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <ContentDatePicker value={startDate} onChange={setStartDate} placeholder="Startdatum" />
                <span className="text-text-muted text-sm shrink-0">→</span>
                <ContentDatePicker value={endDate} onChange={setEndDate} placeholder="Einddatum" />
              </div>
            </div>

            {/* Days */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Dag(en) van de week</label>
              <div className="flex gap-1.5">
                {PLAN_DAYS.map(({ label, day }) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={clsx(
                      'w-9 h-9 rounded-lg text-xs font-medium border transition-colors',
                      selectedDays.includes(day)
                        ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                        : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-zinc-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Patroon
                <span className="ml-1.5 font-normal text-text-muted">(herhaalt automatisch)</span>
              </label>

              {/* Current sequence */}
              {pattern.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3 p-2.5 bg-surface-0 rounded-lg border border-border-subtle min-h-[44px]">
                  {pattern.map((type, i) => (
                    <span key={i} className={clsx('flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium', TYPE_COLOR[type])}>
                      {TYPE_LABEL[type]}
                      <button onClick={() => removeFromPattern(i)} className="opacity-60 hover:opacity-100 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {pattern.length > 1 && (
                    <span className="text-xs text-text-muted ml-1">↺ herhaalt</span>
                  )}
                </div>
              )}

              {/* Add type buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {PLAN_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => addToPattern(type)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      TYPE_COLOR[type],
                      'hover:opacity-80'
                    )}
                  >
                    <Plus size={10} />
                    {TYPE_LABEL[type]}
                  </button>
                ))}
                {pattern.length > 0 && (
                  <button
                    onClick={() => setPattern([])}
                    className="px-2.5 py-1.5 rounded-lg border border-border-subtle text-xs text-text-muted hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    Wissen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="lg:w-64 lg:shrink-0 flex flex-col overflow-hidden border-t lg:border-t-0 border-border-subtle max-h-[40dvh] lg:max-h-none">
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Voorbeeld
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {preview.length === 0 ? 'Geen posts' : `${preview.length} posts`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {preview.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-text-muted">
                  Stel een periode, dag en patroon in
                </div>
              ) : (
                preview.map(({ date, displayDate, type }, i) => (
                  <div key={date + i} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/[0.02]">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                    <span className="text-xs text-text-muted w-20 shrink-0 capitalize">{displayDate}</span>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded border font-medium', TYPE_COLOR[type])}>
                      {TYPE_LABEL[type]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-text-muted">
            {preview.length > 0
              ? `${preview.length} lege posts worden aangemaakt als "Te doen"`
              : 'Stel een patroon in om te beginnen'}
          </p>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">Annuleren</Button>
            <Button onClick={handleGenerate} disabled={!canGenerate || loading} className="gap-2 flex-1 sm:flex-initial">
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Genereren…</>
              ) : (
                <><CalendarRange size={14} />{preview.length > 0 ? `${preview.length} posts aanmaken` : 'Aanmaken'}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
