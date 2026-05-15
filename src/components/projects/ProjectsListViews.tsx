import { useState } from 'react'
import { Plus, ChevronDown, Flag, Check } from 'lucide-react'
import clsx from 'clsx'
import type { Task, TaskStatus, Milestone } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import { UserAvatar } from '../UserAvatar'
import { TASK_STATUSES, PRIORITY_CONFIG } from './projectsPageConstants'

function TaskRow({
  task,
  profiles,
  onTaskClick,
  selectedTaskIds,
  onSelectTask,
}: {
  task: Task
  profiles: UserProfileLite[]
  onTaskClick: (task: Task) => void
  selectedTaskIds?: Set<string>
  onSelectTask?: (id: string) => void
}) {
  const assignee = profiles.find((p) => p.id === task.assigneeId)
  const prio = PRIORITY_CONFIG[task.priority]
  const statusCfg = TASK_STATUSES.find((s) => s.id === task.status)!
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  const isSelected = selectedTaskIds?.has(task.id)
  return (
    <div
      onClick={() => onTaskClick(task)}
      className={clsx(
        'flex items-center gap-3 px-4 py-2.5 bg-surface-0 hover:bg-white/[0.02] cursor-pointer group transition-colors',
        isSelected && 'bg-accent-blue/[0.05]'
      )}
    >
      {onSelectTask && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelectTask(task.id)
          }}
          className={clsx(
            'w-4 h-4 rounded border shrink-0 transition-all flex items-center justify-center',
            isSelected ? 'bg-accent-blue border-accent-blue' : 'border-zinc-600 bg-transparent opacity-0 group-hover:opacity-100'
          )}
        >
          {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
      )}
      <div
        className={clsx('w-[3px] h-5 rounded-full shrink-0', {
          'bg-zinc-600': task.priority === 'low',
          'bg-blue-500': task.priority === 'medium',
          'bg-orange-500': task.priority === 'high',
          'bg-red-500': task.priority === 'urgent',
        })}
      />
      <statusCfg.Icon size={14} className={clsx(statusCfg.color, 'shrink-0')} />
      <span className="flex-1 text-sm text-text-primary group-hover:text-white transition-colors truncate">{task.title}</span>
      {task.priority !== 'medium' && (
        <span className={clsx('hidden sm:flex items-center gap-1 text-xs shrink-0', prio.flagColor)}>
          <Flag size={10} />
          {prio.label}
        </span>
      )}
      {task.dueDate && (
        <span className={clsx('text-xs shrink-0', isOverdue ? 'text-red-400' : 'text-text-muted')}>
          {new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
        </span>
      )}
      {assignee ? (
        <UserAvatar profile={assignee} size="w-6 h-6" textSize="text-[10px]" className="shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full border border-dashed border-zinc-700 shrink-0" />
      )}
    </div>
  )
}

export function ListView({
  tasks,
  profiles,
  milestones = [],
  onTaskClick,
  onAddTask,
  selectedTaskIds,
  onSelectTask,
}: {
  tasks: Task[]
  profiles: UserProfileLite[]
  milestones?: Milestone[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus, milestoneId?: string | null) => void
  selectedTaskIds?: Set<string>
  onSelectTask?: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleCollapse = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  if (milestones.length > 0) {
    const milestoneOrder = [...milestones, null]
    return (
      <div className="space-y-2 pb-4">
        {milestoneOrder.map((ms) => {
          const msKey = ms?.id ?? '__none__'
          const msTasks = tasks.filter((t) => (t.milestoneId ?? null) === (ms?.id ?? null))
          if (msTasks.length === 0 && ms !== null) return null
          const isCollapsed = !!collapsed[msKey]
          const deadlineOverdue = ms?.deadline && new Date(ms.deadline) < new Date()

          return (
            <div key={msKey} className="rounded-xl border border-border-subtle overflow-hidden">
              <button
                onClick={() => toggleCollapse(msKey)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-1 hover:bg-white/[0.03] transition-colors"
              >
                {ms && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ms.color }} />}
                <span className="text-xs font-semibold text-text-primary">
                  {ms ? ms.name : <span className="text-text-muted font-normal italic">Geen milestone</span>}
                </span>
                {ms?.deadline && (
                  <span className={clsx('text-xs ml-1', deadlineOverdue ? 'text-red-400' : 'text-text-muted')}>
                    · {new Date(ms.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <span className="text-xs text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded-full ml-2">{msTasks.length}</span>
                <ChevronDown size={13} className={clsx('ml-auto text-text-muted transition-transform', isCollapsed && '-rotate-90')} />
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-border-subtle">
                  {msTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      profiles={profiles}
                      onTaskClick={onTaskClick}
                      selectedTaskIds={selectedTaskIds}
                      onSelectTask={onSelectTask}
                    />
                  ))}
                  <button
                    onClick={() => onAddTask('todo', ms?.id ?? null)}
                    className="w-full flex items-center gap-3 px-4 py-2 bg-surface-0 hover:bg-white/[0.02] text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <div className="w-[3px] h-4 rounded-full bg-transparent shrink-0" />
                    <Plus size={13} />
                    <span className="text-xs">Taak toevoegen</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const byStatus: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
  tasks.forEach((t) => byStatus[t.status].push(t))

  return (
    <div className="space-y-2 pb-4">
      {TASK_STATUSES.map(({ id, label, Icon, color, ring }) => {
        const groupTasks = byStatus[id]
        const isCollapsed = !!collapsed[id]
        return (
          <div key={id} className="rounded-xl border border-border-subtle overflow-hidden">
            <button
              onClick={() => toggleCollapse(id)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-1 hover:bg-white/[0.03] transition-colors"
            >
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={color} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</span>
              <span className="text-xs text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded-full ml-1">{groupTasks.length}</span>
              <ChevronDown size={13} className={clsx('ml-auto text-text-muted transition-transform', isCollapsed && '-rotate-90')} />
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-border-subtle">
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    profiles={profiles}
                    onTaskClick={onTaskClick}
                    selectedTaskIds={selectedTaskIds}
                    onSelectTask={onSelectTask}
                  />
                ))}
                <button
                  onClick={() => onAddTask(id, null)}
                  className="w-full flex items-center gap-3 px-4 py-2 bg-surface-0 hover:bg-white/[0.02] text-text-muted hover:text-text-secondary transition-colors"
                >
                  <div className="w-[3px] h-4 rounded-full bg-transparent shrink-0" />
                  <Plus size={13} />
                  <span className="text-xs">Taak toevoegen</span>
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
