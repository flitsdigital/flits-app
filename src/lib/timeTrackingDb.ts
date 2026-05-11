import { supabase, supabaseAdmin, withTimeout } from './supabase'
import type { TimeEntry, TimeTag, UserProfile } from '../types'

// ── DB row types ───────────────────────────────────────────────────────────────

interface DbTimeEntry {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  task_id: string | null
  description: string
  started_at: string
  ended_at: string | null
  is_running: boolean
  tag_ids: string[]
  created_at: string
  updated_at: string
}

interface DbTimeTag {
  id: string
  name: string
  color: string
  created_at: string
}

// ── Converters ─────────────────────────────────────────────────────────────────

function entryFromRow(row: DbTimeEntry): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    projectId: row.project_id,
    taskId: row.task_id,
    description: row.description ?? '',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    isRunning: row.is_running ?? false,
    tagIds: row.tag_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function tagFromRow(row: DbTimeTag): TimeTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

// ── DB module ──────────────────────────────────────────────────────────────────

export const timeTrackingDb = {
  // ── Tags ──────────────────────────────────────────────────────────────────

  async fetchTags(): Promise<TimeTag[]> {
    const { data, error } = await withTimeout(
      supabase.from('time_tags').select('*').order('name'),
    )
    if (error) throw error
    return (data as DbTimeTag[] ?? []).map(tagFromRow)
  },

  async createTag(name: string, color: string): Promise<TimeTag> {
    const { data, error } = await withTimeout(
      supabase.from('time_tags').insert({ name, color }).select().single(),
    )
    if (error) throw error
    return tagFromRow(data as DbTimeTag)
  },

  async updateTag(id: string, name: string, color: string): Promise<TimeTag> {
    const { data, error } = await withTimeout(
      supabase.from('time_tags').update({ name, color }).eq('id', id).select().single(),
    )
    if (error) throw error
    return tagFromRow(data as DbTimeTag)
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from('time_tags').delete().eq('id', id),
    )
    if (error) throw error
  },

  // ── Users ─────────────────────────────────────────────────────────────────

  async fetchUsers(): Promise<UserProfile[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('profiles').select('*').order('email'),
    )
    if (error) throw error
    return data ?? []
  },

  // ── Entries ───────────────────────────────────────────────────────────────

  async fetchEntries(input: {
    isAdmin: boolean
    selectedUserId?: string | 'all'
  }): Promise<TimeEntry[]> {
    const query = input.isAdmin
      ? supabaseAdmin.from('time_entries').select('*').order('started_at', { ascending: false })
      : supabase.from('time_entries').select('*').order('started_at', { ascending: false })

    const filtered =
      input.isAdmin && input.selectedUserId && input.selectedUserId !== 'all'
        ? query.eq('user_id', input.selectedUserId)
        : query

    const { data, error } = await withTimeout(filtered, 15_000)
    if (error) throw error
    return (data as DbTimeEntry[] ?? []).map(entryFromRow)
  },

  async startTimer(input: {
    userId: string
    description: string
    clientId: string | null
    tagIds: string[]
  }): Promise<TimeEntry> {
    const now = new Date().toISOString()
    // Stop eventueel lopende timer
    await withTimeout(
      supabase
        .from('time_entries')
        .update({ is_running: false, ended_at: now, updated_at: now })
        .eq('user_id', input.userId)
        .eq('is_running', true),
    ).catch(() => null)

    const { data, error } = await withTimeout(
      supabase
        .from('time_entries')
        .insert({
          user_id: input.userId,
          client_id: input.clientId,
          description: input.description,
          started_at: now,
          ended_at: null,
          is_running: true,
          tag_ids: input.tagIds,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single(),
    )
    if (error) throw error
    return entryFromRow(data as DbTimeEntry)
  },

  async stopTimer(id: string): Promise<TimeEntry> {
    const now = new Date().toISOString()
    const { data, error } = await withTimeout(
      supabase
        .from('time_entries')
        .update({ ended_at: now, is_running: false, updated_at: now })
        .eq('id', id)
        .select()
        .single(),
    )
    if (error) throw error
    return entryFromRow(data as DbTimeEntry)
  },

  async createEntry(input: {
    userId: string
    clientId: string | null
    projectId?: string | null
    taskId?: string | null
    description: string
    startedAt: string
    endedAt: string
    tagIds: string[]
  }): Promise<TimeEntry> {
    const now = new Date().toISOString()
    const { data, error } = await withTimeout(
      supabase
        .from('time_entries')
        .insert({
          user_id: input.userId,
          client_id: input.clientId,
          project_id: input.projectId ?? null,
          task_id: input.taskId ?? null,
          description: input.description,
          started_at: input.startedAt,
          ended_at: input.endedAt,
          is_running: false,
          tag_ids: input.tagIds,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single(),
    )
    if (error) throw error
    return entryFromRow(data as DbTimeEntry)
  },

  async updateEntry(
    id: string,
    input: {
      clientId: string | null
      projectId?: string | null
      taskId?: string | null
      description: string
      startedAt: string
      endedAt: string | null
      tagIds: string[]
    },
  ): Promise<TimeEntry> {
    const { data, error } = await withTimeout(
      supabase
        .from('time_entries')
        .update({
          client_id: input.clientId,
          project_id: input.projectId ?? null,
          task_id: input.taskId ?? null,
          description: input.description,
          started_at: input.startedAt,
          ended_at: input.endedAt,
          tag_ids: input.tagIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
    )
    if (error) throw error
    return entryFromRow(data as DbTimeEntry)
  },

  async fetchEntriesForTask(taskId: string): Promise<TimeEntry[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('time_entries').select('*').eq('task_id', taskId).order('started_at', { ascending: false })
    )
    if (error) throw error
    return (data as DbTimeEntry[] ?? []).map(entryFromRow)
  },

  async deleteEntry(id: string, isAdmin: boolean): Promise<void> {
    const client = isAdmin ? supabaseAdmin : supabase
    const { error } = await withTimeout(client.from('time_entries').delete().eq('id', id))
    if (error) throw error
  },
}
