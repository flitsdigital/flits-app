import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskPriority, TaskStatus, ProjectLabel } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import type { Sprint } from '../../lib/projectsDb'
import { UserAvatar } from '../UserAvatar'

export interface TaskFilters {
  assigneeIds: string[]
  priorities: TaskPriority[]
  labelIds: string[]
  sprintId: string | 'all' | '__none__'
  status: TaskStatus | 'all'
}

export const EMPTY_FILTERS: TaskFilters = {
  assigneeIds: [],
  priorities: [],
  labelIds: [],
  sprintId: 'all',
  status: 'all',
}

export function hasActiveFilters(f: TaskFilters) {
  return f.assigneeIds.length > 0 || f.priorities.length > 0 || f.labelIds.length > 0 || f.sprintId !== 'all' || f.status !== 'all'
}

interface Props {
  filters: TaskFilters
  onChange: (f: TaskFilters) => void
  profiles: UserProfileLite[]
  labels: ProjectLabel[]
  sprints: Sprint[]
  className?: string
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'Hoog' },
  { value: 'medium', label: 'Normaal' },
  { value: 'low', label: 'Laag' },
]

function FilterChip({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border',
        active
          ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
          : 'bg-surface-2 border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-default',
      )}
    >
      {label}
    </button>
  )
}

export function FilterBar({ filters, onChange, profiles, labels, sprints, className }: Props) {
  const active = hasActiveFilters(filters)

  function toggleAssignee(id: string) {
    const ids = filters.assigneeIds.includes(id)
      ? filters.assigneeIds.filter((a) => a !== id)
      : [...filters.assigneeIds, id]
    onChange({ ...filters, assigneeIds: ids })
  }

  function togglePriority(p: TaskPriority) {
    const ps = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    onChange({ ...filters, priorities: ps })
  }

  function toggleLabel(id: string) {
    const ids = filters.labelIds.includes(id)
      ? filters.labelIds.filter((x) => x !== id)
      : [...filters.labelIds, id]
    onChange({ ...filters, labelIds: ids })
  }

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {/* Assignees */}
      {profiles.map((p) => (
        <FilterChip
          key={p.id}
          active={filters.assigneeIds.includes(p.id)}
          onClick={() => toggleAssignee(p.id)}
          label={
            <span className="flex items-center gap-1">
              <UserAvatar profile={p} size="w-3.5 h-3.5" textSize="text-[7px]" />
              {p.name ?? p.email.split('@')[0]}
            </span>
          }
        />
      ))}

      {profiles.length > 0 && (PRIORITY_OPTIONS.length > 0 || labels.length > 0 || sprints.length > 0) && (
        <span className="text-border-default">·</span>
      )}

      {/* Priorities */}
      {PRIORITY_OPTIONS.map(({ value, label }) => (
        <FilterChip
          key={value}
          active={filters.priorities.includes(value)}
          onClick={() => togglePriority(value)}
          label={label}
        />
      ))}

      {/* Labels */}
      {labels.map((l) => (
        <FilterChip
          key={l.id}
          active={filters.labelIds.includes(l.id)}
          onClick={() => toggleLabel(l.id)}
          label={
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              {l.name}
            </span>
          }
        />
      ))}

      {/* Sprints */}
      {sprints.length > 0 && (
        <>
          <FilterChip
            active={filters.sprintId === '__none__'}
            onClick={() => onChange({ ...filters, sprintId: filters.sprintId === '__none__' ? 'all' : '__none__' })}
            label="Geen sprint"
          />
          {sprints.map((s) => (
            <FilterChip
              key={s.id}
              active={filters.sprintId === s.id}
              onClick={() => onChange({ ...filters, sprintId: filters.sprintId === s.id ? 'all' : s.id })}
              label={s.name}
            />
          ))}
        </>
      )}

      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-red-400 transition-colors"
        >
          <X size={11} /> Wis filters
        </button>
      )}
    </div>
  )
}
