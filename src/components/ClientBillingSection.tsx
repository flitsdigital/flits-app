import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getInvoiceStatus,
  formatDate,
  formatWeek,
  formatWeekDate,
  getInvoiceTimeline,
  getPastInvoiceDates,
} from '@/lib/billing'
import { invoicesForClient, getOpenInvoiceAmount, getProjectInvoiceProgress } from '@/lib/clientStats'
import { InvoiceBadge } from '@/components/InvoiceBadge'
import { useStore } from '@/store/useStore'
import type { Client, ClientInvoice, ClientInvoiceStatus } from '@/types'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { MilestoneModal } from '@/components/MilestoneModal'

function invoiceStatusLabel(s: ClientInvoiceStatus): string {
  const m: Record<ClientInvoiceStatus, string> = {
    planned: 'Gepland',
    sent: 'Verzonden',
    paid: 'Betaald',
    overdue: 'Achterstallig',
  }
  return m[s]
}

export function ClientBillingSection({ client }: { client: Client }) {
  const clientInvoices = useStore((s) => s.clientInvoices)
  const addClientInvoice = useStore((s) => s.addClientInvoice)
  const updateClientInvoice = useStore((s) => s.updateClientInvoice)
  const deleteClientInvoice = useStore((s) => s.deleteClientInvoice)
  const updateClient = useStore((s) => s.updateClient)
  const toggleInvoiced = useStore((s) => s.toggleInvoiced)

  const [milestoneOpen, setMilestoneOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<ClientInvoice | null>(null)
  const [splitConfirm, setSplitConfirm] = useState(false)

  const invs = invoicesForClient(clientInvoices, client.id)
  const ct = client.clientType ?? 'recurring'

  const next = client.nextInvoiceDate ? new Date(client.nextInvoiceDate + 'T12:00:00') : null
  const invoiceStatus = next ? getInvoiceStatus(next) : 'ok'
  const futureDates = getInvoiceTimeline(client, 52).filter((d) => d >= new Date())
  const pastDates = getPastInvoiceDates(client)

  async function applyPreset(preset: '50-50' | '30-40-30') {
    const budget = client.projectBudget ?? 0
    if (budget <= 0) {
      toast.error('Stel eerst een projectbudget in (klant bewerken).')
      return
    }
    const start = client.startDate
    const end = client.projectDeadline ?? client.startDate
    if (preset === '50-50') {
      const half = Math.round((budget * 50) / 100)
      await addClientInvoice({
        clientId: client.id,
        label: 'Start (50%)',
        amount: half,
        percentage: 50,
        dueDate: start,
        status: 'planned',
      })
      await addClientInvoice({
        clientId: client.id,
        label: 'Oplevering (50%)',
        amount: budget - half,
        percentage: 50,
        dueDate: end,
        status: 'planned',
      })
    } else {
      const a = Math.round((budget * 30) / 100)
      const b = Math.round((budget * 40) / 100)
      const c = budget - a - b
      await addClientInvoice({
        clientId: client.id,
        label: 'Termijn 1 (30%)',
        amount: a,
        percentage: 30,
        dueDate: start,
        status: 'planned',
      })
      await addClientInvoice({
        clientId: client.id,
        label: 'Termijn 2 (40%)',
        amount: b,
        percentage: 40,
        dueDate: start,
        status: 'planned',
      })
      await addClientInvoice({
        clientId: client.id,
        label: 'Termijn 3 (30%)',
        amount: c,
        percentage: 30,
        dueDate: end,
        status: 'planned',
      })
    }
    toast.success('Termijnen toegevoegd')
  }

  async function splitOneoffToProject() {
    const row = invs[0]
    if (!row) return
    await updateClient(client.id, {
      clientType: 'project',
      projectBudget: row.amount,
      projectDeadline: row.dueDate,
    })
    setSplitConfirm(false)
    toast.success('Omgezet naar project — voeg extra termijnen toe indien nodig.')
  }

  if (ct === 'recurring') {
    return (
      <div className="space-y-5">
        {client.status === 'active' && (
          <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Facturatie
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-3 rounded-lg p-3.5">
                <p className="text-xs text-text-muted mb-1">Vorige factuur</p>
                <p className="text-sm font-medium text-text-primary">{formatWeek(client.lastInvoiceDate)}</p>
                <p className="text-xs text-text-muted mt-0.5">{formatWeekDate(client.lastInvoiceDate)}</p>
              </div>
              <div className="bg-surface-3 rounded-lg p-3.5">
                <p className="text-xs text-text-muted mb-1">Volgende factuur</p>
                <p className="text-sm font-medium text-text-primary">{formatWeek(client.nextInvoiceDate)}</p>
                <p className="text-xs text-text-muted mt-0.5">{formatWeekDate(client.nextInvoiceDate)}</p>
                <div className="mt-1.5">
                  <InvoiceBadge status={invoiceStatus} />
                </div>
              </div>
              <div className="bg-surface-3 rounded-lg p-3.5">
                <p className="text-xs text-text-muted mb-1">Prijs per cyclus</p>
                <p className="text-sm font-medium text-text-primary">
                  €{client.pricePerCycle.toLocaleString('nl-NL')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Aankomende factuurmomenten
          </h2>
          <div className="flex flex-wrap gap-2">
            {futureDates.map((date, i) => {
              const status = getInvoiceStatus(date)
              return (
                <div
                  key={i}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    status === 'overdue'
                      ? 'bg-red-500/15 text-red-400 border-red-500/25'
                      : status === 'this_week'
                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                        : status === 'upcoming'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                          : 'bg-surface-3 text-text-secondary border-border-subtle'
                  }`}
                  title={formatDate(date.toISOString())}
                >
                  <span className="text-xs font-semibold">{formatWeek(date)}</span>
                  <span className="text-xs opacity-60 ml-1">{formatWeekDate(date)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {pastDates.length > 0 && (
          <Accordion type="single" collapsible className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
            <AccordionItem value="history" className="border-none">
              <AccordionTrigger className="px-4 py-2.5 text-left hover:no-underline hover:bg-white/[0.03] [&>svg]:text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Vorige factuurmomenten
                  </span>
                  <span className="text-xs text-text-muted bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded-md">
                    {pastDates.filter((d) => {
                      const key = format(d, 'yyyy-MM-dd')
                      return client.invoiceRecords?.find((r) => r.date === key)?.invoiced
                    }).length}
                    /{pastDates.length} gefactureerd
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="border-t border-border-subtle divide-y divide-border-subtle">
                  {pastDates.map((date, i) => {
                    const key = format(date, 'yyyy-MM-dd')
                    const record = client.invoiceRecords?.find((r) => r.date === key)
                    const invoiced = record?.invoiced ?? false
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleInvoiced(client.id, key)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${invoiced ? 'bg-green-500 border-green-500 text-white' : 'border-border-default hover:border-zinc-400 bg-transparent'}`}
                          >
                            {invoiced && <Check size={11} strokeWidth={3} />}
                          </button>
                          <div>
                            <span className="text-sm font-medium text-text-primary">{formatWeek(date)}</span>
                            <span className="text-xs text-text-muted ml-2">{formatDate(key)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-text-secondary">
                            €{client.pricePerCycle.toLocaleString('nl-NL')}
                          </span>
                          {invoiced ? (
                            <span className="text-xs text-green-400 font-medium">Gefactureerd</span>
                          ) : (
                            <span className="text-xs text-text-muted">Niet gefactureerd</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    )
  }

  if (ct === 'oneoff') {
    const row = invs[0]
    const open = row && row.status !== 'paid' ? getOpenInvoiceAmount(invs) : 0
    return (
      <div className="space-y-4">
        {!row ? (
          <p className="text-sm text-text-muted">Nog geen factuur. Voeg er een toe via Bewerken of hieronder.</p>
        ) : (
          <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Eenmalige factuur
                </h2>
                <p className="text-lg font-semibold text-text-primary">{row.label}</p>
                <p className="text-sm text-text-secondary mt-1">
                  €{row.amount.toLocaleString('nl-NL')} — vervalt {formatDate(row.dueDate)}
                </p>
                <p className="text-xs text-text-muted mt-2">{invoiceStatusLabel(row.status)}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {row.status === 'planned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => updateClientInvoice(row.id, { status: 'sent', sentAt: new Date().toISOString() })}
                  >
                    Markeer verzonden
                  </Button>
                )}
                {(row.status === 'planned' || row.status === 'sent' || row.status === 'overdue') && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      updateClientInvoice(row.id, {
                        status: 'paid',
                        paidAt: new Date().toISOString(),
                      })
                    }
                  >
                    Markeer betaald
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => {
                    setEditingInvoice(row)
                    setMilestoneOpen(true)
                  }}
                >
                  <Pencil size={12} className="mr-1" />
                  Bewerken
                </Button>
              </div>
            </div>
            {open > 0 && (
              <Button variant="link" className="text-xs h-auto p-0 mt-4" onClick={() => setSplitConfirm(true)}>
                Splits in termijnen (omzetten naar project)
              </Button>
            )}
          </div>
        )}

        {!row && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              setEditingInvoice(null)
              setMilestoneOpen(true)
            }}
          >
            <Plus size={14} />
            Factuur toevoegen
          </Button>
        )}

        <MilestoneModal
          open={milestoneOpen}
          onClose={() => {
            setMilestoneOpen(false)
            setEditingInvoice(null)
          }}
          clientId={client.id}
          initial={editingInvoice ?? row ?? undefined}
          budget={client.projectBudget}
          onSaved={() => {
            setMilestoneOpen(false)
            setEditingInvoice(null)
            toast.success('Opgeslagen')
          }}
        />

        <Dialog open={splitConfirm} onOpenChange={(v) => !v && setSplitConfirm(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Omzetten naar project?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              De klant wordt een projectklant met hetzelfde budget en deadline. Je kunt daarna extra termijnen
              toevoegen.
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSplitConfirm(false)}>
                Annuleren
              </Button>
              <Button className="flex-1" onClick={() => void splitOneoffToProject()}>
                Bevestigen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const progress = getProjectInvoiceProgress(client, invs)
  const openTotal = getOpenInvoiceAmount(invs)

  return (
    <div className="space-y-5">
      <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Voortgang</h2>
          <span className="text-xs text-text-muted">
            €{progress.paid.toLocaleString('nl-NL')} / €{progress.total.toLocaleString('nl-NL')} ({progress.pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full bg-green-500/80 transition-all"
            style={{ width: `${Math.min(100, progress.pct)}%` }}
          />
        </div>
        {client.projectDeadline && (
          <p className="text-xs text-text-muted mt-2">
            Deadline: {format(new Date(client.projectDeadline + 'T12:00:00'), 'd MMMM yyyy', { locale: nl })}
          </p>
        )}
        <p className="text-xs text-text-muted mt-1">Openstaand: €{openTotal.toLocaleString('nl-NL')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void applyPreset('50-50')}>
          Preset 50/50
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void applyPreset('30-40-30')}>
          Preset 30/40/30
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1"
          onClick={() => {
            setEditingInvoice(null)
            setMilestoneOpen(true)
          }}
        >
          <Plus size={14} />
          Termijn
        </Button>
      </div>

      <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-4 py-2 border-b border-border-subtle text-xs font-medium text-text-muted">
          <span>Label</span>
          <span>Bedrag</span>
          <span>Vervaldatum</span>
          <span>Status</span>
          <span />
        </div>
        <div className="divide-y divide-border-subtle">
          {invs.length === 0 && (
            <div className="px-4 py-6 text-xs text-text-muted text-center">Nog geen termijnen.</div>
          )}
          {invs.map((inv) => (
            <div
              key={inv.id}
              className="grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-4 py-2.5 items-center text-sm"
            >
              <span className="text-text-primary font-medium truncate">{inv.label}</span>
              <span>€{inv.amount.toLocaleString('nl-NL')}</span>
              <span className="text-text-muted text-xs">{formatDate(inv.dueDate)}</span>
              <span className="text-xs">{invoiceStatusLabel(inv.status)}</span>
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditingInvoice(inv)
                    setMilestoneOpen(true)
                  }}
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => void deleteClientInvoice(inv.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MilestoneModal
        open={milestoneOpen}
        onClose={() => {
          setMilestoneOpen(false)
          setEditingInvoice(null)
        }}
        clientId={client.id}
        initial={editingInvoice ?? undefined}
        budget={client.projectBudget}
        onSaved={() => {
          setMilestoneOpen(false)
          setEditingInvoice(null)
          toast.success('Opgeslagen')
        }}
      />
    </div>
  )
}
