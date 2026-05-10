import { useState, useEffect } from 'react'
import type {
  Client,
  BillingCycle,
  ClientStatus,
  ClientType,
  ClientInvoiceStatus,
} from '../types'
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
import { format } from 'date-fns'
import { RefreshCw, FolderKanban, Receipt, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type FormData = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'nextInvoiceDate' | 'lastInvoiceDate'>

export type ClientFormPendingInvoice = {
  label: string
  amount: number
  percentage?: number
  dueDate: string
  status: ClientInvoiceStatus
}

export type ClientFormSaveData = FormData & {
  pendingInvoices?: ClientFormPendingInvoice[]
}

const defaultForm: FormData = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  notes: '',
  clientType: 'recurring',
  projectBudget: undefined,
  projectDeadline: undefined,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: undefined,
  status: 'active',
  packageType: '',
  billingCycle: '6_weeks',
  customCycleDays: undefined,
  pricePerCycle: 0,
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function TypeCard({
  selected,
  title,
  desc,
  Icon,
  onSelect,
}: {
  selected: boolean
  title: string
  desc: string
  Icon: LucideIcon
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
        selected
          ? 'border-accent-blue bg-accent-blue/10 ring-1 ring-accent-blue/40'
          : 'border-border-subtle hover:bg-white/[0.04]',
      )}
    >
      <Icon size={20} className={selected ? 'text-accent-blue' : 'text-text-muted'} />
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">{desc}</p>
      </div>
    </button>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: ClientFormSaveData) => void | Promise<void>
  initial?: Partial<Client>
  title?: string
  /** Bij wijziging van klanttype met impact op facturatie */
  onConfirmTypeChange?: (from: ClientType, to: ClientType) => Promise<boolean>
}

export function ClientForm({
  open,
  onClose,
  onSave,
  initial,
  title = 'Nieuwe klant',
  onConfirmTypeChange,
}: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initial })
  const [initialType, setInitialType] = useState<ClientType>('recurring')
  const [presetMilestones, setPresetMilestones] = useState<ClientFormPendingInvoice[]>([])
  const [oneoffDraft, setOneoffDraft] = useState<ClientFormPendingInvoice>({
    label: 'Eenmalige factuur',
    amount: 0,
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'planned',
  })

  useEffect(() => {
    if (open) {
      const merged = { ...defaultForm, ...initial }
      setForm(merged)
      setInitialType((initial?.clientType as ClientType) ?? 'recurring')
      setStep(initial?.id ? 1 : 0)
      setPresetMilestones([])
      setOneoffDraft({
        label: 'Eenmalige factuur',
        amount: merged.pricePerCycle || 0,
        dueDate: merged.startDate,
        status: 'planned',
      })
    }
  }, [open, initial])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function goNext() {
    if (step === 0) {
      setStep(1)
      return
    }
    if (step === 1) {
      if (initial?.id && form.clientType !== initialType) {
        const ok = await onConfirmTypeChange?.(initialType, form.clientType)
        if (ok === false) return
      }
      setStep(2)
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  function applyMilestonePreset(preset: '50-50' | '30-40-30') {
    const budget = form.projectBudget ?? 0
    const start = form.startDate
    const end = form.projectDeadline ?? form.startDate
    if (preset === '50-50') {
      const half = Math.round((budget * 50) / 100)
      setPresetMilestones([
        { label: 'Start (50%)', amount: half, percentage: 50, dueDate: start, status: 'planned' },
        { label: 'Oplevering (50%)', amount: budget - half, percentage: 50, dueDate: end, status: 'planned' },
      ])
    } else {
      const a = Math.round((budget * 30) / 100)
      const b = Math.round((budget * 40) / 100)
      const c = budget - a - b
      setPresetMilestones([
        { label: 'Termijn 1 (30%)', amount: a, percentage: 30, dueDate: start, status: 'planned' },
        { label: 'Termijn 2 (40%)', amount: b, percentage: 40, dueDate: start, status: 'planned' },
        { label: 'Termijn 3 (30%)', amount: c, percentage: 30, dueDate: end, status: 'planned' },
      ])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: ClientFormSaveData = { ...form }

    if (!initial?.id && form.clientType === 'project' && presetMilestones.length > 0) {
      payload.pendingInvoices = presetMilestones
    }
    if (!initial?.id && form.clientType === 'oneoff') {
      if (oneoffDraft.amount > 0 && oneoffDraft.dueDate) {
        payload.pendingInvoices = [{ ...oneoffDraft, status: 'planned' }]
      }
    }

    await onSave(payload)
  }

  const isEdit = Boolean(initial?.id)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Stap {step + 1} van 3 — {['Soort klant', 'Gegevens', 'Facturatie'][step]}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {step === 0 && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TypeCard
                selected={form.clientType === 'recurring'}
                title="Retainer / cyclus"
                desc="Vaste facturatie op vaste intervallen (social, doorlopend)."
                Icon={RefreshCw}
                onSelect={() => set('clientType', 'recurring')}
              />
              <TypeCard
                selected={form.clientType === 'project'}
                title="Project"
                desc="Website of traject met termijnen (milestones)."
                Icon={FolderKanban}
                onSelect={() => set('clientType', 'project')}
              />
              <TypeCard
                selected={form.clientType === 'oneoff'}
                title="Eenmalig"
                desc="Één factuur, bijv. losse klus of advies."
                Icon={Receipt}
                onSelect={() => set('clientType', 'oneoff')}
              />
            </section>
          )}

          {step === 1 && (
            <>
              <section>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Klantgegevens
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bedrijfsnaam *" htmlFor="companyName">
                    <Input
                      id="companyName"
                      required
                      value={form.companyName}
                      onChange={(e) => set('companyName', e.target.value)}
                      placeholder="Bloom & Co"
                    />
                  </Field>
                  <Field label="Contactpersoon" htmlFor="contactPerson">
                    <Input
                      id="contactPerson"
                      value={form.contactPerson}
                      onChange={(e) => set('contactPerson', e.target.value)}
                      placeholder="Sophie de Vries"
                    />
                  </Field>
                  <Field label="E-mail" htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="sophie@bedrijf.nl"
                    />
                  </Field>
                  <Field label="Telefoonnummer" htmlFor="phone">
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="06-12345678"
                    />
                  </Field>
                  <Field label="Adres" htmlFor="address">
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      placeholder="Keizersgracht 123, Amsterdam"
                    />
                  </Field>
                  <Field label="BTW nummer" htmlFor="vatNumber">
                    <Input
                      id="vatNumber"
                      value={form.vatNumber}
                      onChange={(e) => set('vatNumber', e.target.value)}
                      placeholder="NL123456789B01"
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Notities" htmlFor="notes">
                    <Textarea
                      id="notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                      placeholder="Interne opmerkingen..."
                      className="resize-none"
                    />
                  </Field>
                </div>
              </section>

              <Separator />

              <section>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Contract
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Startdatum *" htmlFor="startDate">
                    <Input
                      id="startDate"
                      required
                      type="date"
                      value={form.startDate}
                      onChange={(e) => set('startDate', e.target.value)}
                    />
                  </Field>
                  <Field label="Einddatum (optioneel)" htmlFor="endDate">
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate ?? ''}
                      onChange={(e) => set('endDate', e.target.value || undefined)}
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={form.status}
                      onValueChange={(v) => set('status', v as ClientStatus)}
                    >
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
                    <Input
                      id="packageType"
                      value={form.packageType}
                      onChange={(e) => set('packageType', e.target.value)}
                      placeholder="Social Media Full"
                    />
                  </Field>
                </div>
              </section>
            </>
          )}

          {step === 2 && form.clientType === 'recurring' && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Facturatie
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Facturatiecyclus">
                  <Select
                    value={form.billingCycle}
                    onValueChange={(v) => set('billingCycle', v as BillingCycle)}
                  >
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
                    <Input
                      id="customCycleDays"
                      type="number"
                      min={1}
                      value={form.customCycleDays ?? ''}
                      onChange={(e) =>
                        set('customCycleDays', parseInt(e.target.value, 10) || undefined)
                      }
                      placeholder="30"
                    />
                  </Field>
                )}
                <Field label="Prijs per cyclus (€)" htmlFor="pricePerCycle">
                  <Input
                    id="pricePerCycle"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.pricePerCycle}
                    onChange={(e) => set('pricePerCycle', parseFloat(e.target.value) || 0)}
                    placeholder="1850"
                  />
                </Field>
              </div>
            </section>
          )}

          {step === 2 && form.clientType === 'project' && (
            <section className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Project & termijnen
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Projectbudget (€) *" htmlFor="projectBudget">
                  <Input
                    id="projectBudget"
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={form.projectBudget ?? ''}
                    onChange={(e) =>
                      set('projectBudget', parseFloat(e.target.value) || undefined)
                    }
                    placeholder="15000"
                  />
                </Field>
                <Field label="Deadline / oplevering" htmlFor="projectDeadline">
                  <Input
                    id="projectDeadline"
                    type="date"
                    value={form.projectDeadline ?? ''}
                    onChange={(e) => set('projectDeadline', e.target.value || undefined)}
                  />
                </Field>
              </div>
              {!isEdit && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Snel termijnen aanmaken (optioneel)</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => applyMilestonePreset('50-50')}>
                      50% / 50%
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyMilestonePreset('30-40-30')}>
                      30% / 40% / 30%
                    </Button>
                  </div>
                  {presetMilestones.length > 0 && (
                    <ul className="text-xs text-text-secondary space-y-1 border rounded-md p-2 bg-muted/30">
                      {presetMilestones.map((m, i) => (
                        <li key={i}>
                          {m.label}: €{m.amount.toLocaleString('nl-NL')} —{' '}
                          {format(new Date(m.dueDate + 'T12:00:00'), 'd MMM yyyy')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Termijnen beheer je op de klantpagina onder het tabblad Facturatie.
                </p>
              )}
            </section>
          )}

          {step === 2 && form.clientType === 'oneoff' && (
            <section className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Eenmalige factuur
              </p>
              <Field label="Omschrijving" htmlFor="oneoffLabel">
                <Input
                  id="oneoffLabel"
                  value={oneoffDraft.label}
                  onChange={(e) => setOneoffDraft((d) => ({ ...d, label: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bedrag (€) *" htmlFor="oneoffAmount">
                  <Input
                    id="oneoffAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    required={!isEdit}
                    value={oneoffDraft.amount || ''}
                    onChange={(e) =>
                      setOneoffDraft((d) => ({
                        ...d,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </Field>
                <Field label="Vervaldatum *" htmlFor="oneoffDue">
                  <Input
                    id="oneoffDue"
                    type="date"
                    required={!isEdit}
                    value={oneoffDraft.dueDate}
                    onChange={(e) =>
                      setOneoffDraft((d) => ({ ...d, dueDate: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </section>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={goBack} className="gap-1">
                  <ChevronLeft size={14} />
                  Terug
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Annuleren
              </Button>
              {step < 2 ? (
                <Button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={step === 1 && !form.companyName.trim()}
                  className="gap-1"
                >
                  Volgende
                  <ChevronRight size={14} />
                </Button>
              ) : (
                <Button type="submit">Opslaan</Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
