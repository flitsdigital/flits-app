import { supabaseAdmin, withTimeout } from './supabase'
import type { Project, ProjectStatus, Subtask, Task, TaskPriority, TaskStatus } from '../types'

interface DbProject {
  id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  color: string | null
  created_at: string
  updated_at: string
}

interface DbTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
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
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color ?? '#3b82f6',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTask(row: DbTask): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
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

  async fetchProfilesBasic(): Promise<Array<{ id: string; email: string; name?: string | null }>> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('profiles').select('id, email, name').order('created_at')
    )
    if (error) throw error
    return data ?? []
  },

  async saveProject(input: {
    id?: string
    clientId: string
    name: string
    description?: string | null
    status: ProjectStatus
    color: string
  }): Promise<Project> {
    const payload = {
      client_id: input.clientId,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      color: input.color,
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

  async saveTask(input: {
    id?: string
    projectId: string
    title: string
    description?: string | null
    status: TaskStatus
    priority: TaskPriority
    assigneeId?: string | null
    dueDate?: string | null
    position?: number
  }): Promise<Task> {
    const payload = {
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId ?? null,
      due_date: input.dueDate ?? null,
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
}
