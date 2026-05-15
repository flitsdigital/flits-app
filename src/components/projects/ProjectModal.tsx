import { useState } from 'react'
import { Trash2, Euro } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions'
import clsx from 'clsx'
import { projectsDb } from '../../lib/projectsDb'
import { useStore } from '../../store/useStore'
import { errorMessage } from '../../lib/errors'
import type { Project, ProjectStatus } from '../../types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PROJECT_COLORS, PROJECT_STATUS_CONFIG } from './projectsPageConstants'
import { ProjectClientCombobox } from './projectsPageComboboxes'

export function ProjectModal({
  project,
  clientId,
  onClose,
  onSaved,
  onDeleted,
}: {
  project?: Project
  clientId?: string
  onClose: () => void
  onSaved: (p: Project) => void
  onDeleted?: (id: string) => void
}) {
  const clients = useStore((s) => s.clients)
  const isEdit = !!project
  const { can } = usePermissions()

  const [selectedClient, setSelectedClient] = useState(project?.clientId ?? clientId ?? '')
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [value, setValue] = useState(project?.value != null ? String(project.value) : '')
  const [invoicedAmount, setInvoicedAmount] = useState(project?.invoicedAmount != null ? String(project.invoicedAmount) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const parsedValue = parseFloat(value.replace(',', '.'))
      const parsedInvoiced = parseFloat(invoicedAmount.replace(',', '.'))
      const saved = await projectsDb.saveProject({
        id: project?.id,
        clientId: selectedClient || null,
        name: name.trim(),
        description: description.trim() || null,
        status,
        color,
        startDate: startDate || null,
        deadline: deadline || null,
        value: value.trim() !== '' && !isNaN(parsedValue) ? parsedValue : null,
        invoicedAmount: invoicedAmount.trim() !== '' && !isNaN(parsedInvoiced) ? parsedInvoiced : null,
      })
      toast.success(isEdit ? 'Project opgeslagen' : 'Project aangemaakt')
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setLoading(true)
    try {
      await projectsDb.deleteProject(project.id)
      toast.success('Project verwijderd')
    } catch (err: unknown) {
      setError(errorMessage(err))
      setLoading(false)
      return
    }
    onDeleted?.(project.id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Project bewerken' : 'Nieuw project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Klant <span className="text-destructive">*</span>
            </Label>
            <ProjectClientCombobox value={selectedClient} onChange={setSelectedClient} clients={clients} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-name">
              Projectnaam <span className="text-destructive">*</span>
            </Label>
            <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Bijv. Website redesign" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Omschrijving</Label>
            <Textarea
              id="proj-desc"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optionele beschrijving..."
              className="resize-none"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Status</label>
              <div className="flex gap-2">
                {(Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={clsx(
                      'flex-1 py-1.5 px-2 rounded-lg border text-xs transition-colors',
                      status === s
                        ? PROJECT_STATUS_CONFIG[s].cls
                        : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                    )}
                  >
                    {PROJECT_STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Startdatum</Label>
              <DatePickerButton value={startDate || undefined} onChange={(v) => setStartDate(v ?? '')} placeholder="Kies datum" />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <DatePickerButton value={deadline || undefined} onChange={(v) => setDeadline(v ?? '')} placeholder="Kies datum" />
            </div>
          </div>

          {/* Facturatie-sectie */}
          {can('financials') && <div className="rounded-lg border border-border-subtle bg-surface-2/60 p-3 space-y-3">
            <p className="text-xs font-medium text-text-secondary">Facturatie</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-value">Projectwaarde</Label>
                <div className="relative">
                  <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <Input
                    id="proj-value"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-invoiced">Gefactureerd</Label>
                <div className="relative">
                  <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <Input
                    id="proj-invoiced"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={invoicedAmount}
                    onChange={(e) => setInvoicedAmount(e.target.value)}
                    placeholder="0"
                    className="pl-7"
                    disabled={value.trim() === ''}
                  />
                </div>
              </div>
            </div>

            {/* Live openstaand + progress */}
            {(() => {
              const v = parseFloat(value.replace(',', '.'))
              const inv = parseFloat(invoicedAmount.replace(',', '.'))
              if (!value.trim() || isNaN(v) || v <= 0) return null
              const invoiced = !invoicedAmount.trim() || isNaN(inv) ? 0 : Math.min(inv, v)
              const open = v - invoiced
              const pct = Math.round((invoiced / v) * 100)
              const fmt = (n: number) => `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              return (
                <div className="space-y-1.5">
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-muted">
                      {fmt(invoiced)} gefactureerd ({pct}%)
                    </span>
                    <span className={open > 0 ? 'text-amber-400 font-medium' : 'text-green-400 font-medium'}>
                      {open > 0 ? `${fmt(open)} open` : 'Volledig gefactureerd'}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Kleur</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    'w-6 h-6 rounded-full transition-transform',
                    color === c && 'ring-2 ring-offset-2 ring-offset-surface-1 scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {isEdit &&
              (deleteConfirm ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Zeker?</span>
                  <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300">
                    Ja
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="text-text-muted hover:text-text-primary">
                    Nee
                  </button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} className="text-xs text-muted-foreground hover:text-destructive gap-1">
                  <Trash2 size={12} /> Verwijderen
                </Button>
              ))}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
