import { useState, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import type { Task, TaskStatus, Milestone } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import { TASK_STATUSES } from './projectsPageConstants'
import { TaskCard } from './TaskCard'

export function KanbanBoard({
  tasks,
  profiles,
  milestones = [],
  onTaskClick,
  onAddTask,
  onStatusChange,
  selectedTaskIds,
  onSelectTask,
}: {
  tasks: Task[]
  profiles: UserProfileLite[]
  milestones?: Milestone[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus, milestoneId?: string | null) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  selectedTaskIds?: Set<string>
  onSelectTask?: (id: string) => void
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const [collapsedMilestones, setCollapsedMilestones] = useState<Set<string>>(new Set())

  const toggleMilestone = (id: string) =>
    setCollapsedMilestones((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const milestoneOrder = useMemo(() => [...milestones, null], [milestones])

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    tasks.forEach((t) => map[t.status].push(t))
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position))
    return map
  }, [tasks])

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    if (draggedId) {
      const task = tasks.find((t) => t.id === draggedId)
      if (task && task.status !== status) {
        onStatusChange(draggedId, status)
      }
    }
    setDraggedId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-4 snap-x snap-mandatory">
      {TASK_STATUSES.map(({ id, label, Icon, color, bg, headerBg, ring }) => {
        const isOver = dragOverStatus === id
        const isDragSource = draggedId !== null && byStatus[id].some((t) => t.id === draggedId)
        return (
          <div
            key={id}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, id)}
            className={clsx(
              'flex flex-col w-[272px] shrink-0 snap-start rounded-xl overflow-hidden border transition-all duration-150',
              bg,
              isOver
                ? 'border-accent-blue/60 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]'
                : isDragSource
                  ? 'border-zinc-700'
                  : 'border-border-subtle'
            )}
          >
            <div className={clsx('flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle', headerBg)}>
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={color} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</span>
              <span
                className={clsx(
                  'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full',
                  byStatus[id].length > 0 ? `${color} bg-white/[0.08]` : 'text-text-muted'
                )}
              >
                {byStatus[id].length}
              </span>
            </div>

            <div
              className={clsx(
                'flex-1 overflow-y-auto p-2 transition-colors duration-150',
                isOver && byStatus[id].length === 0 && 'bg-accent-blue/[0.06]'
              )}
            >
              {milestones.length > 0 ? (
                milestoneOrder.map((ms) => {
                  const msId = ms?.id ?? null
                  const msKey = msId ?? '__none__'
                  const msTasks = byStatus[id].filter((t) => (t.milestoneId ?? null) === msId)
                  const isCollapsed = collapsedMilestones.has(msKey)
                  if (msTasks.length === 0 && ms !== null) return null
                  return (
                    <div key={msKey} className="mb-2">
                      <button
                        onClick={() => toggleMilestone(msKey)}
                        className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] font-medium text-text-muted hover:text-text-secondary hover:bg-white/[0.04] transition-colors mb-1"
                      >
                        <ChevronDown size={11} className={clsx('transition-transform', isCollapsed && '-rotate-90')} />
                        {ms ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ms.color }} />
                            <span className="truncate">{ms.name}</span>
                            {ms.deadline && (
                              <span
                                className={clsx(
                                  'ml-auto shrink-0 tabular-nums',
                                  new Date(ms.deadline) < new Date() ? 'text-red-400' : ''
                                )}
                              >
                                {new Date(ms.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-zinc-600">Geen milestone</span>
                        )}
                        <span className="ml-auto shrink-0 text-zinc-700">{msTasks.length}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="space-y-2">
                          {msTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              profiles={profiles}
                              onClick={() => {
                                if (!draggedId) onTaskClick(task)
                              }}
                              isDragging={draggedId === task.id}
                              isSelected={selectedTaskIds?.has(task.id)}
                              onSelect={onSelectTask ? () => onSelectTask(task.id) : undefined}
                              onDragStart={() => setDraggedId(task.id)}
                              onDragEnd={() => {
                                setDraggedId(null)
                                setDragOverStatus(null)
                              }}
                            />
                          ))}
                          <button
                            onClick={() => onAddTask(id, msId)}
                            className="w-full flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-700 hover:text-text-muted hover:bg-white/[0.04] rounded transition-colors"
                          >
                            <Plus size={10} />
                            Taak
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="space-y-2">
                  {byStatus[id].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      profiles={profiles}
                      onClick={() => {
                        if (!draggedId) onTaskClick(task)
                      }}
                      isDragging={draggedId === task.id}
                      isSelected={selectedTaskIds?.has(task.id)}
                      onSelect={onSelectTask ? () => onSelectTask(task.id) : undefined}
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDragOverStatus(null)
                      }}
                    />
                  ))}
                </div>
              )}

              {isOver && draggedId && !byStatus[id].some((t) => t.id === draggedId) && (
                <div className="border-2 border-dashed border-accent-blue/40 rounded-lg h-16 flex items-center justify-center mt-2">
                  <span className="text-xs text-accent-blue/60">Hier neerzetten</span>
                </div>
              )}
            </div>

            {milestones.length === 0 && (
              <div className="p-2 border-t border-border-subtle">
                <button
                  onClick={() => onAddTask(id, null)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  <Plus size={12} />
                  Taak toevoegen
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
