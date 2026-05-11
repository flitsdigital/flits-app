import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TaskStatus, TaskPriority, ProjectLabel } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import type { Sprint } from '../../lib/projectsDb'
import { UserAvatar } from '../UserAvatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  selectedCount: number
  profiles: UserProfileLite[]
  sprints: Sprint[]
  labels: ProjectLabel[]
  onSetStatus: (status: TaskStatus) => void
  onSetAssignee: (id: string | null) => void
  onSetSprint: (id: string | null) => void
  onSetPriority: (p: TaskPriority) => void
  onDelete: () => void
  onClear: () => void
  className?: string
}

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Te doen' },
  { value: 'in_progress', label: 'Bezig' },
  { value: 'in_review', label: 'Review' },
  { value: 'done', label: 'Klaar' },
]

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'Hoog' },
  { value: 'medium', label: 'Normaal' },
  { value: 'low', label: 'Laag' },
]

function BulkPopover({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function OptionRow({ label, onClick, prefix }: { label: React.ReactNode; onClick: () => void; prefix?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors text-left"
    >
      {prefix}
      {label}
    </button>
  )
}

export function BulkActionBar({
  selectedCount, profiles, sprints, labels,
  onSetStatus, onSetAssignee, onSetSprint, onSetPriority, onDelete, onClear,
  className,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-border-default shadow-modal',
      className,
    )}>
      <span className="text-xs text-text-muted mr-1">{selectedCount} geselecteerd</span>

      <BulkPopover label="Status">
        {STATUSES.map(({ value, label }) => (
          <OptionRow key={value} label={label} onClick={() => onSetStatus(value)} />
        ))}
      </BulkPopover>

      <BulkPopover label="Assignee">
        <OptionRow label="Niemand" onClick={() => onSetAssignee(null)} />
        {profiles.map((p) => (
          <OptionRow
            key={p.id}
            label={p.name ?? p.email.split('@')[0]}
            onClick={() => onSetAssignee(p.id)}
            prefix={<UserAvatar profile={p} size="w-4 h-4" textSize="text-[8px]" />}
          />
        ))}
      </BulkPopover>

      <BulkPopover label="Prioriteit">
        {PRIORITIES.map(({ value, label }) => (
          <OptionRow key={value} label={label} onClick={() => onSetPriority(value)} />
        ))}
      </BulkPopover>

      {sprints.length > 0 && (
        <BulkPopover label="Sprint">
          <OptionRow label="Geen sprint" onClick={() => onSetSprint(null)} />
          {sprints.map((s) => (
            <OptionRow key={s.id} label={s.name} onClick={() => onSetSprint(s.id)} />
          ))}
        </BulkPopover>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-text-muted hover:text-destructive gap-1"
        onClick={onDelete}
      >
        <Trash2 size={12} /> Verwijderen
      </Button>

      <button
        type="button"
        onClick={onClear}
        className="p-1 text-text-muted hover:text-text-secondary transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
