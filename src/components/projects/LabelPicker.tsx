import { Check, Plus, X, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ProjectLabel } from '../../types'
import { ColorPicker } from '../ColorPicker'
import { LabelBadge } from './LabelBadge'

interface Props {
  labels: ProjectLabel[]
  selected: string[]
  onChange: (ids: string[]) => void
  onCreateLabel?: (name: string, color: string) => Promise<ProjectLabel>
  onDeleteLabel?: (id: string) => void
  className?: string
}

export function LabelPicker({ labels, selected, onChange, onCreateLabel, onDeleteLabel, className }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  async function handleCreate() {
    if (!newName.trim() || !onCreateLabel) return
    const label = await onCreateLabel(newName.trim(), newColor)
    onChange([...selected, label.id])
    setNewName('')
    setNewColor('#6366f1')
    setCreating(false)
  }

  const selectedLabels = labels.filter((l) => selected.includes(l.id))

  return (
    <div className={cn('flex flex-wrap gap-1 items-center', className)}>
      {selectedLabels.map((l) => (
        <LabelBadge key={l.id} label={l} />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-text-muted border border-dashed border-border-strong hover:border-border-strong hover:text-text-secondary transition-colors"
          >
            <Plus size={9} />
            {selected.length === 0 ? 'Label' : ''}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="space-y-0.5">
            {labels.map((l) => (
              <div key={l.id} className="flex items-center group">
                <button
                  type="button"
                  onClick={() => toggle(l.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] transition-colors text-left"
                >
                  <Check size={12} className={cn('shrink-0', selected.includes(l.id) ? 'opacity-100 text-accent-blue' : 'opacity-0')} />
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-text-primary">{l.name}</span>
                </button>
                {onDeleteLabel && (
                  <button
                    type="button"
                    onClick={() => onDeleteLabel(l.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {onCreateLabel && (
            creating ? (
              <div className="mt-2 pt-2 border-t border-border-subtle space-y-2">
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Labelnaam"
                  className="h-7 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                />
                <ColorPicker value={newColor} onChange={setNewColor} />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-xs flex-1" onClick={handleCreate} disabled={!newName.trim()}>Aanmaken</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setCreating(false)}>Annuleer</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full mt-2 pt-2 border-t border-border-subtle flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                <Plus size={11} /> Nieuw label
              </button>
            )
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
