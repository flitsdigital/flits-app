import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Trash2 } from 'lucide-react'
import { projectsDb } from '../../lib/projectsDb'
import { errorMessage } from '../../lib/errors'
import { toast } from 'sonner'
import type { Milestone } from '../../types'

const MILESTONE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#06b6d4', '#f59e0b', '#3b82f6',
]

interface Props {
  projectId: string
  milestone?: Milestone
  onClose: () => void
  onSaved: (m: Milestone) => void
  onDeleted?: (id: string) => void
}

export function MilestoneModal({ projectId, milestone, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!milestone
  const [name, setName] = useState(milestone?.name ?? '')
  const [deadline, setDeadline] = useState(milestone?.deadline ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [color, setColor] = useState(milestone?.color ?? MILESTONE_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      const saved = await projectsDb.saveMilestone({
        id: milestone?.id,
        projectId,
        name: name.trim(),
        deadline: deadline || null,
        description: description.trim() || null,
        color,
        sortOrder: milestone?.sortOrder ?? 0,
      })
      toast.success(isEdit ? 'Milestone opgeslagen' : 'Milestone aangemaakt')
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!milestone) return
    setLoading(true)
    try {
      await projectsDb.deleteMilestone(milestone.id)
      toast.success('Milestone verwijderd')
      onDeleted?.(milestone.id)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Milestone bewerken' : 'Nieuwe milestone'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ms-name">Naam *</Label>
            <Input
              id="ms-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              placeholder="bijv. Wireframe, Design, Development..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <DatePickerButton
              value={deadline || undefined}
              onChange={v => setDeadline(v ?? '')}
              placeholder="Kies deadline"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-desc">Beschrijving</Label>
            <Input
              id="ms-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optioneel..."
            />
          </div>

          <div>
            <Label className="mb-2 block">Kleur</Label>
            <div className="flex gap-2 flex-wrap">
              {MILESTONE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isEdit && (
              deleteConfirm ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Zeker weten?</span>
                  <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300">Ja</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="text-text-muted hover:text-text-primary">Nee</button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)}
                  className="text-xs text-muted-foreground hover:text-destructive gap-1">
                  <Trash2 size={12} /> Verwijderen
                </Button>
              )
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Annuleren</Button>
              <Button type="submit" size="sm" disabled={loading || !name.trim()}>
                {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
