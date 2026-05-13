import { supabaseAdmin, withTimeout } from './supabase'
import type { Milestone, Project, ProjectLabel, ProjectStatus, Subtask, Task, TaskPriority, TaskStatus } from '../types'

// ── Task Comments ──────────────────────────────────────────────────────────────

export interface TaskComment {
  id: string
  taskId: string
  authorId: string
  authorEmail: string
  authorName: string | null
  content: string
  createdAt: string
}

interface DbTaskComment {
  id: string
  task_id: string
  author_id: string
  author_email: string
  author_name: string | null
  content: string
  created_at: string
}

function mapComment(row: DbTaskComment): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    authorEmail: row.author_email,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }
}

// ── Sprints ────────────────────────────────────────────────────────────────────

export type SprintStatus = 'planned' | 'active' | 'closed'

export interface Sprint {
  id: string
  projectId: string
  name: string
  startDate: string | null
  endDate: string | null
  status: SprintStatus
  createdAt: string
}

interface DbSprint {
  id: string
  project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: SprintStatus
  created_at: string
}

function mapSprint(row: DbSprint): Sprint {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
  }
}

// ── Project Activity ───────────────────────────────────────────────────────────

export type ActivityAction = 'task_created' | 'status_changed' | 'commented' | 'assigned' | 'sprint_changed' | 'task_deleted'

export interface ProjectActivity {
  id: string
  projectId: string
  taskId: string | null
  actorEmail: string
  action: ActivityAction
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface DbProjectActivity {
  id: string
  project_id: string
  task_id: string | null
  actor_email: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

function mapActivity(row: DbProjectActivity): ProjectActivity {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    actorEmail: row.actor_email,
    action: row.action as ActivityAction,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}

interface DbProject {
  id: string
  client_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  color: string | null
  start_date: string | null
  deadline: string | null
  created_at: string
  updated_at: string
}

interface DbTask {
  id: string
  project_id: string
  milestone_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  start_date: string | null
  due_date: string | null
  sprint_id: string | null
  position: number
  created_at: string
  updated_at: string
}

interface DbMilestone {
  id: string
  project_id: string
  name: string
  deadline: string | null
  description: string | null
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

function mapMilestone(row: DbMilestone): Milestone {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    deadline: row.deadline ?? null,
    description: row.description ?? null,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface DbProjectLabel {
  id: string
  project_id: string
  name: string
  color: string
  created_at: string
}

function mapLabel(row: DbProjectLabel): ProjectLabel {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

interface DbSubtask {
  id: string
  task_id: string
  title: string
  done: boolean
  position: number
  created_at: string
  updated_at: string
}

function mapProject(row: DbProject): Project {
  return {
    id: row.id,
    clientId: row.client_id ?? null,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color ?? '#3b82f6',
    startDate: row.start_date ?? null,
    deadline: row.deadline ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTask(row: DbTask & { label_ids?: string[] }): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    startDate: row.start_date ?? null,
    dueDate: row.due_date,
    sprintId: row.sprint_id,
    labelIds: row.label_ids ?? [],
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSubtask(row: DbSubtask): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    done: row.done,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const projectsDb = {
  async fetchProjects(): Promise<Project[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('projects').select('*').order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbProject[] ?? []).map(mapProject)
  },

  async fetchProjectsForClient(clientId: string): Promise<Project[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbProject[] ?? []).map(mapProject)
  },

  async fetchTaskRefs(): Promise<Array<{ id: string; projectId: string }>> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('tasks').select('id, project_id').order('created_at')
    )
    if (error) throw error
    return (data as Array<{ id: string; project_id: string }> ?? []).map((t) => ({ id: t.id, projectId: t.project_id }))
  },

  async fetchProjectTasks(projectId: string): Promise<Task[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('tasks').select('*').eq('project_id', projectId).order('position')
    )
    if (error) throw error
    return (data as DbTask[] ?? []).map(mapTask)
  },

  async fetchAllTasks(): Promise<Task[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('tasks').select('*').order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbTask[] ?? []).map(mapTask)
  },

  async fetchProfilesBasic(): Promise<Array<{ id: string; email: string; name?: string | null; avatar_url?: string | null }>> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('profiles').select('id, email, name, avatar_url').order('created_at')
    )
    if (error) throw error
    return data ?? []
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
  }): Promise<Project> {
    const payload = {
      client_id: input.clientId ?? null,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      color: input.color,
      start_date: input.startDate ?? null,
      deadline: input.deadline ?? null,
      updated_at: new Date().toISOString(),
    }

    const query = input.id
      ? supabaseAdmin.from('projects').update(payload as never).eq('id', input.id).select().single()
      : supabaseAdmin.from('projects').insert(payload as never).select().single()

    const { data, error } = await withTimeout(query)
    if (error) throw error
    return mapProject(data as DbProject)
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('projects').delete().eq('id', id))
    if (error) throw error
  },

  async fetchTask(taskId: string): Promise<Task & { subtasks: Subtask[]; comments: TaskComment[] }> {
    const [taskRes, subtasksRes, commentsRes] = await Promise.all([
      withTimeout(supabaseAdmin.from('tasks').select('*').eq('id', taskId).single()),
      withTimeout(supabaseAdmin.from('subtasks').select('*').eq('task_id', taskId).order('position')),
      withTimeout(supabaseAdmin.from('task_comments').select('*').eq('task_id', taskId).order('created_at')),
    ])
    if (taskRes.error) throw taskRes.error
    const task = mapTask(taskRes.data as DbTask)
    // Fetch label ids
    const { data: labelRows } = await withTimeout(
      supabaseAdmin.from('task_labels').select('label_id').eq('task_id', taskId)
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
      ? supabaseAdmin.from('tasks').update(payload as never).eq('id', input.id).select().single()
      : supabaseAdmin.from('tasks').insert({
        ...payload,
        project_id: input.projectId,
        position: input.position ?? 0,
      } as never).select().single()

    const { data, error } = await withTimeout(query)
    if (error) throw error
    return mapTask(data as DbTask)
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('tasks').delete().eq('id', id))
    if (error) throw error
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const { error } = await withTimeout(
      supabaseAdmin.from('tasks').update({ status, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    )
    if (error) throw error
  },

  async fetchTaskSubtasks(taskId: string): Promise<Subtask[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('subtasks').select('*').eq('task_id', taskId).order('position')
    )
    if (error) throw error
    return (data as DbSubtask[] ?? []).map(mapSubtask)
  },

  async addSubtask(taskId: string, title: string, position: number): Promise<Subtask> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('subtasks').insert({ task_id: taskId, title, position } as never).select().single()
    )
    if (error) throw error
    return mapSubtask(data as DbSubtask)
  },

  async toggleSubtaskDone(id: string, done: boolean): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('subtasks').update({ done } as never).eq('id', id))
    if (error) throw error
  },

  async deleteSubtask(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('subtasks').delete().eq('id', id))
    if (error) throw error
  },

  // ── Task Comments ─────────────────────────────────────────────────────────

  async fetchTaskComments(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('task_comments').select('*').eq('task_id', taskId).order('created_at')
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
      supabaseAdmin.from('task_comments').insert(payload as never).select().single()
    )
    if (error) throw error
    return mapComment(data as DbTaskComment)
  },

  async deleteTaskComment(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('task_comments').delete().eq('id', id))
    if (error) throw error
  },

  // ── Sprints ───────────────────────────────────────────────────────────────

  async fetchSprints(projectId: string): Promise<Sprint[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('sprints').select('*').eq('project_id', projectId).order('created_at')
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
      supabaseAdmin.from('sprints').upsert(payload as never).select().single()
    )
    if (error) throw error
    return mapSprint(data as DbSprint)
  },

  async deleteSprint(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('sprints').delete().eq('id', id))
    if (error) throw error
  },

  async updateTaskSprint(taskId: string, sprintId: string | null): Promise<void> {
    const { error } = await withTimeout(
      supabaseAdmin.from('tasks').update({ sprint_id: sprintId, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    )
    if (error) throw error
  },

  // ── Project Activity ──────────────────────────────────────────────────────

  async fetchProjectActivity(projectId: string): Promise<ProjectActivity[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin
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
    const { error } = await withTimeout(supabaseAdmin.from('project_activity').insert(payload as never))
    if (error) {
      // Activity logging is non-critical; suppress errors
      console.warn('Failed to log activity:', error.message)
    }
  },

  // ── Labels ────────────────────────────────────────────────────────────────

  async fetchProjectLabels(projectId: string): Promise<ProjectLabel[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('project_labels').select('*').eq('project_id', projectId).order('created_at')
    )
    if (error) throw error
    return (data as DbProjectLabel[] ?? []).map(mapLabel)
  },

  async createLabel(projectId: string, name: string, color: string): Promise<ProjectLabel> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('project_labels').insert({ project_id: projectId, name, color } as never).select().single()
    )
    if (error) throw error
    return mapLabel(data as DbProjectLabel)
  },

  async updateLabel(id: string, patch: { name?: string; color?: string }): Promise<ProjectLabel> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('project_labels').update(patch as never).eq('id', id).select().single()
    )
    if (error) throw error
    return mapLabel(data as DbProjectLabel)
  },

  async deleteLabel(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('project_labels').delete().eq('id', id))
    if (error) throw error
  },

  async setTaskLabels(taskId: string, labelIds: string[]): Promise<void> {
    await withTimeout(supabaseAdmin.from('task_labels').delete().eq('task_id', taskId))
    if (labelIds.length === 0) return
    const rows = labelIds.map((label_id) => ({ task_id: taskId, label_id }))
    const { error } = await withTimeout(supabaseAdmin.from('task_labels').insert(rows as never))
    if (error) throw error
  },

  async fetchTaskLabelIds(taskId: string): Promise<string[]> {
    const { data } = await withTimeout(
      supabaseAdmin.from('task_labels').select('label_id').eq('task_id', taskId)
    )
    return (data ?? []).map((r: { label_id: string }) => r.label_id)
  },

  // ── Milestones ────────────────────────────────────────────────────────────

  async fetchMilestones(projectId: string): Promise<Milestone[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('milestones').select('*').eq('project_id', projectId).order('sort_order').order('created_at')
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
      ? supabaseAdmin.from('milestones').update(payload as never).eq('id', input.id).select().single()
      : supabaseAdmin.from('milestones').insert(payload as never).select().single()
    const { data, error } = await withTimeout(query)
    if (error) throw error
    return mapMilestone(data as DbMilestone)
  },

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('milestones').delete().eq('id', id))
    if (error) throw error
  },
}
