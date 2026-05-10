import { supabaseAdmin, withTimeout } from './supabase'

export interface Notification {
  id: string
  userId: string
  actorEmail: string
  type: string
  content: string
  linkedType: string | null
  linkedId: string | null
  contextUrl: string | null
  read: boolean
  createdAt: string
}

interface DbNotification {
  id: string
  user_id: string
  actor_email: string
  type: string
  content: string
  linked_type: string | null
  linked_id: string | null
  context_url: string | null
  read: boolean
  created_at: string
}

function mapNotif(row: DbNotification): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    actorEmail: row.actor_email,
    type: row.type,
    content: row.content,
    linkedType: row.linked_type,
    linkedId: row.linked_id,
    contextUrl: row.context_url,
    read: row.read,
    createdAt: row.created_at,
  }
}

export const notificationsDb = {
  async fetchForUser(userId: string): Promise<Notification[]> {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
    )
    if (error) throw error
    return (data as DbNotification[] ?? []).map(mapNotif)
  },

  async create(input: {
    userId: string
    actorEmail: string
    type?: string
    content: string
    linkedType?: string | null
    linkedId?: string | null
    contextUrl?: string | null
  }): Promise<void> {
    const payload = {
      id: crypto.randomUUID(),
      user_id: input.userId,
      actor_email: input.actorEmail,
      type: input.type ?? 'mention',
      content: input.content,
      linked_type: input.linkedType ?? null,
      linked_id: input.linkedId ?? null,
      context_url: input.contextUrl ?? null,
      read: false,
    }
    const { error } = await withTimeout(supabaseAdmin.from('notifications').insert(payload as never))
    if (error) throw error
  },

  async markRead(id: string): Promise<void> {
    const { error } = await withTimeout(
      supabaseAdmin.from('notifications').update({ read: true } as never).eq('id', id)
    )
    if (error) throw error
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await withTimeout(
      supabaseAdmin.from('notifications').update({ read: true } as never).eq('user_id', userId).eq('read', false)
    )
    if (error) throw error
  },
}
