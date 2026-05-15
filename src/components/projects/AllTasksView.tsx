import { useState, useMemo } from 'react'
import { ChevronDown, Flag } from 'lucide-react'
import clsx from 'clsx'
import type { Task, TaskStatus, Project } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import { UserAvatar } from '../UserAvatar'
import { TASK_STATUSES, PRIORITY_CONFIG } from './projectsPageConstants'

export interface ClientInfo {
  id: string
  companyName: string
}

export function AllTasksView({
  tasks,
  projects,
  clients,
  profiles,
  currentUserId,
  onTaskClick,
}: {
  tasks: Task[]
  projects: Project[]
  clients: ClientInfo[]
  profiles: UserProfileLite[]
  currentUserId?: string
  onTaskClick: (task: Task) => void
}) {
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    todo: false,
    in_progress: false,
    in_review: false,
    done: true,
  })

  const filteredTasks = useMemo(() => {
    if (!myTasksOnly || !currentUserId) return tasks
    return tasks.filter((t) => t.assigneeId === currentUserId)
  }, [tasks, myTasksOnly, currentUserId])

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    filteredTasks.forEach((t) => map[t.status].push(t))
    return map
  }, [filteredTasks])

  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients])

  return (
    <div className="space-y-2 pb-6">
      {currentUserId && (
        <div className="flex items-center bg-surface-0 border border-border-subtle rounded-lg p-0.5 w-fit mb-4">
          <button
            onClick={() => setMyTasksOnly(false)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
              !myTasksOnly ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
            )}
          >
            Alle taken
          </button>
          <button
            onClick={() => setMyTasksOnly(true)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
              myTasksOnly ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
            )}
          >
            Mijn taken
          </button>
        </div>
      )}

      {TASK_STATUSES.map(({ id, label, Icon, color, ring }) => {
        const groupTasks = byStatus[id]
        const isCollapsed = collapsed[id]
        return (
          <div key={id} className="rounded-xl border border-border-subtle overflow-hidden">
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-1 hover:bg-white/[0.03] transition-colors"
            >
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={color} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</span>
              <span className="text-xs text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded-full ml-1">{groupTasks.length}</span>
              <ChevronDown size={13} className={clsx('ml-auto text-text-muted transition-transform', isCollapsed && '-rotate-90')} />
            </button>

            {!isCollapsed && (
              <div>
                {groupTasks.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-0 border-b border-border-subtle">
                    <div className="w-[3px] shrink-0" />
                    <Icon size={14} className="shrink-0 opacity-0" />
                    <span className="flex-1 text-[10px] uppercase tracking-wider text-text-muted font-semibold">Taak</span>
                    <span className="w-32 shrink-0 text-[10px] uppercase tracking-wider text-text-muted font-semibold hidden lg:block">Project</span>
                    <span className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-text-muted font-semibold hidden md:block">Klant</span>
                    <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-text-muted font-semibold hidden sm:block">Deadline</span>
                    <span className="w-6 shrink-0" />
                  </div>
                )}

                <div className="divide-y divide-border-subtle">
                  {groupTasks.map((task) => {
                    const project = projectMap[task.projectId]
                    const client = project?.clientId ? clientMap[project.clientId] : undefined
                    const assignee = profiles.find((p) => p.id === task.assigneeId)
                    const prio = PRIORITY_CONFIG[task.priority]
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-surface-0 hover:bg-white/[0.025] cursor-pointer group transition-colors"
                      >
                        <div
                          className={clsx('w-[3px] h-5 rounded-full shrink-0', {
                            'bg-zinc-700': task.priority === 'low',
                            'bg-blue-500': task.priority === 'medium',
                            'bg-orange-500': task.priority === 'high',
                            'bg-red-500': task.priority === 'urgent',
                          })}
                        />

                        <Icon size={14} className={clsx(color, 'shrink-0')} />

                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-sm text-text-primary group-hover:text-white transition-colors truncate">{task.title}</span>
                          {task.priority !== 'medium' && (
                            <span className={clsx('hidden sm:flex items-center gap-0.5 text-xs shrink-0', prio.flagColor)}>
                              <Flag size={9} />
                              {prio.label}
                            </span>
                          )}
                        </div>

                        {project && (
                          <div className="w-32 shrink-0 hidden lg:flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                            <span className="text-xs text-text-muted truncate">{project.name}</span>
                          </div>
                        )}

                        {client && (
                          <span className="w-28 shrink-0 text-xs text-text-muted truncate hidden md:block">{client.companyName}</span>
                        )}

                        <span className={clsx('w-20 shrink-0 text-xs hidden sm:block', isOverdue ? 'text-red-400' : 'text-text-muted')}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '—'}
                        </span>

                        {assignee ? (
                          <UserAvatar profile={assignee} size="w-6 h-6" textSize="text-[10px]" className="shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-dashed border-zinc-700 shrink-0" />
                        )}
                      </div>
                    )
                  })}

                  {groupTasks.length === 0 && <div className="px-4 py-3 bg-surface-0 text-xs text-text-muted italic">Geen taken</div>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
