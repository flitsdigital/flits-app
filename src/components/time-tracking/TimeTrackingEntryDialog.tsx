import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { TimeEntry, TimeTag } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { isoToLocalDate, isoToLocalTime, localToISO } from './timeTrackingHelpers'
import { ClientCombobox, TagSelector } from './TimeTrackingTagUI'

export function TimeTrackingEntryDialog({
  open,
  onClose,
  onSave,
  initial,
  prefilledDate,
  prefilledStart,
  prefilledEnd,
  clients,
  tags,
  onManageTags,
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
  const [date, setDate] = useState(initial ? isoToLocalDate(initial.startedAt) : prefilledDate ?? today)
  const [startTime, setStartTime] = useState(initial ? isoToLocalTime(initial.startedAt) : prefilledStart ?? nowStr)
  const [endTime, setEndTime] = useState(
    initial?.endedAt ? isoToLocalTime(initial.endedAt) : prefilledEnd ?? format(new Date(Date.now() + 30 * 60_000), 'HH:mm'),
  )
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initial) {
      if (prefilledDate) setDate(prefilledDate)
      if (prefilledStart) setStartTime(prefilledStart)
      if (prefilledEnd) setEndTime(prefilledEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync drag-to-create prefills only
  }, [prefilledDate, prefilledStart, prefilledEnd])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !startTime) {
      toast.error('Vul datum en starttijd in')
      return
    }
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
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuleren
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Opslaan…' : 'Opslaan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
