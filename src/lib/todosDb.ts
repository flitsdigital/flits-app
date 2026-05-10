import { supabaseAdmin, withTimeout } from './supabase'

export interface Todo {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  ownerId: string
  assigneeId: string | null
  linkedType: 'client' | 'post' | 'lead' | null
  linkedId: string | null
  linkedLabel: string | null
  notes: string | null
  position: number
  createdAt: string
  updatedAt: string
}

interface DbTodo {
  id: string
  title: string
  done: boolean
  due_date: string | null
  owner_id: string
  assignee_id: string | null
  linked_type: string | null
  linked_id: string | null
  linked_label: string | null
  notes: string | null
  position: number
  created_at: string
  updated_at: string
}

function mapTodo(row: DbTodo): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    dueDate: row.due_date,
    ownerId: row.owner_id,
    assigneeId: row.assignee_id,
    linkedType: row.linked_type as Todo['linkedType'],
    linkedId: row.linked_id,
    linkedLabel: row.linked_label,
    notes: row.notes,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const todosDb = {
  async fetchForUser(userId: string): Promise<Todo[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('todos')
        .select('*')
        .eq('owner_id', userId)
        .order('position')
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbTodo[] ?? []).map(mapTodo)
  },

  async upsert(input: {
    id?: string
    title: string
    done?: boolean
    dueDate?: string | null
    ownerId: string
    assigneeId?: string | null
    linkedType?: Todo['linkedType']
    linkedId?: string | null
    linkedLabel?: string | null
    notes?: string | null
    position?: number
  }): Promise<Todo> {
    const payload: Record<string, unknown> = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      done: input.done ?? false,
      due_date: input.dueDate ?? null,
      owner_id: input.ownerId,
      assignee_id: input.assigneeId ?? null,
      linked_type: input.linkedType ?? null,
      linked_id: input.linkedId ?? null,
      linked_label: input.linkedLabel ?? null,
      notes: input.notes ?? null,
      position: input.position ?? 0,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await withTimeout(
      supabaseAdmin.from('todos').upsert(payload as never).select().single()
    )
    if (error) throw error
    return mapTodo(data as DbTodo)
  },

  async toggleDone(id: string, done: boolean): Promise<void> {
    const { error } = await withTimeout(
      supabaseAdmin.from('todos').update({ done, updated_at: new Date().toISOString() } as never).eq('id', id)
    )
    if (error) throw error
  },

  async updateNotes(id: string, notes: string): Promise<void> {
    const { error } = await withTimeout(
      supabaseAdmin.from('todos').update({ notes, updated_at: new Date().toISOString() } as never).eq('id', id)
    )
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await withTimeout(supabaseAdmin.from('todos').delete().eq('id', id))
    if (error) throw error
  },
}
