import { useState, useEffect } from 'react'
import type { Client, BillingCycle, ClientStatus } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FormData = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'nextInvoiceDate' | 'lastInvoiceDate'>

const defaultForm: FormData = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  notes: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: undefined,
  status: 'active',
  packageType: '',
  billingCycle: '6_weeks',
  customCycleDays: undefined,
  pricePerCycle: 0,
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => void
  initial?: Partial<Client>
  title?: string
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function ClientForm({ open, onClose, onSave, initial, title = 'Nieuwe klant' }: Props) {
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initial })

  useEffect(() => {
    if (open) setForm({ ...defaultForm, ...initial })
  }, [open, initial])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Klantgegevens */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Klantgegevens</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bedrijfsnaam *" htmlFor="companyName">
                <Input id="companyName" required value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Bloom & Co" />
              </Field>
              <Field label="Contactpersoon" htmlFor="contactPerson">
                <Input id="contactPerson" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Sophie de Vries" />
              </Field>
              <Field label="E-mail" htmlFor="email">
                <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="sophie@bedrijf.nl" />
              </Field>
              <Field label="Telefoonnummer" htmlFor="phone">
                <Input id="phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="06-12345678" />
              </Field>
              <Field label="Adres" htmlFor="address">
                <Input id="address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Keizersgracht 123, Amsterdam" />
              </Field>
              <Field label="BTW nummer" htmlFor="vatNumber">
                <Input id="vatNumber" value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="NL123456789B01" />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Notities" htmlFor="notes">
                <Textarea id="notes" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Interne opmerkingen..." className="resize-none" />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Contract */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum *" htmlFor="startDate">
                <Input id="startDate" required type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </Field>
              <Field label="Einddatum (optioneel)" htmlFor="endDate">
                <Input id="endDate" type="date" value={form.endDate ?? ''} onChange={e => set('endDate', e.target.value || undefined)} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set('status', v as ClientStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="paused">Gepauzeerd</SelectItem>
                    <SelectItem value="inactive">Inactief</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pakkettype" htmlFor="packageType">
                <Input id="packageType" value={form.packageType} onChange={e => set('packageType', e.target.value)} placeholder="Social Media Full" />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Facturatie */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Facturatie</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facturatiecyclus">
                <Select value={form.billingCycle} onValueChange={(v) => set('billingCycle', v as BillingCycle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6_weeks">6 weken</SelectItem>
                    <SelectItem value="4_weeks">4 weken</SelectItem>
                    <SelectItem value="monthly">Maandelijks</SelectItem>
                    <SelectItem value="custom">Aangepast</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.billingCycle === 'custom' && (
                <Field label="Aantal dagen" htmlFor="customCycleDays">
                  <Input id="customCycleDays" type="number" min={1} value={form.customCycleDays ?? ''} onChange={e => set('customCycleDays', parseInt(e.target.value))} placeholder="30" />
                </Field>
              )}
              <Field label="Prijs per cyclus (€)" htmlFor="pricePerCycle">
                <Input id="pricePerCycle" type="number" min={0} step={0.01} value={form.pricePerCycle} onChange={e => set('pricePerCycle', parseFloat(e.target.value))} placeholder="1850" />
              </Field>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuleren</Button>
            <Button type="submit">Opslaan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
