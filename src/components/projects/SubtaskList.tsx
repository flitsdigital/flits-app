import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Subtask } from '../../types'

interface Props {
  subtasks: Subtask[]
  newSubtask: string
  onNewSubtaskChange: (v: string) => void
  onAddSubtask: () => void
  onToggle: (subtask: Subtask) => void
  onDelete: (id: string) => void
  className?: string
}

export function SubtaskList({ subtasks, newSubtask, onNewSubtaskChange, onAddSubtask, onToggle, onDelete, className }: Props) {
  const doneCount = subtasks.filter((s) => s.done).length

  return (
    <div className={cn('space-y-1', className)}>
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-blue/60 rounded-full transition-all"
              style={{ width: `${Math.round((doneCount / subtasks.length) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted shrink-0">{doneCount}/{subtasks.length}</span>
        </div>
      )}

      {subtasks.map((s) => (
        <div key={s.id} className="flex items-center gap-2 group">
          <input
            type="checkbox"
            checked={s.done}
            onChange={() => onToggle(s)}
            className="w-3.5 h-3.5 rounded border-border-default bg-surface-3 accent-accent-blue cursor-pointer shrink-0"
          />
          <span className={cn('flex-1 text-xs leading-relaxed', s.done && 'line-through text-text-muted')}>
            {s.title}
          </span>
          <button
            type="button"
            onClick={() => onDelete(s.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-red-400 transition-all"
          >
            <X size={11} />
          </button>
        </div>
      ))}

      <input
        type="text"
        value={newSubtask}
        onChange={(e) => onNewSubtaskChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && newSubtask.trim()) onAddSubtask() }}
        placeholder="+ Subtaak toevoegen"
        className="w-full text-xs bg-transparent text-text-muted placeholder-text-muted/60 focus:text-text-primary focus:outline-none py-0.5"
      />
    </div>
  )
}
