import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import type { Client, BillingCycle, ClientStatus } from '../types'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-surface-3 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-colors'

export function ClientForm({ open, onClose, onSave, initial, title = 'Nieuwe klant' }: Props) {
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initial })

  useEffect(() => {
    if (open) setForm({ ...defaultForm, ...initial })
  }, [open, initial])

  if (!open) return null

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-surface-2 rounded-xl border border-border-subtle shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle sticky top-0 bg-surface-2 z-10">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Klantgegevens */}
          <section>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Klantgegevens</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bedrijfsnaam *">
                <input required className={inputCls} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Bloom & Co" />
              </Field>
              <Field label="Contactpersoon">
                <input className={inputCls} value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Sophie de Vries" />
              </Field>
              <Field label="E-mail">
                <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="sophie@bedrijf.nl" />
              </Field>
              <Field label="Telefoonnummer">
                <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="06-12345678" />
              </Field>
              <Field label="Adres">
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Keizersgracht 123, Amsterdam" />
              </Field>
              <Field label="BTW nummer">
                <input className={inputCls} value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="NL123456789B01" />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Notities">
                <textarea className={clsx(inputCls, 'resize-none')} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Interne opmerkingen..." />
              </Field>
            </div>
          </section>

          {/* Contract */}
          <section>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum *">
                <input required type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </Field>
              <Field label="Einddatum (optioneel)">
                <input type="date" className={inputCls} value={form.endDate ?? ''} onChange={e => set('endDate', e.target.value || undefined)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value as ClientStatus)}>
                  <option value="active">Actief</option>
                  <option value="paused">Gepauzeerd</option>
                  <option value="inactive">Inactief</option>
                </select>
              </Field>
              <Field label="Pakkettype">
                <input className={inputCls} value={form.packageType} onChange={e => set('packageType', e.target.value)} placeholder="Social Media Full" />
              </Field>
            </div>
          </section>

          {/* Facturatie */}
          <section>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Facturatie</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facturatiecyclus">
                <select className={inputCls} value={form.billingCycle} onChange={e => set('billingCycle', e.target.value as BillingCycle)}>
                  <option value="6_weeks">6 weken</option>
                  <option value="4_weeks">4 weken</option>
                  <option value="monthly">Maandelijks</option>
                  <option value="custom">Aangepast</option>
                </select>
              </Field>
              {form.billingCycle === 'custom' && (
                <Field label="Aantal dagen">
                  <input type="number" min={1} className={inputCls} value={form.customCycleDays ?? ''} onChange={e => set('customCycleDays', parseInt(e.target.value))} placeholder="30" />
                </Field>
              )}
              <Field label="Prijs per cyclus (€)">
                <input type="number" min={0} step={0.01} className={inputCls} value={form.pricePerCycle} onChange={e => set('pricePerCycle', parseFloat(e.target.value))} placeholder="1850" />
              </Field>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Annuleren
            </button>
            <button type="submit" className="px-4 py-2 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              Opslaan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
