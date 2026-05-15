import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { projectsDb, type Sprint, type ProjectActivity } from '../lib/projectsDb'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProjectsData } from '../hooks/useProjectsData'
import type { Milestone, Project, Task, TaskStatus, TaskPriority, ProjectLabel } from '../types'
import { toast } from 'sonner'
import { TaskFilters, EMPTY_FILTERS } from '../components/projects/FilterBar'
import { TASK_STATUSES } from '../components/projects/projectsPageConstants'
import { ProjectsDetailLayout } from '../components/projects/ProjectsDetailLayout'
import { ProjectsExplorerLayout } from '../components/projects/ProjectsExplorerLayout'

export function Projects() {
  const clients = useStore((s) => s.clients)
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const location = useLocation()

  const {
    projects,
    setProjects,
    tasks,
    setTasks,
    taskCounts,
    setTaskCounts,
    profiles,
    loading,
    allTasks,
    setAllTasks,
    allTasksLoading,
    loadAll,
    loadProjectTasks,
    loadAllTasks,
    updateTaskStatus,
  } = useProjectsData()

  const [leftNav, setLeftNav] = useState<'projects' | 'overview' | 'timeline'>('projects')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const [boardView, setBoardView] = useState<'kanban' | 'list' | 'gantt' | 'activity'>('kanban')

  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'all'>('all')
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [editSprint, setEditSprint] = useState<Sprint | undefined>()

  const [labels, setLabels] = useState<ProjectLabel[]>([])

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [editMilestone, setEditMilestone] = useState<Milestone | undefined>()
  const [taskDefaultMilestoneId, setTaskDefaultMilestoneId] = useState<string | null>(null)

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | undefined>()
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>('todo')

  usePageMeta('Projecten → Flits Impact')

  function openOverview() {
    setLeftNav('overview')
    setSelectedClientId(null)
    void loadAllTasks()
  }

  function openProject(project: Project) {
    setSelectedProject(project)
    void loadProjectTasks(project.id)
    void projectsDb.fetchSprints(project.id).then(setSprints).catch(() => {})
    void projectsDb.fetchProjectLabels(project.id).then(setLabels).catch(() => {})
    void projectsDb.fetchMilestones(project.id).then(setMilestones).catch(() => {})
    setSelectedSprintId('all')
    setFilters(EMPTY_FILTERS)
    setSelectedTaskIds(new Set())
    setBoardView('kanban')
  }

  useEffect(() => {
    const state = location.state as { projectId?: string; clientId?: string } | null
    if (!state || projects.length === 0) return

    if (state.projectId) {
      const p = projects.find((x) => x.id === state.projectId)
      if (p) openProject(p)
      navigate(location.pathname, { replace: true, state: null })
    } else if (state.clientId) {
      setLeftNav('projects')
      setSelectedClientId(state.clientId)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, projects])

  const loadActivity = useCallback(async (projectId: string) => {
    setActivityLoading(true)
    try {
      const data = await projectsDb.fetchProjectActivity(projectId)
      setActivities(data)
    } catch {
      // silent
    } finally {
      setActivityLoading(false)
    }
  }, [])

  function handleProjectSaved(p: Project) {
    setProjects((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = p
        return next
      }
      return [p, ...prev]
    })
    if (selectedProject?.id === p.id) setSelectedProject(p)
    void loadAll()
  }

  function handleProjectDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (selectedProject?.id === id) setSelectedProject(null)
  }

  function handleTaskSaved(task: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x.id === task.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = task
        return next
      }
      return [...prev, task]
    })
    setTaskCounts((prev) => ({
      ...prev,
      [task.projectId]: (prev[task.projectId] ?? 0) + (editTask ? 0 : 1),
    }))
  }

  function handleTaskDeleted(id: string) {
    const task = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (task) {
      setTaskCounts((prev) => ({
        ...prev,
        [task.projectId]: Math.max(0, (prev[task.projectId] ?? 1) - 1),
      }))
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    await updateTaskStatus(taskId, newStatus)
    if (selectedProject && profile?.email && task) {
      const statusLabel = TASK_STATUSES.find((s) => s.id === newStatus)?.label ?? newStatus
      void projectsDb.logActivity({
        projectId: selectedProject.id,
        taskId,
        actorEmail: profile.email,
        action: 'status_changed',
        metadata: { taskTitle: task.title, newStatus: statusLabel },
      })
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element).tagName
      const isTyping = ['INPUT', 'TEXTAREA'].includes(tag) || (e.target as Element).closest('[contenteditable]')
      if (isTyping || e.metaKey || e.ctrlKey) return

      if (!selectedProject) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setEditTask(undefined)
        setTaskDefaultStatus('todo')
        setShowTaskModal(true)
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setBoardView('kanban')
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        setBoardView('list')
      } else if (e.key === 'Escape') {
        if (selectedTaskIds.size > 0) setSelectedTaskIds(new Set())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedProject, selectedTaskIds])

  async function handleBulkStatus(status: TaskStatus) {
    if (selectedTaskIds.size === 0) return
    const n = selectedTaskIds.size
    await Promise.all([...selectedTaskIds].map((id) => projectsDb.saveTask({ id, status } as never)))
    setTasks((prev) => prev.map((t) => (selectedTaskIds.has(t.id) ? { ...t, status } : t)))
    setSelectedTaskIds(new Set())
    toast.success(`${n} taken bijgewerkt`)
  }

  async function handleBulkAssignee(assigneeId: string | null) {
    if (selectedTaskIds.size === 0) return
    const n = selectedTaskIds.size
    await Promise.all([...selectedTaskIds].map((id) => projectsDb.saveTask({ id, assigneeId } as never)))
    setTasks((prev) => prev.map((t) => (selectedTaskIds.has(t.id) ? { ...t, assigneeId } : t)))
    setSelectedTaskIds(new Set())
    toast.success(`${n} taken bijgewerkt`)
  }

  async function handleBulkSprint(sprintId: string | null) {
    if (selectedTaskIds.size === 0) return
    const n = selectedTaskIds.size
    await Promise.all([...selectedTaskIds].map((id) => projectsDb.saveTask({ id, sprintId } as never)))
    setTasks((prev) => prev.map((t) => (selectedTaskIds.has(t.id) ? { ...t, sprintId } : t)))
    setSelectedTaskIds(new Set())
    toast.success(`${n} taken bijgewerkt`)
  }

  async function handleBulkPriority(priority: TaskPriority) {
    if (selectedTaskIds.size === 0) return
    const n = selectedTaskIds.size
    await Promise.all([...selectedTaskIds].map((id) => projectsDb.saveTask({ id, priority } as never)))
    setTasks((prev) => prev.map((t) => (selectedTaskIds.has(t.id) ? { ...t, priority } : t)))
    setSelectedTaskIds(new Set())
    toast.success(`${n} taken bijgewerkt`)
  }

  async function handleBulkDelete() {
    if (selectedTaskIds.size === 0) return
    const count = selectedTaskIds.size
    await Promise.all([...selectedTaskIds].map((id) => projectsDb.deleteTask(id)))
    setTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)))
    if (selectedProject) {
      setTaskCounts((prev) => ({
        ...prev,
        [selectedProject.id]: Math.max(0, (prev[selectedProject.id] ?? count) - count),
      }))
    }
    setSelectedTaskIds(new Set())
    toast.success(`${count} taken verwijderd`)
  }

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return projects
    if (selectedClientId === '__no_client__') return projects.filter((p) => !p.clientId)
    return projects.filter((p) => p.clientId === selectedClientId)
  }, [projects, selectedClientId])

  const clientsWithProjects = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach((p) => {
      if (p.clientId) counts[p.clientId] = (counts[p.clientId] ?? 0) + 1
    })
    return clients.filter((c) => counts[c.id]).map((c) => ({ ...c, count: counts[c.id] ?? 0 }))
  }, [clients, projects])

  const internProjectCount = useMemo(() => projects.filter((p) => !p.clientId).length, [projects])

  const sprintFilteredTasks = useMemo(() => {
    let result = tasks
    if (selectedSprintId !== 'all') {
      if (selectedSprintId === '__none__') result = result.filter((t) => !t.sprintId)
      else result = result.filter((t) => t.sprintId === selectedSprintId)
    }
    if (filters.assigneeIds.length > 0) result = result.filter((t) => t.assigneeId && filters.assigneeIds.includes(t.assigneeId))
    if (filters.priorities.length > 0) result = result.filter((t) => filters.priorities.includes(t.priority))
    if (filters.labelIds.length > 0) result = result.filter((t) => t.labelIds?.some((id) => filters.labelIds.includes(id)))
    if (filters.sprintId !== 'all') {
      if (filters.sprintId === '__none__') result = result.filter((t) => !t.sprintId)
      else result = result.filter((t) => t.sprintId === filters.sprintId)
    }
    if (filters.status !== 'all') result = result.filter((t) => t.status === filters.status)
    return result
  }, [tasks, selectedSprintId, filters])

  if (selectedProject) {
    const client = clients.find((c) => c.id === selectedProject.clientId)
    const activeSprint = sprints.find((s) => s.status === 'active')
    return (
      <ProjectsDetailLayout
        selectedProject={selectedProject}
        clientLabel={client?.companyName}
        activeSprint={activeSprint}
        sprints={sprints}
        selectedSprintId={selectedSprintId}
        setSelectedSprintId={setSelectedSprintId}
        boardView={boardView}
        setBoardView={setBoardView}
        filters={filters}
        setFilters={setFilters}
        profiles={profiles}
        labels={labels}
        milestones={milestones}
        tasks={tasks}
        sprintFilteredTasks={sprintFilteredTasks}
        activities={activities}
        activityLoading={activityLoading}
        selectedTaskIds={selectedTaskIds}
        setSelectedTaskIds={setSelectedTaskIds}
        showSprintModal={showSprintModal}
        setShowSprintModal={setShowSprintModal}
        editSprint={editSprint}
        setEditSprint={setEditSprint}
        showProjectModal={showProjectModal}
        editProject={editProject}
        showTaskModal={showTaskModal}
        editTask={editTask}
        taskDefaultStatus={taskDefaultStatus}
        taskDefaultMilestoneId={taskDefaultMilestoneId}
        showMilestoneModal={showMilestoneModal}
        editMilestone={editMilestone}
        profileEmail={profile?.email}
        navigate={navigate}
        onExitProject={() => {
          setSelectedProject(null)
          setTasks([])
          setSprints([])
          setLabels([])
          setSelectedTaskIds(new Set())
        }}
        onLoadActivity={loadActivity}
        onEditProjectOpen={() => {
          setEditProject(selectedProject)
          setShowProjectModal(true)
        }}
        onNewMilestoneOpen={() => {
          setEditMilestone(undefined)
          setShowMilestoneModal(true)
        }}
        onNewTaskOpen={() => {
          setEditTask(undefined)
          setTaskDefaultStatus('todo')
          setTaskDefaultMilestoneId(null)
          setShowTaskModal(true)
        }}
        setEditTask={setEditTask}
        setTaskDefaultStatus={setTaskDefaultStatus}
        setTaskDefaultMilestoneId={setTaskDefaultMilestoneId}
        setShowTaskModal={setShowTaskModal}
        setEditMilestone={setEditMilestone}
        setShowMilestoneModal={setShowMilestoneModal}
        setShowProjectModal={setShowProjectModal}
        setEditProject={setEditProject}
        setSprints={setSprints}
        setMilestones={setMilestones}
        handleStatusChange={handleStatusChange}
        handleBulkStatus={handleBulkStatus}
        handleBulkAssignee={handleBulkAssignee}
        handleBulkSprint={handleBulkSprint}
        handleBulkPriority={handleBulkPriority}
        handleBulkDelete={handleBulkDelete}
        handleProjectSaved={handleProjectSaved}
        handleProjectDeleted={handleProjectDeleted}
        handleTaskSaved={handleTaskSaved}
        handleTaskDeleted={handleTaskDeleted}
      />
    )
  }

  return (
    <ProjectsExplorerLayout
      leftNav={leftNav}
      setLeftNav={setLeftNav}
      selectedClientId={selectedClientId}
      setSelectedClientId={setSelectedClientId}
      clients={clients}
      clientsWithProjects={clientsWithProjects}
      internProjectCount={internProjectCount}
      projects={projects}
      filteredProjects={filteredProjects}
      taskCounts={taskCounts}
      loading={loading}
      allTasks={allTasks}
      allTasksLoading={allTasksLoading}
      profiles={profiles}
      profileId={profile?.id}
      showProjectModal={showProjectModal}
      editProject={editProject}
      showTaskModal={showTaskModal}
      editTask={editTask}
      navigate={navigate}
      openOverview={openOverview}
      openProject={openProject}
      setEditProject={setEditProject}
      setShowProjectModal={setShowProjectModal}
      setShowTaskModal={setShowTaskModal}
      setEditTask={setEditTask}
      handleProjectSaved={handleProjectSaved}
      handleProjectDeleted={handleProjectDeleted}
      handleTaskSaved={handleTaskSaved}
      handleTaskDeleted={handleTaskDeleted}
      setAllTasks={setAllTasks}
    />
  )
}
