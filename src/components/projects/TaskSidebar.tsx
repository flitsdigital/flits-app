import { Circle, CircleDot, Eye, CheckCircle2, Flag, Calendar, User, Zap, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { PillDropdown } from '@/components/ui/pill-dropdown'
import type { Task, TaskStatus, TaskPriority, ProjectLabel } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import type { Sprint } from '../../lib/projectsDb'
import { UserAvatar } from '../UserAvatar'
import { LabelPicker } from './LabelPicker'
import { projectsDb } from '../../lib/projectsDb'

// ── Status config ──────────────────────────────────────────────────────────────

export const TASK_STATUSES: { id: TaskStatus; label: string; Icon: React.ElementType; color: string }[] = [
  { id: 'todo',        label: 'Te doen', Icon: Circle,       color: 'text-zinc-400' },
  { id: 'in_progress', label: 'Bezig',   Icon: CircleDot,    color: 'text-blue-400' },
  { id: 'in_review',   label: 'Review',  Icon: Eye,          color: 'text-purple-400' },
  { id: 'done',        label: 'Klaar',   Icon: CheckCircle2, color: 'text-green-400' },
]

export const TASK_PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'urgent', label: 'Urgent',  color: 'text-red-400' },
  { id: 'high',   label: 'Hoog',    color: 'text-orange-400' },
  { id: 'medium', label: 'Normaal', color: 'text-blue-400' },
  { id: 'low',    label: 'Laag',    color: 'text-zinc-400' },
]

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  task: Partial<Task>
  profiles: UserProfileLite[]
  labels: ProjectLabel[]
  sprints: Sprint[]
  onStatusChange: (s: TaskStatus) => void
  onPriorityChange: (p: TaskPriority) => void
  onAssigneeChange: (id: string | null) => void
  onDueDateChange: (d: string | null) => void
  onSprintChange: (id: string | null) => void
  onLabelsChange: (ids: string[]) => void
  onCreateLabel?: (name: string, color: string) => Promise<ProjectLabel>
  onDeleteLabel?: (id: string) => void
  createdAt?: string
  updatedAt?: string
  /** Compact mode for use inside modals (pill-bar style) */
  compact?: boolean
}

// ── Row helper ─────────────────────────────────────────────────────────────────

function SidebarRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border-subtle/50 last:border-0">
      <Icon size={13} className="text-text-muted shrink-0 mt-0.5" strokeWidth={1.8} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

// ── TaskSidebar ────────────────────────────────────────────────────────────────

export function TaskSidebar({
  task, profiles, labels, sprints,
  onStatusChange, onPriorityChange, onAssigneeChange, onDueDateChange, onSprintChange, onLabelsChange,
  onCreateLabel, onDeleteLabel,
  createdAt, updatedAt, compact = false,
}: Props) {
  const statusCfg = TASK_STATUSES.find((s) => s.id === task.status) ?? TASK_STATUSES[0]
  const priorityCfg = TASK_PRIORITIES.find((p) => p.id === task.priority) ?? TASK_PRIORITIES[2]
  const assignee = profiles.find((p) => p.id === task.assigneeId)
  const sprint = sprints.find((s) => s.id === task.sprintId)

  if (compact) {
    // Pill-bar mode: all in one row (for TaskModal)
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <PillDropdown<TaskStatus>
          options={TASK_STATUSES.map((s) => s.id)}
          value={task.status ?? 'todo'}
          onChange={onStatusChange}
          renderLabel={() => {
            const s = TASK_STATUSES.find((x) => x.id === task.status) ?? TASK_STATUSES[0]
            return <><s.Icon size={12} className={cn('shrink-0', s.color)} /><span>{s.label}</span></>
          }}
          renderOption={(v) => {
            const s = TASK_STATUSES.find((x) => x.id === v) ?? TASK_STATUSES[0]
            return <><s.Icon size={12} className={cn('shrink-0', s.color)} /><span>{s.label}</span></>
          }}
        />
        <PillDropdown<TaskPriority>
          options={TASK_PRIORITIES.map((p) => p.id)}
          value={task.priority ?? 'medium'}
          onChange={onPriorityChange}
          renderLabel={() => <><Flag size={11} className={cn('shrink-0', priorityCfg.color)} /><span className={priorityCfg.color}>{priorityCfg.label}</span></>}
          renderOption={(v) => {
            const p = TASK_PRIORITIES.find((x) => x.id === v) ?? TASK_PRIORITIES[2]
            return <><Flag size={11} /><span>{p.label}</span></>
          }}
        />
        <PillDropdown<string>
          options={['__none__', ...profiles.map((p) => p.id)]}
          value={task.assigneeId || '__none__'}
          onChange={(v) => onAssigneeChange(v === '__none__' ? null : v)}
          renderLabel={() => assignee
            ? <><UserAvatar profile={assignee} size="w-3.5 h-3.5" textSize="text-[7px]" /><span>{assignee.name ?? assignee.email.split('@')[0]}</span></>
            : <><div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-600" /><span className="text-zinc-500">Niemand</span></>
          }
          renderOption={(id) => {
            if (id === '__none__') return <><div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-600" /><span>Niemand</span></>
            const p = profiles.find((x) => x.id === id)!
            return <><UserAvatar profile={p} size="w-3.5 h-3.5" textSize="text-[7px]" /><span>{p.name ?? p.email.split('@')[0]}</span></>
          }}
        />
        {/* Due date */}
        <div className="relative">
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={(e) => onDueDateChange(e.target.value || null)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
          <span className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md border text-xs cursor-pointer select-none',
            task.dueDate ? 'border-border-subtle text-text-secondary bg-surface-2' : 'border-dashed border-border-strong text-text-muted bg-transparent',
          )}>
            <Calendar size={11} />
            {task.dueDate
              ? format(new Date(task.dueDate), 'd MMM', { locale: nl })
              : 'Datum'}
          </span>
        </div>
        {/* Sprint */}
        {sprints.length > 0 && (
          <PillDropdown<string>
            options={['__none__', ...sprints.map((s) => s.id)]}
            value={task.sprintId || '__none__'}
            onChange={(v) => onSprintChange(v === '__none__' ? null : v)}
            renderLabel={() => sprint
              ? <><Zap size={11} className="text-blue-400" /><span>{sprint.name}</span></>
              : <><Zap size={11} className="text-text-muted" /><span className="text-zinc-500">Sprint</span></>
            }
            renderOption={(id) => {
              if (id === '__none__') return <span>Geen sprint</span>
              const s = sprints.find((x) => x.id === id)!
              return <><Zap size={11} className="text-blue-400" /><span>{s.name}</span></>
            }}
          />
        )}
      </div>
    )
  }

  // Full sidebar mode (for TaskDetail page)
  return (
    <div className="space-y-0">
      <SidebarRow icon={Circle} label="Status">
        <PillDropdown<TaskStatus>
          options={TASK_STATUSES.map((s) => s.id)}
          value={task.status ?? 'todo'}
          onChange={onStatusChange}
          renderLabel={() => <><statusCfg.Icon size={12} className={cn('shrink-0', statusCfg.color)} /><span>{statusCfg.label}</span></>}
          renderOption={(v) => {
            const s = TASK_STATUSES.find((x) => x.id === v) ?? TASK_STATUSES[0]
            return <><s.Icon size={12} className={cn('shrink-0', s.color)} /><span>{s.label}</span></>
          }}
        />
      </SidebarRow>

      <SidebarRow icon={Flag} label="Prioriteit">
        <PillDropdown<TaskPriority>
          options={TASK_PRIORITIES.map((p) => p.id)}
          value={task.priority ?? 'medium'}
          onChange={onPriorityChange}
          renderLabel={() => <><Flag size={11} className={priorityCfg.color} /><span className={priorityCfg.color}>{priorityCfg.label}</span></>}
          renderOption={(v) => {
            const p = TASK_PRIORITIES.find((x) => x.id === v) ?? TASK_PRIORITIES[2]
            return <><Flag size={11} /><span>{p.label}</span></>
          }}
        />
      </SidebarRow>

      <SidebarRow icon={User} label="Toegewezen aan">
        <PillDropdown<string>
          options={['__none__', ...profiles.map((p) => p.id)]}
          value={task.assigneeId || '__none__'}
          onChange={(v) => onAssigneeChange(v === '__none__' ? null : v)}
          renderLabel={() => assignee
            ? <><UserAvatar profile={assignee} size="w-4 h-4" textSize="text-[8px]" /><span>{assignee.name ?? assignee.email.split('@')[0]}</span></>
            : <><div className="w-4 h-4 rounded-full border border-dashed border-zinc-600" /><span className="text-zinc-500">Niemand</span></>
          }
          renderOption={(id) => {
            if (id === '__none__') return <><div className="w-4 h-4 rounded-full border border-dashed border-zinc-600" /><span>Niemand</span></>
            const p = profiles.find((x) => x.id === id)!
            return <><UserAvatar profile={p} size="w-4 h-4" textSize="text-[8px]" /><span>{p.name ?? p.email.split('@')[0]}</span></>
          }}
        />
      </SidebarRow>

      <SidebarRow icon={Calendar} label="Deadline">
        <div className="relative inline-block">
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={(e) => onDueDateChange(e.target.value || null)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
          <span className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md border text-xs cursor-pointer select-none',
            task.dueDate ? 'border-border-subtle text-text-secondary bg-surface-2' : 'border-dashed border-border-strong text-text-muted bg-transparent',
          )}>
            <Calendar size={11} />
            {task.dueDate ? format(new Date(task.dueDate), 'd MMMM yyyy', { locale: nl }) : 'Geen deadline'}
          </span>
        </div>
      </SidebarRow>

      {sprints.length > 0 && (
        <SidebarRow icon={Zap} label="Sprint">
          <PillDropdown<string>
            options={['__none__', ...sprints.map((s) => s.id)]}
            value={task.sprintId || '__none__'}
            onChange={(v) => onSprintChange(v === '__none__' ? null : v)}
            renderLabel={() => sprint
              ? <><Zap size={11} className="text-blue-400" /><span>{sprint.name}</span></>
              : <><span className="text-zinc-500">Geen sprint</span></>
            }
            renderOption={(id) => {
              if (id === '__none__') return <span>Geen sprint</span>
              const s = sprints.find((x) => x.id === id)!
              return <><Zap size={11} className="text-blue-400" /><span>{s.name}</span></>
            }}
          />
        </SidebarRow>
      )}

      <SidebarRow icon={Tag} label="Labels">
        <LabelPicker
          labels={labels}
          selected={task.labelIds ?? []}
          onChange={onLabelsChange}
          onCreateLabel={onCreateLabel}
          onDeleteLabel={onDeleteLabel}
        />
      </SidebarRow>

      {(createdAt || updatedAt) && (
        <div className="pt-3 space-y-1">
          {createdAt && (
            <p className="text-[10px] text-text-muted">
              Aangemaakt {format(new Date(createdAt), 'd MMM yyyy', { locale: nl })}
            </p>
          )}
          {updatedAt && updatedAt !== createdAt && (
            <p className="text-[10px] text-text-muted">
              Bijgewerkt {format(new Date(updatedAt), 'd MMM yyyy HH:mm', { locale: nl })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
