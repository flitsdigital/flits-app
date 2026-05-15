import { Check, Flag } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import { UserAvatar } from '../UserAvatar'
import { PRIORITY_CONFIG } from './projectsPageConstants'

export function TaskCard({
  task,
  profiles,
  onClick,
  isDragging,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  task: Task
  profiles: UserProfileLite[]
  onClick: () => void
  isDragging: boolean
  isSelected?: boolean
  onSelect?: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const assignee = profiles.find((p) => p.id === task.assigneeId)
  const prio = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        'bg-surface-0 border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-zinc-500 hover:shadow-lg hover:shadow-black/20 transition-all group border-l-[3px] select-none relative',
        prio.border,
        isDragging && 'opacity-40 scale-[0.98]',
        isSelected && 'border-accent-blue/50 bg-accent-blue/[0.04]'
      )}
    >
      {onSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className={clsx(
            'absolute top-2 right-2 w-4 h-4 rounded border transition-all',
            isSelected
              ? 'bg-accent-blue border-accent-blue flex items-center justify-center'
              : 'border-zinc-600 bg-transparent opacity-0 group-hover:opacity-100'
          )}
        >
          {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
      )}

      <p className="text-sm text-text-primary leading-snug group-hover:text-white transition-colors mb-2 pr-5">{task.title}</p>

      {task.description && <p className="text-xs text-text-muted mb-2 line-clamp-2 leading-relaxed">{task.description}</p>}

      <div className="flex items-center gap-1.5">
        {task.priority !== 'medium' && (
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium', prio.flagColor)}>
            <Flag size={9} />
            {prio.label}
          </span>
        )}
        {task.dueDate && (
          <span
            className={clsx(
              'text-xs px-1.5 py-0.5 rounded',
              isOverdue ? 'text-red-400 bg-red-500/10' : 'text-text-muted bg-white/[0.04]'
            )}
          >
            {new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {assignee && <UserAvatar profile={assignee} size="w-5 h-5 ml-auto" textSize="text-[8px]" />}
      </div>
    </div>
  )
}
