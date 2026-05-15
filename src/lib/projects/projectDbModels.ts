import type { Milestone, Project, ProjectLabel, ProjectStatus, Subtask, Task, TaskPriority, TaskStatus } from '../../types'

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

export interface DbTaskComment {
  id: string
  task_id: string
  author_id: string
  author_email: string
  author_name: string | null
  content: string
  created_at: string
}

export function mapComment(row: DbTaskComment): TaskComment {
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

export interface DbSprint {
  id: string
  project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: SprintStatus
  created_at: string
}

export function mapSprint(row: DbSprint): Sprint {
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

export interface DbProjectActivity {
  id: string
  project_id: string
  task_id: string | null
  actor_email: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export function mapActivity(row: DbProjectActivity): ProjectActivity {
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

export interface DbProject {
  id: string
  client_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  color: string | null
  start_date: string | null
  deadline: string | null
  value: number | null
  invoiced_amount: number | null
  created_at: string
  updated_at: string
}

export interface DbTask {
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

export interface DbMilestone {
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

export function mapMilestone(row: DbMilestone): Milestone {
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

export interface DbProjectLabel {
  id: string
  project_id: string
  name: string
  color: string
  created_at: string
}

export function mapLabel(row: DbProjectLabel): ProjectLabel {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

export interface DbSubtask {
  id: string
  task_id: string
  title: string
  done: boolean
  position: number
  created_at: string
  updated_at: string
}

export function mapProject(row: DbProject): Project {
  return {
    id: row.id,
    clientId: row.client_id ?? null,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color ?? '#3b82f6',
    startDate: row.start_date ?? null,
    deadline: row.deadline ?? null,
    value: row.value ?? null,
    invoicedAmount: row.invoiced_amount ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapTask(row: DbTask & { label_ids?: string[] }): Task {
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

export function mapSubtask(row: DbSubtask): Subtask {
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
