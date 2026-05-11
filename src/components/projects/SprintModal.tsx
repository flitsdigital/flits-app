import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { projectsDb, type Sprint, type SprintStatus } from '../../lib/projectsDb'

interface Props {
  open: boolean
  projectId: string
  sprint?: Sprint | null
  onSave: (sprint: Sprint) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const STATUS_LABELS: Record<SprintStatus, string> = {
  planned: 'Gepland',
  active: 'Actief',
  closed: 'Gesloten',
}

export function SprintModal({ open, projectId, sprint, onSave, onDelete, onClose }: Props) {
  const isEdit = !!sprint
  const [name, setName] = useState(sprint?.name ?? '')
  const [startDate, setStartDate] = useState(sprint?.startDate ?? '')
  const [endDate, setEndDate] = useState(sprint?.endDate ?? '')
  const [status, setStatus] = useState<SprintStatus>(sprint?.status ?? 'planned')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const saved = await projectsDb.saveSprint({
        id: sprint?.id,
        projectId,
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        status,
      })
      onSave(saved)
      toast.success(isEdit ? 'Sprint bijgewerkt' : 'Sprint aangemaakt')
      onClose()
    } catch (err) {
      toast.error('Mislukt', { description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!sprint) return
    setLoading(true)
    try {
      await projectsDb.deleteSprint(sprint.id)
      onDelete?.(sprint.id)
      toast.success('Sprint verwijderd')
      onClose()
    } catch (err) {
      toast.error('Mislukt', { description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  async function activateSprint() {
    if (!sprint) return
    setLoading(true)
    try {
      const saved = await projectsDb.saveSprint({ ...sprint, status: 'active' })
      onSave(saved)
      toast.success('Sprint gestart')
      onClose()
    } catch (err) {
      toast.error('Mislukt', { description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sprint bewerken' : 'Nieuwe sprint'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sprint-name">Naam</Label>
            <Input
              id="sprint-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Sprint 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sprint-start">Startdatum</Label>
              <Input id="sprint-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sprint-end">Einddatum</Label>
              <Input id="sprint-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex gap-1.5">
                {(['planned', 'active', 'closed'] as SprintStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded text-xs transition-colors ${status === s ? 'bg-accent-blue text-white' : 'bg-surface-3 text-text-secondary hover:bg-surface-4'}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              {isEdit && sprint?.status === 'planned' && (
                <Button type="button" variant="outline" size="sm" onClick={activateSprint} disabled={loading}>
                  <Zap size={13} /> Sprint starten
                </Button>
              )}
              {isEdit && (
                deleteConfirm ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Zeker?</span>
                    <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300">Ja</button>
                    <button type="button" onClick={() => setDeleteConfirm(false)} className="text-text-muted">Nee</button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-destructive" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 size={14} />
                  </Button>
                )
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuleer</Button>
              <Button type="submit" size="sm" disabled={loading || !name.trim()}>
                {isEdit ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
