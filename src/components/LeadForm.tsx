import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Lead, LeadStatus } from '../types'

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Nieuw' },
  { value: 'contacted', label: 'Gecontacteerd' },
  { value: 'qualified', label: 'Gekwalificeerd' },
  { value: 'proposal', label: 'Offerte verstuurd' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
]

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Doorverwijzing' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'event', label: 'Evenement' },
  { value: 'other', label: 'Anders' },
]

type LeadInput = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>

const DEFAULT: LeadInput = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  source: '',
  status: 'new',
  assigneeId: undefined,
  estimatedValue: undefined,
  notes: '',
  lastContactedAt: undefined,
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: LeadInput) => void
  initial?: Lead
}

export function LeadForm({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<LeadInput>(DEFAULT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        companyName: initial.companyName,
        contactPerson: initial.contactPerson,
        email: initial.email,
        phone: initial.phone ?? '',
        source: initial.source ?? '',
        status: initial.status,
        assigneeId: initial.assigneeId,
        estimatedValue: initial.estimatedValue,
        notes: initial.notes ?? '',
        lastContactedAt: initial.lastContactedAt,
      } : DEFAULT)
    }
  }, [open, initial])

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Lead bewerken' : 'Nieuwe lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-company">Bedrijfsnaam *</Label>
              <Input
                id="lf-company"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="Acme B.V."
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-contact">Contactpersoon *</Label>
              <Input
                id="lf-contact"
                value={form.contactPerson}
                onChange={(e) => set('contactPerson', e.target.value)}
                placeholder="Jan de Vries"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-email">E-mail</Label>
              <Input
                id="lf-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jan@acme.nl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-phone">Telefoon</Label>
              <Input
                id="lf-phone"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+31 6 12345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Bron</Label>
              <Select value={form.source ?? ''} onValueChange={(v) => set('source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bron..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lf-value">Geschatte waarde (€)</Label>
            <Input
              id="lf-value"
              type="number"
              min={0}
              value={form.estimatedValue ?? ''}
              onChange={(e) => set('estimatedValue', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="1500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lf-notes">Notities</Label>
            <Textarea
              id="lf-notes"
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Extra context over deze lead..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Annuleren</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Opslaan...' : initial ? 'Bijwerken' : 'Lead aanmaken'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
