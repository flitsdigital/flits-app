import { NavigateFunction } from 'react-router-dom'
import { Plus, List, Zap, LayoutGrid, GanttChartSquare, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import type { Milestone, Project, Task, TaskStatus, TaskPriority, ProjectLabel } from '../../types'
import type { Sprint, ProjectActivity } from '../../lib/projectsDb'
import { projectsDb } from '../../lib/projectsDb'
import { PageHeader } from '../PageHeader'
import { Button } from '@/components/ui/button'
import { FilterBar, TaskFilters } from './FilterBar'
import { BulkActionBar } from './BulkActionBar'
import { GanttView } from './GanttView'
import { SprintModal } from './SprintModal'
import { MilestoneModal } from './MilestoneModal'
import { ProjectModal } from './ProjectModal'
import { TaskModal } from './TaskModal'
import { KanbanBoard } from './KanbanBoard'
import { ListView } from './ProjectsListViews'
import { ActivityRow } from './ActivityRow'

export interface ProjectsDetailLayoutProps {
  selectedProject: Project
  clientLabel?: string
  activeSprint: Sprint | undefined
  sprints: Sprint[]
  selectedSprintId: string | 'all'
  setSelectedSprintId: (v: string | 'all') => void
  boardView: 'kanban' | 'list' | 'gantt' | 'activity'
  setBoardView: (v: 'kanban' | 'list' | 'gantt' | 'activity') => void
  filters: TaskFilters
  setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>
  profiles: UserProfileLite[]
  labels: ProjectLabel[]
  milestones: Milestone[]
  tasks: Task[]
  sprintFilteredTasks: Task[]
  activities: ProjectActivity[]
  activityLoading: boolean
  selectedTaskIds: Set<string>
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<Set<string>>>
  showSprintModal: boolean
  setShowSprintModal: (v: boolean) => void
  editSprint: Sprint | undefined
  setEditSprint: (v: Sprint | undefined) => void
  showProjectModal: boolean
  editProject: Project | undefined
  showTaskModal: boolean
  editTask: Task | undefined
  taskDefaultStatus: TaskStatus
  taskDefaultMilestoneId: string | null
  showMilestoneModal: boolean
  editMilestone: Milestone | undefined
  profileEmail: string | undefined
  navigate: NavigateFunction
  onExitProject: () => void
  onLoadActivity: (projectId: string) => void
  onEditProjectOpen: () => void
  onNewMilestoneOpen: () => void
  onNewTaskOpen: () => void
  setEditTask: (t: Task | undefined) => void
  setTaskDefaultStatus: (s: TaskStatus) => void
  setTaskDefaultMilestoneId: (id: string | null) => void
  setShowTaskModal: (v: boolean) => void
  setEditMilestone: (m: Milestone | undefined) => void
  setShowMilestoneModal: (v: boolean) => void
  setShowProjectModal: (v: boolean) => void
  setEditProject: (p: Project | undefined) => void
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>
  handleStatusChange: (taskId: string, newStatus: TaskStatus) => void
  handleBulkStatus: (status: TaskStatus) => void
  handleBulkAssignee: (assigneeId: string | null) => void
  handleBulkSprint: (sprintId: string | null) => void
  handleBulkPriority: (priority: TaskPriority) => void
  handleBulkDelete: () => void
  handleProjectSaved: (p: Project) => void
  handleProjectDeleted: (id: string) => void
  handleTaskSaved: (t: Task) => void
  handleTaskDeleted: (id: string) => void
}

export function ProjectsDetailLayout({
  selectedProject,
  clientLabel,
  activeSprint,
  sprints,
  selectedSprintId,
  setSelectedSprintId,
  boardView,
  setBoardView,
  filters,
  setFilters,
  profiles,
  labels,
  milestones,
  tasks,
  sprintFilteredTasks,
  activities,
  activityLoading,
  selectedTaskIds,
  setSelectedTaskIds,
  showSprintModal,
  setShowSprintModal,
  editSprint,
  setEditSprint,
  showProjectModal,
  editProject,
  showTaskModal,
  editTask,
  taskDefaultStatus,
  taskDefaultMilestoneId,
  showMilestoneModal,
  editMilestone,
  profileEmail,
  navigate,
  onExitProject,
  onLoadActivity,
  onEditProjectOpen,
  onNewMilestoneOpen,
  onNewTaskOpen,
  setEditTask,
  setTaskDefaultStatus,
  setTaskDefaultMilestoneId,
  setShowTaskModal,
  setEditMilestone,
  setShowMilestoneModal,
  setShowProjectModal,
  setEditProject,
  setSprints,
  setMilestones,
  handleStatusChange,
  handleBulkStatus,
  handleBulkAssignee,
  handleBulkSprint,
  handleBulkPriority,
  handleBulkDelete,
  handleProjectSaved,
  handleProjectDeleted,
  handleTaskSaved,
  handleTaskDeleted,
}: ProjectsDetailLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={selectedProject.name}
        breadcrumbs={[
          { label: 'Projecten', onClick: onExitProject },
          ...(clientLabel ? [{ label: clientLabel }] : []),
          { label: selectedProject.name },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { setEditSprint(undefined); setShowSprintModal(true) }} className="h-7 text-xs gap-1.5">
              <Zap size={12} />
              Sprints
            </Button>
            {sprints.length > 0 && (
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value as string | 'all')}
                className="text-xs px-2 py-1.5 bg-surface-0 border border-border-subtle rounded-lg text-text-secondary hover:border-zinc-600 transition-colors focus:outline-none"
              >
                <option value="all">Alle sprints</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.status === 'active' ? '(actief)' : ''}
                  </option>
                ))}
                <option value="__none__">Geen sprint</option>
              </select>
            )}
            <div className="flex items-center bg-surface-0 border border-border-subtle rounded-lg p-0.5">
              <button
                onClick={() => setBoardView('kanban')}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'kanban' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <LayoutGrid size={13} />
                Board
              </button>
              <button
                onClick={() => setBoardView('list')}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'list' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <List size={13} />
                Lijst
              </button>
              <button
                onClick={() => setBoardView('gantt')}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'gantt' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <GanttChartSquare size={13} />
                Gantt
              </button>
              <button
                onClick={() => {
                  setBoardView('activity')
                  onLoadActivity(selectedProject.id)
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'activity' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <Activity size={13} />
                Activiteit
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={onEditProjectOpen} className="h-7 text-xs">
              Bewerken
            </Button>
            <Button variant="outline" size="sm" onClick={onNewMilestoneOpen} className="h-7 text-xs gap-1">
              <Plus size={12} />
              Milestone
            </Button>
            {boardView !== 'activity' && (
              <Button size="sm" onClick={onNewTaskOpen} className="h-7 text-xs gap-1.5">
                <Plus size={13} />
                Taak
              </Button>
            )}
          </>
        }
      />

      {activeSprint && selectedSprintId === 'all' && (
        <div className="px-6 py-2 border-b border-border-subtle bg-blue-500/[0.04] flex items-center gap-2 shrink-0">
          <Zap size={12} className="text-blue-400" />
          <span className="text-xs text-blue-400 font-medium">{activeSprint.name} loopt</span>
          {activeSprint.endDate && (
            <span className="text-xs text-text-muted">t/m {format(new Date(activeSprint.endDate + 'T00:00:00'), 'd MMM', { locale: nl })}</span>
          )}
        </div>
      )}

      {(profiles.length > 0 || labels.length > 0 || sprints.length > 0) && boardView !== 'activity' && boardView !== 'gantt' && (
        <div className="px-4 lg:px-6 py-2 border-b border-border-subtle shrink-0">
          <FilterBar filters={filters} onChange={setFilters} profiles={profiles} labels={labels} sprints={sprints} />
        </div>
      )}

      <div
        className={clsx(
          'flex-1',
          boardView === 'kanban' ? 'overflow-hidden px-4 lg:px-6 pt-4 lg:pt-5' : boardView === 'gantt' ? 'overflow-hidden' : 'overflow-y-auto px-4 lg:px-6 pt-4 lg:pt-5'
        )}
      >
        {boardView === 'kanban' ? (
          <KanbanBoard
            tasks={sprintFilteredTasks}
            profiles={profiles}
            milestones={milestones}
            onTaskClick={(task) => navigate(`/projecten/${task.projectId}/taken/${task.id}`)}
            onAddTask={(status, msId) => {
              setEditTask(undefined)
              setTaskDefaultStatus(status)
              setTaskDefaultMilestoneId(msId ?? null)
              setShowTaskModal(true)
            }}
            onStatusChange={handleStatusChange}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={(id) =>
              setSelectedTaskIds((prev) => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }
          />
        ) : boardView === 'list' ? (
          <ListView
            tasks={sprintFilteredTasks}
            profiles={profiles}
            milestones={milestones}
            onTaskClick={(task) => navigate(`/projecten/${task.projectId}/taken/${task.id}`)}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={(id) =>
              setSelectedTaskIds((prev) => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }
            onAddTask={(status, msId) => {
              setEditTask(undefined)
              setTaskDefaultStatus(status)
              setTaskDefaultMilestoneId(msId ?? null)
              setShowTaskModal(true)
            }}
          />
        ) : boardView === 'gantt' ? (
          <GanttView
            tasks={tasks}
            sprints={sprints}
            milestones={milestones}
            projectStartDate={selectedProject.startDate}
            projectDeadline={selectedProject.deadline}
            onTaskClick={(task) => navigate(`/projecten/${task.projectId}/taken/${task.id}`)}
            onMilestoneClick={(ms) => {
              setEditMilestone(ms)
              setShowMilestoneModal(true)
            }}
          />
        ) : (
          <div className="max-w-xl pb-8">
            {activityLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity size={24} className="text-text-muted mb-3" />
                <p className="text-sm text-text-secondary">Nog geen activiteit in dit project</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activities.map((act) => (
                  <ActivityRow key={act.id} activity={act} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedTaskIds.size}
        profiles={profiles}
        sprints={sprints}
        labels={labels}
        onSetStatus={handleBulkStatus}
        onSetAssignee={handleBulkAssignee}
        onSetSprint={handleBulkSprint}
        onSetPriority={handleBulkPriority}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedTaskIds(new Set())}
      />

      <SprintModal
        open={showSprintModal}
        projectId={selectedProject.id}
        sprint={editSprint ?? null}
        onSave={(saved) => {
          setSprints((prev) => {
            const idx = prev.findIndex((s) => s.id === saved.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = saved
              return next
            }
            return [...prev, saved]
          })
        }}
        onDelete={(id) => setSprints((prev) => prev.filter((s) => s.id !== id))}
        onClose={() => {
          setShowSprintModal(false)
          setEditSprint(undefined)
        }}
      />
      {showProjectModal && (
        <ProjectModal
          project={editProject}
          onClose={() => {
            setShowProjectModal(false)
            setEditProject(undefined)
          }}
          onSaved={handleProjectSaved}
          onDeleted={handleProjectDeleted}
        />
      )}
      {showTaskModal && (
        <TaskModal
          task={editTask}
          projectId={selectedProject.id}
          defaultStatus={taskDefaultStatus}
          defaultMilestoneId={taskDefaultMilestoneId}
          milestones={milestones}
          profiles={profiles}
          onClose={() => {
            setShowTaskModal(false)
            setEditTask(undefined)
            setTaskDefaultMilestoneId(null)
          }}
          onSaved={(t) => {
            handleTaskSaved(t)
            if (profileEmail) {
              void projectsDb.logActivity({
                projectId: selectedProject.id,
                taskId: t.id,
                actorEmail: profileEmail,
                action: editTask ? 'status_changed' : 'task_created',
                metadata: { taskTitle: t.title },
              })
            }
          }}
          onDeleted={(id) => {
            handleTaskDeleted(id)
            if (profileEmail) {
              void projectsDb.logActivity({
                projectId: selectedProject.id,
                taskId: id,
                actorEmail: profileEmail,
                action: 'task_deleted',
                metadata: {},
              })
            }
          }}
        />
      )}
      {showMilestoneModal && (
        <MilestoneModal
          projectId={selectedProject.id}
          milestone={editMilestone}
          onClose={() => {
            setShowMilestoneModal(false)
            setEditMilestone(undefined)
          }}
          onSaved={(m) =>
            setMilestones((prev) => {
              const idx = prev.findIndex((x) => x.id === m.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = m
                return next
              }
              return [...prev, m]
            })
          }
          onDeleted={(id) => setMilestones((prev) => prev.filter((x) => x.id !== id))}
        />
      )}
    </div>
  )
}
