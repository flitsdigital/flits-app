import { supabase, withTimeout } from '../supabase'
import {
  fetchProfilesBasicCached,
  projectTaskRefsCache,
  projectsListCache,
} from '../appCaches'
import type { Milestone, Project, ProjectLabel, ProjectStatus, Subtask, Task, TaskPriority, TaskStatus } from '../../types'
import {
  mapActivity,
  mapComment,
  mapLabel,
  mapMilestone,
  mapProject,
  mapSprint,
  mapSubtask,
  mapTask,
  type ActivityAction,
  type DbMilestone,
  type DbProject,
  type DbProjectActivity,
  type DbProjectLabel,
  type DbSprint,
  type DbSubtask,
  type DbTask,
  type DbTaskComment,
  type ProjectActivity,
  type Sprint,
  type SprintStatus,
  type TaskComment,
} from './projectDbModels'

export const projectsDb = {
  async fetchProjects(): Promise<Project[]> {
    return projectsListCache.fetch(async () => {
      const { data, error } = await withTimeout(
        supabase.from('projects_app').select('*').order('created_at', { ascending: false }),
      )
      if (error) throw error
      return (data as DbProject[] ?? []).map(mapProject)
    })
  },

  async fetchProjectsForClient(clientId: string): Promise<Project[]> {
    const { data, error } = await withTimeout(
      supabase.from('projects_app').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbProject[] ?? []).map(mapProject)
  },

  async fetchTaskRefs(): Promise<Array<{ id: string; projectId: string }>> {
    return projectTaskRefsCache.fetch(async () => {
      const { data, error } = await withTimeout(
        supabase.from('tasks').select('id, project_id').order('created_at'),
      )
      if (error) throw error
      return (data as Array<{ id: string; project_id: string }> ?? []).map((t) => ({
        id: t.id,
        projectId: t.project_id,
      }))
    })
  },

  async fetchProjectTasks(projectId: string): Promise<Task[]> {
    const { data, error } = await withTimeout(
      supabase.from('tasks').select('*').eq('project_id', projectId).order('position')
    )
    if (error) throw error
    return (data as DbTask[] ?? []).map(mapTask)
  },

  async fetchAllTasks(): Promise<Task[]> {
    const { data, error } = await withTimeout(
      supabase.from('tasks').select('*').order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbTask[] ?? []).map(mapTask)
  },

  async fetchProfilesBasic() {
    return fetchProfilesBasicCached()
  },

  async saveProject(input: {
    id?: string
    clientId?: string | null
    name: string
    description?: string | null
    status: ProjectStatus
    color: string
    startDate?: string | null
    deadline?: string | null
    value?: number | null
    invoicedAmount?: number | null
  }): Promise<Project> {
    const payload = {
      client_id: input.clientId ?? null,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      color: input.color,
      start_date: input.startDate ?? null,
      deadline: input.deadline ?? null,
      value: input.value ?? null,
      invoiced_amount: input.invoicedAmount ?? null,
      updated_at: new Date().toISOString(),
    }

    const query = input.id
      ? supabase.from('projects').update(payload as never).eq('id', input.id).select().single()
      : supabase.from('projects').insert(payload as never).select().single()

    const { data, error } = await withTimeout(query)
    if (error) throw error
    projectsListCache.invalidate()
    projectTaskRefsCache.invalidate()
    return mapProject(data as DbProject)
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('projects').delete().eq('id', id))
    if (error) throw error
    projectsListCache.invalidate()
    projectTaskRefsCache.invalidate()
  },

  async fetchTask(taskId: string): Promise<Task & { subtasks: Subtask[]; comments: TaskComment[] }> {
    const [taskRes, subtasksRes, commentsRes] = await Promise.all([
      withTimeout(supabase.from('tasks').select('*').eq('id', taskId).single()),
      withTimeout(supabase.from('subtasks').select('*').eq('task_id', taskId).order('position')),
      withTimeout(supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at')),
    ])
    if (taskRes.error) throw taskRes.error
    const task = mapTask(taskRes.data as DbTask)
    // Fetch label ids
    const { data: labelRows } = await withTimeout(
      supabase.from('task_labels').select('label_id').eq('task_id', taskId)
    )
    task.labelIds = (labelRows ?? []).map((r: { label_id: string }) => r.label_id)
    return {
      ...task,
      subtasks: (subtasksRes.data as DbSubtask[] ?? []).map(mapSubtask),
      comments: (commentsRes.data as DbTaskComment[] ?? []).map(mapComment),
    }
  },

  async saveTask(input: {
    id?: string
    projectId: string
    milestoneId?: string | null
    title: string
    description?: string | null
    status: TaskStatus
    priority: TaskPriority
    assigneeId?: string | null
    startDate?: string | null
    dueDate?: string | null
    sprintId?: string | null
    position?: number
  }): Promise<Task> {
    const payload = {
      milestone_id: input.milestoneId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId ?? null,
      start_date: input.startDate ?? null,
      due_date: input.dueDate ?? null,
      sprint_id: input.sprintId ?? null,
      updated_at: new Date().toISOString(),
    }

    const query = input.id
      ? supabase.from('tasks').update(payload as never).eq('id', input.id).select().single()
      : supabase.from('tasks').insert({
        ...payload,
        project_id: input.projectId,
        position: input.position ?? 0,
      } as never).select().single()

    const { data, error } = await withTimeout(query)
    if (error) throw error
    return mapTask(data as DbTask)
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('tasks').delete().eq('id', id))
    if (error) throw error
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('tasks').update({ status, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    )
    if (error) throw error
  },

  async fetchTaskSubtasks(taskId: string): Promise<Subtask[]> {
    const { data, error } = await withTimeout(
      supabase.from('subtasks').select('*').eq('task_id', taskId).order('position')
    )
    if (error) throw error
    return (data as DbSubtask[] ?? []).map(mapSubtask)
  },

  async addSubtask(taskId: string, title: string, position: number): Promise<Subtask> {
    const { data, error } = await withTimeout(
      supabase.from('subtasks').insert({ task_id: taskId, title, position } as never).select().single()
    )
    if (error) throw error
    return mapSubtask(data as DbSubtask)
  },

  async toggleSubtaskDone(id: string, done: boolean): Promise<void> {
    const { error } = await withTimeout(supabase.from('subtasks').update({ done } as never).eq('id', id))
    if (error) throw error
  },

  async deleteSubtask(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('subtasks').delete().eq('id', id))
    if (error) throw error
  },

  // ── Task Comments ─────────────────────────────────────────────────────────

  async fetchTaskComments(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await withTimeout(
      supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at')
    )
    if (error) throw error
    return (data as DbTaskComment[] ?? []).map(mapComment)
  },

  async addTaskComment(input: {
    taskId: string
    authorId: string
    authorEmail: string
    authorName?: string | null
    content: string
  }): Promise<TaskComment> {
    const payload = {
      id: crypto.randomUUID(),
      task_id: input.taskId,
      author_id: input.authorId,
      author_email: input.authorEmail,
      author_name: input.authorName ?? null,
      content: input.content,
    }
    const { data, error } = await withTimeout(
      supabase.from('task_comments').insert(payload as never).select().single()
    )
    if (error) throw error
    return mapComment(data as DbTaskComment)
  },

  async deleteTaskComment(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('task_comments').delete().eq('id', id))
    if (error) throw error
  },

  // ── Sprints ───────────────────────────────────────────────────────────────

  async fetchSprints(projectId: string): Promise<Sprint[]> {
    const { data, error } = await withTimeout(
      supabase.from('sprints').select('*').eq('project_id', projectId).order('created_at')
    )
    if (error) throw error
    return (data as DbSprint[] ?? []).map(mapSprint)
  },

  async saveSprint(input: {
    id?: string
    projectId: string
    name: string
    startDate?: string | null
    endDate?: string | null
    status?: SprintStatus
  }): Promise<Sprint> {
    const payload: Record<string, unknown> = {
      id: input.id ?? crypto.randomUUID(),
      project_id: input.projectId,
      name: input.name,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      status: input.status ?? 'planned',
    }
    const { data, error } = await withTimeout(
      supabase.from('sprints').upsert(payload as never).select().single()
    )
    if (error) throw error
    return mapSprint(data as DbSprint)
  },

  async deleteSprint(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('sprints').delete().eq('id', id))
    if (error) throw error
  },

  async updateTaskSprint(taskId: string, sprintId: string | null): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('tasks').update({ sprint_id: sprintId, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    )
    if (error) throw error
  },

  // ── Project Activity ──────────────────────────────────────────────────────

  async fetchProjectActivity(projectId: string): Promise<ProjectActivity[]> {
    const { data, error } = await withTimeout(
      supabase
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50)
    )
    if (error) throw error
    return (data as DbProjectActivity[] ?? []).map(mapActivity)
  },

  async logActivity(input: {
    projectId: string
    taskId?: string | null
    actorEmail: string
    action: ActivityAction
    metadata?: Record<string, unknown> | null
  }): Promise<void> {
    const payload = {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      actor_email: input.actorEmail,
      action: input.action,
      metadata: input.metadata ?? null,
    }
    const { error } = await withTimeout(supabase.from('project_activity').insert(payload as never))
    if (error) {
      // Activity logging is non-critical; suppress errors
      console.warn('Failed to log activity:', error.message)
    }
  },

  // ── Labels ────────────────────────────────────────────────────────────────

  async fetchProjectLabels(projectId: string): Promise<ProjectLabel[]> {
    const { data, error } = await withTimeout(
      supabase.from('project_labels').select('*').eq('project_id', projectId).order('created_at')
    )
    if (error) throw error
    return (data as DbProjectLabel[] ?? []).map(mapLabel)
  },

  async createLabel(projectId: string, name: string, color: string): Promise<ProjectLabel> {
    const { data, error } = await withTimeout(
      supabase.from('project_labels').insert({ project_id: projectId, name, color } as never).select().single()
    )
    if (error) throw error
    return mapLabel(data as DbProjectLabel)
  },

  async updateLabel(id: string, patch: { name?: string; color?: string }): Promise<ProjectLabel> {
    const { data, error } = await withTimeout(
      supabase.from('project_labels').update(patch as never).eq('id', id).select().single()
    )
    if (error) throw error
    return mapLabel(data as DbProjectLabel)
  },

  async deleteLabel(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('project_labels').delete().eq('id', id))
    if (error) throw error
  },

  async setTaskLabels(taskId: string, labelIds: string[]): Promise<void> {
    await withTimeout(supabase.from('task_labels').delete().eq('task_id', taskId))
    if (labelIds.length === 0) return
    const rows = labelIds.map((label_id) => ({ task_id: taskId, label_id }))
    const { error } = await withTimeout(supabase.from('task_labels').insert(rows as never))
    if (error) throw error
  },

  async fetchTaskLabelIds(taskId: string): Promise<string[]> {
    const { data } = await withTimeout(
      supabase.from('task_labels').select('label_id').eq('task_id', taskId)
    )
    return (data ?? []).map((r: { label_id: string }) => r.label_id)
  },

  // ── Milestones ────────────────────────────────────────────────────────────

  async fetchMilestones(projectId: string): Promise<Milestone[]> {
    const { data, error } = await withTimeout(
      supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order').order('created_at')
    )
    if (error) throw error
    return (data as DbMilestone[] ?? []).map(mapMilestone)
  },

  async saveMilestone(input: {
    id?: string
    projectId: string
    name: string
    deadline?: string | null
    description?: string | null
    color?: string
    sortOrder?: number
  }): Promise<Milestone> {
    const payload = {
      project_id: input.projectId,
      name: input.name,
      deadline: input.deadline ?? null,
      description: input.description ?? null,
      color: input.color ?? '#6366f1',
      sort_order: input.sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    }
    const query = input.id
      ? supabase.from('milestones').update(payload as never).eq('id', input.id).select().single()
      : supabase.from('milestones').insert(payload as never).select().single()
    const { data, error } = await withTimeout(query)
    if (error) throw error
    return mapMilestone(data as DbMilestone)
  },

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from('milestones').delete().eq('id', id))
    if (error) throw error
  },
}
